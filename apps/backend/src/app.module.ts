import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { CognitoAuthGuard } from "./common/guards/cognito-auth.guard";
import { TasksModule } from "./tasks/tasks.module";
import { ProjectsModule } from "./projects/projects.module";
import { CommentsModule } from "./comments/comments.module";
import { UsersModule } from "./users/users.module";
import { TeamsModule } from "./teams/teams.module";
import { NotificationsModule } from "./notifications/notifications.module";
import { ActivityModule } from "./activity/activity.module";
import { AuditLogsModule } from "./audit-logs/audit-logs.module";
@Module({
  imports: [
    TasksModule,
    ProjectsModule,
    CommentsModule,
    UsersModule,
    TeamsModule,
    NotificationsModule,
    ActivityModule,
    AuditLogsModule
  ],
  controllers: [],
  providers: [
    {
      provide: APP_GUARD,
      useClass: CognitoAuthGuard,
    },
  ],
})
export class AppModule {}
