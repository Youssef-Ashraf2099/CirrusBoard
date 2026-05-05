import { Module } from "@nestjs/common";
import { ProjectsService } from "./projects.service";
import { ProjectsRepository } from "./projects.repository";
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
  provide: "PROJECTS_TABLE",
  useValue: process.env.PROJECTS_TABLE || "Projects",
};

@Module({
  providers: [
    dynamoClientProvider,
    tableNameProvider,
    ProjectsRepository,
    ProjectsService,
  ],
  exports: [ProjectsService],
})
export class ProjectsModule {}
