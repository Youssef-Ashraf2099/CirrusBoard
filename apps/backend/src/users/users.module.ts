import { Module } from "@nestjs/common";
import { UsersService } from "./users.service";
import { UsersController } from "./users.controller";
import { UsersRepository } from "./users.repository";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { createSharedDynamoDBClient } from "../common/dynamo-client.factory";

const dynamoClientProvider = {
  provide: "DYNAMO_CLIENT",
  useFactory: () =>
    DynamoDBDocumentClient.from(createSharedDynamoDBClient()),
};

const tableNameProvider = {
  provide: "USERS_TABLE",
  useValue: process.env.USERS_TABLE || "Users",
};

@Module({
  controllers: [UsersController],
  providers: [
    dynamoClientProvider,
    tableNameProvider,
    UsersRepository,
    UsersService,
  ],
  exports: [UsersService, UsersRepository],
})
export class UsersModule {}
