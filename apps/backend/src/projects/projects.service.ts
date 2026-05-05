import {
  Injectable,
  ForbiddenException,
  NotFoundException,
} from "@nestjs/common";
import { ProjectsRepository } from "./projects.repository";
import { ProjectItem } from "./projects.types";
import { v4 as uuidv4 } from "uuid";
import { UserPrincipal } from "../tasks/tasks.types";

@Injectable()
export class ProjectsService {
  constructor(private readonly repo: ProjectsRepository) {}

  async createProject(
    actor: UserPrincipal,
    input: Partial<ProjectItem>,
  ): Promise<ProjectItem> {
    if (actor.role !== "Manager")
      throw new ForbiddenException("Only managers may create projects");
    const now = new Date().toISOString();
    const project: ProjectItem = {
      projectId: uuidv4(),
      name: input.name ?? "Untitled",
      description: input.description,
      ownerId: actor.userId,
      teamId: input.teamId,
      createdAt: now,
      updatedAt: now,
    };
    return this.repo.createProject(project);
  }

  async getProject(
    actor: UserPrincipal,
    projectId: string,
  ): Promise<ProjectItem> {
    const project = await this.repo.getProjectById(projectId);
    if (!project) throw new NotFoundException("Project not found");
    if (actor.role !== "Manager" && actor.teamId !== project.teamId)
      throw new ForbiddenException("Access denied");
    return project;
  }

  async updateProject(
    actor: UserPrincipal,
    projectId: string,
    updates: Partial<ProjectItem>,
  ): Promise<ProjectItem> {
    const project = await this.repo.getProjectById(projectId);
    if (!project) throw new NotFoundException("Project not found");
    if (actor.role !== "Manager" && actor.teamId !== project.teamId)
      throw new ForbiddenException("Access denied");
    updates.updatedAt = new Date().toISOString();
    return this.repo.updateProject(projectId, updates);
  }

  async deleteProject(actor: UserPrincipal, projectId: string): Promise<void> {
    const project = await this.repo.getProjectById(projectId);
    if (!project) throw new NotFoundException("Project not found");
    if (actor.role !== "Manager" && actor.teamId !== project.teamId)
      throw new ForbiddenException("Access denied");
    await this.repo.deleteProject(projectId);
  }
}
