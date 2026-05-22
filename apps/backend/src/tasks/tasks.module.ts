import { Module } from "@nestjs/common";
import { TasksService } from "./tasks.service";
import { TasksController } from "./tasks.controller";
import { TasksRepository } from "./tasks.repository";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { createSharedDynamoDBClient } from "../common/dynamo-client.factory";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { S3Module } from "../integrations/s3/s3.module";
import { LambdaModule } from "../integrations/lambda/lambda.module";
import { SnsModule } from "../integrations/sns/sns.module";
import { AuditLogsModule } from "../audit-logs/audit-logs.module";
import { UsersModule } from "../users/users.module";
import { NotificationsModule } from "../notifications/notifications.module";
import { ProjectsModule } from "../projects/projects.module";

const dynamoClientProvider = {
  provide: "DYNAMO_CLIENT",
  useFactory: () => DynamoDBDocumentClient.from(createSharedDynamoDBClient()),
};

const tableNameProvider = {
  provide: "TASKS_TABLE",
  useValue: process.env.TASKS_TABLE || "Tasks",
};

@Module({
  imports: [
    S3Module,
    LambdaModule,
    SnsModule,
    AuditLogsModule,
    UsersModule,
    NotificationsModule,
    ProjectsModule,
  ],
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
