import { ForbiddenException, Injectable } from "@nestjs/common";
import { ActivityRepository } from "./activity.repository";
import type { UserItem } from "../users/users.model";
import type { CreateActivityDto } from "./dto/create-activity.dto";
import { isPrivileged } from "../common/permissions";

@Injectable()
export class ActivityService {
  constructor(private readonly repo: ActivityRepository) {}

  async listForTeam(actor: UserItem, teamId: string, limit?: number) {
    if (!isPrivileged(actor.role) && actor.primaryTeamId !== teamId) {
      throw new ForbiddenException("Access denied");
    }
    return this.repo.listByTeam(teamId, limit ?? 60);
  }

  async create(actor: UserItem, input: CreateActivityDto) {
    if (!isPrivileged(actor.role) && actor.userId !== input.userId) {
      throw new ForbiddenException();
    }
    if (!isPrivileged(actor.role) && actor.primaryTeamId !== input.teamId) {
      throw new ForbiddenException("Cannot post activity to another team");
    }
    return this.repo.create(input);
  }
}
