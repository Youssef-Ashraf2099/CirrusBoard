import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import type { UserItem } from '../users/users.model';
import type { CreateActivityDto } from './dto/create-activity.dto';
import { isPrivileged } from '../common/permissions';

@Injectable()
export class ActivityService {
  constructor(private readonly auditLogs: AuditLogsService) {}

  async listForTeam(actor: UserItem, teamId: string, limit?: number) {
    if (!isPrivileged(actor.role) && actor.primaryTeamId !== teamId) {
      throw new ForbiddenException('Access denied');
    }
    return this.auditLogs.listActivityForTeam(teamId, limit ?? 60);
  }

  async create(actor: UserItem, input: CreateActivityDto) {
    if (!isPrivileged(actor.role) && actor.userId !== input.userId) {
      throw new ForbiddenException();
    }
    if (!isPrivileged(actor.role) && actor.primaryTeamId !== input.teamId) {
      throw new ForbiddenException('Cannot post activity to another team');
    }

    const taskId =
      input.taskId ?? (input.target === 'task' ? input.targetId : undefined);
    if (!taskId) {
      throw new BadRequestException(
        'taskId is required (or set target to "task" with targetId as the task id)',
      );
    }

    return this.auditLogs.recordActivityEntry(taskId, {
      teamId: input.teamId,
      userId: input.userId,
      action: input.action,
      target: input.target,
      targetId: input.targetId,
    });
  }
}
