# Workflows

Runtime flows, in the order you'll encounter them. Code references use `path:line`.

Middleware pipeline order is defined in
[`Program.cs:104-123`](../backend/NFC_Backend/NFC_Backend/Program.cs):

```
CORS → RateLimiter → Authentication
      ├─ (/api/tenant/*)  TenantMiddleware → SessionMiddleware
      ├─ LanguageMiddleware
      ├─ CurrencyMiddleware
      └─ Authorization → Controllers / SignalR hubs
```

---

## 1. Tenant resolution (`/api/tenant/*`)

[`MidlleWares/TenantMiddleware.cs`](../backend/NFC_Backend/NFC_Backend/MidlleWares/TenantMiddleware.cs)

1. CORS preflight (`OPTIONS`) is passed through untouched.
2. Reads the `X-Tenant` header (lower-cased, trimmed) and validates it against a
   slug regex (`TenantMiddleware.cs:9`). Missing/invalid → `400`.
3. Looks up the tenant by `Subdomain` where `IsActive`, cached **5 minutes** in
   `IMemoryCache` under `tenant:{slug}` (`TenantMiddleware.cs:30-37`). Not found →
   `404`.
4. If the caller is JWT-authenticated, the token's tenant must match the header
   (`TenantMiddleware.cs:47-56`), otherwise `403`.
5. Stores a `TenantInfo` projection on `ITenantAccessor.Current`.

The gateway injects `X-Tenant` from the hostname; see
[`nginx/conf.d/app.conf`](../nginx/conf.d/app.conf).

> 🐞 **Verify the tenant claim name.** `TokenService` writes a claim literally named
> `TenantId` ([`TokenService.cs:38`](../backend/NFC_Backend/NFC_Backend/Services/TokenService.cs)),
> but `TenantMiddleware` reads `tenant_id`
> ([`TenantMiddleware.cs:49`](../backend/NFC_Backend/NFC_Backend/MidlleWares/TenantMiddleware.cs)).
> JWT claim lookup is case-sensitive, so the match may never fire for JWT-authenticated
> calls to `/api/tenant/*`. Today those routes mostly use sessions, so it's latent —
> but confirm before relying on it.

---

## 2. Customer session lifecycle

A *session* ties a customer device to a tenant (and optionally a table) for the
duration of a visit. It is separate from user auth.

**Issuing** — [`tenantsController.cs:42-106`](../backend/NFC_Backend/NFC_Backend/Controllers/tenantsController.cs), `GET /api/tenant/info`:

1. Accepts an optional `?oldSession=` query param.
2. If a valid, unexpired session from the **same tenant** exists, it is reused and
   its cache entry refreshed.
3. Otherwise a new token is generated (`TokenService.GenerateSessionToken()` —
   32 random bytes, Base64Url so it is header/query safe), **SHA-256 hashed**
   (`HashSessionToken`), and stored in `sessions`. The **raw** token is returned to
   the client; only the hash is persisted.
4. Expiry comes from `Variable:SessionExpirationHours` (default **24h** if unset).
5. A `SessionInfo` is cached under `session:{tokenHash}` for the same duration.

**Enforcing** — [`MidlleWares/SessionMiddleware.cs`](../backend/NFC_Backend/NFC_Backend/MidlleWares/SessionMiddleware.cs)

- Only runs on endpoints decorated with `[NeedSession]` (`SessionMiddleware.cs:17-22`).
- Requires the raw session token in the `X-Session-Id` header; hashes it, validates
  against `sessions` for the current tenant, cached 2 minutes.
- Missing header → `400`; unknown/invalid → `404`; expired → `410 Gone`
  (and evicts the cache entry).
- Puts `SessionInfo` (session id, tenant id, table id) on `ISessionAccessor.Current`.

`[NeedSession]` endpoints in `tenantsController`: `info` (line 112), `Categories`
(163), `menu` (252), `Order` (302), `Order/{id}/Line` (437).

> ⚠️ The cache key must stay identical in both places: the controller writes
> `session:{tokenHash}` and the middleware reads the same key. Changing one without
> the other silently forces DB hits (or stale reads).

---

## 3. Authentication (users / admin)

[`Controllers/AuthController.cs`](../backend/NFC_Backend/NFC_Backend/Controllers/AuthController.cs),
route base `api/Auth`. Tokens are issued by
[`Services/TokenService.cs`](../backend/NFC_Backend/NFC_Backend/Services/TokenService.cs)
and stored in **httpOnly cookies** by `CookieService`.

| Endpoint | Flow |
| --- | --- |
| `POST register` | Create tenant + MinIO bucket + optional logo, hash password (BCrypt cost 12), create user, issue access + refresh cookies. Rate-limited. |
| `POST login` | Verify BCrypt password, rotate refresh token (stored hashed), issue cookies. Rate-limited. |
| `POST refresh` | Read refresh cookie → hash → look up user → check expiry → issue new access **and** rotate refresh token. |
| `POST logout` | Delete refresh token from DB, clear cookies. |
| `GET me` | `[Authorize]`; reads user id from the JWT `NameIdentifier` claim. |

Details:

- **Access token**: HS256 JWT, `Jwt:Secret`, claims `sub`/`email`/`jti`/`Role`, plus
  `TenantId` when the user belongs to a tenant. Lifetime
  `Jwt:AccessTokenExpiryMinutes` (**15**).
- **Refresh token**: 64 random bytes, Base64. Only its SHA-256 hash is stored on the
  user row with `RefreshTokenExpiryTime` (`Jwt:RefreshTokenExpiryDays`). Rotated on
  every login/refresh; comparison is constant-time
  (`TokenService.cs:100-109`).
- **Register** also creates the tenant's storage bucket
  (`StringTool.CreateBucketName(subdomain)`) and uploads the logo.
- Duplicate email → `400`; duplicate phone / subdomain → `400`/`409`
  (`SubDomaineExistExeption`).

> ⚠️ **Rate limiting** is enabled on register/login via
> `[EnableRateLimiting(RateLimitingTools.LoginRegisterRateLimit)]`; the refresh
> limiter is currently commented out (`AuthController.cs:251`). Review before
> production.

---

## 4. Menu browsing & translation

- `GET /api/tenant/menu` returns the tenant menu for a `?lang` query param
  (`tenantsController.cs:164`), scoped to the session's tenant.
- Translation is written by `CategoryTranslationService` /
  `ICategoryTranslationService`, which fan out to **Azure Translator** (keys in
  `AzureTranslator__*`) and **Gemini** (`Gemini__*`) as a fallback/AI layer.
- Translatable content lives in dedicated `*_translations` tables (categories, menu
  items, order statuses, payment statuses, payment methods), one row per language.
- Supported languages: `fr, ar, en, es, it, ja, zh, ko, de`
  (see [DATABASE.md §7](./DATABASE.md)).

---

## 5. Order lifecycle

**Creation (customer)** — `POST /api/tenant/Order` (`tenantsController.cs:303`),
`[NeedSession]`:

- Order is scoped to the session's tenant; table/session are attached.
- Line items snapshot name/price into `order_items` (so later menu edits don't alter
  history).
- `OrderNumber` is unique per tenant (`UQ_Order_Number_PerTenant`).
- Initial status `NEW`, initial payment status `NotPaid`.
- `NotifcationService.SendNotificationOnOrderCreated` pushes a `ReceiveNotification`
  event and `OrderLiveChangesService.SendNewOrderAsync` pushes the new order to the
  tenant's realtime group.

**Tracking (customer)** — `GET /api/tenant/Order/{id}/Line`
(`tenantsController.cs:438`), `[NeedSession]`: tenant **and** session scoped, so a
session can only read its own order (`tenantsController.cs:445-451`).

**Kitchen board (staff)** — [`OrdersController.cs`](../backend/NFC_Backend/NFC_Backend/Controllers/OrdersController.cs),
route `api/Orders`:

- `GET current-orders` (line 539) returns orders grouped into status columns.
- `PATCH {id}/move-to/{statusId}` (line 573) transitions an order; each change is
  recorded in `order_status_history` with the acting user.
- Status vocabulary is fixed by seed: `NEW → PREPARING → COMPLETED` / `CANCELLED`
  (`COMPLETED` and `CANCELLED` are `IsFinal`).
- `POST NewStatus` / `PUT Status/{id}` / `DELETE Status/{id}` manage (non-protected)
  statuses; `GET/PUT Status/{id}/Translations` manage their names.

**Payment & invoicing** — `PaymentStatuses` (`NotPaid`, `Paid`) and
`PaymentMethods` (Cash/Card/BankTransfer/Mobile, per-tenant via
`tenant_payment_methods`). `InvoicesController` exposes `[Route("api/[controller]")]`;
the `Pay` action is **commented out** (`InvoicesController.cs:51-53`), so paying is
not yet a live endpoint.

---

## 6. Realtime (SignalR)

- `NotificationHub` at `/hubs/notifications`
- `OrderLiveChangesHub` at `/hubs/order-live-changes`

Both mapped in `Program.cs:122-123`. Clients are grouped per tenant (see
`Hubs/HubsHelpers.cs`); services `NotifcationService` and `OrderLiveChangesService`
broadcast to the relevant group. The gateway proxies `/hubs/` with WebSocket
upgrade headers.

---

## 7. Currency & exchange rates

- `CurrencyMiddleware` reads a currency hint per request and stores it on
  `ICurrencyAccessor`; `LanguageMiddleware` does the same for `ILanguageAccessor`.
- `ExchangeRateJob` (Quartz, registered via `AddQuartzWithConfigurations`,
  `Extensions/QuartzExtentiosn.cs`) periodically pulls rates using
  `ExchangeRateService` + `ExchangeRateApi__ApiKey` and writes `ExchangeRates`.

---

## 8. File storage (MinIO)

- `MinioFileStorageService` (S3 API on `minio:9000`, browser console `:9001`).
- One bucket per tenant: `StringTool.CreateBucketName(subdomain)`, created during
  registration.
- Public file URL prefix is `Minio__FileAPI` (mapped to `${BASE_DOMAIN}/minio-api`).
- Logo upload occurs in `AuthController.Register`.

---

## 9. Email (verification)

- `VerificationEmailService` sends codes through `GmailSmtpAdapter` using
  `GmailSettings__*` (Gmail app password).
- `verification_codes` stores the code + status + expiry, with a filtered unique
  index ensuring only one pending code per user.
- 🐞 The email body template is intentionally the **old** `"Email Verified
  Successfully"` string (a prior "fix" was reverted at the user's request); review
  before changing.
