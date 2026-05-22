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
AWS_ENDPOINT=http://localstack:4566
S3_ENDPOINT=http://localstack:4566
S3_FORCE_PATH_STYLE=true
USERS_TABLE=Users
TEAMS_TABLE=Teams
PROJECTS_TABLE=Projects
TASKS_TABLE=Tasks
COMMENTS_TABLE=Comments
TASK_AUDIT_LOGS_TABLE=TaskAuditLogs
LOCALSTACK_ENDPOINT=http://localstack:4566
COGNITO_USER_POOL_ID=local-pool
COGNITO_USER_POOL_CLIENT_ID=local-client
COGNITO_ISSUER=http://localstack:4566

```

2. Start the local stack (DynamoDB Local + LocalStack + init script that creates tables):

```bash
# from repo root
docker compose up -d --build
```

3. Verify the init script created the tables (readable table output):

```bash
docker run --rm \
  --network cirrusboard_default \
  -e AWS_ACCESS_KEY_ID=test \
  -e AWS_SECRET_ACCESS_KEY=test \
  -e AWS_REGION=us-east-1 \
  amazon/aws-cli \
  dynamodb list-tables \
  --endpoint-url http://dynamodb:8000 \
  --region us-east-1 \
  --output table
```

Expected output (example):

```
----------------
|    ListTables     |
+-------------------+
||   TableNames    ||
|+-----------------+|
||  Comments       ||
||  Projects       ||
||  TaskAuditLogs  ||
||  Tasks          ||
||  Teams          ||
||  Users          ||
|+-----------------+|

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

## Architecture (high availability)

Diagram files:

- Preview image: [docs/aws-arch-2.png](docs/aws-arch-2.png)
- Source SVG: [docs/AWS Arch 2.svg](docs/AWS%20Arch%202.svg)

High availability highlights (as reflected in the diagram):

- Edge delivery with CloudFront in front of the app and static assets.
- Compute tier behind an Application Load Balancer with autoscaling across multiple AZs.
- DynamoDB and S3 provide multi-AZ storage for tasks and attachments.
- Asynchronous workflows: S3 -> Lambda (image resize), SNS -> SQS -> worker Lambda, and EventBridge scheduled Lambdas for digests.
- Cognito for authentication and CloudWatch for logs/metrics/alarms.

Local development uses LocalStack to emulate S3/Lambda/SNS/SQS/EventBridge/Cognito and DynamoDB Local for tables.

## Lambda image resize (sharp)

The S3 image-resize Lambda handler uses `sharp`, which includes native binaries. If you package the Lambda locally, build it for Linux:

```bash
cd apps/backend
npm install --platform=linux --arch=x64 --libc=glibc sharp
```

Alternatively, build inside a Linux container that matches the Lambda runtime.

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

Video demo : https://drive.google.com/file/d/1cJe7GTPoDr8DdOfVjZ5_aWwnHCEOkAOb/view?usp=drive_link
