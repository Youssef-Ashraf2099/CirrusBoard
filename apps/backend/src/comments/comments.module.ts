import { Module } from "@nestjs/common";
import { CommentsService } from "./comments.service";
import { CommentsController } from "./comments.controller";
import { CommentsRepository } from "./comments.repository";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";

const dynamoClientProvider = {
  provide: "DYNAMO_CLIENT",
  useFactory: () => {
    const client = new DynamoDBClient({
      region: process.env.AWS_REGION || "us-east-1",
      endpoint: process.env.DYNAMODB_ENDPOINT,
    });
    return DynamoDBDocumentClient.from(client);
  },
};

const tableNameProvider = {
  provide: "COMMENTS_TABLE",
  useValue: process.env.COMMENTS_TABLE || "Comments",
};

@Module({
  controllers: [CommentsController],
  providers: [
    dynamoClientProvider,
    tableNameProvider,
    CommentsRepository,
    CommentsService,
  ],
  exports: [CommentsService],
})
export class CommentsModule {}
