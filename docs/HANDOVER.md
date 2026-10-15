# Handover — read this first

Critical context for whoever picks this up next. Pair it with
[DATABASE.md](./DATABASE.md), [WORKFLOWS.md](./WORKFLOWS.md) and
[DEPLOYMENT.md](./DEPLOYMENT.md).

---

## 0. TL;DR

- One shared Postgres database, multi-tenant by `TenantId` (no RLS).
- .NET 8 backend + two Vite/React SPAs + nginx gateway, all in one Compose stack.
- Deploy via GitHub Actions → rsync → `deploy.sh` on `~/DigitalMenuQrNFC`.
- Real secrets live **only** in the host `.env` (never committed).
- Be careful with text encoding, table naming, and the customer `/3` deep-link.

---

## 1. Environment & repo facts

- Repo root: `C:\Users\USER\Desktop\Smart Menu NFC`.
- Dev host is **Windows / PowerShell 5.1**. `ripgrep` is not installed — use the
  editor search tools. Docker is not run locally in the normal dev loop.
- Remote: `github.com/mohammedbourass-youssef/DigitalMenuQrNFC`, branch `main`.
- Live server deploy dir is `~/DigitalMenuQrNFC` (contains the real `.env`). The old
  `~/smart-menu-nfc` is dead — do not deploy there.
- Server runs **Docker Compose v2** (`docker compose`). The old v1 binary crashes on
  v2-created containers (`KeyError: 'ContainerConfig'`); `deploy.sh` works around it.

---

## 2. Critical gotchas

### 2.1 Text encoding / mojibake ⚠️
The admin locale files had been double/triple-encoded (UTF-8 bytes read as
Windows-1252) and committed that way, producing `Ã©`-style garbage. **nginx `charset`
cannot fix corrupted bytes** — the files had to be rewritten as clean UTF-8. The nine
locale files under `Admin FrontEnd/Snack-X-Menu-Admin/src/i18n/locales/` are now
correct. When editing them:
- Keep files **UTF-8 without BOM**.
- A repair script (idempotent) is kept at
  `C:\Users\USER\AppData\Local\Temp\opencode\fix_i18n.py` — it may be gone; if so the
  logic is "reverse cp1252→UTF-8 best effort". Verify by grepping for `Ã`/`Â`.

### 2.2 The `CateogriesController` typo ⚠️
`Controllers/CateogriesController.cs` is mis-spelled ("Cateogries") in the class and
possibly the route. The admin frontend service paths may depend on it. **Do not rename
without updating the frontend in the same change.**

### 2.3 Mixed table naming ⚠️
Some tables are `snake_case` (via `ToTable`), others default to `PascalCase`
(`Currencies`, `MenuItems`, `Notifications`, ...). Quote identifiers in raw SQL. Full
list in [DATABASE.md §2](./DATABASE.md).

### 2.4 Tenant claim name mismatch 🐞
`TokenService` emits a claim named `TenantId`; `TenantMiddleware` looks up
`tenant_id`. JWT claim lookup is case-sensitive, so the cross-tenant guard on
`/api/tenant/*` may never trigger for JWT callers. Latent today (those routes use
sessions) — **verify and align** if you start JWT-authenticating those routes.
See [WORKFLOWS.md §1](./WORKFLOWS.md).

### 2.5 Customer `/{number}` deep-link ⚠️
The customer Menu app has a minimal router
(`Admin FrontEnd/Menu/src/lib/router.ts`) that only knows `/`, `/order`, `/ticket`
and **rewrites any other path to `/` on mount**. A URL like `.../3` (table 3) is
destroyed by that rewrite before a component effect can read it. The fix is in
`Admin FrontEnd/Menu/src/hooks/useAutoSelectTableFromUrl.ts`: it captures
`window.location.pathname` **at module load** (before React mounts) and parses the
table number from that. If you touch routing, preserve this capture order.

Related behaviour: a **non-existent** table number currently **falls back to the
first available table** (it does not show `InvalidTableScreen`). Decide whether that
is desired.

### 2.6 Session cache-key coupling ⚠️
`tenantsController` writes `IMemoryCache` key `session:{tokenHash}` and
`SessionMiddleware` reads the same key. Change one, change both. Same story for
`tenant:{slug}` between `TenantMiddleware`.

### 2.7 Backend migrates on startup
`Program.cs` applies EF migrations at boot. Keep a single backend replica, or
re-enable the commented `migrator` Compose service and gate the backend on it.

### 2.8 `VITE_*` are baked at build time
Frontend config is compiled into the bundle. Changing `VITE_API_URL` etc. requires
rebuilding the image, not just restarting.

---

## 3. Security items to review

- **Seq runs with `SEQ_FIRSTRUN_NOAUTHENTICATION: "true"`** — no login. It is routed
  through the gateway under `/seq`. Put it behind auth or keep it off the public edge.
- **MinIO** console (`:9001`) and S3 API (`:9000`) are published on the host. Confirm
  firewall/Cloudflare rules; the app only needs internal `minio:9000`.
- **pgAdmin** is exposed under `/pgadmin` — ensure it is not publicly reachable.
- **Secrets**: JWT secret, DB/MinIO/Gmail/Azure/Gemini/ExchangeRate keys live only in
  the host `.env`. Never commit `.env`/`p.env` (they are gitignored and rsync-excluded).
- **Rate limiting**: only register/login are limited; refresh's limiter is commented
  out (`AuthController.cs:251`).
- **TLS** is a Cloudflare **origin** certificate at `/etc/ssl/cloudflare/origin.pem`.
  Cloudflare must be in front; the origin cert is not publicly trusted.
- **CORS** is origin-allow-listed to `localhost`, `*.localhost`, `BASE_DOMAIN` and its
  subdomains (`Program.cs:46-82`). New domains must sit under the base domain.
- **Passwords** BCrypt cost 12; **refresh/session tokens** stored only as SHA-256
  hashes. Good — keep it that way.

---

## 4. Known gaps / TODO

- `InvoicesController` `Pay` action is commented out — no live payment endpoint.
- Email verification template still uses the legacy `"Email Verified
  Successfully"` copy (a prior change was reverted on purpose). Revisit.
- `payment_statuses` only seeds `NotPaid`/`Paid`; `PaymentStatusCodes` mentions
  Partial/Refunded — verify whether more statuses are planned.
- `Notifications` entity is global (no `TenantId` column) — confirm cross-tenant
  exposure is acceptable or scope it.
- Decide invalid-table-number behaviour (fallback vs error screen) — see §2.5.
- Multi-replica backend is unsafe until the migrator is split out — see §2.7.

---

## 5. How-tos

**Add a migration** (from `backend/NFC_Backend/NFC_Backend`):
```powershell
dotnet ef migrations add <Name>
dotnet ef database update       # or: dotnet NFC_Backend.dll --migrate-only
```
Changing a **seeded** row (via `HasData`) requires a new migration — EF won't update
it in place.

**Add an API endpoint**: add a controller under `Controllers/` (route base
`api/...`). If it's customer-facing under `/api/tenant/*` and needs a session,
decorate with `[NeedSession]`; the tenant is already resolved by middleware. Scope
every query by `TenantId`.

**Add a supported language**: update `Domain/Constants/TranslationLanguages.cs`, the
seed builders in `AppDbContextHelpers`, and the admin locale JSONs — then add a
migration. See [DATABASE.md §7](./DATABASE.md).

**Add an admin page**: create the page under
`Admin FrontEnd/Snack-X-Menu-Admin/src/pages/`, wire it into the router, add a service
call under `src/services/`, and add i18n keys to all nine locale files.

**Deploy**: push to `main` (or run the workflow manually). It rsyncs to
`~/DigitalMenuQrNFC` and runs `deploy.sh`. Never delete the host `.env`.

---

## 6. Conventions

- Backend: repository pattern (`Repos/Interfaces` + `Repos/Implementations`), DTOs in
  `Domain/DTOS`, custom exceptions in `Exceptions/`, structured logging via Serilog
  with `ILogger<T>` (include `TenantId`/`UserId` in messages).
- C#: file-scoped namespaces, nullable enabled, `async` all the way through, DTOs are
  `record`s where possible.
- Frontend: TypeScript, React function components + hooks, services isolate HTTP,
  i18n via react-i18next. Locale files must stay valid UTF-8.
- Comments: **do not add new comments** unless they explain non-obvious behaviour
  (the existing code is fairly comment-light; match it).
- Git: short, imperative commit messages. Do not commit `.env`/`p.env` or secrets.
