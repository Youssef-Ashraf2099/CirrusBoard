import { Module } from '@nestjs/common';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { ActivityService } from './activity.service';
import { ActivityController } from './activity.controller';

@Module({
  imports: [AuditLogsModule],
  controllers: [ActivityController],
  providers: [ActivityService],
})
export class ActivityModule {}
