import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { CognitoAuthGuard } from "./common/guards/cognito-auth.guard";
import { TasksModule } from "./tasks/tasks.module";
import { ProjectsModule } from "./projects/projects.module";
import { CommentsModule } from "./comments/comments.module";
import { UsersModule } from "./users/users.module";

@Module({
  imports: [TasksModule, ProjectsModule, CommentsModule, UsersModule],
  controllers: [],
  providers: [
    {
      provide: APP_GUARD,
      useClass: CognitoAuthGuard,
    },
  ],
})
export class AppModule {}
