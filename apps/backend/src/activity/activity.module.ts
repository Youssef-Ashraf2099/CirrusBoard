import { Module } from "@nestjs/common";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { createSharedDynamoDBClient } from "../common/dynamo-client.factory";
import { ActivityRepository } from "./activity.repository";
import { ActivityService } from "./activity.service";
import { ActivityController } from "./activity.controller";

const dynamoClientProvider = {
  provide: "DYNAMO_CLIENT",
  useFactory: () =>
    DynamoDBDocumentClient.from(createSharedDynamoDBClient()),
};

const tableProvider = {
  provide: "ACTIVITY_TABLE",
  useValue: process.env.ACTIVITY_TABLE || "Activity",
};

@Module({
  controllers: [ActivityController],
  providers: [
    dynamoClientProvider,
    tableProvider,
    ActivityRepository,
    ActivityService,
  ],
})
export class ActivityModule {}
