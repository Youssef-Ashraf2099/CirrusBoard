import { Injectable } from '@nestjs/common';
import { AuditLogsRepository } from './audit-logs.repository';
import { CreateAuditLogDto } from './dto/create-audit-log.dto';
import {
  auditLogToActivityFeedItem,
  type ActivityFeedItem,
} from './audit-logs.model';

@Injectable()
export class AuditLogsService {
  constructor(private readonly repo: AuditLogsRepository) {}

  async addAuditLog(taskId: string, input: CreateAuditLogDto) {
    return this.repo.createAuditLog(taskId, input.action, input.actorId, {
      oldValue: input.oldValue,
      newValue: input.newValue,
      teamId: input.teamId,
      target: input.target,
      targetId: input.targetId,
    });
  }

  async getLogsForTask(taskId: string) {
    return this.repo.getAuditLogsByTask(taskId);
  }

  async listActivityForTeam(
    teamId: string,
    limit?: number,
  ): Promise<ActivityFeedItem[]> {
    const rows = await this.repo.listByTeam(teamId, limit ?? 60);
    return rows.map(auditLogToActivityFeedItem);
  }

  async recordActivityEntry(
    taskId: string,
    input: {
      teamId: string;
      userId: string;
      action: string;
      target: string;
      targetId: string;
    },
  ): Promise<ActivityFeedItem> {
    const row = await this.repo.createAuditLog(
      taskId,
      input.action,
      input.userId,
      {
        teamId: input.teamId,
        target: input.target,
        targetId: input.targetId,
      },
    );
    return auditLogToActivityFeedItem(row);
  }
}
