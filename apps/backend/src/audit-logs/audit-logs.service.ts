import { Injectable } from '@nestjs/common';
import { AuditLogsRepository } from './audit-logs.repository';
import { CreateAuditLogDto } from './dto/create-audit-log.dto';

@Injectable()
export class AuditLogsService {
  constructor(private readonly repo: AuditLogsRepository) {}

  async addAuditLog(taskId: string, input: CreateAuditLogDto) {
    return this.repo.createAuditLog(
      taskId,
      input.action,
      input.actorId,
      input.oldValue,
      input.newValue,
    );
  }

  async getLogsForTask(taskId: string) {
    return this.repo.getAuditLogsByTask(taskId);
  }
}
