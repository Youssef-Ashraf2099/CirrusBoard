import { Module } from "@nestjs/common";
import { TasksModule } from "./tasks/tasks.module";
import { ProjectsModule } from "./projects/projects.module";
import { CommentsModule } from "./comments/comments.module";
import { UsersModule } from "./users/users.module";

@Module({
  imports: [TasksModule, ProjectsModule, CommentsModule, UsersModule],
  controllers: [],
  providers: [],
})
export class AppModule {}
