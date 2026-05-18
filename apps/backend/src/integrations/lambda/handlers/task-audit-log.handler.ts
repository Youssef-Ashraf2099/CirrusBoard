import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";

const tableName = process.env.TASK_AUDIT_LOGS_TABLE;
const region = process.env.AWS_REGION || "us-east-1";
const endpoint =
  process.env.DYNAMODB_ENDPOINT ||
  process.env.AWS_ENDPOINT ||
  process.env.LOCALSTACK_ENDPOINT;

const docClient = DynamoDBDocumentClient.from(
  new DynamoDBClient({
    region,
    ...(endpoint ? { endpoint } : {}),
  }),
);

const normalizeValue = (value: unknown) => {
  if (value === undefined || value === null) return undefined;
  return typeof value === "string" ? value : JSON.stringify(value);
};

export const handler = async (event: any) => {
  if (!tableName) {
    return { skipped: true, reason: "missing_table" };
  }

  const payload = event?.detail ?? event ?? {};
  const taskId = payload.taskId;
  const action = payload.action;
  const actorId = payload.actorId;

  if (!taskId || !action || !actorId) {
    return { skipped: true, reason: "missing_fields" };
  }

  const now = new Date().toISOString();
  const item = {
    PK: `TASK#${taskId}`,
    SK: `AUDIT#${now}`,
    action,
    actorId,
    oldValue: normalizeValue(payload.oldValue),
    newValue: normalizeValue(payload.newValue),
    createdAt: now,
  };

  await docClient.send(
    new PutCommand({
      TableName: tableName,
      Item: item,
    }) as any,
  );

  return { ok: true };
};
