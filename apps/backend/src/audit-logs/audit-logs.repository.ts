import { Injectable, Inject, Logger } from '@nestjs/common';
import {
  DynamoDBDocumentClient,
  PutCommand,
  QueryCommand,
  ScanCommand,
} from '@aws-sdk/lib-dynamodb';
import { TaskAuditLogItem } from './audit-logs.model';

@Injectable()
export class AuditLogsRepository {
  private readonly logger = new Logger(AuditLogsRepository.name);

  constructor(
    @Inject('DYNAMO_CLIENT') private readonly client: DynamoDBDocumentClient,
    @Inject('TASK_AUDIT_LOGS_TABLE') private readonly tableName: string,
    @Inject('TASK_AUDIT_LOGS_TEAM_GSI')
    private readonly teamGsiName: string,
  ) {}

  async createAuditLog(
    taskId: string,
    action: string,
    actorId: string,
    options?: {
      oldValue?: string;
      newValue?: string;
      teamId?: string;
      target?: string;
      targetId?: string;
    },
  ): Promise<TaskAuditLogItem> {
    const now = new Date().toISOString();
    const item: TaskAuditLogItem = {
      PK: `TASK#${taskId}`,
      SK: `AUDIT#${now}`,
      action,
      actorId,
      oldValue: options?.oldValue,
      newValue: options?.newValue,
      createdAt: now,
      teamId: options?.teamId,
      target: options?.target ?? 'task',
      targetId: options?.targetId ?? taskId,
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
        ExpressionAttributeValues: {
          ':pk': `TASK#${taskId}`,
          ':skPrefix': 'AUDIT#',
        },
      }) as any,
    );
    const items = ((res as any).Items ?? []) as TaskAuditLogItem[];
    items.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return items;
  }

  async listByTeam(teamId: string, limit = 60): Promise<TaskAuditLogItem[]> {
    if (this.teamGsiName) {
      try {
        const res = await this.client.send(
          new QueryCommand({
            TableName: this.tableName,
            IndexName: this.teamGsiName,
            KeyConditionExpression: '#teamId = :teamId',
            ExpressionAttributeNames: { '#teamId': 'teamId' },
            ExpressionAttributeValues: { ':teamId': teamId },
            ScanIndexForward: false,
            Limit: limit,
          }) as any,
        );
        const items = ((res as any).Items ?? []) as TaskAuditLogItem[];
        return items.slice(0, limit);
      } catch (err) {
        this.logger.warn(
          `Team activity GSI query failed (${this.teamGsiName}), falling back to scan: ${
            err instanceof Error ? err.message : err
          }`,
        );
      }
    }

    const res = await this.client.send(
      new ScanCommand({
        TableName: this.tableName,
        FilterExpression: '#teamId = :teamId',
        ExpressionAttributeNames: { '#teamId': 'teamId' },
        ExpressionAttributeValues: { ':teamId': teamId },
        Limit: Math.max(limit * 4, 100),
      }) as any,
    );
    const items = ((res as any).Items ?? []) as TaskAuditLogItem[];
    items.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return items.slice(0, limit);
  }
}
