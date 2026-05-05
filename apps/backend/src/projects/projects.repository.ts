import { Injectable, Inject } from "@nestjs/common";
import {
  DynamoDBDocumentClient,
  PutCommand,
  GetCommand,
  UpdateCommand,
  DeleteCommand,
  QueryCommand,
} from "@aws-sdk/lib-dynamodb";
import { ProjectItem } from "./projects.types";

@Injectable()
export class ProjectsRepository {
  constructor(
    @Inject("DYNAMO_CLIENT") private readonly client: DynamoDBDocumentClient,
    @Inject("PROJECTS_TABLE") private readonly tableName: string,
  ) {}

  async createProject(project: ProjectItem): Promise<ProjectItem> {
    await this.client.send(
      new PutCommand({ TableName: this.tableName, Item: project }) as any,
    );
    return project;
  }

  async getProjectById(projectId: string): Promise<ProjectItem | null> {
    const res = await this.client.send(
      new GetCommand({ TableName: this.tableName, Key: { projectId } }) as any,
    );
    return (res as any).Item ?? null;
  }

  async updateProject(
    projectId: string,
    updates: Partial<ProjectItem>,
  ): Promise<ProjectItem> {
    const ExpressionAttributeNames: Record<string, string> = {};
    const ExpressionAttributeValues: Record<string, any> = {};
    const setParts: string[] = [];
    let idx = 0;
    for (const [k, v] of Object.entries(updates)) {
      idx += 1;
      const nameKey = `#k${idx}`;
      const valKey = `:v${idx}`;
      ExpressionAttributeNames[nameKey] = k;
      ExpressionAttributeValues[valKey] = v;
      setParts.push(`${nameKey} = ${valKey}`);
    }
    const UpdateExpression = setParts.length
      ? `SET ${setParts.join(", ")}`
      : undefined;
    const res = await this.client.send(
      new UpdateCommand({
        TableName: this.tableName,
        Key: { projectId },
        UpdateExpression,
        ExpressionAttributeNames: Object.keys(ExpressionAttributeNames).length
          ? ExpressionAttributeNames
          : undefined,
        ExpressionAttributeValues: Object.keys(ExpressionAttributeValues).length
          ? ExpressionAttributeValues
          : undefined,
        ReturnValues: "ALL_NEW",
      }) as any,
    );
    return (res as any).Attributes as ProjectItem;
  }

  async deleteProject(projectId: string): Promise<void> {
    await this.client.send(
      new DeleteCommand({
        TableName: this.tableName,
        Key: { projectId },
      }) as any,
    );
  }

  async queryProjectsByTeam(
    teamId: string,
    indexName = "teamId-index",
  ): Promise<ProjectItem[]> {
    const res = await this.client.send(
      new QueryCommand({
        TableName: this.tableName,
        IndexName: indexName,
        KeyConditionExpression: "#teamId = :teamId",
        ExpressionAttributeNames: { "#teamId": "teamId" },
        ExpressionAttributeValues: { ":teamId": teamId },
      }) as any,
    );
    return (res as any).Items ?? [];
  }
}
