import { Module } from "@nestjs/common";
import { ProjectsService } from "./projects.service";
import { ProjectsController } from "./projects.controller";
import { ProjectsRepository } from "./projects.repository";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { createSharedDynamoDBClient } from "../common/dynamo-client.factory";

const dynamoClientProvider = {
  provide: "DYNAMO_CLIENT",
  useFactory: () =>
    DynamoDBDocumentClient.from(createSharedDynamoDBClient()),
};

const tableNameProvider = {
  provide: "PROJECTS_TABLE",
  useValue: process.env.PROJECTS_TABLE || "Projects",
};

@Module({
  controllers: [ProjectsController],
  providers: [
    dynamoClientProvider,
    tableNameProvider,
    ProjectsRepository,
    ProjectsService,
  ],
  exports: [ProjectsService],
})
export class ProjectsModule { }
