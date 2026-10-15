#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"

ENV_FILE="${ENV_FILE:-.env}"
RUN_MIGRATIONS="${RUN_MIGRATIONS:-true}"

# Prefer the Compose v2 plugin ("docker compose"), fall back to v1 ("docker-compose").
if docker compose version >/dev/null 2>&1; then
  COMPOSE=(docker compose)
elif command -v docker-compose >/dev/null 2>&1; then
  COMPOSE=(docker-compose)
else
  echo "[deploy] ERROR: neither 'docker compose' (v2) nor 'docker-compose' (v1) was found on this server." >&2
  exit 1
fi

# Compose auto-loads ".env" from the project directory in every version, which is
# more portable than the "--env-file" global flag (unsupported on older CLIs).
if [ -f .env ]; then
  echo "[deploy] Using env file: .env"
elif [ -f "$ENV_FILE" ]; then
  cp -f "$ENV_FILE" .env
  echo "[deploy] Using env file: $ENV_FILE (copied to .env)"
else
  echo "[deploy] ERROR: no .env or '$ENV_FILE' found in $(pwd)" >&2
  exit 1
fi

echo "[deploy] Docker:  $(docker --version)"
echo "[deploy] Compose: ${COMPOSE[*]}"
"${COMPOSE[@]}" version || true

echo "[deploy] Building images..."
"${COMPOSE[@]}" build

if [ "$RUN_MIGRATIONS" = "true" ]; then
  echo "[deploy] Applying EF Core migrations..."
  "${COMPOSE[@]}" run --rm backend dotnet NFC_Backend.dll --migrate-only
fi

# Legacy docker-compose v1 (<= 1.29.2) crashes on recreate with recent Docker
# engines (KeyError: 'ContainerConfig'). Removing the existing containers first
# avoids that broken code path. Only needed for the legacy v1 binary.
if [ "${COMPOSE[0]}" = "docker-compose" ]; then
  echo "[deploy] Legacy docker-compose detected; removing old containers to avoid the ContainerConfig bug..."
  "${COMPOSE[@]}" down --remove-orphans || true
fi

echo "[deploy] Starting/updating containers..."
"${COMPOSE[@]}" up -d

if [ "$RUN_MIGRATIONS" = "true" ]; then
  echo "[deploy] Restarting backend so it picks up the migrated schema..."
  "${COMPOSE[@]}" restart backend
fi

echo "[deploy] Done."
"${COMPOSE[@]}" ps