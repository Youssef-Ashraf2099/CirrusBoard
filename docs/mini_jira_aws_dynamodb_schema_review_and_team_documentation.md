# Mini-Jira on AWS — DynamoDB Schema Review & Team Documentation

## Objective

This document reviews the proposed DynamoDB schema for the Mini-Jira on AWS project, identifies architectural weaknesses, and proposes a production-grade DynamoDB design aligned with:

- AWS best practices
- Project functional requirements
- Team isolation requirements
- Scalability requirements
- Event-driven architecture requirements
- Future maintainability

This document is intended to serve as the official backend data-model reference for the team.

---

# 1. Executive Review of the Current Proposed Schema

## Current Strengths

The current schema already includes several correct architectural decisions:

- Separation of core entities:
  - Users
  - Teams
  - Projects
  - Tasks
  - Comments

- Correct use of:
  - teamId
  - assigneeId
  - audit logs
  - DynamoDB GSIs
  - S3 image references

- Awareness of:
  - Team isolation
  - Role-based access control
  - Query optimization
  - Lambda processing requirements

The overall direction is correct.

---

# 2. Critical Problems in the Current Schema

## Problem 1 — Comments Table Partition Key is Incorrect

### Current Design

```text
PK = taskId
SK = createdAt
```

### Why This Is Dangerous

This design causes a hot partition problem.

If one task becomes highly active:

- all comments hit one partition
- DynamoDB throttling risk increases
- scalability degrades

### Correct Design

Use:

```text
PK = TASK#<taskId>
SK = COMMENT#<timestamp>#<commentId>
```

Benefits:

- ordered retrieval
- no collision risk
- extensibility
- supports future entity types

---

## Problem 2 — User Team Relationship is Too Rigid

### Current Design

```text
teamId: string
```

### Problem

The requirements currently say one employee belongs to one team.

However:

- managers already span teams
- future extensibility is limited
- cross-functional assignments become difficult

### Recommended Design

Keep:

```text
primaryTeamId
```

Add:

```text
teamIds: string[]
```

This future-proofs the system.

---

## Problem 3 — Task Status Stored as Free String

### Current Design

```text
status: string
```

### Problem

This allows invalid states:

- "doing"
- "donee"
- "closed"

### Correct Design

Enforce enum validation at backend level:

```ts
export enum TaskStatus {
  TODO = 'TODO',
  IN_PROGRESS = 'IN_PROGRESS',
  IN_REVIEW = 'IN_REVIEW',
  DONE = 'DONE'
}
```

Store normalized values only.

---

## Problem 4 — Audit Log Embedded Inside Task Item

### Current Design

```text
auditLog: list<object>
```

### Why This Is Bad

DynamoDB item size limit:

```text
400 KB per item
```

Large audit histories will:

- bloat task reads
- increase cost
- eventually exceed limits

### Correct Design

Move audit logs into separate table.

---

## Problem 5 — No Support for Efficient Dashboard Queries

The current schema lacks:

- due-date indexing
- status analytics indexing
- metrics aggregation patterns

CloudWatch dashboards and daily digest Lambda will become inefficient.

---

## Problem 6 — Missing Multi-Image Support

Current design:

```text
originalImageUrl
resizedThumbnailUrl
```

This only supports one image.

Requirements mention:

- versioning
- replacement
- retained old versions

### Correct Design

Use attachments array.

---

# 3. Recommended Production-Grade DynamoDB Design

---

# 3.1 USERS TABLE

## Table Name

```text
Users
```

## Purpose

Stores authenticated users synced with Cognito.

---

## Schema

| Attribute | Type | Description |
|---|---|---|
| PK | string | USER#<userId> |
| email | string | unique email |
| name | string | full name |
| role | string | ADMIN / MANAGER / EMPLOYEE |
| primaryTeamId | string | main team |
| teamIds | string[] | accessible teams |
| createdAt | string | ISO timestamp |
| updatedAt | string | ISO timestamp |
| cognitoSub | string | Cognito user id |
| isActive | boolean | active flag |

---

## Example

```json
{
  "PK": "USER#u_123",
  "email": "sara@company.com",
  "name": "Sara Ahmed",
  "role": "EMPLOYEE",
  "primaryTeamId": "TEAM#frontend",
  "teamIds": ["TEAM#frontend"],
  "createdAt": "2026-05-01T10:00:00Z",
  "updatedAt": "2026-05-01T10:00:00Z",
  "isActive": true
}
```

---

# 3.2 TEAMS TABLE

## Table Name

```text
Teams
```

## Schema

| Attribute | Type |
|---|---|
| PK | string |
| name | string |
| description | string |
| createdAt | string |
| createdBy | string |

---

## Example

```json
{
  "PK": "TEAM#frontend",
  "name": "Frontend",
  "description": "Frontend Engineering Team",
  "createdAt": "2026-05-01T10:00:00Z",
  "createdBy": "USER#admin"
}
```

---

# 3.3 PROJECTS TABLE

## Table Name

```text
Projects
```

## Schema

| Attribute | Type |
|---|---|
| PK | string |
| title | string |
| description | string |
| createdBy | string |
| createdAt | string |
| updatedAt | string |
| status | string |

---

## Example

```json
{
  "PK": "PROJECT#jira-clone",
  "title": "Mini Jira",
  "description": "Cloud Computing Project",
  "createdBy": "USER#manager1",
  "createdAt": "2026-05-01T10:00:00Z",
  "updatedAt": "2026-05-01T10:00:00Z",
  "status": "ACTIVE"
}
```

---

# 3.4 TASKS TABLE

## Table Name

```text
Tasks
```

This is the most important table in the system.

---

# Core Access Patterns

The schema is optimized for:

- Get task by ID
- Get tasks by team
- Get tasks by assignee
- Get tasks by status
- Daily due-task scans
- Manager analytics
- Kanban board queries
- Team dashboards

---

# Schema

| Attribute | Type | Description |
|---|---|---|
| PK | string | TASK#<taskId> |
| projectId | string | linked project |
| teamId | string | owning team |
| assigneeId | string | assigned user |
| title | string | task title |
| description | string | task description |
| status | string | normalized enum |
| priority | string | LOW / MEDIUM / HIGH / CRITICAL |
| deadline | string | ISO date |
| createdBy | string | creator |
| createdAt | string | ISO timestamp |
| updatedAt | string | ISO timestamp |
| attachments | list | file metadata |
| latestThumbnailUrl | string | optimized UI thumbnail |
| deleted | boolean | soft delete |

---

# Attachments Structure

```json
"attachments": [
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

# Recommended GSIs

## GSI 1 — TeamIndex

### Purpose

Team isolation + Kanban board.

| Field | Value |
|---|---|
| PK | teamId |
| SK | createdAt |

---

## GSI 2 — AssigneeIndex

### Purpose

Fetch all tasks assigned to user.

| Field | Value |
|---|---|
| PK | assigneeId |
| SK | status#deadline |

---

## GSI 3 — StatusIndex

### Purpose

Dashboard metrics.

| Field | Value |
|---|---|
| PK | status |
| SK | updatedAt |

---

## GSI 4 — DueDateIndex

### Purpose

Daily digest Lambda.

| Field | Value |
|---|---|
| PK | dueDate |
| SK | assigneeId |

---

# Example Task Item

```json
{
  "PK": "TASK#task123",
  "projectId": "PROJECT#jira-clone",
  "teamId": "TEAM#frontend",
  "assigneeId": "USER#sara",
  "title": "Implement Login UI",
  "description": "Create responsive login page",
  "status": "TODO",
  "priority": "HIGH",
  "deadline": "2026-05-20",
  "createdBy": "USER#manager1",
  "createdAt": "2026-05-01T10:00:00Z",
  "updatedAt": "2026-05-01T10:00:00Z",
  "deleted": false
}
```

---

# 3.5 COMMENTS TABLE

## Table Name

```text
Comments
```

---

# Schema

| Attribute | Type |
|---|---|
| PK | string |
| SK | string |
| commentId | string |
| taskId | string |
| authorId | string |
| content | string |
| createdAt | string |
| editedAt | string |
| deleted | boolean |

---

# Key Structure

```text
PK = TASK#<taskId>
SK = COMMENT#<timestamp>#<commentId>
```

---

# Why This Design Is Better

Benefits:

- comments naturally sorted
- infinite scalability
- avoids collisions
- efficient pagination
- chronological retrieval

---

# Example Comment

```json
{
  "PK": "TASK#task123",
  "SK": "COMMENT#2026-05-01T10:00:00Z#comment1",
  "commentId": "comment1",
  "taskId": "task123",
  "authorId": "USER#sara",
  "content": "Login UI completed",
  "createdAt": "2026-05-01T10:00:00Z",
  "deleted": false
}
```

---

# 3.6 TASK AUDIT LOG TABLE

## Table Name

```text
TaskAuditLogs
```

---

# Purpose

Stores immutable task history.

Critical for:

- accountability
- debugging
- metrics
- activity feeds
- compliance

---

# Schema

| Attribute | Type |
|---|---|
| PK | string |
| SK | string |
| action | string |
| actorId | string |
| oldValue | string |
| newValue | string |
| createdAt | string |

---

# Example

```json
{
  "PK": "TASK#task123",
  "SK": "AUDIT#2026-05-01T10:10:00Z",
  "action": "STATUS_CHANGED",
  "actorId": "USER#sara",
  "oldValue": "TODO",
  "newValue": "IN_PROGRESS",
  "createdAt": "2026-05-01T10:10:00Z"
}
```

---

# 4. Security Architecture Requirements

---

# 4.1 Team Isolation Enforcement

This MUST happen server-side.

Frontend filtering alone is NOT security.

---

# Required Backend Validation

Every task read/update operation MUST:

1. Extract JWT token
2. Validate Cognito token
3. Extract:
   - role
   - teamId
   - userId
4. Enforce:

```ts
if (user.role !== 'MANAGER') {
  if (task.teamId !== user.primaryTeamId) {
    throw ForbiddenException
  }
}
```

---

# 4.2 Recommended Authorization Matrix

| Operation | Employee | Manager | Admin |
|---|---|---|---|
| Read own team tasks | YES | YES | YES |
| Read other team tasks | NO | YES | YES |
| Create task | NO | YES | YES |
| Delete task | NO | YES | YES |
| Comment | YES | YES | YES |
| Change status | YES | YES | YES |
| Create teams | NO | NO | YES |

---

# 5. Recommended AWS Event Architecture

---

# Task Assignment Flow

```text
Manager Creates Task
        ↓
Backend API
        ↓
SNS Topic
        ↓
 ┌───────────────┬────────────────┐
 ↓               ↓
Email        SQS Queue
                 ↓
         Worker Lambda
                 ↓
      CloudWatch Metrics
                 ↓
         Activity Logs
```

---

# 6. DynamoDB Best Practices Applied

---

## Use ISO Dates

Always:

```text
2026-05-01T10:00:00Z
```

Benefits:

- sortable
- queryable
- timezone-safe

---

## Avoid Full Table Scans

All major operations should use:

- PK lookups
- GSIs
- Query operations

NOT scans.

---

## Prefer Soft Deletes

Use:

```json
"deleted": true
```

instead of hard deletion.

Benefits:

- recovery
- auditability
- safer debugging

---

## Keep Items Small

Never embed:

- huge arrays
- full logs
- image binaries

inside DynamoDB items.

---

# 7. Recommended Backend Folder Structure

```text
src/
├── modules/
│   ├── auth/
│   ├── users/
│   ├── teams/
│   ├── projects/
│   ├── tasks/
│   ├── comments/
│   ├── uploads/
│   ├── notifications/
│   └── analytics/
│
├── shared/
│   ├── aws/
│   ├── guards/
│   ├── middleware/
│   ├── types/
│   └── utils/
│
├── lambdas/
│   ├── image-resize/
│   ├── assignment-worker/
│   └── daily-digest/
│
└── infrastructure/
    ├── terraform/
    └── cloudformation/
```

---

# 8. Final Recommended Technology Stack

## Frontend

- REACT.js
- TypeScript
- TailwindCSS
- shadcn/ui
- DnD Kit
- TanStack Query

---

## Backend

- NestJS
- TypeScript
- AWS SDK v3
- JWT validation middleware

---

## Infrastructure

- Terraform or AWS CDK
- Docker
- GitHub Actions CI/CD

---

# 9. Final Architecture Decision

## Recommended Decision

DO NOT keep the original schema unchanged.

The proposed schema is acceptable for:

- classroom demos
- prototypes

But it is NOT robust enough for:

- scaling
- analytics
- clean AWS architecture
- long-term maintainability

The revised schema in this document should be considered the official implementation target.

---

# 10. Immediate Team Action Items

## Backend Team

- Implement revised DynamoDB schema
- Add DTO validation
- Add RBAC middleware
- Add GSI query services

---

## DevOps Team

- Create DynamoDB tables + GSIs
- Configure IAM permissions
- Configure Lambda triggers
- Configure CloudWatch dashboard

---

## Frontend Team

- Align API contracts with new schema
- Support attachment arrays
- Implement Kanban filtering
- Add optimistic updates

---

## Security Requirements

Mandatory:

- Cognito JWT validation
- Server-side authorization
- Input validation
- Least privilege IAM
- S3 signed URLs
- Rate limiting

---

# 11. Final Verdict

The revised schema:

- satisfies all assignment requirements
- supports proper DynamoDB access patterns
- scales significantly better
- improves maintainability
- improves security
- improves analytics capability
- supports event-driven AWS architecture correctly

This design is now aligned with:

- real-world SaaS architecture patterns
- AWS serverless design principles
- production-grade DynamoDB modeling
- secure multi-tenant backend systems

