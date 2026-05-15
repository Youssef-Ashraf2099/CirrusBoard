import { Module } from "@nestjs/common";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { createSharedDynamoDBClient } from "../common/dynamo-client.factory";
import { TeamsRepository } from "./teams.repository";
import { TeamsService } from "./teams.service";
import { TeamsController } from "./teams.controller";
import { UsersModule } from "../users/users.module";

const dynamoClientProvider = {
  provide: "DYNAMO_CLIENT",
  useFactory: () =>
    DynamoDBDocumentClient.from(createSharedDynamoDBClient()),
};

const teamsTableProvider = {
  provide: "TEAMS_TABLE",
  useValue: process.env.TEAMS_TABLE || "Teams",
};

@Module({
  imports: [UsersModule],
  controllers: [TeamsController],
  providers: [
    dynamoClientProvider,
    teamsTableProvider,
    TeamsRepository,
    TeamsService,
  ],
})
export class TeamsModule {}
