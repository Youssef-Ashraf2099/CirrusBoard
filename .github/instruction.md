# CirrusBoard AI Instructions

## Project summary

- CirrusBoard is a task-management app with a NestJS backend and a Next.js frontend.
- AWS integrations (LocalStack for local dev): DynamoDB, S3, Lambda, SNS, SQS, Cognito, EventBridge.
- Infra is split into focused SAM templates under infrastructure/.

## Key goals (current)

- Keep infrastructure templates separated by concern.
- Maintain LocalStack parity for S3/Lambda/SNS/SQS/Cognito workflows.
- Preserve the S3 upload + resize pipeline and task assignment notifications.

## Repo layout

- apps/backend: NestJS API, AWS SDK v3 integrations, Lambda handlers in src/integrations/lambda/handlers.
- apps/frontend: Next.js app.
- infrastructure/: SAM templates (S3/Lambda, messaging worker, CloudFront CDN, VPC/ALB/ASG).
- scripts/: LocalStack init scripts and DynamoDB table bootstrap.
- docs/: architecture diagrams and schema docs.

## Local development

- Start services: `docker compose up -d --build`
- Backend tests: `cd apps/backend && npm test`
- Backend run: `cd apps/backend && npm run start`

## Env and config

- Local env in `.env` (gitignored). Copy values from README and adjust for your local stack.
- S3 config uses S3_ENDPOINT and S3_FORCE_PATH_STYLE; keep bucket names consistent between env and SAM templates.
- SNS/SQS ARNs and URLs are provided via env when running locally or via SAM outputs when deployed.

## Infra templates (SAM)

- infrastructure/s3-lambda-sam.yaml: S3 -> image resize Lambda.
- infrastructure/messaging-worker-sam.yaml: SNS topic, SQS queue, worker Lambda (SES stub).
- infrastructure/frontend-cdn-sam.yaml: CloudFront CDN for Next.js origin.
- infrastructure/vpc-alb-asg.yaml: VPC, public/private subnets, NAT, ALB, EC2 ASG.

## Conventions

- Prefer small, focused templates and modules.
- Use AWS SDK v3 clients.
- Avoid adding global changes without verifying LocalStack compatibility.

## Notes for agents

- Read current file contents before edits; user may have made recent changes.
- Keep new files and edits ASCII-only unless the file already contains Unicode.
- Do not commit or expose real credentials; use dummy values in docs.
- When in doubt about AWS service behavior, refer to official AWS docs or LocalStack docs for compatibility notes.
- For backend code, follow NestJS conventions for modules, services, controllers, and repositories.
- For infra, ensure SAM templates are valid and deployable; test with `sam validate` and `sam deploy --guided`.
- For LocalStack issues, check container logs and ensure the correct services are enabled in the compose file.
- When adding new AWS integrations, update the LocalStack config and ensure local dev workflows are not broken and also check the requirments of the .env.
- When updating the architecture diagram, maintain clarity and consistency with AWS iconography and ensure it reflects the current state of the codebase and the pdf requirments.
- For any new features or integrations, update this instruction file with clear steps and notes for future developers.
  -Implement the SOLID Design Principles in the backend code to ensure maintainability and scalability.
