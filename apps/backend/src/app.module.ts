import { Module } from "@nestjs/common";
import { TasksModule } from "./tasks/tasks.module";
import { ProjectsModule } from "./projects/projects.module";
import { CommentsModule } from "./comments/comments.module";

@Module({
  imports: [TasksModule, ProjectsModule, CommentsModule],
  controllers: [],
  providers: [],
})
export class AppModule {}
