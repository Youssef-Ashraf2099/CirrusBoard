import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import type { TeamItem } from "./teams.model";
import { TeamsRepository } from "./teams.repository";
import { UsersService } from "../users/users.service";
import type { UserItem } from "../users/users.model";
import { isPrivileged } from "../common/permissions";
import type { CreateTeamDto } from "./dto/create-team.dto";
import type { UpdateTeamDto } from "./dto/update-team.dto";
import type { PublicUser } from "../users/users.service";

export type TeamWithMembers = TeamItem & { members?: PublicUser[] };

@Injectable()
export class TeamsService {
  constructor(
    private readonly repo: TeamsRepository,
    private readonly users: UsersService,
  ) {}

  private canSeeTeam(actor: UserItem, team: TeamItem): boolean {
    if (isPrivileged(actor.role)) return true;
    if (actor.primaryTeamId === team.teamId) return true;
    if ((team.memberUserIds ?? []).includes(actor.userId)) return true;
    return false;
  }

  private canMutateTeam(actor: UserItem, team: TeamItem): boolean {
    if (isPrivileged(actor.role)) return true;
    return team.managerId === actor.userId;
  }

  async create(actor: UserItem, input: CreateTeamDto): Promise<TeamWithMembers> {
    if (!isPrivileged(actor.role)) {
      throw new ForbiddenException("Only managers/admins may create teams");
    }
    const created = await this.repo.create({
      name: input.name,
      description: input.description,
      managerId: input.managerId ?? actor.userId,
      memberUserIds: input.memberUserIds ?? [],
    });
    return this.expandMembers(actor, created, true);
  }

  async findAll(actor: UserItem): Promise<TeamWithMembers[]> {
    const all = await this.repo.scanAll();
    const filtered = all.filter((t) => this.canSeeTeam(actor, t));
    return filtered.map((t) => ({
      ...t,
      memberUserIds: t.memberUserIds ?? [],
    }));
  }

  async findOne(actor: UserItem, id: string, expand?: boolean): Promise<TeamWithMembers> {
    const team = await this.repo.getById(id);
    if (!team) throw new NotFoundException("Team not found");
    if (!this.canSeeTeam(actor, team)) throw new ForbiddenException("Access denied");
    return this.expandMembers(actor, team, !!expand);
  }

  /** Loads member users without changing shape when expand is false. */
  async expandMembers(
    _actor: UserItem,
    team: TeamItem,
    expand: boolean,
  ): Promise<TeamWithMembers> {
    if (!expand) return { ...team, memberUserIds: team.memberUserIds ?? [] };
    const ids = team.memberUserIds ?? [];
    const members: PublicUser[] = [];
    for (const uid of ids) {
      try {
        const u = await this.users.getUser(uid);
        members.push(u);
      } catch {
        /* skip stale ids */
      }
    }
    return { ...team, memberUserIds: ids, members };
  }

  async update(actor: UserItem, id: string, input: UpdateTeamDto): Promise<TeamWithMembers> {
    const existing = await this.repo.getById(id);
    if (!existing) throw new NotFoundException("Team not found");
    if (!this.canMutateTeam(actor, existing)) throw new ForbiddenException("Access denied");
    const now = new Date().toISOString();
    const next: TeamItem = {
      ...existing,
      name: input.name ?? existing.name,
      description: input.description ?? existing.description,
      managerId: input.managerId ?? existing.managerId,
      memberUserIds: input.memberUserIds ?? existing.memberUserIds ?? [],
      updatedAt: now,
    };
    await this.repo.put(next);
    return this.expandMembers(actor, next, true);
  }

  async remove(actor: UserItem, id: string): Promise<void> {
    const existing = await this.repo.getById(id);
    if (!existing) throw new NotFoundException("Team not found");
    if (!this.canMutateTeam(actor, existing)) throw new ForbiddenException("Access denied");
    await this.repo.delete(id);
  }
}
