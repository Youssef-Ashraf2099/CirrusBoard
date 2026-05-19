import { Module } from "@nestjs/common";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { createSharedDynamoDBClient } from "../common/dynamo-client.factory";
import { NotificationsRepository } from "./notifications.repository";
import { NotificationsService } from "./notifications.service";
import { NotificationsController } from "./notifications.controller";

const dynamoClientProvider = {
  provide: "DYNAMO_CLIENT",
  useFactory: () =>
    DynamoDBDocumentClient.from(createSharedDynamoDBClient()),
};

const tableProvider = {
  provide: "NOTIFICATIONS_TABLE",
  useValue: process.env.NOTIFICATIONS_TABLE || "Notifications",
};

@Module({
  controllers: [NotificationsController],
  providers: [
    dynamoClientProvider,
    tableProvider,
    NotificationsRepository,
    NotificationsService,
  ],
})
export class NotificationsModule {}
