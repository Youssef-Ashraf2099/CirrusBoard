import { Injectable, Inject } from "@nestjs/common";
import { randomUUID } from "crypto";
import {
  DynamoDBDocumentClient,
  PutCommand,
  GetCommand,
  UpdateCommand,
  DeleteCommand,
  QueryCommand,
} from "@aws-sdk/lib-dynamodb";
import { TaskItem } from "./tasks.model";

@Injectable()
export class TasksRepository {
  constructor(
    @Inject("DYNAMO_CLIENT") private readonly client: DynamoDBDocumentClient,
    @Inject("TASKS_TABLE") private readonly tableName: string,
  ) {}

  async createTask(task: TaskItem): Promise<TaskItem> {
    const now = new Date().toISOString();
    const id = task.taskId ?? randomUUID();
    const pk = `TASK#${id}`;

    const item: TaskItem = {
      PK: pk,
      taskId: id,
      projectId: task.projectId,
      teamId: task.teamId,
      assigneeId: task.assigneeId,
      title: task.title,
      description: task.description,
      status: task.status ?? "TODO",
      priority: task.priority ?? "MEDIUM",
      deadline: task.deadline ?? now.split("T")[0],
      createdBy: task.createdBy,
      createdAt: task.createdAt ?? now,
      updatedAt: now,
      deleted: task.deleted ?? false,
      latestThumbnailUrl: task.latestThumbnailUrl,
      attachments: task.attachments,
      statusDeadline: `${task.status ?? "TODO"}#${task.deadline ?? now.split("T")[0]}`,
    } as TaskItem;

    await this.client.send(
      new PutCommand({ TableName: this.tableName, Item: item }) as any,
    );
    return item;
  }

  async getTaskById(taskId: string): Promise<TaskItem | null> {
    const pk = `TASK#${taskId}`;
    const cmd = new GetCommand({ TableName: this.tableName, Key: { PK: pk } });
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

    // ensure statusDeadline is updated when status/deadline change
    if (updates.status || updates.deadline) {
      const status = updates.status ?? "TODO";
      const deadline =
        updates.deadline ?? new Date().toISOString().split("T")[0];
      idx += 1;
      const sdName = `#k${idx}`;
      const sdVal = `:v${idx}`;
      ExpressionAttributeNames[sdName] = "statusDeadline";
      ExpressionAttributeValues[sdVal] = `${status}#${deadline}`;
      setParts.push(`${sdName} = ${sdVal}`);
    }

    const UpdateExpression = setParts.length
      ? `SET ${setParts.join(", ")}`
      : undefined;

    const pk = `TASK#${taskId}`;

    const cmd = new UpdateCommand({
      TableName: this.tableName,
      Key: { PK: pk },
      UpdateExpression,
      ExpressionAttributeNames: Object.keys(ExpressionAttributeNames).length
        ? ExpressionAttributeNames
        : undefined,
      ExpressionAttributeValues: Object.keys(ExpressionAttributeValues).length
        ? ExpressionAttributeValues
        : undefined,
      ReturnValues: "ALL_NEW",
    }) as any;
    const res = await this.client.send(cmd);
    return (res as any).Attributes as TaskItem;
  }

  async deleteTask(taskId: string): Promise<void> {
    const pk = `TASK#${taskId}`;
    const cmd = new DeleteCommand({
      TableName: this.tableName,
      Key: { PK: pk },
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

  async updateAttachment(
    taskId: string,
    attachmentId: string,
    patch: Partial<
      Partial<TaskItem> & { size?: number; thumbnailKey?: string }
    >,
  ): Promise<TaskItem> {
    const task = await this.getTaskById(taskId);
    if (!task) throw new Error("Task not found");
    const attachments = task.attachments ?? [];
    const idx = attachments.findIndex((a) => a.attachmentId === attachmentId);
    if (idx === -1) throw new Error("Attachment not found");
    const updatedAtt = { ...attachments[idx], ...patch } as any;
    const newAttachments = [...attachments];
    newAttachments[idx] = updatedAtt;
    const updated = await this.updateTask(taskId, {
      attachments: newAttachments,
      updatedAt: new Date().toISOString(),
    });
    return updated;
  }
}
