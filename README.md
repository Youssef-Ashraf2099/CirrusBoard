# CirrusBoard (scaffold)

This repo contains a scaffold for the CirrusBoard task-management application.

## Quick start

- Backend (NestJS) is in [apps/backend](apps/backend).
- Run unit tests:

```bash
cd apps/backend
npm install
npm test
```

## How to interact — full guide

Prerequisites:

- Docker & Docker Compose
- Node.js 20+ for local builds (if building images locally)

1. Populate `.env` (a template exists). At minimum set:

```
AWS_ACCESS_KEY_ID=test
AWS_SECRET_ACCESS_KEY=test
AWS_REGION=us-east-1
DYNAMODB_ENDPOINT=http://dynamodb:8000
TASKS_TABLE=Tasks
PROJECTS_TABLE=Projects
COMMENTS_TABLE=Comments
```

2. Start the local stack (DynamoDB Local + LocalStack + init script that creates tables):

```bash
# from repo root
docker compose up -d --build
```

3. Verify the init script created the tables (readable table output):

```bash
docker run --rm --network cirrusboard_default \
	-e AWS_ACCESS_KEY_ID=test -e AWS_SECRET_ACCESS_KEY=test -e AWS_REGION=us-east-1 \
	amazon/aws-cli dynamodb list-tables --endpoint-url http://dynamodb:8000 --region us-east-1 --output table
```

Expected output (example):

```
----------------
|  ListTables  |
+--------------+
|| TableNames ||
|+------------+|
||  Comments  ||
||  Projects  ||
||  Tasks     ||
|+------------+|
```

4. Troubleshooting tips

- If `dynamodb-init` fails, inspect its logs:

```bash
docker compose logs dynamodb-init --tail 200
```

- If the `aws-cli` shows `NoRegion` or `NoCredentials`, ensure `.env` is loaded by compose (see step 1).
- If containers do not start, run `docker compose down` then `docker compose up --build`.

5. Backend local run (without Docker)

```bash
cd apps/backend
npm install
npm run start:dev
```

6. Useful commands

- Stop everything:

```bash
docker compose down
```

- Tail all logs:

```bash
docker compose logs -f
```

7. Next steps / API notes

- Controllers (HTTP routes) will be added to expose CRUD for Tasks, Projects, Comments.
- For now the backend service reads/writes to the DynamoDB tables created above; credentials used are local/dummy for development.

If you want, I can:

- Add simple REST controllers and a Postman collection, or
- Show full table descriptions and example PutItem/GetItem commands.

---

Last updated: short guide added for local interaction and verification.
