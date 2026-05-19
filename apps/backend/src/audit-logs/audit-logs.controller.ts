import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { AuditLogsService } from './audit-logs.service';
import { CreateAuditLogDto } from './dto/create-audit-log.dto';

@ApiTags('Audit Logs')
@Controller('audit-logs')
export class AuditLogsController {
  constructor(private readonly auditLogsService: AuditLogsService) {}

  @Post('task/:taskId')
  @ApiOperation({ summary: 'Create an audit log for a task' })
  create(
    @Param('taskId') taskId: string,
    @Body() createAuditLogDto: CreateAuditLogDto,
  ) {
    return this.auditLogsService.addAuditLog(taskId, createAuditLogDto);
  }

  @Get('task/:taskId')
  @ApiOperation({ summary: 'Get all audit logs for a task' })
  findAllForTask(@Param('taskId') taskId: string) {
    return this.auditLogsService.getLogsForTask(taskId);
  }
}
