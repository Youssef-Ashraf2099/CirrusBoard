import {
  Injectable,
  ForbiddenException,
  NotFoundException,
} from "@nestjs/common";
import { ProjectsRepository } from "./projects.repository";
import { ProjectItem } from "./projects.model";
import { v4 as uuidv4 } from "uuid";
import { UserItem } from "../users/users.model";

@Injectable()
export class ProjectsService {
  constructor(private readonly repo: ProjectsRepository) { }

  async createProject(
    actor: UserItem,
    input: Partial<ProjectItem>,
  ): Promise<ProjectItem> {
    if (actor.role !== "MANAGER")
      throw new ForbiddenException("Only managers may create projects");
    const now = new Date().toISOString();
    const id = uuidv4();
    const project: ProjectItem = {
      PK: `PROJECT#${id}`,
      projectId: id,
      name: input.name,
      description: input.description,
      createdBy: actor.userId,
      teamId: input.teamId,
      createdAt: now

    };
    return this.repo.createProject(project);
  }

  async getProject(
    actor: UserItem,
    projectId: string,
  ): Promise<ProjectItem> {
    const project = await this.repo.getProjectById(projectId);
    if (!project) throw new NotFoundException("Project not found");
    if (actor.role !== "MANAGER" && actor.primaryTeamId !== project.teamId)
      throw new ForbiddenException("Access denied");
    return project;
  }

  async updateProject(
    actor: UserItem,
    projectId: string,
    updates: Partial<ProjectItem>,
  ): Promise<ProjectItem> {
    const project = await this.repo.getProjectById(projectId);
    if (!project) throw new NotFoundException("Project not found");
    if (actor.role !== "MANAGER" && actor.primaryTeamId !== project.teamId)
      throw new ForbiddenException("Access denied");
    updates.updatedAt = new Date().toISOString();
    return this.repo.updateProject(projectId, updates);
  }

  async deleteProject(actor: UserItem, projectId: string): Promise<void> {
    const project = await this.repo.getProjectById(projectId);
    if (!project) throw new NotFoundException("Project not found");
    if (actor.role !== "MANAGER" && actor.primaryTeamId !== project.teamId)
      throw new ForbiddenException("Access denied");
    await this.repo.deleteProject(projectId);
  }
}
