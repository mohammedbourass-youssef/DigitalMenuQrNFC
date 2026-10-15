# Smart Menu NFC — Digital Menu QR / NFC

A multi-tenant SaaS for restaurants. Each restaurant (tenant) gets a public
**digital menu** reachable by QR code or NFC tag, plus an **admin dashboard** to
manage categories, menu items, tables, orders, payments, NFC tags and
translations.

Menus are localized (9 languages), currency-aware, and support table-scoped
ordering. A customer taps an NFC tag or scans a QR code, lands on the menu with
their table pre-selected, builds a cart and places an order; staff follow it live
through SignalR.

---

## Table of contents

- [Architecture](#architecture)
- [Tech stack](#tech-stack)
- [Repository layout](#repository-layout)
- [Multi-tenancy & routing](#multi-tenancy--routing)
- [The two frontends](#the-two-frontends)
- [Backend](#backend)
- [Database](#database)
- [Environment variables](#environment-variables)
- [Running locally](#running-locally)
- [CI/CD deployment](#cicd-deployment)
- [Troubleshooting / known issues](#troubleshooting--known-issues)
- [Detailed documentation](#detailed-documentation)

---

## Detailed documentation

Deep-dive docs for maintainers and the next team live in [`docs/`](./docs):

- [`docs/DATABASE.md`](./docs/DATABASE.md) — full PostgreSQL schema, relationships, seeds and migrations.
- [`docs/WORKFLOWS.md`](./docs/WORKFLOWS.md) — tenant resolution, sessions, auth, order lifecycle, translations, realtime.
- [`docs/DEPLOYMENT.md`](./docs/DEPLOYMENT.md) — host layout, Compose, nginx gateway, env vars, CI/CD.
- [`docs/HANDOVER.md`](./docs/HANDOVER.md) — critical gotchas, security notes and TODOs.

---

## Architecture

Everything runs behind a single Nginx **gateway** that routes by host and path.

```
                        ┌──────────────────────────────┐
   Internet / LAN  ───▶ │  gateway (nginx:alpine)      │
                        │  :80  :443 (Cloudflare cert) │
                        └───────────────┬──────────────┘
            host-based routing          │            path-based routing
   ┌─────────────────────────┬──────────┴───────────┬───────────────────────┐
   ▼                         ▼                      ▼                       ▼
menu (customer SPA)   snack-x-menu-admin (SPA)   /api, /hubs → backend   /seq /pgadmin /minio
   *.BASE_DOMAIN          BASE_DOMAIN            nfc_backend :8080       tools UIs
                                                       │
                        ┌──────────────────────────────┼───────────────────────────┐
                        ▼                 ▼             ▼            ▼                 ▼
                    postgres           minio          seq      (external) Azure   Gemini / Gmail
                    :5432 (pg_data)    :9000/9001    :5341     Translator API     SMTP / FX API
```

Services are defined in `docker-compose.yaml`:

| Service | Image / build | Container | Purpose |
|---|---|---|---|
| `gateway` | `nginx:alpine` | `app_gateway` | reverse proxy, TLS termination, host routing |
| `backend` | `backend/NFC_Backend` | `nfc_backend` | ASP.NET Core 8 Web API + SignalR |
| `menu` | `Admin FrontEnd/Menu` | `menu_client` | customer-facing menu SPA |
| `snack-x-menu-admin` | `Admin FrontEnd/Snack-X-Menu-Admin` | `snack_x_menu_admin` | staff/owner admin SPA |
| `postgres` | `postgres:16-alpine` | `eByte_Software_postgres` | primary database |
| `minio` | `minio/minio` | `eByte_Software_minio` | S3-compatible object storage (images) |
| `pgadmin` | `dpage/pgadmin4` | `eByte_Software_pgadmin` | DB admin UI |
| `seq` | `datalust/seq` | `eByte_Software_seq` | structured log viewer |

Named volumes: `pg_data`, `pgadmin_data`, `minio_data`, `seq_data`. All services
share the `app_network` bridge network.

---

## Tech stack

**Backend**
- .NET 8 (`Microsoft.NET.Sdk.Web`), C#, nullable enabled
- ASP.NET Core Web API + SignalR
- Entity Framework Core 8 + Npgsql (PostgreSQL)
- JWT Bearer auth (`Microsoft.AspNetCore.Authentication.JwtBearer`)
- BCrypt.Net-Next for password hashing
- Minio SDK for object storage
- Quartz.NET hosted jobs (exchange-rate refresh)
- Serilog (Console + Seq sinks)
- Swashbuckle / Swagger (Development only)

**Frontends**
- React (Admin: React 19; Menu: React 18) + TypeScript + Vite
- Admin: React Router 7, TanStack Query, react-hook-form + Zod, Radix UI,
  Tailwind CSS 4, i18next/react-i18next, sonner, @microsoft/signalr, jspdf
- Menu: dependency-light (React + lucide-react), custom path router, Tailwind 3

**Infra**
- Docker Compose, Nginx gateway, GitHub Actions CI/CD

---

## Repository layout

```
.
├─ Admin FrontEnd/
│  ├─ Menu/                    # customer-facing menu SPA (Vite, React 18)
│  └─ Snack-X-Menu-Admin/      # admin dashboard SPA (Vite, React 19)
├─ backend/
│  └─ NFC_Backend/
│     ├─ NFC_Backend.sln
│     └─ NFC_Backend/          # the Web API project
│        ├─ Adapters/          # Azure Translator, Gemini translator, Gmail SMTP, DTO shapes
│        ├─ Controllers/       # API endpoints
│        ├─ Domain/            # entities + DTOs
│        ├─ Exceptions/
│        ├─ Extensions/        # DI, JWT, rate limiter, Quartz registration
│        ├─ Hubs/              # SignalR hubs
│        ├─ Infrastructure/    # Configs, Data (AppDbContext, seeds)
│        ├─ Jobs/              # Quartz jobs (ExchangeRateJob)
│        ├─ MidlleWares/       # Tenant, Session, Language, Currency middleware
│        ├─ Migrations/        # EF Core migrations
│        ├─ Repos/             # repository interfaces + implementations
│        ├─ Services/          # token, email, storage, notifications, translation, cookie
│        ├─ Dockerfile
│        └─ Program.cs
├─ db/                         # Postgres init scripts (mounted at /docker-entrypoint-initdb.d)
├─ nginx/conf.d/app.conf       # gateway config
├─ .github/workflows/deploy.yml
├─ docker-compose.yaml
├─ deploy.sh
├─ p.env / .env                # NOT committed (see Environment variables)
└─ README.md
```

---

## Multi-tenancy & routing

A tenant is a restaurant, identified by a **slug** (e.g. `snackme`). The gateway
selects the app by host, and the backend selects the tenant by header/subdomain.

**Host-based (Nginx `map $host $frontend_upstream`):**
- `BASE_DOMAIN` and `localhost` → **admin** app (`snack-x-menu-admin`)
- any other subdomain (`snackme.mohammedbourass.me`, `*.localhost`) → **menu** app

**Path-based (same gateway):**
- `/api/` → backend (`X-Tenant`, `X-Session-Id`, `X-Lang`, `X-Currency`,
  `Authorization` forwarded to `backend:8080`)
- `/hubs/` → backend SignalR (WebSocket upgrade, `proxy_read_timeout 100s`)
- `/seq/`, `/pgadmin/`, `/minio/`, `/minio-api/` → tool UIs

**Backend pipeline** (`Program.cs`):
- `/api/tenant/*` runs `TenantMiddleware` + `SessionMiddleware`
- then `LanguageMiddleware` (`X-Lang`) and `CurrencyMiddleware` (`X-Currency`)
- SignalR hubs: `/hubs/notifications`, `/hubs/order-live-changes`

**Customer menu deep-links** (how a tag routes a customer):
- `/{number}` → seat the customer at the table with that number (e.g. `/3`)
- `/t/{token}` → seat the customer at the table for that NFC/QR token
  (validated server-side via `GET .../Tables/token/{token}`)

The menu app resolves the tenant from the hostname at runtime
(`resolveTenant()`), falling back to `?tenant=` / `VITE_DEV_TENANT` in dev only.

---

## The two frontends

### Customer menu (`Admin FrontEnd/Menu`)
Single-page, mobile-first, two screens (`/`, `/order`, `/ticket`) with a tiny
custom path router (no react-router). Features:
- NFC/QR entry: pre-selects table by number or token, stored per tenant in
  session storage
- Category tabs, menu item grid, item detail sheet, cart, order submission
- Live order tracking (stepper, status banner) via polling + SignalR
- Language switcher (9 languages) and currency switcher
- Splash / invalid-table / restaurant-not-found screens

Dev server on port `80` (`VITE_BASE_DOMAIN` + `VITE_DEV_TENANT`, e.g.
`http://snackme.localhost/1`).

### Admin dashboard (`Admin FrontEnd/Snack-X-Menu-Admin`)
Authenticated SPA with sidebar + top bar. Routes (`src/App.tsx`):

| Route | Page |
|---|---|
| `/login`, `/register`, `/confirm-email` | auth (public) |
| `/` | Dashboard |
| `/menu-items`, `/menu-items/new`, `/menu-items/:menuId/{images,translations,edit}` | Menu items & translations |
| `/categories`, `/categories/:categoryId` | Categories |
| `/tables` | Tables (incl. NFC/QR) |
| `/orders`, `/orders/status-settings`, `/orders/history` | Orders |
| `/nfc-tags` | NFC tags |
| `/payments/invoices`, `/payments/...` | Payments & invoices |
| `/payments/methods` | Owner-only (`ProtectedRoute roles={['TenantOwner']}`) |
| `/settings` | Settings |

Auth state lives in `AuthContext`; protected routes wrap the layout. i18n uses
`src/i18n/locales/*.json` (en, ar, fr, de, es, it, ja, ko, zh).

---

## Backend

**Controllers** (`Controllers/`): `AuthController`, `UsersController`,
`tenantsController`, `RestaurantsController`, `CateogriesController`,
`MenuItemsController`, `TablesController`, `OrdersController`,
`PaymentMethodsController`, `AdminPaymentStatusesController`,
`InvoicesController`.

**Authentication:** JWT Bearer. Access + refresh tokens (`TokenService`), BCrypt
password hashing, email verification codes (`VerificationEmailService`). Role
gating via `[Authorize(Roles = ...)]` (e.g. `TenantOwner`).

**Services:** token, cookie, verification email, MinIO file storage,
notifications, order live-changes, category translation (`I`/`CategoryTranslationService`),
exchange rate.

**Integrations (`Adapters/`):**
- Azure Translator (`AzureTranslator__*`) — menu/category translation
- Google Gemini (`Gemini__*`) — AI transliteration/translation
- Gmail SMTP (`GmailSettings__*`) — transactional email
- Exchange Rate API (`ExchangeRateApi__ApiKey`) — currency rates

**Background jobs:** Quartz `ExchangeRateJob`.

**Logging:** Serilog → stdout and Seq (`Serilog__WriteTo__1__Args__serverUrl`,
default `http://seq:5341`).

**Migrations:** EF Core. Applied by `deploy.sh` via
`dotnet NFC_Backend.dll --migrate-only`, handled in `Program.cs` (lines 90-96).
Migration history lives in `__EFMigrationsHistory`.

---

## Database

- PostgreSQL 16, initialized as UTF-8 (`--encoding=UTF8 --lc-collate=C --lc-ctype=C`).
- Schema is owned by EF Core migrations (`backend/.../Migrations`).
- `db/init` is mounted into the container for any first-run SQL bootstrap.
- Admin UI: pgAdmin at `/pgadmin/` (also published on `:5050`).

Key domain areas from the migration history: Tenants, Users (+revocation,
verification codes), Categories & translations, MenuItems, Sessions/Tables,
Orders, Notifications, PaymentMethods / PaymentStatuses (system + tenant,
seeded for 9 languages), Invoices.

---

## Environment variables

`p.env` (production) and `.env` (dev) are **git-ignored and never synced by CI** —
you create them yourself. Compose auto-loads `.env` from the project directory.

| Variable | Used for |
|---|---|
| `BASE_DOMAIN`, `VITE_BASE_DOMAIN` | root domain for tenant subdomain resolution |
| `BACKEND_URL`, `VITE_API_URL`, `DEFAULT_PORT` | API URL / public base URL |
| `VITE_DEV_TENANT`, `VITE_USE_MOCK`, `VITE_MOCK_ORDER_LINE` | menu dev/mock flags |
| `ASPNETCORE_ENVIRONMENT` | `Production` / `Development` |
| `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_PORT` | Postgres container |
| `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `DB_PORT` | connection string used by the API |
| `PGADMIN_EMAIL`, `PGADMIN_PASSWORD` | pgAdmin login |
| `MINIO_ROOT_USER`, `MINIO_ROOT_PASSWORD`, `MINIO_ACCESS_KEY`, `MINIO_SECRET_KEY`, `MINIO_BUCKET_NAME`, `MINIO_USE_SSL` | object storage |
| `JWT_SECRET`, `JWT_ISSUER`, `JWT_AUDIENCE`, `JWT_ACCESS_TOKEN_EXPIRY_MINUTES`, `JWT_REFRESH_TOKEN_EXPIRY_DAYS` | auth |
| `GMAIL_APP_PASSWORD`, `GMAIL_SENDER_EMAIL`, `GMAIL_SENDERNAME`, `GMAIL_HOST`, `GMAIL_PORT` | SMTP email |
| `AZURE_TRANSLATOR_API_KEY`, `AZURE_TRANSLATOR_REGION`, `AZURE_TRANSLATOR_ENDPOINT` | translation |
| `GEMINI_API_KEY`, `GEMINI_MODEL` | AI translation |
| `EXCHANGE_RATE_API_KEY` | currency rates |
| `FREE_TRIAL_DAYS`, `SESSION_EXPIRATION_HOURS` | business rules |
| `SEQ_SERVER_URL` (optional) | Seq ingestion URL (default `http://seq:5341`) |

> Never commit `p.env` / `.env`. Production values are managed on the server.

---

## Running locally

**Prerequisites:** Docker + Docker Compose v2 (`docker compose`).

```bash
# 1. create the env file (copy and fill in)
cp p.env .env          # or create .env with the variables above

# 2. build and start everything
docker compose up -d --build

# 3. apply EF Core migrations
docker compose run --rm backend dotnet NFC_Backend.dll --migrate-only

# 4. restart backend so it picks up the migrated schema
docker compose restart backend
```

Endpoints once up:
- Admin SPA — `http://localhost/`
- Customer menu — `http://<tenant>.localhost/` (e.g. `http://snackme.localhost/3`)
- API — `http://localhost/api/`
- Swagger — `http://localhost:7194/swagger` (Development)
- Seq — `http://localhost/seq/`  •  pgAdmin — `http://localhost/pgadmin/`  •  MinIO — `http://localhost/minio/`

### Frontend dev (Vite, outside Docker)

```bash
# admin
cd "Admin FrontEnd/Snack-X-Menu-Admin" && npm ci && npm run dev   # :5173
# customer menu (serves on :80)
cd "Admin FrontEnd/Menu" && npm ci && npm run dev
```

Menu scripts: `dev`, `build`, `lint`, `typecheck` (`tsc --noEmit -p tsconfig.app.json`), `test`.
Admin scripts: `dev`, `build`, `preview`, `test`.

---

## CI/CD deployment

`.github/workflows/deploy.yml` runs on **push to `main`** (and manual
`workflow_dispatch`). It:

1. validates the deploy configuration,
2. installs `rsync`, sets up an SSH key,
3. `rsync`s the repo into `~/DigitalMenuQrNFC` on the server (excluding `.git`,
   `node_modules`, `p.env`, `.env`, `*.env`, `minio_data.tar.gz`),
4. runs `bash deploy.sh` on the server.

`deploy.sh`:
- prefers **Compose v2** (`docker compose`), falls back to v1 (`docker-compose`);
- uses the existing `.env` (or copies `ENV_FILE`, default `.env`);
- `build` → `run --rm backend ... --migrate-only` → `up -d` → `restart backend`;
- for legacy v1 it runs `down` first to avoid the `ContainerConfig` crash.

### Required GitHub configuration
Add under **Settings → Secrets and variables → Actions** (Secrets or Variables):

| Name | Notes |
|---|---|
| `SSH_HOST` | server host/IP |
| `SSH_USER` | SSH user (e.g. `root`) |
| `SSH_PORT` | SSH port (defaults to `22`) |
| `SSH_PRIVATE_KEY` | **secret** — private key allowed to deploy |

The production `.env` must exist in `~/DigitalMenuQrNFC/` on the server (it is not
uploaded by CI). TLS certs are mounted from `/etc/ssl/cloudflare/origin.{pem,key}`.

---

## Troubleshooting / known issues

- **`KeyError: 'ContainerConfig'` on `up`** — legacy `docker-compose` 1.29.2 is
  incompatible with Docker Engine 25+. Install Compose v2
  (`sudo apt-get install -y docker-compose-plugin`) or let `deploy.sh` run
  `down` first.
- **Admin "Something went wrong" on an empty list** — a `204 No Content`
  response is returned for empty paginated lists; the frontend now guards
  `meta`/`data` and the Categories endpoint returns a `200` with
  `{ meta, data: [] }` instead of `204`.
- **`/{number}` deep-link not selecting the table** — the menu's minimal router
  normalizes unknown paths to `/`; the tag path is captured at module load
  before that rewrite (`useAutoSelectTableFromUrl`).
- **Garbled French/Arabic text** — the locale JSON files were double-encoded
  (Windows-1252 → UTF-8) and have been repaired to clean UTF-8. Container Nginx
  configs also send `charset utf-8`.
- **Email `FormatException`** — `GMAIL_SENDER_EMAIL` must be a real address (not
  a placeholder), or `MailAddress` parsing throws at send time.
