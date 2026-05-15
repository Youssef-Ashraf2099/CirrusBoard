import { Module } from "@nestjs/common";
import { CommentsService } from "./comments.service";
import { CommentsController } from "./comments.controller";
import { CommentsRepository } from "./comments.repository";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { createSharedDynamoDBClient } from "../common/dynamo-client.factory";

const dynamoClientProvider = {
  provide: "DYNAMO_CLIENT",
  useFactory: () =>
    DynamoDBDocumentClient.from(createSharedDynamoDBClient()),
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
