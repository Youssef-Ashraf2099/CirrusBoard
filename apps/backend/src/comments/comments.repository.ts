import { Injectable, Inject } from "@nestjs/common";
import {
  DynamoDBDocumentClient,
  PutCommand,
  QueryCommand,
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
}
