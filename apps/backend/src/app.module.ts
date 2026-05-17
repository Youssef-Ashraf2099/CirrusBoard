import { Module } from "@nestjs/common";
import { TasksModule } from "./tasks/tasks.module";
import { ProjectsModule } from "./projects/projects.module";
import { CommentsModule } from "./comments/comments.module";
import { UsersModule } from "./users/users.module";
import { AuditLogsModule } from "./audit-logs/audit-logs.module";
@Module({
  imports: [TasksModule, ProjectsModule, CommentsModule, UsersModule, AuditLogsModule],
  controllers: [],
  providers: [],
})
export class AppModule {}
