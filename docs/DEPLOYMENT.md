# Deployment

Production runs on a single Linux host as a Docker Compose stack behind an nginx
gateway. CI/CD is a GitHub Actions workflow that rsyncs the repo to the host and
re-runs Compose.

---

## 1. Host layout

| Path | Purpose |
| --- | --- |
| `~/DigitalMenuQrNFC` | **Live deploy directory** (repo checkout + real `.env`). CI targets this. |
| `~/smart-menu-nfc` | Legacy deploy directory — no longer used. |
| `/etc/ssl/cloudflare/origin.{pem,key}` | Cloudflare **origin** certificate mounted into the gateway. |

- Docker Engine ≥ 29, **Compose v2** (`docker compose`). `deploy.sh` falls back to
  legacy `docker-compose` v1 if v2 is absent.
- The production `.env` lives **only** on the host (gitignored, excluded from rsync).

---

## 2. Compose services

[`docker-compose.yaml`](../docker-compose.yaml)

| Service | Image / build | Ports | Volume | Notes |
| --- | --- | --- | --- | --- |
| `postgres` | `postgres:16-alpine` | `${POSTGRES_PORT}:5432` | `pg_data` | UTF-8, C collation; `./db/init` bootstrap |
| `pgadmin` | `dpage/pgadmin4` | `5050:80` | `pgadmin_data` | Served under `SCRIPT_NAME=/pgadmin` |
| `minio` | `minio/minio` | `9000` S3, `9001` console | `minio_data` | `MINIO_BROWSER_REDIRECT_URL` = `${BASE_DOMAIN}/minio/` |
| `seq` | `datalust/seq` | `8081:80`, `5341:5341` | `seq_data` | Structured logs; **no auth** in first-run mode |
| `backend` | built from `backend/NFC_Backend` | `7194:8080` | — | .NET backend; health-gated on postgres & minio |
| `menu` | built from `Admin FrontEnd/Menu` | internal | — | Customer SPA (Vite build → nginx) |
| `snack-x-menu-admin` | built from `Admin FrontEnd/Snack-X-Menu-Admin` | internal | — | Admin SPA |
| `gateway` | `nginx:alpine` | `80:80`, `443:443` | `./nginx/conf.d/app.conf`, TLS certs | Terminates TLS, routes by host/path |

`migrator` is defined but **commented out** (`docker-compose.yaml:132-144`); the
backend applies migrations on startup instead.

---

## 3. Gateway (nginx)

[`nginx/conf.d/app.conf`](../nginx/conf.d/app.conf) — `default.conf` inside the
`gateway` container.

- Terminates TLS using the Cloudflare origin cert (`/etc/ssl/cloudflare/origin.pem`
  / `.key`).
- Routes `/api/` and `/hubs/` (with WebSocket upgrade) to the backend, and forwards
  the **`X-Tenant`** header derived from the request host.
- Serves the two SPAs (`menu`, `snack-x-menu-admin`).
- Routes tool UIs: `/pgadmin`, `/minio` (+ `/minio-api` for objects), `/seq`.
- The SPA containers carry their own `nginx.conf`; both were given an explicit
  `charset utf-8;` and `charset_types` so SVG/JSON responses advertise UTF-8.

---

## 4. Environment variables

All are read from the host `.env` by Compose. Bundled in `p.env.example` /
`.env.example` style — never commit real values.

**Database & infra**
`POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_PORT`,
`DB_NAME`, `DB_USER`, `DB_PASSWORD`, `DB_PORT`,
`PGADMIN_EMAIL`, `PGADMIN_PASSWORD`,
`MINIO_ROOT_USER`, `MINIO_ROOT_PASSWORD`, `MINIO_ACCESS_KEY`, `MINIO_SECRET_KEY`,
`MINIO_BUCKET_NAME`, `MINIO_USE_SSL`,
`BASE_DOMAIN`, `DEFAULT_PORT`, `SEQ_SERVER_URL`, `BACKEND_URL`.

**App / auth**
`ASPNETCORE_ENVIRONMENT`,
`JWT_SECRET`, `JWT_ISSUER`, `JWT_AUDIENCE`,
`JWT_ACCESS_TOKEN_EXPIRY_MINUTES`, `JWT_REFRESH_TOKEN_EXPIRY_DAYS`,
`FREE_TRIAL_DAYS`, `SESSION_EXPIRATION_HOURS`.

**Integrations**
`EXCHANGE_RATE_API_KEY`,
`GMAIL_APP_PASSWORD`, `GMAIL_SENDER_EMAIL`, `GMAIL_SENDERNAME`, `GMAIL_HOST`,
`GMAIL_PORT`,
`AZURE_TRANSLATOR_API_KEY`, `AZURE_TRANSLATOR_REGION`, `AZURE_TRANSLATOR_ENDPOINT`,
`GEMINI_API_KEY`, `GEMINI_MODEL`.

**Frontend build args** (baked at image build time — changing them needs a rebuild)
`VITE_API_URL`, `VITE_BASE_DOMAIN`, `VITE_DEV_TENANT`, `VITE_USE_MOCK`,
`VITE_MOCK_ORDER_LINE`.

> ⚠️ `VITE_*` values are compiled into the JS bundles. They are **not** secrets, but
> they cannot be changed at runtime.

Full mapping lives in `docker-compose.yaml:93-130`.

---

## 5. CI/CD

[`.github/workflows/deploy.yml`](../.github/workflows/deploy.yml) — triggers on push
to `main` and manual `workflow_dispatch`.

Required GitHub **secret**:

| Name | Purpose |
| --- | --- |
| `SSH_HOST` | server address |
| `SSH_USER` | ssh user |
| `SSH_PORT` | ssh port (defaults to `22`) |
| `SSH_PRIVATE_KEY` | deploy key (secret) |

(Values may be provided as either `secrets` or `vars`; the workflow resolves
`${{ secrets.X || vars.X }}`.)

Steps (high level):

1. Checkout, set up SSH.
2. `rsync` the repo to `~/DigitalMenuQrNFC` with excludes for `.git`, `node_modules`,
   `p.env`, `.env`, `*.env`, and `minio_data.tar.gz`. **No `--delete`** — remote
   `.env` and data are preserved.
3. Run [`deploy.sh`](../deploy.sh) on the host.

`deploy.sh`:

- Detects Compose v2 (`docker compose`) and falls back to v1 (`docker-compose`).
- Resolves the env file: reuses an existing `.env`, otherwise copies `$ENV_FILE`
  (default `.env`). It avoids the `cp .env .env` same-file error.
- On legacy v1 it runs `docker-compose down --remove-orphans` first as a workaround
  for the `KeyError: 'ContainerConfig'` crash, then `up -d --build`.

---

## 6. Manual operations

```powershell
# Deploy (on the host, from the deploy dir)
./deploy.sh

# Rebuild a single service
docker compose up -d --build backend

# Logs
docker logs -f nfc_backend
docker logs -f app_gateway

# Apply migrations manually
docker exec nfc_backend dotnet NFC_Backend.dll --migrate-only
```

---

## 7. Troubleshooting

| Symptom | Cause | Fix |
| --- | --- | --- |
| `KeyError: 'ContainerConfig'` during `up` | legacy `docker-compose` v1 parsing a v2-created container | install Compose v2, or run `docker-compose down --remove-orphans` first (handled by `deploy.sh`) |
| Deploy fails "env file not found" | `.env` missing in the deploy dir | create `~/DigitalMenuQrNFC/.env` (the workflow no longer deletes it) |
| UI shows mojibake (`Ã©`) | locale JSON committed as double-encoded UTF-8 | ban `charset` can't fix bytes — repair the files as clean UTF-8 (see HANDOVER.md) |
| Changes pushed but site unchanged | workflow deployed to the old dir / rsync deleted `.env` | confirm target is `~/DigitalMenuQrNFC`, `--delete` removed |
| `FormatException` building email | `MailAddress` received `<placeholder>` from env | put real `GMAIL_SENDER_EMAIL` / `GMAIL_APP_PASSWORD` in `.env` |
| CORS errors from a new domain | origin not under `BASE_DOMAIN` | `AppSettings__BaseDomain` must be the apex; tenant subdomains are allowed automatically |
