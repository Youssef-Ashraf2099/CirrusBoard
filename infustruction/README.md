# Infra instructions (S3 -> Lambda image resize)

This folder contains a SAM template that wires S3 uploads to the image-resize Lambda.

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
sam build -t infustruction/s3-lambda-sam.yaml
sam deploy --guided -t infustruction/s3-lambda-sam.yaml
```

## Notes

- The template creates a new S3 bucket and attaches an `ObjectCreated` event to the Lambda.
- The handler path is `integrations/lambda/handlers/s3-image-resize.handler` in `apps/backend/dist`.
- The Lambda updates the task attachment in DynamoDB using `TASKS_TABLE`.
