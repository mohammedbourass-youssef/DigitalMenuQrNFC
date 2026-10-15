# Documentation

Technical documentation for the **Smart Menu NFC / DigitalMenuQrNFC** platform. These
files are aimed at maintainers and the next engineering team.

| Document | What it covers |
| --- | --- |
| [DATABASE.md](./DATABASE.md) | PostgreSQL schema, every table, relationships, indexes, seed data, EF Core migrations, and database conventions/gotchas. |
| [WORKFLOWS.md](./WORKFLOWS.md) | End-to-end runtime flows: tenant resolution, customer sessions, auth (JWT + refresh), order lifecycle, translations, currency/exchange rates, realtime, storage, invoicing. |
| [DEPLOYMENT.md](./DEPLOYMENT.md) | Host layout, Docker Compose services, the nginx gateway, environment variables, GitHub Actions pipeline and `deploy.sh`. |
| [HANDOVER.md](./HANDOVER.md) | **Read this first.** Critical gotchas, known issues, security notes and TODO list for the incoming team. |

The root [`../README.md`](../README.md) is the general project overview (architecture,
tech stack, features, local development).

## Conventions used in these docs

- Paths are relative to the repository root.
- Code references use `path:line` so they can be jumped to.
- `⚠️` marks a footgun. `🐞` marks a suspected bug / thing to verify. `TODO` marks
  pending work.
