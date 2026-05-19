import {
  Injectable,
  ForbiddenException,
  NotFoundException,
} from "@nestjs/common";
import { ProjectsRepository } from "./projects.repository";
import { ProjectItem } from "./projects.model";
import { v4 as uuidv4 } from "uuid";
import { UserItem } from "../users/users.model";
import { isPrivileged } from "../common/permissions";
import type { CreateProjectDto } from "./dto/create-project.dto";
import type { UpdateProjectDto } from "./dto/update-project.dto";
import { canManageWorkspace, hasTeamAccess } from "../common/auth/cognito-auth.utils";

@Injectable()
export class ProjectsService {
  constructor(private readonly repo: ProjectsRepository) { }

  async createProject(
    actor: UserItem,
    input: CreateProjectDto,
  ): Promise<ProjectItem> {
    if (!isPrivileged(actor.role))
      throw new ForbiddenException("Only managers may create projects");
    const now = new Date().toISOString();
    const id = uuidv4();
    const project: ProjectItem = {
      PK: `PROJECT#${id}`,
      projectId: id,
      name: input.name,
      description: input.description,
      status: input.status ?? "ACTIVE",
      progress:
        input.progress !== undefined ? input.progress : 0,
      startDate: input.startDate ?? now,
      endDate: input.endDate,
      createdBy: actor.userId,
      teamId: input.teamId,
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
    if (!isPrivileged(actor.role) && actor.primaryTeamId !== project.teamId)
      throw new ForbiddenException("Access denied");
    return project;
  }

  async updateProject(
    actor: UserItem,
    projectId: string,
    updates: UpdateProjectDto,
  ): Promise<ProjectItem> {
    const project = await this.repo.getProjectById(projectId);
    if (!project) throw new NotFoundException("Project not found");
    if (!isPrivileged(actor.role) && actor.primaryTeamId !== project.teamId)
      throw new ForbiddenException("Access denied");
    const payload: Partial<ProjectItem> = {
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    return this.repo.updateProject(projectId, payload);
  }

  async deleteProject(actor: UserItem, projectId: string): Promise<void> {
    const project = await this.repo.getProjectById(projectId);
    if (!project) throw new NotFoundException("Project not found");
    if (!isPrivileged(actor.role) && actor.primaryTeamId !== project.teamId)
      throw new ForbiddenException("Access denied");
    await this.repo.deleteProject(projectId);
  }

  async listProjectsForTeam(
    actor: UserItem,
    teamId: string,
  ): Promise<ProjectItem[]> {
    if (!isPrivileged(actor.role) && actor.primaryTeamId !== teamId) {
      throw new ForbiddenException("Access denied");
    }
    return this.repo.queryProjectsByTeam(teamId);
  }
}
