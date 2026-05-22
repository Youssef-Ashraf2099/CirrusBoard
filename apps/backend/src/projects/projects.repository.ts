import { Injectable, Inject, Logger } from "@nestjs/common";
import {
  DynamoDBDocumentClient,
  PutCommand,
  GetCommand,
  UpdateCommand,
  DeleteCommand,
  QueryCommand,
  ScanCommand,
} from "@aws-sdk/lib-dynamodb";
import { normalizeTeamId } from "../common/team-id.utils";
import { ProjectItem } from "./projects.model";

@Injectable()
export class ProjectsRepository {
  private readonly logger = new Logger(ProjectsRepository.name);

  constructor(
    @Inject("DYNAMO_CLIENT") private readonly client: DynamoDBDocumentClient,
    @Inject("PROJECTS_TABLE") private readonly tableName: string,
  ) { }

  async createProject(project: ProjectItem): Promise<ProjectItem> {
    const now = new Date().toISOString();
    const id = project.projectId ?? Math.random().toString(36).slice(2);
    const pk = `PROJECT#${id}`;
    const item: ProjectItem = {
      PK: pk,
      projectId: id,
      name: project.name,
      ...(project.description !== undefined
        ? { description: project.description }
        : {}),
      status: project.status ?? "ACTIVE",
      progress: project.progress ?? 0,
      startDate: project.startDate ?? now,
      ...(project.endDate !== undefined ? { endDate: project.endDate } : {}),
      createdBy: project.createdBy,
      teamId: project.teamId,
      createdAt: project.createdAt ?? now,
      updatedAt: now,
    } as ProjectItem;

    await this.client.send(
      new PutCommand({ TableName: this.tableName, Item: item }) as any,
    );
    return item;
  }

  async getProjectById(projectId: string): Promise<ProjectItem | null> {
    const pk = `PROJECT#${projectId}`;
    const res = await this.client.send(
      new GetCommand({ TableName: this.tableName, Key: { PK: pk } }) as any,
    );
    return (res as any).Item ?? null;
  }

  async updateProject(
    projectId: string,
    updates: Partial<ProjectItem>,
  ): Promise<ProjectItem> {
    // sanitize updates: never allow PK or projectId to be updated
    const now = new Date().toISOString();
    const pk = `PROJECT#${projectId}`;

    const sanitized: Record<string, any> = {
      ...(updates as Record<string, any>),
    };
    delete sanitized.PK;
    delete sanitized.projectId;

    // always update updatedAt
    sanitized.updatedAt = now;

    const ExpressionAttributeNames: Record<string, string> = {};
    const ExpressionAttributeValues: Record<string, any> = {};
    const setParts: string[] = [];
    let idx = 0;

    for (const [k, v] of Object.entries(sanitized)) {
      idx += 1;
      const nameKey = `#k${idx}`;
      const valKey = `:v${idx}`;
      ExpressionAttributeNames[nameKey] = k;
      ExpressionAttributeValues[valKey] = v;
      setParts.push(`${nameKey} = ${valKey}`);
    }

    if (setParts.length === 0) {
      throw new Error("No updatable fields provided");
    }

    const UpdateExpression = `SET ${setParts.join(", ")}`;

    const res = await this.client.send(
      new UpdateCommand({
        TableName: this.tableName,
        Key: { PK: pk },
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
    const pk = `PROJECT#${projectId}`;
    await this.client.send(
      new DeleteCommand({ TableName: this.tableName, Key: { PK: pk } }) as any,
    );
  }

  async queryProjectsByTeam(
    teamId: string,
    indexName = process.env.PROJECTS_TEAM_GSI || "teamId-index",
  ): Promise<ProjectItem[]> {
    const normalized = normalizeTeamId(teamId);
    try {
      const res = await this.client.send(
        new QueryCommand({
          TableName: this.tableName,
          IndexName: indexName,
          KeyConditionExpression: "#teamId = :teamId",
          ExpressionAttributeNames: { "#teamId": "teamId" },
          ExpressionAttributeValues: { ":teamId": teamId },
        }) as any,
      );
      const items = ((res as any).Items ?? []) as ProjectItem[];
      if (items.length > 0) return items;
    } catch (err) {
      this.logger.warn(
        `Projects team GSI query failed (${indexName}), falling back to scan: ${
          err instanceof Error ? err.message : err
        }`,
      );
    }

    const res = await this.client.send(
      new ScanCommand({
        TableName: this.tableName,
        Limit: 200,
      }) as any,
    );
    const items = ((res as any).Items ?? []) as ProjectItem[];
    return items.filter(
      (p) => normalizeTeamId(p.teamId) === normalized,
    );
  }
}
