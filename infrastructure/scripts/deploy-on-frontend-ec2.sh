#!/usr/bin/env bash
# Run ON the frontend EC2 (SSM session) after cloning CirrusBoard to /app/CirrusBoard.
set -euo pipefail

APP_ROOT="${APP_ROOT:-/app/CirrusBoard}"
BACKEND_PORT="${BACKEND_PORT:-3001}"
FRONTEND_PORT="${FRONTEND_PORT:-3000}"

cd "$APP_ROOT"

echo "==> Backend (Nest) on :${BACKEND_PORT}"
cd apps/backend
npm ci
npm run build
export PORT="$BACKEND_PORT"
nohup node dist/main.js > /var/log/cirrusboard-backend.log 2>&1 &
echo $! > /var/run/cirrusboard-backend.pid

echo "==> Frontend (Next.js) on :${FRONTEND_PORT}"
cd "$APP_ROOT/apps/frontend"
npm ci
printf 'BACKEND_URL=http://127.0.0.1:%s\n' "$BACKEND_PORT" > .env.production.local
npm run build
export PORT="$FRONTEND_PORT"
nohup npm run start > /var/log/cirrusboard-frontend.log 2>&1 &
echo $! > /var/run/cirrusboard-frontend.pid

sleep 3
echo "==> Health checks"
curl -sf "http://127.0.0.1:${BACKEND_PORT}/api/health" && echo " backend ok"
curl -sf -o /dev/null -w "frontend / → %{http_code}\n" "http://127.0.0.1:${FRONTEND_PORT}/"
curl -sf -o /dev/null -w "login proxy → %{http_code}\n" \
  -X POST "http://127.0.0.1:${FRONTEND_PORT}/api/users/login" \
  -H 'Content-Type: application/json' \
  -d '{"email":"test@example.com","password":"test"}' || true
echo "Done. Ensure ALB uses ApiRoutingMode=frontend (no /api/* → backend rule)."
