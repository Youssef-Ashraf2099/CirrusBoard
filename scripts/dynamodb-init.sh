#!/bin/sh
set -e

echo "Waiting for DynamoDB to be available at ${DYNAMODB_ENDPOINT:-http://dynamodb:8000}..."
attempts=0
until curl -s ${DYNAMODB_ENDPOINT:-http://dynamodb:8000} >/dev/null 2>&1; do
  attempts=$((attempts+1))
  if [ $attempts -ge 30 ]; then
    echo "DynamoDB did not become available after 30s, continuing anyway..."
    break
  fi
  sleep 1
done

echo "Creating Tasks table..."
aws dynamodb create-table --table-name "${TASKS_TABLE}" \
  --attribute-definitions AttributeName=taskId,AttributeType=S AttributeName=teamId,AttributeType=S AttributeName=assigneeId,AttributeType=S \
  --key-schema AttributeName=taskId,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST \
  --global-secondary-indexes '[{"IndexName":"teamId-index","KeySchema":[{"AttributeName":"teamId","KeyType":"HASH"}],"Projection":{"ProjectionType":"ALL"}},{"IndexName":"assigneeId-index","KeySchema":[{"AttributeName":"assigneeId","KeyType":"HASH"}],"Projection":{"ProjectionType":"ALL"}}]' \
  --endpoint-url "${DYNAMODB_ENDPOINT}" || true

echo "Creating Projects table..."
aws dynamodb create-table --table-name "${PROJECTS_TABLE}" \
  --attribute-definitions AttributeName=projectId,AttributeType=S AttributeName=teamId,AttributeType=S \
  --key-schema AttributeName=projectId,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST \
  --global-secondary-indexes '[{"IndexName":"teamId-index","KeySchema":[{"AttributeName":"teamId","KeyType":"HASH"}],"Projection":{"ProjectionType":"ALL"}}]' \
  --endpoint-url "${DYNAMODB_ENDPOINT}" || true

echo "Creating Comments table..."
aws dynamodb create-table --table-name "${COMMENTS_TABLE}" \
  --attribute-definitions AttributeName=commentId,AttributeType=S AttributeName=taskId,AttributeType=S \
  --key-schema AttributeName=commentId,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST \
  --global-secondary-indexes '[{"IndexName":"taskId-index","KeySchema":[{"AttributeName":"taskId","KeyType":"HASH"}],"Projection":{"ProjectionType":"ALL"}}]' \
  --endpoint-url "${DYNAMODB_ENDPOINT}" || true

echo "DynamoDB init complete."
