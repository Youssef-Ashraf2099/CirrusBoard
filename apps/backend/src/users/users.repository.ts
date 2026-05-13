import { Injectable, Inject } from "@nestjs/common";
import {
  DynamoDBDocumentClient,
  PutCommand,
  GetCommand,
  UpdateCommand,
  DeleteCommand,
  QueryCommand,
} from "@aws-sdk/lib-dynamodb";
import { UserItem } from "./users.model";
import { v4 as uuidv4 } from "uuid";

@Injectable()
export class UsersRepository {
  constructor(
    @Inject("DYNAMO_CLIENT") private readonly client: DynamoDBDocumentClient,
    @Inject("USERS_TABLE") private readonly tableName: string,
  ) {}

  async createUser(user: Partial<UserItem>): Promise<UserItem> {
    const now = new Date().toISOString();
    const id = user.userId ?? uuidv4();
    const pk = `USER#${id}`;
    const item: UserItem = {
      PK: pk,
      userId: id,
      email: user.email!,
      name: user.name ?? "",
      role: user.role ?? "EMPLOYEE",
      password: user.password,
      primaryTeamId: user.primaryTeamId,
      teamIds: user.teamIds ?? [],
      cognitoSub: user.cognitoSub,
      isActive: user.isActive ?? true,
      createdAt: user.createdAt ?? now,
      updatedAt: now,
    } as UserItem;

    await this.client.send(
      new PutCommand({ TableName: this.tableName, Item: item }) as any,
    );
    return item;
  }

  async getUserById(userId: string): Promise<UserItem | null> {
    const pk = `USER#${userId}`;
    const res = await this.client.send(
      new GetCommand({ TableName: this.tableName, Key: { PK: pk } }) as any,
    );
    return (res as any).Item ?? null;
  }

  async updateUser(
    userId: string,
    updates: Partial<UserItem>,
  ): Promise<UserItem> {
    const now = new Date().toISOString();
    const pk = `USER#${userId}`;
    const sanitized: Record<string, any> = {
      ...(updates as Record<string, any>),
    };
    delete sanitized.PK;
    delete sanitized.userId;
    sanitized.updatedAt = now;

    const ExpressionAttributeNames: Record<string, string> = {};
    const ExpressionAttributeValues: Record<string, any> = {};
    const setParts: string[] = [];
    let idx = 0;
    for (const [k, v] of Object.entries(sanitized)) {
      idx += 1;
      const nameKey = `#k${idx}`;
      const valKey = `:v${idx}`;
      ExpressionAttributeNames[nameKey] = k;
      ExpressionAttributeValues[valKey] = v;
      setParts.push(`${nameKey} = ${valKey}`);
    }
    if (setParts.length === 0) throw new Error("No updatable fields provided");
    const UpdateExpression = `SET ${setParts.join(", ")}`;
    const res = await this.client.send(
      new UpdateCommand({
        TableName: this.tableName,
        Key: { PK: pk },
        UpdateExpression,
        ExpressionAttributeNames,
        ExpressionAttributeValues,
        ReturnValues: "ALL_NEW",
      }) as any,
    );
    return (res as any).Attributes as UserItem;
  }

  async deleteUser(userId: string): Promise<void> {
    const pk = `USER#${userId}`;
    await this.client.send(
      new DeleteCommand({ TableName: this.tableName, Key: { PK: pk } }) as any,
    );
  }

  async queryUsersByTeam(
    teamId: string,
    indexName = "primaryTeamId-index",
  ): Promise<UserItem[]> {
    const res = await this.client.send(
      new QueryCommand({
        TableName: this.tableName,
        IndexName: indexName,
        KeyConditionExpression: "#primaryTeamId = :teamId",
        ExpressionAttributeNames: { "#primaryTeamId": "primaryTeamId" },
        ExpressionAttributeValues: { ":teamId": teamId },
      }) as any,
    );
    return (res as any).Items ?? [];
  }
}
