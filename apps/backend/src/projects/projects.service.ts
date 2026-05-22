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
import { isPrivileged, isTeamMember } from "../common/permissions";
import type { CreateProjectDto } from "./dto/create-project.dto";
import type { UpdateProjectDto } from "./dto/update-project.dto";
import { UsersService, type PublicUser } from "../users/users.service";

export type ProjectWithMembers = ProjectItem & { members?: PublicUser[] };

@Injectable()
export class ProjectsService {
  constructor(
    private readonly repo: ProjectsRepository,
    private readonly users: UsersService,
  ) {}

  private async expandMembers(
    project: ProjectItem,
    expand: boolean,
  ): Promise<ProjectWithMembers> {
    if (!expand) {
      return { ...project, memberUserIds: project.memberUserIds ?? [] };
    }
    const ids = project.memberUserIds ?? [];
    const members: PublicUser[] = [];
    for (const uid of ids) {
      try {
        members.push(await this.users.getUser(uid));
      } catch {
        /* skip stale ids */
      }
    }
    return { ...project, memberUserIds: ids, members };
  }

  private filterProjectsForActor(
    actor: UserItem,
    projects: ProjectItem[],
  ): ProjectItem[] {
    if (isPrivileged(actor.role)) return projects;
    return projects.filter(
      (p) =>
        isTeamMember(actor, p.teamId ?? "") ||
        (p.memberUserIds ?? []).includes(actor.userId),
    );
  }

  async createProject(
    actor: UserItem,
    input: CreateProjectDto,
  ): Promise<ProjectWithMembers> {
    if (!isPrivileged(actor.role))
      throw new ForbiddenException("Only managers may create projects");
    const projectTeamId = input.teamId?.trim();
    if (!projectTeamId) {
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
      teamId: projectTeamId,
      memberUserIds: input.memberUserIds ?? [],
      createdAt: now,
      updatedAt: now,
    };
    const created = await this.repo.createProject(project);
    return this.expandMembers(created, true);
  }

  async getProject(
    actor: UserItem,
    projectId: string,
    expand?: boolean,
  ): Promise<ProjectWithMembers> {
    const project = await this.repo.getProjectById(projectId);
    if (!project) throw new NotFoundException("Project not found");
    if (!isPrivileged(actor.role)) {
      const roster = project.memberUserIds ?? [];
      if (
        !isTeamMember(actor, project.teamId ?? "") &&
        !roster.includes(actor.userId)
      ) {
        throw new ForbiddenException("Access denied");
      }
    }
    return this.expandMembers(project, !!expand);
  }

  async updateProject(
    actor: UserItem,
    projectId: string,
    updates: UpdateProjectDto,
  ): Promise<ProjectWithMembers> {
    const project = await this.repo.getProjectById(projectId);
    if (!project) throw new NotFoundException("Project not found");
    if (!isPrivileged(actor.role))
      throw new ForbiddenException("Access denied");
    const payload: Partial<ProjectItem> = {
      updatedAt: new Date().toISOString(),
    };
    if (updates.name !== undefined) payload.name = updates.name;
    if (updates.description !== undefined)
      payload.description = updates.description;
    if (updates.status !== undefined) payload.status = updates.status;
    if (updates.progress !== undefined) payload.progress = updates.progress;
    if (updates.startDate !== undefined) payload.startDate = updates.startDate;
    if (updates.endDate !== undefined) payload.endDate = updates.endDate;
    if (updates.memberUserIds !== undefined) {
      payload.memberUserIds = updates.memberUserIds;
    }
    if (updates.teamId !== undefined) {
      const nextTeam = updates.teamId?.trim();
      if (!nextTeam) throw new BadRequestException("teamId cannot be empty");
      payload.teamId = nextTeam;
    }
    const updated = await this.repo.updateProject(projectId, payload);
    return this.expandMembers(updated, true);
  }

  async deleteProject(actor: UserItem, projectId: string): Promise<void> {
    const project = await this.repo.getProjectById(projectId);
    if (!project) throw new NotFoundException("Project not found");
    if (!isPrivileged(actor.role))
      throw new ForbiddenException("Access denied");
    await this.repo.deleteProject(projectId);
  }

  async listProjectsForTeam(
    actor: UserItem,
    teamId: string,
  ): Promise<ProjectItem[]> {
    if (!isPrivileged(actor.role) && !isTeamMember(actor, teamId)) {
      throw new ForbiddenException("Access denied");
    }
    const all = await this.repo.queryProjectsByTeam(teamId);
    return this.filterProjectsForActor(actor, all);
  }
}
