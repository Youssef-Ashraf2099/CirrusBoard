import { Injectable, Inject } from "@nestjs/common";
import { randomUUID } from "crypto";
import {
  DynamoDBDocumentClient,
  PutCommand,
  GetCommand,
  DeleteCommand,
  ScanCommand,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";
import { NotificationItem } from "./notifications.model";

@Injectable()
export class NotificationsRepository {
  constructor(
    @Inject("DYNAMO_CLIENT") private readonly client: DynamoDBDocumentClient,
    @Inject("NOTIFICATIONS_TABLE") private readonly tableName: string,
  ) {}

  async create(
    partial: {
      userId: string;
      type: NotificationItem["type"];
      title: string;
      message: string;
      link?: string;
      read?: boolean;
      notificationId?: string;
    },
  ): Promise<NotificationItem> {
    const now = new Date().toISOString();
    const id = partial.notificationId ?? randomUUID();
    const item: NotificationItem = {
      PK: `NOTIF#${id}`,
      notificationId: id,
      userId: partial.userId,
      type: partial.type,
      title: partial.title,
      message: partial.message,
      read: partial.read ?? false,
      link: partial.link,
      createdAt: now,
    };
    await this.client.send(
      new PutCommand({ TableName: this.tableName, Item: item }) as any,
    );
    return item;
  }

  async getById(id: string): Promise<NotificationItem | null> {
    const res = await this.client.send(
      new GetCommand({
        TableName: this.tableName,
        Key: { PK: `NOTIF#${id}` },
      }) as any,
    );
    return (res as any).Item ?? null;
  }

  async listByUserId(userId: string): Promise<NotificationItem[]> {
    const res = await this.client.send(
      new ScanCommand({
        TableName: this.tableName,
        FilterExpression: "#u = :u",
        ExpressionAttributeNames: { "#u": "userId" },
        ExpressionAttributeValues: { ":u": userId },
      }) as any,
    );
    const items: NotificationItem[] = (res as any).Items ?? [];
    items.sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""));
    return items;
  }

  async patchRead(id: string, read: boolean): Promise<NotificationItem> {
    const pk = `NOTIF#${id}`;
    const res = await this.client.send(
      new UpdateCommand({
        TableName: this.tableName,
        Key: { PK: pk },
        UpdateExpression: "SET #r = :read",
        ExpressionAttributeNames: { "#r": "read" },
        ExpressionAttributeValues: { ":read": read },
        ReturnValues: "ALL_NEW",
      }) as any,
    );
    return (res as any).Attributes as NotificationItem;
  }

  async delete(id: string): Promise<void> {
    await this.client.send(
      new DeleteCommand({
        TableName: this.tableName,
        Key: { PK: `NOTIF#${id}` },
      }) as any,
    );
  }
}
