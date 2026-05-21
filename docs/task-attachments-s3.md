# Task attachments (S3 presigned upload)

## Flow

1. Frontend `POST /api/tasks/:taskId/upload-url` → Nest returns presigned **PUT** URL + attachment metadata on the task.
2. Browser **PUT**s the file directly to S3 (not through Next.js).
3. Frontend `POST /api/tasks/:taskId/upload-complete` → Nest verifies object via `HeadObject`, updates attachment size/ETag.
4. Download: `GET /api/tasks/:taskId/attachments/:attachmentId/download-url` → presigned **GET** URL.

## Backend env (`apps/backend/.env`)

```env
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
S3_BUCKET_NAME=your-bucket-name
```

LocalStack (optional):

```env
S3_ENDPOINT=http://localhost:4566
S3_FORCE_PATH_STYLE=true
AWS_ACCESS_KEY_ID=local
AWS_SECRET_ACCESS_KEY=local
```

## S3 bucket

1. Create a bucket (e.g. `cirrusboard-upload`).
2. Block public access (recommended); use presigned URLs only.
3. IAM user/role for the API needs at least:
   - `s3:PutObject`, `s3:GetObject`, `s3:HeadObject` on `arn:aws:s3:::your-bucket-name/*`

## CORS (required for browser PUT)

Apply CORS so the **frontend origin** can upload:

```bash
aws s3api put-bucket-cors \
  --bucket your-bucket-name \
  --cors-configuration file://apps/backend/scripts/s3-cors.example.json
```

Edit `AllowedOrigins` in `s3-cors.example.json` to include:

- `http://localhost:3000` (Next dev)
- Your production site URL (e.g. `https://app.example.com`)

Allowed methods: `PUT`, `GET`, `HEAD`. Expose `ETag` so upload-complete can validate.

## Frontend

- `BACKEND_URL` must point at Nest (see `apps/frontend/.env.example`).
- User must be logged in (Cognito Bearer token) for upload routes.

## Verify

```bash
# After login, with TOKEN and TASK_ID:
curl -sS -X POST "http://127.0.0.1:3001/api/tasks/$TASK_ID/upload-url" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"filename":"test.txt","contentType":"text/plain"}'
```

Then PUT the file to `uploadUrl`, then POST `upload-complete` with `attachmentId`, `key`, and optional `eTag`/`size`.
