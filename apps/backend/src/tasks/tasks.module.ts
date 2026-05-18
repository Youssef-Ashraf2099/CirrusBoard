import { Module } from "@nestjs/common";
import { TasksService } from "./tasks.service";
import { TasksController } from "./tasks.controller";
import { TasksRepository } from "./tasks.repository";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { S3Module } from "../integrations/s3/s3.module";
import { LambdaModule } from "../integrations/lambda/lambda.module";
import { SnsModule } from "../integrations/sns/sns.module";
import { AuditLogsModule } from "../audit-logs/audit-logs.module";

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
  provide: "TASKS_TABLE",
  useValue: process.env.TASKS_TABLE || "Tasks",
};

@Module({
  imports: [S3Module, LambdaModule, SnsModule, AuditLogsModule],
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
