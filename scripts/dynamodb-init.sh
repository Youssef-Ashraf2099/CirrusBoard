#!/bin/sh
set -e

DYNAMODB_ENDPOINT=${DYNAMODB_ENDPOINT:-http://dynamodb:8000}
AWS_REGION=${AWS_REGION:-eu-north-1}
USERS_TABLE=${USERS_TABLE:-Users}
TEAMS_TABLE=${TEAMS_TABLE:-Teams}
PROJECTS_TABLE=${PROJECTS_TABLE:-Projects}
TASKS_TABLE=${TASKS_TABLE:-Tasks}
COMMENTS_TABLE=${COMMENTS_TABLE:-Comments}
TASK_AUDIT_LOGS_TABLE=${TASK_AUDIT_LOGS_TABLE:-TaskAuditLogs}

########################################################
# HEALTH CHECKS
########################################################

echo "Waiting for DynamoDB to become available at ${DYNAMODB_ENDPOINT}..."
attempts=0
until curl -s ${DYNAMODB_ENDPOINT} >/dev/null 2>&1; do
  attempts=$((attempts+1))
  if [ $attempts -ge 30 ]; then
    echo "DynamoDB did not become available after 30 seconds."
    exit 1
  fi
  sleep 1
done
echo "DynamoDB is ready."

########################################################
# USERS TABLE
########################################################

echo "Creating Users table..."

aws dynamodb create-table \
  --table-name "${USERS_TABLE}" \
  --attribute-definitions \
      AttributeName=PK,AttributeType=S \
      AttributeName=email,AttributeType=S \
      AttributeName=primaryTeamId,AttributeType=S \
  --key-schema \
      AttributeName=PK,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST \
  --global-secondary-indexes '[
    {
      "IndexName": "EmailIndex",
      "KeySchema": [
        {
          "AttributeName": "email",
          "KeyType": "HASH"
        }
      ],
      "Projection": {
        "ProjectionType": "ALL"
      }
    },
    {
      "IndexName": "primaryTeamId-index",
      "KeySchema": [
        {
          "AttributeName": "primaryTeamId",
          "KeyType": "HASH"
        }
      ],
      "Projection": {
        "ProjectionType": "ALL"
      }
    }
  ]' \
  --endpoint-url "${DYNAMODB_ENDPOINT}" || true

########################################################
# TEAMS TABLE
########################################################

echo "Creating Teams table..."

aws dynamodb create-table \
  --table-name "${TEAMS_TABLE}" \
  --attribute-definitions \
      AttributeName=PK,AttributeType=S \
      AttributeName=name,AttributeType=S \
  --key-schema \
      AttributeName=PK,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST \
  --global-secondary-indexes '[
    {
      "IndexName": "TeamNameIndex",
      "KeySchema": [
        {
          "AttributeName": "name",
          "KeyType": "HASH"
        }
      ],
      "Projection": {
        "ProjectionType": "ALL"
      }
    }
  ]' \
  --endpoint-url "${DYNAMODB_ENDPOINT}" || true

########################################################
# PROJECTS TABLE
########################################################

echo "Creating Projects table..."

aws dynamodb create-table \
  --table-name "${PROJECTS_TABLE}" \
  --attribute-definitions \
      AttributeName=PK,AttributeType=S \
      AttributeName=status,AttributeType=S \
      AttributeName=teamId,AttributeType=S \
  --key-schema \
      AttributeName=PK,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST \
  --global-secondary-indexes '[
    {
      "IndexName": "ProjectStatusIndex",
      "KeySchema": [
        {
          "AttributeName": "status",
          "KeyType": "HASH"
        }
      ],
      "Projection": {
        "ProjectionType": "ALL"
      }
    },
    {
      "IndexName": "teamId-index",
      "KeySchema": [
        {
          "AttributeName": "teamId",
          "KeyType": "HASH"
        }
      ],
      "Projection": {
        "ProjectionType": "ALL"
      }
    }
  ]' \
  --endpoint-url "${DYNAMODB_ENDPOINT}" || true

########################################################
# TASKS TABLE
########################################################

echo "Creating Tasks table..."

aws dynamodb create-table \
  --table-name "${TASKS_TABLE}" \
  --attribute-definitions \
      AttributeName=PK,AttributeType=S \
      AttributeName=teamId,AttributeType=S \
      AttributeName=assigneeId,AttributeType=S \
      AttributeName=status,AttributeType=S \
      AttributeName=deadline,AttributeType=S \
      AttributeName=createdAt,AttributeType=S \
      AttributeName=statusDeadline,AttributeType=S \
  --key-schema \
      AttributeName=PK,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST \
  --global-secondary-indexes '[
    {
      "IndexName": "teamId-index",
      "KeySchema": [
        {
          "AttributeName": "teamId",
          "KeyType": "HASH"
        },
        {
          "AttributeName": "createdAt",
          "KeyType": "RANGE"
        }
      ],
      "Projection": {
        "ProjectionType": "ALL"
      }
    },
    {
      "IndexName": "AssigneeIndex",
      "KeySchema": [
        {
          "AttributeName": "assigneeId",
          "KeyType": "HASH"
        },
        {
          "AttributeName": "statusDeadline",
          "KeyType": "RANGE"
        }
      ],
      "Projection": {
        "ProjectionType": "ALL"
      }
    },
    {
      "IndexName": "StatusIndex",
      "KeySchema": [
        {
          "AttributeName": "status",
          "KeyType": "HASH"
        },
        {
          "AttributeName": "createdAt",
          "KeyType": "RANGE"
        }
      ],
      "Projection": {
        "ProjectionType": "ALL"
      }
    },
    {
      "IndexName": "DueDateIndex",
      "KeySchema": [
        {
          "AttributeName": "deadline",
          "KeyType": "HASH"
        },
        {
          "AttributeName": "assigneeId",
          "KeyType": "RANGE"
        }
      ],
      "Projection": {
        "ProjectionType": "ALL"
      }
    }
  ]' \
  --endpoint-url "${DYNAMODB_ENDPOINT}" || true

########################################################
# COMMENTS TABLE
########################################################

echo "Creating Comments table..."

aws dynamodb create-table \
  --table-name "${COMMENTS_TABLE}" \
  --attribute-definitions \
      AttributeName=PK,AttributeType=S \
      AttributeName=SK,AttributeType=S \
      AttributeName=authorId,AttributeType=S \
  --key-schema \
      AttributeName=PK,KeyType=HASH \
      AttributeName=SK,KeyType=RANGE \
  --billing-mode PAY_PER_REQUEST \
  --global-secondary-indexes '[
    {
      "IndexName": "AuthorIndex",
      "KeySchema": [
        {
          "AttributeName": "authorId",
          "KeyType": "HASH"
        }
      ],
      "Projection": {
        "ProjectionType": "ALL"
      }
    }
  ]' \
  --endpoint-url "${DYNAMODB_ENDPOINT}" || true

########################################################
# TASK AUDIT LOGS TABLE
########################################################

echo "Creating TaskAuditLogs table..."

aws dynamodb create-table \
  --table-name "${TASK_AUDIT_LOGS_TABLE}" \
  --attribute-definitions \
      AttributeName=PK,AttributeType=S \
      AttributeName=SK,AttributeType=S \
      AttributeName=actorId,AttributeType=S \
  --key-schema \
      AttributeName=PK,KeyType=HASH \
      AttributeName=SK,KeyType=RANGE \
  --billing-mode PAY_PER_REQUEST \
  --global-secondary-indexes '[
    {
      "IndexName": "ActorIndex",
      "KeySchema": [
        {
          "AttributeName": "actorId",
          "KeyType": "HASH"
        }
      ],
      "Projection": {
        "ProjectionType": "ALL"
      }
    }
  ]' \
  --endpoint-url "${DYNAMODB_ENDPOINT}" || true

########################################################
# DONE
########################################################

echo "========================================="
echo "AWS Services initialization completed."
echo "========================================="
