import {
  Injectable,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { ProjectsRepository } from "./projects.repository";
import { ProjectItem } from "./projects.model";
import { v4 as uuidv4 } from "uuid";
import { UserItem } from "../users/users.model";
import { isPrivileged } from "../common/permissions";
import type { CreateProjectDto } from "./dto/create-project.dto";
import type { UpdateProjectDto } from "./dto/update-project.dto";
import {
  normalizeTeamId,
  teamIdsMatch,
} from "../common/team-id.utils";

@Injectable()
export class ProjectsService {
  constructor(private readonly repo: ProjectsRepository) {}

  async createProject(
    actor: UserItem,
    input: CreateProjectDto,
  ): Promise<ProjectItem> {
    if (!isPrivileged(actor.role)) {
      throw new ForbiddenException("Only managers may create projects");
    }
    if (!input.teamId?.trim()) {
      throw new BadRequestException("teamId is required");
    }
    const now = new Date().toISOString();
    const id = uuidv4();
    const project: ProjectItem = {
      PK: `PROJECT#${id}`,
      projectId: id,
      name: input.name,
      description: input.description,
      status: input.status ?? "ACTIVE",
      progress: input.progress !== undefined ? input.progress : 0,
      startDate: input.startDate ?? now,
      endDate: input.endDate,
      createdBy: actor.userId,
      teamId: input.teamId.trim(),
      createdAt: now,
      updatedAt: now,
    };
    return this.repo.createProject(project);
  }

  async getProject(
    actor: UserItem,
    projectId: string,
  ): Promise<ProjectItem> {
    const project = await this.repo.getProjectById(projectId);
    if (!project) throw new NotFoundException("Project not found");
    if (
      !isPrivileged(actor.role) &&
      !teamIdsMatch(actor.primaryTeamId ?? actor.teamIds?.[0], project.teamId)
    ) {
      throw new ForbiddenException("Access denied");
    }
    return project;
  }

  async updateProject(
    actor: UserItem,
    projectId: string,
    updates: UpdateProjectDto,
  ): Promise<ProjectItem> {
    if (!isPrivileged(actor.role)) {
      throw new ForbiddenException("Only managers may update projects");
    }
    const project = await this.repo.getProjectById(projectId);
    if (!project) throw new NotFoundException("Project not found");
    const payload: Partial<ProjectItem> = {
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    if (updates.teamId !== undefined) {
      payload.teamId = updates.teamId.trim();
    }
    return this.repo.updateProject(projectId, payload);
  }

  async deleteProject(actor: UserItem, projectId: string): Promise<void> {
    if (!isPrivileged(actor.role)) {
      throw new ForbiddenException("Only managers may delete projects");
    }
    const project = await this.repo.getProjectById(projectId);
    if (!project) throw new NotFoundException("Project not found");
    await this.repo.deleteProject(projectId);
  }

  async listProjects(
    actor: UserItem,
    teamId?: string,
  ): Promise<ProjectItem[]> {
    if (isPrivileged(actor.role)) {
      if (teamId) {
        return this.repo.queryProjectsByTeam(teamId);
      }
      return this.repo.listAllProjects();
    }

    const actorTeam = normalizeTeamId(
      actor.primaryTeamId ?? actor.teamIds?.[0],
    );
    if (
      teamId &&
      actorTeam &&
      !teamIdsMatch(teamId, actor.primaryTeamId ?? actor.teamIds?.[0])
    ) {
      throw new ForbiddenException("Access denied to team projects");
    }
    if (!actorTeam) {
      return [];
    }
    return this.repo.queryProjectsByTeam(actorTeam);
  }

  async listProjectsForTeam(
    actor: UserItem,
    teamId: string,
  ): Promise<ProjectItem[]> {
    return this.listProjects(actor, teamId);
  }
}
