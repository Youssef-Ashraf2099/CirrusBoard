import { Injectable, Inject } from "@nestjs/common";
import {
  DynamoDBDocumentClient,
  PutCommand,
  QueryCommand,
} from "@aws-sdk/lib-dynamodb";
import { CommentItem } from "./comments.types";

@Injectable()
export class CommentsRepository {
  constructor(
    @Inject("DYNAMO_CLIENT") private readonly client: DynamoDBDocumentClient,
    @Inject("COMMENTS_TABLE") private readonly tableName: string,
  ) {}

  async createComment(comment: CommentItem): Promise<CommentItem> {
    await this.client.send(
      new PutCommand({ TableName: this.tableName, Item: comment }) as any,
    );
    return comment;
  }

  async queryCommentsByTask(
    taskId: string,
    indexName = "taskId-index",
  ): Promise<CommentItem[]> {
    const res = await this.client.send(
      new QueryCommand({
        TableName: this.tableName,
        IndexName: indexName,
        KeyConditionExpression: "#taskId = :taskId",
        ExpressionAttributeNames: { "#taskId": "taskId" },
        ExpressionAttributeValues: { ":taskId": taskId },
      }) as any,
    );
    return (res as any).Items ?? [];
  }
}
