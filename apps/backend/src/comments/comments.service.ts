import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from "@nestjs/common";
import { CommentsRepository } from "./comments.repository";
import { CommentItem } from "./comments.model";
import { v4 as uuidv4 } from "uuid";
import { TasksService } from "../tasks/tasks.service";
import { UserItem } from "../users/users.model";

@Injectable()
export class CommentsService {
  constructor(
    private readonly repo: CommentsRepository,
    private readonly tasksService: TasksService,
  ) {}

  async addComment(
    actor: UserItem,
    taskId: string,
    content: string,
  ): Promise<CommentItem> {
    await this.tasksService.assertTaskAccess(actor, taskId);
    const now = new Date().toISOString();
    const comment: Partial<CommentItem> = {
      commentId: uuidv4(),
      authorId: actor.userId,
      taskId,
      content,
      createdAt: now,
    };
    return this.repo.createComment(comment);
  }

  async getCommentsForTask(actor: UserItem, taskId: string) {
    await this.tasksService.assertTaskAccess(actor, taskId);
    const comments = await this.repo.queryCommentsByTask(taskId);
    return comments.filter((c) => !c.deleted);
  }

  async updateComment(
    actor: UserItem,
    taskId: string,
    commentId: string,
    content: string,
  ): Promise<CommentItem> {
    await this.tasksService.assertTaskAccess(actor, taskId);
    const existing = await this.repo.queryCommentsByTask(taskId);
    const comment = existing.find((c) => c.commentId === commentId);
    if (!comment) throw new NotFoundException("Comment not found");
    if (comment.authorId !== actor.userId) {
      throw new ForbiddenException("You can only edit your own comments");
    }
    try {
      return await this.repo.updateComment(taskId, commentId, content);
    } catch (e: any) {
      if (e.message === "Comment not found")
        throw new NotFoundException(e.message);
      throw e;
    }
  }

  async deleteComment(
    actor: UserItem,
    taskId: string,
    commentId: string,
  ): Promise<void> {
    await this.tasksService.assertTaskAccess(actor, taskId);
    const existing = await this.repo.queryCommentsByTask(taskId);
    const comment = existing.find((c) => c.commentId === commentId);
    if (!comment) throw new NotFoundException("Comment not found");
    if (comment.authorId !== actor.userId) {
      throw new ForbiddenException("You can only delete your own comments");
    }
    try {
      await this.repo.deleteComment(taskId, commentId);
    } catch (e: any) {
      if (e.message === "Comment not found")
        throw new NotFoundException(e.message);
      throw e;
    }
  }
}
