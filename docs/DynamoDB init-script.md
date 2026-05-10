# Document 1 — DynamoDB Initialization Script Documentation

# Purpose

The `dynamodb-init.sh` script is responsible for bootstrapping the local development database environment for the Mini-Jira AWS project.

The script automatically creates all required DynamoDB tables and indexes when the Docker environment starts.

This allows every team member to:

- run the project locally without manual AWS setup
- simulate the AWS cloud environment locally
- ensure all developers use the same database schema
- avoid inconsistent local environments
- accelerate onboarding and testing

---

# Why This Script Exists

Without the initialization script:

- every developer would manually create tables
- indexes could become inconsistent between machines
- onboarding becomes slow
- debugging becomes harder
- DynamoDB schema mismatches occur

The script guarantees:

- consistent schema creation
- deterministic local setup
- reproducible development environment

---

# Architecture Context

The project uses:

- Docker Compose
- DynamoDB Local
- LocalStack
- NestJS backend

The script runs automatically inside the `dynamodb-init` container.

---

# Execution Flow

```text
Docker Compose Starts
        ↓
DynamoDB Container Starts
        ↓
Initialization Script Waits for DynamoDB
        ↓
Tables Are Created
        ↓
GSIs Are Created
        ↓
Backend Can Safely Start
```

---

# Responsibilities of the Script

The script performs the following tasks:

| Responsibility           | Description                                     |
| ------------------------ | ----------------------------------------------- |
| Wait for DynamoDB        | Ensures DB container is reachable               |
| Create Tables            | Creates all required DynamoDB tables            |
| Create GSIs              | Creates Global Secondary Indexes                |
| Configure Local Endpoint | Connects to local DynamoDB instead of AWS cloud |
| Provide Idempotency      | Prevents crashing if tables already exist       |

---

# Tables Created

The script creates:

| Table         | Purpose                                |
| ------------- | -------------------------------------- |
| Users         | Stores users synchronized with Cognito |
| Teams         | Stores company teams                   |
| Projects      | Stores projects                        |
| Tasks         | Stores all task data                   |
| Comments      | Stores task comments                   |
| TaskAuditLogs | Stores immutable task history          |

---

# What the Script DOES NOT Do

The script DOES NOT define all attributes/columns.

This is intentional.

DynamoDB is schemaless except for:

- Partition Keys
- Sort Keys
- GSI indexed attributes

Therefore the script only defines:

- PK/SK
- GSI keys

Regular attributes such as:

- role
- status
- attachments
- priority
- cognitoSub
- audit metadata

are inserted dynamically by the NestJS backend.

---

# Important DynamoDB Concept

Unlike SQL databases:

```sql
CREATE TABLE users (
  id VARCHAR,
  role VARCHAR,
  email VARCHAR
)
```

DynamoDB does NOT require declaring all attributes.

Instead:

```json
{
  "PK": "USER#1",
  "role": "MANAGER",
  "email": "manager@company.com"
}
```

can be inserted directly.

---

# Why Only Indexed Attributes Are Declared

Attributes are declared only if they are used in:

- Primary Keys
- Sort Keys
- Global Secondary Indexes

Example:

```bash
--attribute-definitions \
  AttributeName=PK,AttributeType=S \
  AttributeName=email,AttributeType=S
```

Because:

- `PK` is indexed
- `email` is indexed through a GSI

But:

- `role`
- `name`
- `status`

are not indexed.

Therefore they are not declared.

---

# Docker Compose Integration

The initialization container:

```yaml
services:
  dynamodb-init:
    image: amazon/aws-cli:latest
```

runs the bootstrap script automatically.

---

# Local Development Benefits

Benefits:

- fully offline development
- AWS simulation without cloud cost
- isolated testing environment
- faster debugging
- easier CI/CD integration later

---

# Correct Local DynamoDB Verification Command

## Important Clarification

This command:

```bash
docker run --rm --network cirrusboard_default \
  -e AWS_ACCESS_KEY_ID=test \
  -e AWS_SECRET_ACCESS_KEY=test \
  -e AWS_REGION=us-east-1 \
  amazon/aws-cli dynamodb list-tables \
  --endpoint-url http://dynamodb:8000 \
  --region us-east-1 \
  --output table
```

DOES NOT create permanent resources.

It only:

- starts a temporary container
- executes the AWS CLI command
- lists existing tables
- removes the container automatically because of `--rm`

Therefore:

- there is nothing to undo
- no cleanup is required

---

# Updated Recommended Verification Command

```bash
docker run --rm \
  --network cirrusboard_default \
  -e AWS_ACCESS_KEY_ID=test \
  -e AWS_SECRET_ACCESS_KEY=test \
  -e AWS_REGION=us-east-1 \
  amazon/aws-cli \
  dynamodb list-tables \
  --endpoint-url http://dynamodb:8000 \
  --region us-east-1 \
  --output table
```

---

# Recommended Additional Verification Commands

## Describe Tasks Table

```bash
docker run --rm \
  --network cirrusboard_default \
  -e AWS_ACCESS_KEY_ID=test \
  -e AWS_SECRET_ACCESS_KEY=test \
  -e AWS_REGION=us-east-1 \
  amazon/aws-cli \
  dynamodb describe-table \
  --table-name Tasks \
  --endpoint-url http://dynamodb:8000
```

---

## Scan Tasks Table

```bash
docker run --rm \
  --network cirrusboard_default \
  -e AWS_ACCESS_KEY_ID=test \
  -e AWS_SECRET_ACCESS_KEY=test \
  -e AWS_REGION=us-east-1 \
  amazon/aws-cli \
  dynamodb scan \
  --table-name Tasks \
  --endpoint-url http://dynamodb:8000
```

---

# Final Objective of the Script

The script exists to simulate AWS DynamoDB infrastructure locally in a deterministic and repeatable way for all team members.

It is a local infrastructure bootstrap mechanism.

---

NOTE TO RESTART INITIAL SCRIPT:

```bash
docker compose down
docker compose up --build
```

---
