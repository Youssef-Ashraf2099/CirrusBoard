import { Injectable, Inject } from "@nestjs/common";
import { randomUUID } from "crypto";
import {
  DynamoDBDocumentClient,
  PutCommand,
  ScanCommand,
} from "@aws-sdk/lib-dynamodb";
import { ActivityItem } from "./activity.model";

@Injectable()
export class ActivityRepository {
  constructor(
    @Inject("DYNAMO_CLIENT") private readonly client: DynamoDBDocumentClient,
    @Inject("ACTIVITY_TABLE") private readonly tableName: string,
  ) {}

  async create(input: Omit<ActivityItem, "PK" | "activityId">): Promise<ActivityItem> {
    const now = new Date().toISOString();
    const id = randomUUID();
    const item: ActivityItem = {
      PK: `ACTIVITY#${id}`,
      activityId: id,
      teamId: input.teamId,
      userId: input.userId,
      action: input.action,
      target: input.target,
      targetId: input.targetId,
      createdAt: now,
    };
    await this.client.send(
      new PutCommand({ TableName: this.tableName, Item: item }) as any,
    );
    return item;
  }

  async listByTeam(teamId: string, limit = 60): Promise<ActivityItem[]> {
    const res = await this.client.send(
      new ScanCommand({
        TableName: this.tableName,
        FilterExpression: "#t = :t",
        ExpressionAttributeNames: { "#t": "teamId" },
        ExpressionAttributeValues: { ":t": teamId },
      }) as any,
    );
    const items: ActivityItem[] = (res as any).Items ?? [];
    items.sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""));
    return items.slice(0, limit);
  }
}
