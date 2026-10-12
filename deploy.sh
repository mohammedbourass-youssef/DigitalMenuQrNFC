#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"

ENV_FILE="${ENV_FILE:-p.env}"
RUN_MIGRATIONS="${RUN_MIGRATIONS:-true}"

echo "[deploy] Building images..."
docker compose --env-file "$ENV_FILE" build

if [ "$RUN_MIGRATIONS" = "true" ]; then
  echo "[deploy] Applying EF Core migrations..."
  docker compose --env-file "$ENV_FILE" run --rm backend dotnet NFC_Backend.dll --migrate-only
fi

echo "[deploy] Starting/updating containers..."
docker compose --env-file "$ENV_FILE" up -d

if [ "$RUN_MIGRATIONS" = "true" ]; then
  echo "[deploy] Restarting backend so it picks up the migrated schema..."
  docker compose --env-file "$ENV_FILE" restart backend
fi

echo "[deploy] Done."
docker compose --env-file "$ENV_FILE" ps