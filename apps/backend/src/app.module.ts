import { Module } from "@nestjs/common";
import { TasksModule } from "./tasks/tasks.module";
import { ProjectsModule } from "./projects/projects.module";
import { CommentsModule } from "./comments/comments.module";
import { UsersModule } from "./users/users.module";
import { TeamsModule } from "./teams/teams.module";
import { NotificationsModule } from "./notifications/notifications.module";
import { ActivityModule } from "./activity/activity.module";

@Module({
  imports: [
    TasksModule,
    ProjectsModule,
    CommentsModule,
    UsersModule,
    TeamsModule,
    NotificationsModule,
    ActivityModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
