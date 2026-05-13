import { Injectable, Inject } from "@nestjs/common";
import {
  DynamoDBDocumentClient,
  PutCommand,
  QueryCommand,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";
import { CommentItem } from "./comments.model";

@Injectable()
export class CommentsRepository {
  constructor(
    @Inject("DYNAMO_CLIENT") private readonly client: DynamoDBDocumentClient,
    @Inject("COMMENTS_TABLE") private readonly tableName: string,
  ) {}

  async createComment(comment: Partial<CommentItem>): Promise<CommentItem> {
    const now = new Date().toISOString();
    const id = comment.commentId ?? (Math.random() + "").slice(2);
    const pk = `TASK#${comment.taskId}`;
    const sk = `COMMENT#${now}#${id}`;
    const item: CommentItem = {
      PK: pk,
      SK: sk,
      commentId: id,
      taskId: comment.taskId,
      authorId: comment.authorId,
      content: comment.content,
      createdAt: now,
      editedAt: comment.editedAt,
      deleted: comment.deleted ?? false,
    } as CommentItem;

    await this.client.send(
      new PutCommand({ TableName: this.tableName, Item: item }) as any,
    );
    return item;
  }

  async queryCommentsByTask(
    taskId: string,
    indexName = "taskId-index",
  ): Promise<CommentItem[]> {
    // Primary access pattern: query by PK = TASK#<taskId> and SK begins_with COMMENT#
    const pk = `TASK#${taskId}`;
    const res = await this.client.send(
      new QueryCommand({
        TableName: this.tableName,
        KeyConditionExpression:
          "#PK = :PK AND begins_with(#SK, :commentPrefix)",
        ExpressionAttributeNames: { "#PK": "PK", "#SK": "SK" },
        ExpressionAttributeValues: { ":PK": pk, ":commentPrefix": "COMMENT#" },
      }) as any,
    );
    return (res as any).Items ?? [];
  }

  async getComment(taskId: string, commentId: string): Promise<CommentItem | null> {
    const comments = await this.queryCommentsByTask(taskId);
    return comments.find(c => c.commentId === commentId && !c.deleted) || null;
  }

  async updateComment(taskId: string, commentId: string, content: string): Promise<CommentItem> {
    const comment = await this.getComment(taskId, commentId);
    if (!comment) throw new Error("Comment not found");

    const now = new Date().toISOString();
    const res = await this.client.send(
      new UpdateCommand({
        TableName: this.tableName,
        Key: { PK: comment.PK, SK: comment.SK },
        UpdateExpression: "SET content = :content, editedAt = :editedAt",
        ExpressionAttributeValues: {
          ":content": content,
          ":editedAt": now,
        },
        ReturnValues: "ALL_NEW",
      }) as any,
    );
    return (res as any).Attributes as CommentItem;
  }

  async deleteComment(taskId: string, commentId: string): Promise<void> {
    const comment = await this.getComment(taskId, commentId);
    if (!comment) throw new Error("Comment not found");

    await this.client.send(
      new UpdateCommand({
        TableName: this.tableName,
        Key: { PK: comment.PK, SK: comment.SK },
        UpdateExpression: "SET deleted = :deleted",
        ExpressionAttributeValues: {
          ":deleted": true,
        },
      }) as any,
    );
  }
}
