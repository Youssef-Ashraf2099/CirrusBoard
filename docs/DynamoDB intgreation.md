
# Document 2 — How Attributes Are Inserted from NestJS Backend

# Purpose

This document explains how the NestJS backend inserts DynamoDB items using:

* DTOs
* Models
* Repository layer
* AWS SDK v3

---

# Architecture Flow

```text
HTTP Request
      ↓
Controller
      ↓
DTO Validation
      ↓
Service Layer
      ↓
Repository Layer
      ↓
AWS SDK v3
      ↓
DynamoDB
```

---

# Why DTOs Exist

DTOs (Data Transfer Objects) validate incoming API data.

DTOs ensure:

* required fields exist
* types are correct
* invalid requests are rejected
* backend remains secure

---

# Example DTO

## create-task.dto.ts

```ts
import {
  IsEnum,
  IsOptional,
  IsString,
} from 'class-validator';

import { TaskPriority } from '../../shared/enums/task-priority.enum';
import { TaskStatus } from '../../shared/enums/task-status.enum';

export class CreateTaskDto {
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsString()
  teamId: string;

  @IsString()
  assigneeId: string;

  @IsEnum(TaskStatus)
  status: TaskStatus;

  @IsEnum(TaskPriority)
  priority: TaskPriority;

  @IsString()
  deadline: string;
}
```

---

# Why Models Exist

Models define the internal application structure.

Benefits:

* strong typing
* IntelliSense
* predictable repository behavior
* reusable interfaces

---

# Example Model

## task.model.ts

```ts
export interface Task {
  PK: string;
  projectId: string;
  teamId: string;
  assigneeId: string;
  title: string;
  description?: string;
  status: string;
  priority: string;
  deadline: string;
  createdAt: string;
  updatedAt: string;
}
```

---

# Repository Layer Responsibility

Repositories communicate directly with DynamoDB.

Repositories should:

* isolate AWS SDK logic
* isolate query logic
* prevent AWS code duplication

---

# Example Repository Structure

```text
tasks/
├── dto/
├── models/
├── repositories/
│   └── tasks.repository.ts
├── tasks.service.ts
├── tasks.controller.ts
└── tasks.module.ts
```

---

# AWS SDK v3 Integration

The project uses:

```bash
@aws-sdk/client-dynamodb
@aws-sdk/lib-dynamodb
```

Recommended because:

* modular SDK
* smaller bundle size
* modern async API
* official AWS recommendation

---

# DynamoDB Client Configuration

## dynamodb.service.ts

```ts
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

const client = new DynamoDBClient({
  region: process.env.AWS_REGION,
  endpoint: process.env.DYNAMODB_ENDPOINT,
  credentials: {
    accessKeyId: 'test',
    secretAccessKey: 'test',
  },
});

export const dynamoDb = DynamoDBDocumentClient.from(client);
```

---

# Example Insert Operation

## tasks.repository.ts

```ts
import { PutCommand } from '@aws-sdk/lib-dynamodb';

async createTask(dto: CreateTaskDto) {
  const now = new Date().toISOString();

  const item = {
    PK: `TASK#${crypto.randomUUID()}`,
    projectId: dto.projectId,
    teamId: dto.teamId,
    assigneeId: dto.assigneeId,
    title: dto.title,
    description: dto.description,
    status: dto.status,
    priority: dto.priority,
    deadline: dto.deadline,
    createdAt: now,
    updatedAt: now,
    deleted: false,

    // Required for GSI sorting
    statusDeadline: `${dto.status}#${dto.deadline}`,
  };

  await dynamoDb.send(
    new PutCommand({
      TableName: process.env.TASKS_TABLE,
      Item: item,
    }),
  );

  return item;
}
```

---

# Why statusDeadline Exists

The `AssigneeIndex` uses:

```text
PK = assigneeId
SK = statusDeadline
```

Therefore:

```ts
statusDeadline = `${status}#${deadline}`
```

must be generated manually.

This is a DynamoDB optimization technique.

---

# Example Inserted DynamoDB Item

```json
{
  "PK": "TASK#123",
  "projectId": "PROJECT#jira-clone",
  "teamId": "TEAM#frontend",
  "assigneeId": "USER#u_1001",
  "title": "Create Login Page",
  "description": "Responsive login UI",
  "status": "TODO",
  "priority": "HIGH",
  "deadline": "2026-05-20",
  "statusDeadline": "TODO#2026-05-20",
  "createdAt": "2026-05-01T10:00:00Z",
  "updatedAt": "2026-05-01T10:00:00Z",
  "deleted": false
}
```

---

# Important DynamoDB Behavior

DynamoDB automatically accepts extra attributes.

Example:

```ts
Item: {
  PK: 'TASK#1',
  title: 'Task',
  customField: 'anything'
}
```

This works even if:

* `customField` was never declared in create-table

because DynamoDB is schemaless.

---

# Recommended Backend Layers

| Layer          | Responsibility        |
| -------------- | --------------------- |
| Controller     | Handle HTTP requests  |
| DTO            | Validate request body |
| Service        | Business logic        |
| Repository     | Database access       |
| Model          | Type definitions      |
| Infrastructure | AWS integrations      |

---

# Recommended Future Infrastructure Modules

```text
infrastructure/
├── dynamodb/
├── s3/
├── sns/
├── sqs/
├── cognito/
└── cloudwatch/
```

---

# Final Objective

The backend architecture is designed to:

* simulate AWS locally
* keep code modular
* isolate AWS integrations
* support DynamoDB access patterns correctly
* maintain strong typing with NestJS
* support future AWS deployment with minimal code changes
