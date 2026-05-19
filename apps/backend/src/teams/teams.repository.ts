import { Injectable, Inject } from "@nestjs/common";
import { randomUUID } from "crypto";
import {
  DynamoDBDocumentClient,
  PutCommand,
  GetCommand,
  DeleteCommand,
  ScanCommand,
} from "@aws-sdk/lib-dynamodb";
import { TeamItem } from "./teams.model";

@Injectable()
export class TeamsRepository {
  constructor(
    @Inject("DYNAMO_CLIENT") private readonly client: DynamoDBDocumentClient,
    @Inject("TEAMS_TABLE") private readonly tableName: string,
  ) {}

  async create(
    team: Omit<TeamItem, "PK" | "teamId"> & { teamId?: string },
  ): Promise<TeamItem> {
    const now = new Date().toISOString();
    const id = team.teamId ?? randomUUID();
    const item: TeamItem = {
      PK: `TEAM#${id}`,
      teamId: id,
      name: team.name,
      description: team.description,
      managerId: team.managerId,
      memberUserIds: team.memberUserIds ?? [],
      createdAt: now,
      updatedAt: now,
    };
    await this.client.send(
      new PutCommand({ TableName: this.tableName, Item: item }) as any,
    );
    return item;
  }

  async getById(teamId: string): Promise<TeamItem | null> {
    const res = await this.client.send(
      new GetCommand({
        TableName: this.tableName,
        Key: { PK: `TEAM#${teamId}` },
      }) as any,
    );
    return (res as any).Item ?? null;
  }

  async put(item: TeamItem): Promise<TeamItem> {
    await this.client.send(
      new PutCommand({ TableName: this.tableName, Item: item }) as any,
    );
    return item;
  }

  async delete(teamId: string): Promise<void> {
    await this.client.send(
      new DeleteCommand({
        TableName: this.tableName,
        Key: { PK: `TEAM#${teamId}` },
      }) as any,
    );
  }

  async scanAll(): Promise<TeamItem[]> {
    const res = await this.client.send(
      new ScanCommand({ TableName: this.tableName }) as any,
    );
    return (res as any).Items ?? [];
  }
}
