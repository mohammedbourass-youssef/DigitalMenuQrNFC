# Menu — Customer-facing digital menu

Customer-facing menu app for a multi-tenant NFC restaurant SaaS. Built with React, Vite, TypeScript, and Tailwind CSS.

The tenant is resolved **at runtime from the hostname**: `pizza.yourdomain.com` loads the `pizza` restaurant, `cafe.yourdomain.com` loads `cafe`, and so on. NFC table tags live at `/t/<token>` (e.g. `https://pizza.yourdomain.com/t/8fK2xQ`), which auto-validates the table and pre-fills its number.

## Scripts

- `npm run dev` — start the dev server (port 80)
- `npm run build` — production build
- `npm run lint` — ESLint
- `npm run typecheck` — TypeScript check (`tsc --noEmit`)

## Environment

Create a `.env.local` (or edit `.env.development` / `.env.production`) with:

```
# Root domain used to resolve the tenant from the hostname.
VITE_BASE_DOMAIN=yourdomain.com

# Base URL of the tenant API.
VITE_API_URL=https://api.yourdomain.com

# Dev-only fallback tenant for plain http://localhost (never shipped).
VITE_DEV_TENANT=pizza

# When "true", serve data from the built-in mock (src/data.ts) with no network.
VITE_USE_MOCK=true
```

## Local development

- The backend is ASP.NET Core running locally at `https://localhost:7194`
  (Kestrel, HTTPS) with a self-signed development certificate.
- Before starting the frontend, open `https://localhost:7194` once in your
  browser and accept the certificate warning. Until you do, every API call
  fails immediately with a network error — the browser blocks the request
  before it ever reaches the backend.
- The backend's CORS policy must explicitly allow the frontend origin(s) used
  during development: `http://snackme.localhost` and any other `*.localhost`
  subdomain you test. Otherwise the browser blocks the requests even with a
  valid, accepted certificate.

## API contract

All requests carry an `X-Tenant: <slug>` header. The client only ever sends
product ids and quantities — never prices.

| Endpoint | Description |
| --- | --- |
| `GET /api/public/tenant` | Tenant meta (name, logo, brand colors, currency, languages). `404` means the restaurant is unknown. |
| `GET /api/public/tables/{token}` | Validate an NFC/QR table tag → `{ tableId, number, tenantSlug }`. `404` if invalid. |
| `GET /api/public/menu` | Categories + products (`MenuData`). |
| `POST /api/public/orders` | Body `{ tableToken, items: [{ productId, quantity }], note?, idempotencyKey }` → `201 { id, number }`. |

## Tenant resolution

- In production the hostname must match `*.VITE_BASE_DOMAIN`; the label before
  the domain is the tenant slug. Reserved labels (`www`, `api`, `admin`, `app`)
  are ignored.
- In development, additionally `?tenant=<slug>` or `VITE_DEV_TENANT` are used as
  fallbacks so plain `http://localhost` works.
- Unknown subdomains show the restaurant-not-found screen.

## State & persistence

All state is scoped per tenant so two tabs (pizza/cafe) never share data:

| Key | Storage | Contents |
| --- | --- | --- |
| `cart:<slug>` | localStorage | Cart items |
| `table:<slug>` | sessionStorage | Validated table `{ tableId, number, token }` |
| `lang:<slug>` | localStorage | Selected UI language |

Prices are formatted with `Intl.NumberFormat` using the tenant currency and the
active UI language. Brand colors come from the tenant and are applied as CSS
variables (`--color-primary*`, `--color-accent*`), so the Tailwind `brand` and
`accent` utilities re-skin automatically per restaurant.

## Mock mode

With `VITE_USE_MOCK=true` (the dev default), the API client serves data from
`src/data.ts` with a small artificial delay and no network calls. Built-in mock
data:

- Tenant `pizza` → "Snack X", MAD, `en` default, orange brand.
- Tenant `cafe` → "Café Nuno", MAD, `ar` default, teal brand.
- Table tag `abc123` → table 12 at `pizza`; `cafe-5` → table 5 at `cafe`.
- Any other tag → invalid-table screen.

Point the phone at `http://pizza.localhost/t/abc123` (with `localhost`
resolved as the root domain) to exercise the full flow.