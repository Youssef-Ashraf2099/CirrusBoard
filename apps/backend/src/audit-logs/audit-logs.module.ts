import { Module } from '@nestjs/common';
import { AuditLogsService } from './audit-logs.service';
import { AuditLogsController } from './audit-logs.controller';
import { AuditLogsRepository } from './audit-logs.repository';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { createSharedDynamoDBClient } from '../common/dynamo-client.factory';

const dynamoClientProvider = {
  provide: 'DYNAMO_CLIENT',
  useFactory: () =>
    DynamoDBDocumentClient.from(createSharedDynamoDBClient()),
};

const tableNameProvider = {
  provide: 'TASK_AUDIT_LOGS_TABLE',
  useValue: process.env.TASK_AUDIT_LOGS_TABLE || 'TaskAuditLogs',
};

const teamGsiProvider = {
  provide: 'TASK_AUDIT_LOGS_TEAM_GSI',
  useValue: process.env.TASK_AUDIT_LOGS_TEAM_GSI || 'TeamActivityIndex',
};

@Module({
  controllers: [AuditLogsController],
  providers: [
    dynamoClientProvider,
    tableNameProvider,
    teamGsiProvider,
    AuditLogsRepository,
    AuditLogsService,
  ],
  exports: [AuditLogsService],
})
export class AuditLogsModule {}
