import { Injectable, Inject } from '@nestjs/common';
import { DynamoDBDocumentClient, PutCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { TaskAuditLogItem } from './audit-logs.model';

@Injectable()
export class AuditLogsRepository {
  constructor(
    @Inject('DYNAMO_CLIENT') private readonly client: DynamoDBDocumentClient,
    @Inject('TASK_AUDIT_LOGS_TABLE') private readonly tableName: string,
  ) {}

  async createAuditLog(
    taskId: string,
    action: string,
    actorId: string,
    oldValue?: string,
    newValue?: string,
  ): Promise<TaskAuditLogItem> {
    const now = new Date().toISOString();
    const item: TaskAuditLogItem = {
      PK: `TASK#${taskId}`,
      SK: `AUDIT#${now}`,
      action,
      actorId,
      oldValue,
      newValue,
      createdAt: now,
    };

    await this.client.send(
      new PutCommand({ TableName: this.tableName, Item: item as any }) as any,
    );
    return item;
  }

  async getAuditLogsByTask(taskId: string): Promise<TaskAuditLogItem[]> {
    const res = await this.client.send(
      new QueryCommand({
        TableName: this.tableName,
        KeyConditionExpression: '#PK = :pk AND begins_with(#SK, :skPrefix)',
        ExpressionAttributeNames: { '#PK': 'PK', '#SK': 'SK' },
        ExpressionAttributeValues: { ':pk': `TASK#${taskId}`, ':skPrefix': 'AUDIT#' },
      }) as any,
    );
    return (res as any).Items ?? [];
  }
}
