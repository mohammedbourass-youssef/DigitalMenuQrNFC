# Database

PostgreSQL 16, accessed through **EF Core (Npgsql)**. There is a single shared
database for every tenant — the platform is **multi-tenant with row-level scoping**
on `TenantId`, not separate databases or schemas.

- ORM: EF Core 8, `Npgsql.EntityFrameworkCore.PostgreSQL`
- Context: [`backend/NFC_Backend/NFC_Backend/Infrastructure/Data/AppDbContext.cs`](../backend/NFC_Backend/NFC_Backend/Infrastructure/Data/AppDbContext.cs)
- Entities: `backend/NFC_Backend/NFC_Backend/Domain/Entities/`
- Migrations: `backend/NFC_Backend/NFC_Backend/Migrations/`

---

## 1. Connection & provisioning

Defined in [`docker-compose.yaml:2-22`](../docker-compose.yaml) and consumed by the
backend via `ConnectionStrings__SmartMenuDb`
([`docker-compose.yaml:98`](../docker-compose.yaml)):

```
Host=postgres;Port=${DB_PORT};Database=${DB_NAME};Username=${DB_USER};Password=${DB_PASSWORD}
```

The Postgres container is created with **UTF-8** and C collation:

```yaml
POSTGRES_INITDB_ARGS: "--encoding=UTF8 --lc-collate=C --lc-ctype=C"
```

> ⚠️ The `C` collation is significant: default text ordering is **byte order**, not
> locale-aware. Arabic/French names will sort by code point. Change deliberately if
> you need linguistic sort.

Optional bootstrap SQL lives in `./db/init` (mounted read-only into
`/docker-entrypoint-initdb.d`). It only runs on **first** container start with an
empty data volume.

---

## 2. Table inventory & naming caveat

Most tables are explicitly named via `ToTable("...")` in **snake_case**, but several
entities were left with EF's defaults, which produces **PascalCase, quoted**
identifiers. PostgreSQL folds unquoted identifiers to lower case, so these two
conventions are *not* interchangeable in raw SQL.

| Entity | Physical table |
| --- | --- |
| User | `users` |
| Tenant | `tenants` |
| Currency | `Currencies` ⚠️ default (not snake_case) |
| ExchangeRate | `ExchangeRates` ⚠️ |
| VerificationCode | `verification_codes` |
| Category | `categories` |
| CategoryTranslation | `category_translations` |
| MenuItem | `MenuItems` ⚠️ |
| MenuItemTranslation | `MenuItemTranslations` ⚠️ |
| MenuImage | `MenuImages` ⚠️ |
| Session | `sessions` |
| Table | `tables` |
| Order | `orders` |
| OrderItem | `order_items` |
| OrderStatus | `order_statuses` |
| OrderStatusTranslation | `order_status_translations` |
| OrderStatusHistory | `order_status_history` |
| PaymentStatus | `payment_statuses` |
| PaymentStatusTranslation | `payment_status_translations` |
| PaymentMethod | `payment_methods` |
| PaymentMethodTranslation | `payment_method_translations` |
| TenantPaymentMethod | `tenant_payment_methods` |
| Invoice | `invoices` |
| Notification | `Notifications` ⚠️ |
| Feature | `features` |
| Role | `roles` |
| PlanFeature | `plan_features` (composite PK PlanId + FeatureId) |
| RolePermission | `role_permissions` (composite PK RoleId + FeatureId) |
| TenantUserRole | `user_roles` (composite PK UserId + RoleId) |

> ⚠️ When writing raw SQL, quote PascalCase tables/columns: `SELECT * FROM "MenuItems"`.

---

## 3. Tenancy model

- `tenants` is the root. Every business-owned row carries `TenantId`.
- Enforced in code (`TenantMiddleware` + repository queries), **not** by Postgres
  Row-Level Security. There is no DB-level guarantee that a query is tenant-scoped —
  a missing `.Where(x => x.TenantId == ...)` leaks data. Review tenant filters on any
  new query.
- Cascade rules are chosen per relationship:
  - `Cascade` — tenant → users/categories/tables/sessions/orders, order → order_items,
    category → translations, ...
  - `Restrict` — money/audit references (orders → status/payment status/currency,
    invoices → order/user/method). These block deletion on purpose.
  - `SetNull` — references that must survive (`order_items.MenuItemId`,
    `orders.TableId`, `orders.SessionId`, `sessions.TableId`). **Order and invoice
    history is preserved even if the dish/table/session is removed.**

---

## 4. Tables in detail

### Tenancy & identity

**`tenants`** — `Tenant.cs`
Unique `Subdomain`; `Status` stored as string (max 20); `CurrencyCode` `char(3)`,
default `'MAD'`, FK → `Currencies` (Restrict). `RestaurantName`, contact/address,
branding (`PrimaryColor`, logo), storage `BucketName` set during registration.

**`users`** — `User.cs`
Unique index on `Email`; indexes on `TenantId` and `RefreshToken`. `Role` stored as
string (max 20). Nullable `TenantId` (a `SuperAdmin` may have none) FK → `tenants`
(Cascade). Auth columns: `PasswordHash` (BCrypt), `RefreshToken` (SHA-256 hash),
`RefreshTokenExpiryTime`, `IsRevoked`.

**`verification_codes`** — `VerificationCode.cs`
`Code`, status string, `ExpiredAt`, `CreatedAt` default `NOW()`. A **filtered unique
index** `UQ_ActivePendingCode` on `(UserId, VerificationsStatus)` where status =
`'Pending'` guarantees at most one active code per user.

### Catalog

**`categories`** — `Category.cs`
`TenantId` (Cascade), `Color` (max 20), `DisplayOrder` (default 0), `IsActive`
(default true), `CreatedAt` default `NOW()`.

**`category_translations`** — `CategoryTranslation.cs`
`Lang` (max 5) + `Name` (max 150); unique `(CategoryId, Lang)`; cascade.

**`MenuItems`** — `MenuItem.cs`
`PriceInDefaultCurrency` / `DiscountedPrice` `decimal(18,2)`; `DefaultCurrencyCode`
`char(3)`; `CategoryId` and `TenantId` both **Restrict**; index `(TenantId, CategoryId)`.

**`MenuItemTranslations`** — `MenuItemTranslation.cs`
`Name` + description per `Lang`; unique `(MenuId, Lang)`; cascade.

**`MenuImages`** — `MenuImage.cs`
`Url` required; cascade from `MenuId`.

### Customer sessions & tables

**`sessions`** — `Session.cs`
`TokenHash` (SHA-256 of the raw `X-Session-Id`, unique), `CreatedAt` default `NOW()`,
`ExpiresAt`; indexes on `TokenHash`, `ExpiresAt`, `TenantId`, `TableId`.
`TenantId` Cascade, `TableId` **SetNull**.

**`tables`** — `Table.cs`
`Number`, `Name` (max 100), `IsAvailable` (default true); unique
`(TenantId, Number)` (`UQ_Table_Number_PerTenant`).

### Orders

**`orders`** — `Order.cs`
`CurrencyCode` `char(3)`; `Subtotal`/`Total`/`PaidAmount` `decimal(18,2)`;
`Notes` (max 500); `CreatedAt` default `NOW()`.
Indexes: `TenantId`; `(TenantId, StatusId)` for the kitchen board;
`(TenantId, PaymentStatusId)` for unpaid filtering; `(TenantId, CreatedAt)` for
history/reports; `TableId`; `SessionId`; and unique `(TenantId, OrderNumber)`
(`UQ_Order_Number_PerTenant`).
FKs: `Tenant` Cascade, `Table`/`Session` SetNull, `Status`/`PaymentStatus`/`Currency`
Restrict.

**`order_items`** — `OrderItem.cs`
Denormalised snapshot: `NameSnapshot` (max 200), `UnitPrice`, `LineTotal`, `Notes`.
`OrderId` Cascade, `MenuItemId` **SetNull** (history survives dish deletion).

**`order_status_history`** — `OrderStatusHistory.cs`
`ChangedAt` default `NOW()`; `OrderId` Cascade, `StatusId` Restrict,
`ChangedByUserId` SetNull. Audit trail of every status transition.

### Lookup tables (seeded)

**`order_statuses`** — seed 4 rows (`AppDbContext.cs:357-362`):

| Id | Code | Color | Final? |
| --- | --- | --- | --- |
| 1 | `NEW` | `#3B82F6` | no |
| 2 | `PREPARING` | `#F59E0B` | no |
| 3 | `COMPLETED` | `#10B981` | yes |
| 4 | `CANCELLED` | `#EF4444` | yes |

Constants in `OrderStatusCodes.cs`. `order_status_translations` is seeded with
**4 statuses × 9 languages = 36 rows** (`AppDbContextHelpers.BuildOrderStatusSeed()`).

**`payment_statuses`** — seed 2 rows (`AppDbContext.cs:399-402`): `NotPaid`
(`IsSystem = true`) and `Paid`. Constants in `PaymentStatusCodes.cs`
(`Paid`/`NotPaid` are "protected" and cannot be removed). Translations seeded 2 × 9.

**`payment_methods`** — seed 4 rows (`AppDbContext.cs:553-558`): `Cash`, `Card`,
`BankTransfer`, `Mobile`, each with color + icon. Translations seeded via
`BuildPaymentMethodSeed()`.

**`tenant_payment_methods`** — per-tenant enablement of a method:
`DisplayName`, `IsEnabled`, `IsDefault`, `DisplayOrder`. Unique
`(TenantId, PaymentMethodId)`; a **filtered unique index** guarantees **one default
per tenant** (`UQ_TenantPaymentMethod_Default`).

### Audit / other

**`Notifications`** — `Notification.cs`
`Title` (max 200), `Message` (max 1000), `Type` stored as string, index on
`CreatedAt`.

**`invoices`** — `Invoice.cs`
Check constraint `CK_Invoice_Amounts` (`OrderTotal >= 0 AND PaidAmount >= 0`);
`OrderTotal`, `PaidAmount`, `Notes`; `CreatedAtUtc` default `NOW()`. FKs to
Order/User/TenantPaymentMethod are all **Restrict** — invoices are financial records
and must never be cascade-deleted.

### Currency

**`Currencies`** — PK is the 3-char `Code`. Seeded 7 rows (`AppDbContext.cs:107-115`):
`MAD`, `USD`, `EUR`, `JPY`, `KRW`, `CNY`, `GBP` (JPY/KRW have 0 decimal places).

**`ExchangeRates`** — unique `(BaseCurrency, TargetCurrency, RateDate)`
(`UQ_Rate`); `Rate decimal(18,6)`; `CreatedAt` default `NOW()`; both FKs Restrict.
Populated by the Quartz `ExchangeRateJob`.

---

## 5. Access control (RBAC)

**`features`** — `Feature.cs`
Platform feature registry. `Id` Guid PK; `Code` (max 50, unique) and `Name` (max 100);
`Status` stored as string (max 20). Seeded 23 platform features (`AppDbContext.cs`).
Frontend must keep `FeatureCodes` (`backend/NFC_Backend/NFC_Backend/Domain/Constants/FeatureIds.cs`)
in sync with this table — the feature-catalog check (`npm run check:features`) enforces it.

**`roles`** — `Role.cs`
`Id` Guid PK; optional `TenantId` (Cascade → `tenants`; null = platform/system role);
`Name` (max 100); `Description`; `IsSystem` (default false, protected roles cannot be
edited/deleted by tenants); `CreatedAt` default `NOW()`. Filtered unique indexes:
one role name per tenant (`UQ_Role_Name_PerTenant`) and one platform-wide name
(`UQ_Role_Name_Platform`).

**`role_permissions`** — `RolePermission.cs`
Composite PK (`RoleId`, `FeatureId`). Boolean flags `CanRead`, `CanAdd`, `CanEdit`,
`CanDelete` (default false). `RoleId` Cascade → `roles`; `FeatureId` Restrict →
`features`. The matrix UI sends these four flags per feature; a row is only persisted
when at least one flag is true.

**`plan_features`** — `PlanFeature.cs`
Composite PK (`PlanId`, `FeatureId`). Links a `plan` to the `features` it includes.
Cascade from both sides. Seeded during registration (plan → all platform features).

**`TenantUserRole`** — `user_roles`
Composite PK (`UserId`, `RoleId`). Assigns a role to a user within a tenant. `UserId`
Cascade → `users`; `RoleId` Cascade → `roles`. A user's effective permissions are the
union of all rows for `(UserId, tenant's roles)`. Used by the Users list and role
editor.

**Seed data** — `AppDbContext.cs`
Platform role `TenantAdmin` (`RoleIds.TenantAdmin`, `IsSystem = true`) is seeded with
all permissions for all plan features, so new tenants get a ready-made admin role.
Custom roles are created per-tenant via `POST api/Roles/Create`.

## 6. Money & currency

- All monetary columns are `decimal(18,2)`; exchange rates `decimal(18,6)`.
- Prices are stored in the tenant's default currency (`DefaultCurrencyCode`), with
  `Subtotal`/`Total` snapshotted onto the order at creation time.
- Currency resolution per request is handled by `CurrencyMiddleware` +
  `ICurrencyAccessor`; rate lookups by `ExchangeRateService`.

---

## 7. Migrations

26 migrations to date (earliest `20260911103721_AddTenantTable`, latest
`20261031201900_Check`). Wrapped in an out-of-process SQL
Server-style pattern — **they target PostgreSQL**, so `NOW()`/filtered indexes are
used throughout (the `GETDATE()` comment at `AppDbContext.cs:137` is a red herring
left over from a template).

| Migration | Summary |
|---|---|
| `20260911103721_AddTenantTable` | Base `tenants` + `users` |
| `20260911142901_modifyTent` | `tenants.BucketName` |
| `20260911224926_AddIsRevokedToUsers` | `users.IsRevoked`, `RefreshTokenRevockedAt` |
| `20260912221320_AddCurrencyToTenant` | `Currencies`, `ExchangeRates`, `tenants.CurrencyCode` |
| `20260914133439_AddVerificationCodes` | `verification_codes` |
| `20260914224732_AddCategoriesAndTranslations` | `categories`, `category_translations` |
| `20260918134405_AddMenuItems` | `MenuItems`, `MenuImages`, `MenuItemTranslations` |
| `20260922001836_AddSessionTable` | `sessions` |
| `20260926184554_CreateTablesTable` | `tables` (+ `sessions.TableId`) |
| `20260929114828_AddOrders` | `orders`, `order_items`, statuses/payments (+ translations/history) |
| `20260929155847_AddTenantToTranslation` | `order_statuses.TenantId` |
| `20261003231132_AddNotifications` | `Notifications` |
| `20261005174136_AddPaymentMethods` | payment methods + translations + tenant mapping |
| `20261005183119_AddInvoices` | `invoices` + `CK_Invoice_Amounts` |
| `20261007141844_ChangestheDefaults` | payment-status code rename |
| `20261007142238_ChangestheDefaultsIsSystem` | `payment_statuses.IsSystem` |
| `20261015192630_AddCurrencyToInvoice` | `invoices.CurrencyCode` |
| `20261021160742_AddPlans` | `plans`, tenant `PlanId`/`BillingCycle`, `CK_Plan_Prices` |
| `20261028173502_AddAccessControl` | `features`, `roles`, `plan_features`, `role_permissions`, `user_roles` |
| `20261030194715_AddPermissionIndexes` | seed TenantAdmin role + role_permissions |
| `20261031170032_RolesConstraints` | `plans.MaxRoles` + Roles feature/permission |
| `20261031181003_RolesConstraintsDesc` | (empty / description only) |
| `20261031201900_Check` | additional constraints |

Common commands (run from `backend/NFC_Backend/NFC_Backend`):

```powershell
dotnet ef migrations add <Name>
dotnet ef database update
dotnet ef migrations list
```

Runtime migration: the backend supports a one-shot mode used by CI/compose:

```powershell
dotnet NFC_Backend.dll --migrate-only
```

There is a **commented-out `migrator` service** in compose
(`docker-compose.yaml:132-144`) intended to run migrations as a separate step before
the backend starts. It is disabled because the backend currently applies migrations
on startup.

> ⚠️ Because the backend migrates on startup, concurrent backend replicas could race.
> Keep a single backend instance, or re-enable the `migrator` service and gate the
> backend on it.

---

## 8. Adding translations

Supported languages are centralised in
`Domain/Constants/TranslationLanguages.cs`:

```csharp
["fr", "ar", "en", "es", "it", "ja", "zh", "ko", "de"]
```

> ⚠️ Adding a language requires updating **three** things: this C# array, the per-table
> seed builders (`AppDbContextHelpers`), and the locale JSON files in the admin
> frontend (`Admin FrontEnd/Snack-X-Menu-Admin/src/i18n/locales/`). The seed builders
> assume 9 languages — a 10th requires a new migration.

---

## 9. Known schema gotchas (summary)

1. Mixed `snake_case` / `PascalCase` table naming — see §2. **Quote in raw SQL.**
2. No Postgres RLS — tenant isolation is code-only.
3. `C` collation → byte-ordered text sorting.
4. Backend migrates on startup → avoid multiple replicas.
5. `CateogriesController` (note the typo) is the *admin* categories controller; the
   spelling is baked into the class/route, do not "fix" it without checking the
   frontend service paths.
6. Seed data is inserted declaratively via `HasData`; changing a seeded row's values
   requires a new migration (EF won't update it otherwise).
