#!/usr/bin/env sh
set -eu

AWS_REGION=${AWS_REGION:-eu-north-1}
ACCOUNT_ID=${AWS_ACCOUNT_ID:-000000000000}
S3_BUCKET_NAME=${S3_BUCKET_NAME:-cirrusboard-upload}
IMAGE_RESIZE_FUNCTION=${IMAGE_RESIZE_FUNCTION:-image-resize}
TASK_ASSIGN_WORKER_FUNCTION=${TASK_ASSIGN_WORKER_FUNCTION:-task-assignment-worker}
TOPIC_NAME=${SNS_TASK_ASSIGN_TOPIC_NAME:-cirrusboard-task-assign}
QUEUE_NAME=${SQS_TASK_ASSIGN_QUEUE_NAME:-cirrusboard-task-assign-queue}
LAMBDA_ROLE_ARN=${LAMBDA_ROLE_ARN:-arn:aws:iam::${ACCOUNT_ID}:role/lambda-role}

create_lambda_zip() {
  name="$1"
  handler_body="$2"
  workdir="/tmp/${name}-lambda"
  zipfile="/tmp/${name}.zip"

  rm -rf "$workdir"
  mkdir -p "$workdir"
  printf "%s\n" "$handler_body" > "$workdir/index.js"

  python - <<PY
import zipfile
with zipfile.ZipFile("$zipfile", "w") as zf:
    zf.write("$workdir/index.js", "index.js")
PY
}

ensure_lambda_function() {
  name="$1"
  if awslocal lambda get-function --function-name "$name" >/dev/null 2>&1; then
    return
  fi

  create_lambda_zip "$name" "$2"
  awslocal lambda create-function \
    --function-name "$name" \
    --runtime nodejs20.x \
    --handler index.handler \
    --role "$LAMBDA_ROLE_ARN" \
    --zip-file "fileb:///tmp/${name}.zip" >/dev/null
}

create_bucket() {
  if awslocal s3api head-bucket --bucket "$S3_BUCKET_NAME" >/dev/null 2>&1; then
    return
  fi

  if [ "$AWS_REGION" = "us-east-1" ]; then
    awslocal s3api create-bucket --bucket "$S3_BUCKET_NAME" >/dev/null
  else
    awslocal s3api create-bucket \
      --bucket "$S3_BUCKET_NAME" \
      --create-bucket-configuration LocationConstraint="$AWS_REGION" >/dev/null
  fi
}

create_bucket

ensure_lambda_function "$IMAGE_RESIZE_FUNCTION" "exports.handler = async () => ({ ok: true });"
ensure_lambda_function "$TASK_ASSIGN_WORKER_FUNCTION" "exports.handler = async () => ({ ok: true });"

IMAGE_RESIZE_ARN="arn:aws:lambda:${AWS_REGION}:${ACCOUNT_ID}:function:${IMAGE_RESIZE_FUNCTION}"
TASK_ASSIGN_ARN="arn:aws:lambda:${AWS_REGION}:${ACCOUNT_ID}:function:${TASK_ASSIGN_WORKER_FUNCTION}"

awslocal lambda add-permission \
  --function-name "$IMAGE_RESIZE_FUNCTION" \
  --statement-id s3invoke \
  --action lambda:InvokeFunction \
  --principal s3.amazonaws.com \
  --source-arn "arn:aws:s3:::${S3_BUCKET_NAME}" >/dev/null 2>&1 || true

awslocal s3api put-bucket-notification-configuration \
  --bucket "$S3_BUCKET_NAME" \
  --notification-configuration "{\"LambdaFunctionConfigurations\":[{\"LambdaFunctionArn\":\"${IMAGE_RESIZE_ARN}\",\"Events\":[\"s3:ObjectCreated:*\"]}]}" >/dev/null 2>&1 || true

TOPIC_ARN=$(awslocal sns create-topic --name "$TOPIC_NAME" --query 'TopicArn' --output text)

awslocal sqs create-queue --queue-name "$QUEUE_NAME" >/dev/null
QUEUE_URL=$(awslocal sqs get-queue-url --queue-name "$QUEUE_NAME" --query 'QueueUrl' --output text)
QUEUE_ARN=$(awslocal sqs get-queue-attributes --queue-url "$QUEUE_URL" --attribute-names QueueArn --query 'Attributes.QueueArn' --output text)

POLICY=$(cat <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowSnsPublish",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "sqs:SendMessage",
      "Resource": "$QUEUE_ARN",
      "Condition": {
        "ArnEquals": {"aws:SourceArn": "$TOPIC_ARN"}
      }
    }
  ]
}
EOF
)

awslocal sqs set-queue-attributes --queue-url "$QUEUE_URL" --attributes Policy="$POLICY"
awslocal sns subscribe --topic-arn "$TOPIC_ARN" --protocol sqs --notification-endpoint "$QUEUE_ARN" >/dev/null

awslocal lambda create-event-source-mapping \
  --function-name "$TASK_ASSIGN_WORKER_FUNCTION" \
  --event-source-arn "$QUEUE_ARN" \
  --batch-size 10 >/dev/null 2>&1 || true

echo "LocalStack ready: bucket=$S3_BUCKET_NAME topic=$TOPIC_ARN queue=$QUEUE_URL"
