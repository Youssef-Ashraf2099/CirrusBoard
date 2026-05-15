import { Module } from "@nestjs/common";
import { TasksService } from "./tasks.service";
import { TasksController } from "./tasks.controller";
import { TasksRepository } from "./tasks.repository";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { createSharedDynamoDBClient } from "../common/dynamo-client.factory";

const dynamoClientProvider = {
  provide: "DYNAMO_CLIENT",
  useFactory: () =>
    DynamoDBDocumentClient.from(createSharedDynamoDBClient()),
};

const tableNameProvider = {
  provide: "TASKS_TABLE",
  useValue: process.env.TASKS_TABLE || "Tasks",
};

@Module({
  controllers: [TasksController],
  providers: [
    dynamoClientProvider,
    tableNameProvider,
    TasksRepository,
    TasksService,
  ],
  exports: [TasksService],
})
export class TasksModule {}
