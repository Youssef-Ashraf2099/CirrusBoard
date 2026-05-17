# Infra instructions (separated SAM templates)

This folder contains separated SAM templates by responsibility:

- `s3-lambda-sam.yaml` for S3 uploads -> image-resize Lambda
- `messaging-worker-sam.yaml` for SNS/SQS task assignment worker
- `frontend-cdn-sam.yaml` for CloudFront CDN in front of the Next.js origin
- `vpc-alb-asg.yaml` for VPC + public/private subnets + NAT + ALB + EC2 ASG

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

## Deploy (SAM)

```bash
sam build -t infrastructure/s3-lambda-sam.yaml
sam deploy --guided -t infrastructure/s3-lambda-sam.yaml

sam build -t infrastructure/messaging-worker-sam.yaml
sam deploy --guided -t infrastructure/messaging-worker-sam.yaml

sam build -t infrastructure/frontend-cdn-sam.yaml
sam deploy --guided -t infrastructure/frontend-cdn-sam.yaml --parameter-overrides OriginDomainName=<your-origin-dns>

sam build -t infrastructure/vpc-alb-asg.yaml
sam deploy --guided -t infrastructure/vpc-alb-asg.yaml
```

## Notes

- The S3 template creates a bucket and attaches an `ObjectCreated` event to the image-resize Lambda.
- The handler path is `integrations/lambda/handlers/s3-image-resize.handler` in `apps/backend/dist`.
- The Lambda updates the task attachment in DynamoDB using `TASKS_TABLE`.
- The messaging template provisions an SNS topic, an SQS queue, and a worker Lambda wired to the queue.
- The CDN template expects a DNS origin (ALB/EC2/S3 website) and creates a CloudFront distribution.
- The VPC template provisions two public and two private subnets across two AZs, plus NAT gateways, ALB, and an EC2 ASG.
