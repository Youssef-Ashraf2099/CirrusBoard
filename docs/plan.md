## Plan: Team Task-Management App on AWS

TL;DR - Build a NestJS backend and Next.js frontend, deploy them behind an ALB+AutoScaling Group (EC2) and front with CloudFront. Persist data in DynamoDB (with GSIs for teamId and assigneeId), store images in S3 with a Lambda image-resize pipeline, and implement event-driven flows using SNS, SQS, and EventBridge. Use Cognito for auth and enforce team-based filtering server-side. Infrastructure will be provisioned with AWS CDK (TypeScript). Seed demo users for the demo scenario.

**Steps**
1. Project scaffolding (parallelizable):
   - Create monorepo layout: `apps/backend`, `apps/frontend`, `infra/cdk`, `docker-compose.yml`, `README.md`.
2. Authentication (depends on 1):
   - Configure Cognito User Pool & Identity Pool in CDK; define groups/roles `Manager`, `Employee`, `Admin` and custom attribute `teamId`.
   - Implement token validation middleware in NestJS (verify JWT via Cognito JWKS).
3. Data model & DynamoDB (parallel with backend scaffolding):
   - Design tables: `Users`, `Teams`, `Projects`, `Tasks`, `Comments` (Tasks table with PK `taskId`, SK optional, attributes; create GSI on `teamId` and `assigneeId`).
   - Implement repository layer in backend using AWS SDK v3 and DynamoDB DocumentClient.
4. Backend API (NestJS) (depends on 1,3):
   - Implement modules: Auth, Users, Teams, Projects, Tasks, Comments, Attachments, Events.
   - Enforce server-side team checks: endpoints check caller role+team; managers bypass team filter.
   - CRUD for Tasks/Projects/Comments; file upload endpoints generate presigned S3 URLs.
   - Audit logs for status changes persisted to DynamoDB or a dedicated `ActivityLog` table.
   - Publish SNS message when a task is assigned; push to SQS and email subscription.
   - Publish CloudWatch custom metric `TasksAssignedPerTeam` via PutMetricData.
5. Frontend (Next.js) (depends on 1,2):
   - Implement polished UI using Tailwind + shadcn/ui (or Material UI) with Kanban board drag-and-drop (react-beautiful-dnd).
   - Implement sign-in with Cognito (Auth SDK) and token storage.
   - Task detail modal with comments, attachments, and status transitions.
   - Team-aware views: backend enforces access but frontend will also filter for usability.
6. Image pipeline (S3 + Lambda) (depends on 1,4):
   - S3 bucket for uploads; enable event notification for `s3:ObjectCreated:*` to trigger image-resize Lambda.
   - Lambda resizes and writes variants to `resized/` prefix or separate bucket; update Task item with resized URLs if desired.
   - Keep old versions: enable S3 versioning.
7. Event-driven worker (SNS → SQS → Lambda) (depends on 4):
   - SNS topic for TaskAssigned; subscription: (a) email, (b) SQS queue.
   - Worker Lambda polls SQS, writes activity log item, emits CloudWatch metric.
8. Scheduled digest (EventBridge) (parallel):
   - EventBridge rule daily at 09:00 triggering Lambda that scans Tasks due today and publishes digest to SNS per assignee.
9. High-availability infra (CDK) (depends on above):
   - Provision EC2 Auto Scaling Group across 2+ AZs running backend container behind ALB.
   - CloudFront distribution fronting ALB (or S3 for static assets) with SSL cert via ACM.
   - DynamoDB with on-demand capacity or provisioned with autoscaling; S3 with encryption and versioning.
   - IAM roles least-privilege for services.
10. Observability & Alarms (parallel):
   - CloudWatch dashboard with widgets: tasks created/day, tasks closed/day per team, average time-to-close, EC2 CPU utilization.
   - CloudWatch alarm for overdue tasks threshold publish to SNS.
11. Local dev and CI/CD (parallel):
   - `docker-compose.yml` with `dynamodb-local`, backend, frontend for local testing.
   - GitHub Actions workflow: build, tests, CDK synth/deploy to dev account, push images to ECR.
12. Demo readiness & seeding (final):
   - CDK stack or script seeds Cognito users: Ali (Manager), Sara (Employee, team: Frontend), Omar (Employee, team: Backend) and creates Projects and Tasks A/B as described.

**Relevant files to create**
- `apps/backend/package.json`, `apps/backend/src/main.ts`, `apps/backend/src/app.module.ts` — NestJS API and modules
- `apps/backend/Dockerfile`, `apps/backend/.dockerignore`
- `apps/frontend/package.json`, `apps/frontend/next.config.js`, `apps/frontend/Dockerfile` — Next.js app with Tailwind
- `infra/cdk/bin/infra.ts`, `infra/cdk/lib/{core-stack,compute-stack,storage-stack,events-stack}.ts` — CDK stacks
- `docker-compose.yml` — local DynamoDB and apps
- `.github/workflows/ci.yml` — CI and CDK deploy pipeline
- `scripts/seed-demo.ts` — seeds users, teams, and demo tasks

**Verification**
1. Local: run `docker-compose up` (DynamoDB Local + apps) and run integration tests hitting the API and UI.
2. CDK deploy (dev): `cd infra/cdk && npm run build && cdk deploy --all` then run smoke tests:
   - Cognito sign-ins for seeded users, verify Sara sees only Task A, Omar only Task B, Ali sees both.
   - Upload an image to a task: ensure S3 object created, Lambda resized variants exist, DynamoDB item links images.
   - Assign task: verify email from SNS and SQS-driven activity log entry and custom CloudWatch metric increment.
   - Run EventBridge scheduled Lambda (manually trigger): verify digest SNS emails.
3. Observability: validate CloudWatch dashboard widgets show metrics; alarm triggers when simulating overdue tasks.

**Decisions & Assumptions**
- Use AWS CDK (TypeScript) for infra to keep infra-as-code in the repo and enable constructs reuse.
- Use EC2 Auto Scaling Group behind ALB (requirement explicitly asks EC2 across AZs).
- Use Cognito for auth and store `teamId` as a custom attribute on users; backend enforces access control.
- DynamoDB single or multiple tables: use separate logical tables for clarity (Tasks table with GSIs on `teamId` and `assigneeId`).
- Use S3 versioning to keep old image versions; resized images written to `resized/` prefix.

**Further Considerations**
1. Cost & accounts: Running multiple EC2 instances, RIs, and managed services has cost — use a dev account and smaller instance types for demo.
2. Secrets & CI: Store AWS creds and Cognito secrets in GitHub Secrets and use least-privilege deploy role.
3. Demo fallback: provide a scripted local demo mode that uses DynamoDB Local and mocked SNS/SQS (or LocalStack) for guaranteed demo reliability.

---

If this plan looks good, tell me which implementation phase to start with (scaffold repo, infra CDK, or backend API). I will then create the scaffold and begin implementing the selected phase.