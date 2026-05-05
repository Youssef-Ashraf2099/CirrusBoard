import { Injectable, Inject } from "@nestjs/common";
import {
  DynamoDBDocumentClient,
  PutCommand,
  GetCommand,
  UpdateCommand,
  DeleteCommand,
  QueryCommand,
} from "@aws-sdk/lib-dynamodb";
import { TaskItem } from "./tasks.types";

@Injectable()
export class TasksRepository {
  constructor(
    @Inject("DYNAMO_CLIENT") private readonly client: DynamoDBDocumentClient,
    @Inject("TASKS_TABLE") private readonly tableName: string,
  ) {}

  async createTask(task: TaskItem): Promise<TaskItem> {
    const cmd = new PutCommand({ TableName: this.tableName, Item: task });
    await this.client.send(cmd as any);
    return task;
  }

  async getTaskById(taskId: string): Promise<TaskItem | null> {
    const cmd = new GetCommand({ TableName: this.tableName, Key: { taskId } });
    const res = await this.client.send(cmd as any);
    return (res as any).Item ?? null;
  }

  async updateTask(
    taskId: string,
    updates: Partial<TaskItem>,
  ): Promise<TaskItem> {
    // Build update expression
    const ExpressionAttributeNames: Record<string, string> = {};
    const ExpressionAttributeValues: Record<string, any> = {};
    const setParts: string[] = [];
    let idx = 0;
    for (const [k, v] of Object.entries(updates)) {
      idx += 1;
      const nameKey = `#k${idx}`;
      const valKey = `:v${idx}`;
      ExpressionAttributeNames[nameKey] = k;
      ExpressionAttributeValues[valKey] = v;
      setParts.push(`${nameKey} = ${valKey}`);
    }

    const UpdateExpression = setParts.length
      ? `SET ${setParts.join(", ")}`
      : undefined;

    const cmd = new UpdateCommand({
      TableName: this.tableName,
      Key: { taskId },
      UpdateExpression,
      ExpressionAttributeNames: Object.keys(ExpressionAttributeNames).length
        ? ExpressionAttributeNames
        : undefined,
      ExpressionAttributeValues: Object.keys(ExpressionAttributeValues).length
        ? ExpressionAttributeValues
        : undefined,
      ReturnValues: "ALL_NEW",
    });
    const res = await this.client.send(cmd as any);
    return (res as any).Attributes as TaskItem;
  }

  async deleteTask(taskId: string): Promise<void> {
    const cmd = new DeleteCommand({
      TableName: this.tableName,
      Key: { taskId },
    });
    await this.client.send(cmd as any);
  }

  async queryTasksByTeamId(
    teamId: string,
    indexName = "teamId-index",
  ): Promise<TaskItem[]> {
    const cmd = new QueryCommand({
      TableName: this.tableName,
      IndexName: indexName,
      KeyConditionExpression: "#teamId = :teamId",
      ExpressionAttributeNames: { "#teamId": "teamId" },
      ExpressionAttributeValues: { ":teamId": teamId },
    });
    const res = await this.client.send(cmd as any);
    return (res as any).Items ?? [];
  }
}
