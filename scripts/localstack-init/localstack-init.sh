#!/usr/bin/env sh
set -eu

AWS_REGION=${AWS_REGION:-eu-north-1}
ACCOUNT_ID=${AWS_ACCOUNT_ID:-000000000000}
LOCALSTACK_ENDPOINT=${LOCALSTACK_ENDPOINT:-http://localstack:4566}
DYNAMODB_ENDPOINT=${DYNAMODB_ENDPOINT:-http://dynamodb:8000}
S3_ENDPOINT=${S3_ENDPOINT:-http://localstack:4566}
S3_FORCE_PATH_STYLE=${S3_FORCE_PATH_STYLE:-true}
TASKS_TABLE=${TASKS_TABLE:-Tasks}
TASK_AUDIT_LOGS_TABLE=${TASK_AUDIT_LOGS_TABLE:-TaskAuditLogs}
SES_FROM_ADDRESS=${SES_FROM_ADDRESS:-}
SES_TO_ADDRESS=${SES_TO_ADDRESS:-}
SES_ENDPOINT=${SES_ENDPOINT:-http://localstack:4566}
S3_BUCKET_NAME=${S3_BUCKET_NAME:-cirrusboard-upload}
IMAGE_RESIZE_FUNCTION=${IMAGE_RESIZE_FUNCTION:-image-resize}
TASK_ASSIGN_WORKER_FUNCTION=${TASK_ASSIGN_WORKER_FUNCTION:-task-assignment-worker}
TASK_AUDIT_LOG_FUNCTION=${TASK_AUDIT_LOG_FUNCTION:-task-audit-log}
COGNITO_USER_POOL_ID=${COGNITO_USER_POOL_ID:-local-pool}
COGNITO_USER_POOL_CLIENT_ID=${COGNITO_USER_POOL_CLIENT_ID:-local-client}
TOPIC_NAME=${SNS_TASK_ASSIGN_TOPIC_NAME:-cirrusboard-task-assign}
QUEUE_NAME=${SQS_TASK_ASSIGN_QUEUE_NAME:-cirrusboard-task-assign-queue}
LAMBDA_ROLE_ARN=${LAMBDA_ROLE_ARN:-arn:aws:iam::${ACCOUNT_ID}:role/lambda-role}
LAMBDA_DIST_DIR=${LAMBDA_DIST_DIR:-/opt/cirrusboard/dist}
LAMBDA_NODE_MODULES_DIR=${LAMBDA_NODE_MODULES_DIR:-/opt/cirrusboard/node_modules}

create_stub_zip() {
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

create_real_zip() {
  name="$1"
  handler_path="$2"
  zipfile="/tmp/${name}.zip"
  handler_file="${LAMBDA_DIST_DIR}/${handler_path}.js"

  if [ ! -f "$handler_file" ]; then
    return 1
  fi

  python - <<PY
import os
import zipfile

dist_dir = "${LAMBDA_DIST_DIR}"
node_modules = "${LAMBDA_NODE_MODULES_DIR}"
zip_path = "${zipfile}"

def add_dir(root, zf, prefix=""):
    for base, _, files in os.walk(root):
        for name in files:
            full_path = os.path.join(base, name)
            rel = os.path.relpath(full_path, root)
            arcname = os.path.join(prefix, rel) if prefix else rel
            zf.write(full_path, arcname)

with zipfile.ZipFile(zip_path, "w") as zf:
    add_dir(dist_dir, zf)
    if os.path.isdir(node_modules):
        add_dir(node_modules, zf, "node_modules")
PY
  return 0
}

ensure_lambda_function() {
  name="$1"
  handler_path="$2"
  stub_body="$3"
  env_vars="$4"

  if awslocal lambda get-function --function-name "$name" >/dev/null 2>&1; then
    return
  fi

  if create_real_zip "$name" "$handler_path"; then
    awslocal lambda create-function \
      --function-name "$name" \
      --runtime nodejs20.x \
      --handler "$handler_path" \
      --role "$LAMBDA_ROLE_ARN" \
      --zip-file "fileb:///tmp/${name}.zip" \
      --environment "$env_vars" >/dev/null
  else
    create_stub_zip "$name" "$stub_body"
    awslocal lambda create-function \
      --function-name "$name" \
      --runtime nodejs20.x \
      --handler index.handler \
      --role "$LAMBDA_ROLE_ARN" \
      --zip-file "fileb:///tmp/${name}.zip" \
      --environment "$env_vars" >/dev/null
  fi
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

echo "Waiting for LocalStack to become available at ${LOCALSTACK_ENDPOINT}..."
attempts=0
until curl -s ${LOCALSTACK_ENDPOINT}/_localstack/health | grep -q '"cognito-idp":'; do
  attempts=$((attempts+1))
  if [ $attempts -ge 30 ]; then
    echo "LocalStack Cognito service did not become available after 30 seconds."
    exit 1
  fi
  sleep 1
done
echo "LocalStack Cognito is ready."

echo "Creating Cognito User Pool..."
awslocal cognito-idp create-user-pool \
  --pool-name "MyUserPool" \
  --region "${AWS_REGION}" \
  --user-pool-tags "_custom_id_=${COGNITO_USER_POOL_ID}" || true

echo "Creating Cognito User Pool Client..."
awslocal cognito-idp create-user-pool-client \
  --user-pool-id "${COGNITO_USER_POOL_ID}" \
  --client-name "_custom_id_:${COGNITO_USER_POOL_CLIENT_ID}" \
  --region "${AWS_REGION}" || true

IMAGE_RESIZE_ENV="Variables={AWS_REGION=${AWS_REGION},TASKS_TABLE=${TASKS_TABLE},DYNAMODB_ENDPOINT=${DYNAMODB_ENDPOINT},S3_ENDPOINT=${S3_ENDPOINT},S3_FORCE_PATH_STYLE=${S3_FORCE_PATH_STYLE},AWS_ENDPOINT=${LOCALSTACK_ENDPOINT},LOCALSTACK_ENDPOINT=${LOCALSTACK_ENDPOINT}}"
TASK_ASSIGN_ENV="Variables={AWS_REGION=${AWS_REGION},SES_FROM_ADDRESS=${SES_FROM_ADDRESS},SES_TO_ADDRESS=${SES_TO_ADDRESS},SES_ENDPOINT=${SES_ENDPOINT},AWS_ENDPOINT=${LOCALSTACK_ENDPOINT},LOCALSTACK_ENDPOINT=${LOCALSTACK_ENDPOINT}}"
TASK_AUDIT_ENV="Variables={AWS_REGION=${AWS_REGION},TASK_AUDIT_LOGS_TABLE=${TASK_AUDIT_LOGS_TABLE},DYNAMODB_ENDPOINT=${DYNAMODB_ENDPOINT},AWS_ENDPOINT=${LOCALSTACK_ENDPOINT},LOCALSTACK_ENDPOINT=${LOCALSTACK_ENDPOINT}}"

ensure_lambda_function \
  "$IMAGE_RESIZE_FUNCTION" \
  "integrations/lambda/handlers/s3-image-resize.handler" \
  "exports.handler = async () => ({ ok: true });" \
  "$IMAGE_RESIZE_ENV"

ensure_lambda_function \
  "$TASK_ASSIGN_WORKER_FUNCTION" \
  "integrations/lambda/handlers/task-assignment.handler" \
  "exports.handler = async () => ({ ok: true });" \
  "$TASK_ASSIGN_ENV"

ensure_lambda_function \
  "$TASK_AUDIT_LOG_FUNCTION" \
  "integrations/lambda/handlers/task-audit-log.handler" \
  "exports.handler = async () => ({ ok: true });" \
  "$TASK_AUDIT_ENV"

IMAGE_RESIZE_ARN="arn:aws:lambda:${AWS_REGION}:${ACCOUNT_ID}:function:${IMAGE_RESIZE_FUNCTION}"
TASK_ASSIGN_ARN="arn:aws:lambda:${AWS_REGION}:${ACCOUNT_ID}:function:${TASK_ASSIGN_WORKER_FUNCTION}"
TASK_AUDIT_LOG_ARN="arn:aws:lambda:${AWS_REGION}:${ACCOUNT_ID}:function:${TASK_AUDIT_LOG_FUNCTION}"

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
