# Mini-Jira on AWS — Complete DynamoDB Schema Reference

## Purpose

This document contains the finalized DynamoDB schema design for the Mini-Jira on AWS project.

It is intended to be the official implementation reference for:

- Backend developers
- Frontend developers
- DevOps engineers
- Cloud engineers
- QA team

The schema is optimized for:

- Multi-team isolation
- DynamoDB query efficiency
- AWS event-driven architecture
- High scalability
- Secure RBAC enforcement
- CloudWatch analytics

---

# Table of Contents

1. Users Table
2. Teams Table
3. Projects Table
4. Tasks Table
5. Comments Table
6. Task Audit Logs Table
7. DynamoDB Global Secondary Indexes (GSIs)
8. Relationships Between Tables
9. Required Backend Validation Rules
10. Example Access Patterns

---

# 1. USERS TABLE

## Table Name

```text
Users
```

---

# Purpose

Stores all authenticated users synchronized with AWS Cognito.

---

# Primary Key

| Key | Value |
|---|---|
| PK | USER#<userId> |

---

# Columns

| Column | Type | Mandatory | Description |
|---|---|---|---|
| PK | string | YES | Partition key |
| email | string | YES | User email |
| name | string | YES | Full name |
| role | string | YES | EMPLOYEE / MANAGER / ADMIN |
| primaryTeamId | string | YES | Main team |
| teamIds | string[] | YES | Accessible teams |
| cognitoSub | string | YES | Cognito user identifier |
| isActive | boolean | YES | User active status |
| createdAt | string | YES | ISO timestamp |
| updatedAt | string | YES | ISO timestamp |

---

# Example Item

```json
{
  "PK": "USER#u_1001",
  "email": "sara@company.com",
  "name": "Sara Ahmed",
  "role": "EMPLOYEE",
  "primaryTeamId": "TEAM#frontend",
  "teamIds": [
    "TEAM#frontend"
  ],
  "cognitoSub": "3f234af2-xxxx-xxxx",
  "isActive": true,
  "createdAt": "2026-05-01T10:00:00Z",
  "updatedAt": "2026-05-01T10:00:00Z"
}
```

---

# 2. TEAMS TABLE

## Table Name

```text
Teams
```

---

# Purpose

Stores all company teams.

Examples:

- Frontend
- Backend
- QA
- DevOps

---

# Primary Key

| Key | Value |
|---|---|
| PK | TEAM#<teamId> |

---

# Columns

| Column | Type | Mandatory | Description |
|---|---|---|---|
| PK | string | YES | Partition key |
| name | string | YES | Team name |
| description | string | NO | Team description |
| createdBy | string | YES | Creator user id |
| createdAt | string | YES | ISO timestamp |
| updatedAt | string | YES | ISO timestamp |

---

# Example Item

```json
{
  "PK": "TEAM#frontend",
  "name": "Frontend",
  "description": "Frontend Engineering Team",
  "createdBy": "USER#admin1",
  "createdAt": "2026-05-01T10:00:00Z",
  "updatedAt": "2026-05-01T10:00:00Z"
}
```

---

# 3. PROJECTS TABLE

## Table Name

```text
Projects
```

---

# Purpose

Stores company projects.

---

# Primary Key

| Key | Value |
|---|---|
| PK | PROJECT#<projectId> |

---

# Columns

| Column | Type | Mandatory | Description |
|---|---|---|---|
| PK | string | YES | Partition key |
| title | string | YES | Project title |
| description | string | NO | Project description |
| status | string | YES | ACTIVE / ARCHIVED |
| createdBy | string | YES | Creator user id |
| createdAt | string | YES | ISO timestamp |
| updatedAt | string | YES | ISO timestamp |

---

# Example Item

```json
{
  "PK": "PROJECT#jira-clone",
  "title": "Mini Jira",
  "description": "Cloud Computing Course Project",
  "status": "ACTIVE",
  "createdBy": "USER#manager1",
  "createdAt": "2026-05-01T10:00:00Z",
  "updatedAt": "2026-05-01T10:00:00Z"
}
```

---

# 4. TASKS TABLE

## Table Name

```text
Tasks
```

---

# Purpose

Stores all tasks and supports:

- Team isolation
- Kanban board
- Dashboard analytics
- Due-date queries
- Assignment queries

---

# Primary Key

| Key | Value |
|---|---|
| PK | TASK#<taskId> |

---

# Columns

| Column | Type | Mandatory | Description |
|---|---|---|---|
| PK | string | YES | Partition key |
| projectId | string | YES | Linked project |
| teamId | string | YES | Owning team |
| assigneeId | string | YES | Assigned user |
| title | string | YES | Task title |
| description | string | NO | Task description |
| status | string | YES | TODO / IN_PROGRESS / IN_REVIEW / DONE |
| priority | string | YES | LOW / MEDIUM / HIGH / CRITICAL |
| deadline | string | YES | Due date |
| createdBy | string | YES | Task creator |
| createdAt | string | YES | ISO timestamp |
| updatedAt | string | YES | ISO timestamp |
| deleted | boolean | YES | Soft delete flag |
| latestThumbnailUrl | string | NO | Latest image thumbnail |
| attachments | list | NO | Image/file metadata |

---

# Attachments Structure

```json
[
  {
    "attachmentId": "att_1",
    "originalKey": "tasks/originals/image1.png",
    "thumbnailKey": "tasks/thumbnails/thumb1.png",
    "uploadedAt": "2026-05-01T10:00:00Z",
    "version": 1
  }
]
```

---

# Example Item

```json
{
  "PK": "TASK#task123",
  "projectId": "PROJECT#jira-clone",
  "teamId": "TEAM#frontend",
  "assigneeId": "USER#u_1001",
  "title": "Implement Login Page",
  "description": "Create responsive login UI",
  "status": "TODO",
  "priority": "HIGH",
  "deadline": "2026-05-20",
  "createdBy": "USER#manager1",
  "createdAt": "2026-05-01T10:00:00Z",
  "updatedAt": "2026-05-01T10:00:00Z",
  "deleted": false,
  "latestThumbnailUrl": "https://cdn.company.com/thumb.png",
  "attachments": [
    {
      "attachmentId": "att_1",
      "originalKey": "tasks/originals/image1.png",
      "thumbnailKey": "tasks/thumbnails/thumb1.png",
      "uploadedAt": "2026-05-01T10:00:00Z",
      "version": 1
    }
  ]
}
```

---

# 5. COMMENTS TABLE

## Table Name

```text
Comments
```

---

# Purpose

Stores threaded comments for tasks.

Optimized for:

- chronological retrieval
- pagination
- scalability

---

# Primary Key

| Key | Value |
|---|---|
| PK | TASK#<taskId> |
| SK | COMMENT#<timestamp>#<commentId> |

---

# Columns

| Column | Type | Mandatory | Description |
|---|---|---|---|
| PK | string | YES | Parent task |
| SK | string | YES | Sort key |
| commentId | string | YES | Unique comment id |
| taskId | string | YES | Linked task |
| authorId | string | YES | Comment author |
| content | string | YES | Comment text |
| createdAt | string | YES | ISO timestamp |
| editedAt | string | NO | Edit timestamp |
| deleted | boolean | YES | Soft delete flag |

---

# Example Item

```json
{
  "PK": "TASK#task123",
  "SK": "COMMENT#2026-05-01T11:00:00Z#comment1",
  "commentId": "comment1",
  "taskId": "task123",
  "authorId": "USER#u_1001",
  "content": "Login page completed",
  "createdAt": "2026-05-01T11:00:00Z",
  "deleted": false
}
```

---

# 6. TASK AUDIT LOGS TABLE

## Table Name

```text
TaskAuditLogs
```

---

# Purpose

Stores immutable task activity history.

Used for:

- auditing
- dashboards
- activity feeds
- debugging
- compliance

---

# Primary Key

| Key | Value |
|---|---|
| PK | TASK#<taskId> |
| SK | AUDIT#<timestamp> |

---

# Columns

| Column | Type | Mandatory | Description |
|---|---|---|---|
| PK | string | YES | Parent task |
| SK | string | YES | Sort key |
| action | string | YES | Action name |
| actorId | string | YES | User who triggered action |
| oldValue | string | NO | Previous value |
| newValue | string | NO | Updated value |
| createdAt | string | YES | ISO timestamp |

---

# Example Item

```json
{
  "PK": "TASK#task123",
  "SK": "AUDIT#2026-05-01T11:30:00Z",
  "action": "STATUS_CHANGED",
  "actorId": "USER#u_1001",
  "oldValue": "TODO",
  "newValue": "IN_PROGRESS",
  "createdAt": "2026-05-01T11:30:00Z"
}
```

---

# 7. GLOBAL SECONDARY INDEXES (GSIs)

# Tasks Table GSIs

---

# GSI 1 — TeamIndex

## Purpose

Supports:

- Team isolation
- Kanban board queries
- Team dashboards

---

| Attribute | Value |
|---|---|
| Index Name | TeamIndex |
| Partition Key | teamId |
| Sort Key | createdAt |

---

# Example Query

```text
Get all Frontend team tasks
```

---

# GSI 2 — AssigneeIndex

## Purpose

Supports:

- User dashboard
- My tasks page

---

| Attribute | Value |
|---|---|
| Index Name | AssigneeIndex |
| Partition Key | assigneeId |
| Sort Key | status#deadline |

---

# Example Query

```text
Get all tasks assigned to Sara
```

---

# GSI 3 — StatusIndex

## Purpose

Supports:

- Analytics
- Reporting
- Dashboard metrics

---

| Attribute | Value |
|---|---|
| Index Name | StatusIndex |
| Partition Key | status |
| Sort Key | updatedAt |

---

# Example Query

```text
Get all DONE tasks
```

---

# GSI 4 — DueDateIndex

## Purpose

Supports:

- Daily digest Lambda
- Overdue tasks monitoring

---

| Attribute | Value |
|---|---|
| Index Name | DueDateIndex |
| Partition Key | deadline |
| Sort Key | assigneeId |

---

# Example Query

```text
Get all tasks due today
```

---

# 8. RELATIONSHIPS BETWEEN TABLES

| Source | Relationship | Target |
|---|---|---|
| User | belongs to | Team |
| User | assigned to | Tasks |
| Task | belongs to | Project |
| Task | belongs to | Team |
| Task | has many | Comments |
| Task | has many | Audit Logs |

---

# 9. REQUIRED BACKEND VALIDATION RULES

# Task Status Enum

```ts
export enum TaskStatus {
  TODO = 'TODO',
  IN_PROGRESS = 'IN_PROGRESS',
  IN_REVIEW = 'IN_REVIEW',
  DONE = 'DONE'
}
```

---

# Task Priority Enum

```ts
export enum TaskPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL'
}
```

---

# Role Enum

```ts
export enum UserRole {
  EMPLOYEE = 'EMPLOYEE',
  MANAGER = 'MANAGER',
  ADMIN = 'ADMIN'
}
```

---

# Team Isolation Enforcement

Mandatory backend validation:

```ts
if (user.role !== 'MANAGER') {
  if (task.teamId !== user.primaryTeamId) {
    throw ForbiddenException
  }
}
```

---

# 10. EXAMPLE ACCESS PATTERNS

| Use Case | Query Method |
|---|---|
| Get task by id | PK lookup |
| Get team tasks | TeamIndex |
| Get user tasks | AssigneeIndex |
| Get due tasks | DueDateIndex |
| Get task comments | PK query on Comments |
| Get task audit history | PK query on TaskAuditLogs |
| Get all done tasks | StatusIndex |

---

# FINAL IMPLEMENTATION NOTES

## Mandatory Requirements

- Use ISO timestamps only
- Use server-side RBAC validation
- Use Cognito JWT validation
- Use soft deletes
- Use DynamoDB Query operations instead of scans
- Store images in S3 only
- Never store binaries in DynamoDB

---

# FINAL APPROVED SCHEMA

This schema is the finalized implementation target for the Mini-Jira AWS project.

All backend services, APIs, Lambda functions, and frontend contracts should align with this document.

