# Tasks table — `assigneeId` GSI

Employee task listing queries by assignee, then filters to `primaryTeamId` in application code.

## Create / verify in AWS Console

| Setting | Value |
|--------|--------|
| Index name | `assigneeId-index` |
| Partition key | `assigneeId` (String) |
| Projection | ALL |

Optional env override: `TASKS_ASSIGNEE_GSI=assigneeId-index`

Also ensure `teamId-index` exists (partition key `teamId`, projection ALL) for manager team filters.
