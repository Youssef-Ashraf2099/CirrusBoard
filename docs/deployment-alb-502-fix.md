# ALB 502 on `/api/*` (login and all API calls)

## What you saw

`POST http://<alb-dns>/api/users/login` → **502 Bad Gateway** from `awselb/2.0`.

That means the load balancer could not get a valid response from the **target group** for that request — not a Nest validation error.

## Root cause (this repo’s default CloudFormation)

`infrastructure/vpc-alb-asg.yaml` used to send **`/api/*` to the backend Auto Scaling group** while many deployments only run **Next.js on the frontend EC2** (with Nest on the same host via `BACKEND_URL=127.0.0.1:3001`).

The browser calls `/api/users/login` on the ALB host. That request never reached Next.js, so the BFF proxy in `apps/frontend/app/api/users/login/route.ts` never ran.

Backend ASG instances often still run the **placeholder** `server.js` from UserData, or are **unhealthy** because Nest had no `GET /api/health` for the target group health check.

## Fix in code (already applied)

1. **`GET /api/health`** on Nest (for backend target group health checks).
2. **Default `PORT=3001`** in `main.ts` (matches ALB backend port).
3. **`ApiRoutingMode` parameter** (default `frontend`): ALB sends **all** traffic to Next.js; `/api` is proxied server-side to Nest.

## What you should do on AWS

### Recommended: Next.js + Nest on the **frontend EC2** (same box)

1. **Redeploy or update the stack** with `ApiRoutingMode=frontend` (default), **or** delete the listener rule that forwards `/api/*` to the backend target group in the AWS console.
2. On the **frontend** instance (SSM session):

   ```bash
   cd /app/apps/backend   # or /appBack/apps/backend
   npm ci
   npm run build
   PORT=3001 node dist/main.js &   # or pm2 start ecosystem.config.js

   cd /app/apps/frontend
   echo 'BACKEND_URL=http://127.0.0.1:3001' > .env.production.local
   npm ci
   npm run build
   PORT=3000 npm run start &
   ```

3. Confirm locally on the instance:

   ```bash
   curl -s http://127.0.0.1:3001/api/health
   curl -s -X POST http://127.0.0.1:3000/api/users/login -H 'Content-Type: application/json' \
     -d '{"email":"...","password":"..."}'
   ```

4. ALB target group **frontend** should be healthy on `/`.

### Alternative: Split routing (`ApiRoutingMode=backend`)

Only if Nest runs on **backend ASG** instances:

1. Deploy built Nest app on each backend instance; `PORT=3001`.
2. Ensure `GET /api/health` returns 200 (included in this repo).
3. Set stack parameter `ApiRoutingMode=backend`.
4. Backend target group must show **healthy** in EC2 → Target groups.

## Quick checks in AWS Console

| Check | Healthy looks like |
|--------|-------------------|
| Target group `cirrusboard-frontend-tg` | 1+ healthy |
| Target group `cirrusboard-backend-tg` | Only needed for `ApiRoutingMode=backend` |
| Listener rules | Default → frontend; no `/api/*` → backend rule if using `frontend` mode |
| Backend EC2 logs | `Listening on 3001` from Nest, not placeholder text |

## After stack update

Hard-refresh the browser and try login again. You should see JSON from Nest (401/400) instead of HTML 502 from the ELB.
