import { Module } from '@nestjs/common';
import { AuditLogsService } from './audit-logs.service';
import { AuditLogsController } from './audit-logs.controller';
import { AuditLogsRepository } from './audit-logs.repository';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';

const dynamoClientProvider = {
  provide: 'DYNAMO_CLIENT',
  useFactory: () => {
    const client = new DynamoDBClient({
      region: process.env.AWS_REGION || 'us-east-1',
      endpoint: process.env.DYNAMODB_ENDPOINT,
    });
    return DynamoDBDocumentClient.from(client);
  },
};

const tableNameProvider = {
  provide: 'TASK_AUDIT_LOGS_TABLE',
  useValue: process.env.TASK_AUDIT_LOGS_TABLE || 'TaskAuditLogs',
};

@Module({
  controllers: [AuditLogsController],
  providers: [
    dynamoClientProvider,
    tableNameProvider,
    AuditLogsRepository,
    AuditLogsService,
  ],
  exports: [AuditLogsService],
})
export class AuditLogsModule {}
