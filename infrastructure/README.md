# Infra instructions (separated SAM templates)

This folder contains separated SAM templates by responsibility:

- `s3-lambda-sam.yaml` for S3 uploads -> image-resize Lambda
- `messaging-worker-sam.yaml` for SNS/SQS task assignment worker
- `frontend-cdn-sam.yaml` for CloudFront CDN in front of the Next.js origin
- `vpc-alb-asg.yaml` for VPC + public/private subnets + NAT + ALB + EC2 ASG  
  **Default `ApiRoutingMode=frontend`**: all HTTP goes to Next.js; `/api/*` is proxied to Nest via `BACKEND_URL`. See `docs/deployment-alb-502-fix.md` if login returns **502**.
- `dynamodb-tables.yaml` for DynamoDB tables (Users, Teams, Projects, Tasks, Comments, TaskAuditLogs)

## Prerequisites

- AWS CLI configured (access key, secret key, default region) or environment variables set.
- AWS SAM CLI installed.
- Node.js 20+ for backend build.

## Build the Lambda bundle

The Lambda handler is written in TypeScript and expected to be in the backend build output:

```bash
cd apps/backend
npm install
npm run build
```

If you are building the `sharp` native module locally, build for Linux:

```bash
cd apps/backend
npm install --platform=linux --arch=x64 --libc=glibc sharp
```

## Deploy (SAM) - step by step

1. Validate templates (optional but recommended):

```bash
sam validate -t infrastructure/dynamodb-tables.yaml --region <your-region>
sam validate -t infrastructure/vpc-alb-asg.yaml --region <your-region>
sam validate -t infrastructure/s3-lambda-sam.yaml --region <your-region>
sam validate -t infrastructure/messaging-worker-sam.yaml --region <your-region>
sam validate -t infrastructure/frontend-cdn-sam.yaml --region <your-region>
```

2. Deploy DynamoDB tables (creates Users/Teams/Projects/Tasks/Comments/TaskAuditLogs):

```bash
sam deploy --guided -t infrastructure/dynamodb-tables.yaml
```

3. Deploy VPC/ALB/ASG (required to get the ALB DNS for CloudFront):

```bash
sam build -t infrastructure/vpc-alb-asg.yaml
sam deploy --guided -t infrastructure/vpc-alb-asg.yaml
```

4. Deploy S3 resize pipeline:

```bash
sam build -t infrastructure/s3-lambda-sam.yaml
sam deploy --guided -t infrastructure/s3-lambda-sam.yaml
```

5. Deploy messaging worker (SNS/SQS + worker + audit log Lambda):

```bash
sam build -t infrastructure/messaging-worker-sam.yaml
sam deploy --guided -t infrastructure/messaging-worker-sam.yaml
```

6. Deploy CloudFront with the ALB DNS as the origin:

```bash
sam build -t infrastructure/frontend-cdn-sam.yaml
sam deploy --guided -t infrastructure/frontend-cdn-sam.yaml --parameter-overrides OriginDomainName=<alb-dns>
```

Notes:

- SES requires a verified sender identity for the worker Lambda to send emails.
- The Lambda `CodeUri` points at `apps/backend/dist`, so build before deployment.

```bash
sam deploy --guided -t infrastructure/dynamodb-tables.yaml

sam build -t infrastructure/vpc-alb-asg.yaml
sam deploy --guided -t infrastructure/vpc-alb-asg.yaml

sam build -t infrastructure/s3-lambda-sam.yaml
sam deploy --guided -t infrastructure/s3-lambda-sam.yaml

sam build -t infrastructure/messaging-worker-sam.yaml
sam deploy --guided -t infrastructure/messaging-worker-sam.yaml

sam build -t infrastructure/frontend-cdn-sam.yaml
sam deploy --guided -t infrastructure/frontend-cdn-sam.yaml --parameter-overrides OriginDomainName=<alb-dns>
```

## Notes

- The S3 template creates a bucket and attaches an `ObjectCreated` event to the image-resize Lambda.
- The handler path is `integrations/lambda/handlers/s3-image-resize.handler` in `apps/backend/dist`.
- The Lambda updates the task attachment in DynamoDB using `TASKS_TABLE`.
- The messaging template provisions an SNS topic, an SQS queue, and a worker Lambda wired to the queue.
- The CDN template expects a DNS origin (ALB/EC2/S3 website) and creates a CloudFront distribution.
- The VPC template provisions two public and two private subnets across two AZs, plus NAT gateways, ALB, and an EC2 ASG.
- The DynamoDB template provisions the core data tables and required GSIs.
