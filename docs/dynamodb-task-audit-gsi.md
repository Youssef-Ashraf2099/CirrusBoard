# TaskAuditLogs — team activity GSI

The **Activity** API (`GET /api/activity?teamId=…`) reads from **TaskAuditLogs**, not a separate `Activity` table.

Each audit row includes:

- `teamId` — GSI partition key for the team feed
- `target` — e.g. `task`, `attachment`
- `targetId` — entity id for the feed

## Create GSI (AWS CLI)

Replace `TaskAuditLogs` and region if needed:

```bash
aws dynamodb update-table \
  --table-name TaskAuditLogs \
  --attribute-definitions \
      AttributeName=teamId,AttributeType=S \
      AttributeName=createdAt,AttributeType=S \
  --global-secondary-index-updates \
    '[{
      "Create": {
        "IndexName": "TeamActivityIndex",
        "KeySchema": [
          {"AttributeName": "teamId", "KeyType": "HASH"},
          {"AttributeName": "createdAt", "KeyType": "RANGE"}
        ],
        "Projection": {"ProjectionType": "ALL"}
      }
    }]' \
  --region eu-north-1
```

Set on the API host:

```env
TASK_AUDIT_LOGS_TABLE=TaskAuditLogs
TASK_AUDIT_LOGS_TEAM_GSI=TeamActivityIndex
```

Without the GSI, the API falls back to a **scan** filtered by `teamId` (works for small datasets, slower at scale).
