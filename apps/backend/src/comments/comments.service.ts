import { Injectable, NotFoundException } from "@nestjs/common";
import { CommentsRepository } from "./comments.repository";
import { CommentItem } from "./comments.model";
import { v4 as uuidv4 } from "uuid";

@Injectable()
export class CommentsService {
  constructor(private readonly repo: CommentsRepository) {}

  async addComment(
    authorId: string,
    taskId: string,
    content: string,
  ): Promise<CommentItem> {
    const now = new Date().toISOString();
    const comment: Partial<CommentItem> = {
      commentId: uuidv4(),
      authorId,
      taskId,
      content,
      createdAt: now,
    };
    return this.repo.createComment(comment);
  }

  async getCommentsForTask(taskId: string) {
    const comments = await this.repo.queryCommentsByTask(taskId);
    return comments.filter(c => !c.deleted);
  }

  async updateComment(taskId: string, commentId: string, content: string): Promise<CommentItem> {
    try {
      return await this.repo.updateComment(taskId, commentId, content);
    } catch (e: any) {
      if (e.message === "Comment not found") throw new NotFoundException(e.message);
      throw e;
    }
  }

  async deleteComment(taskId: string, commentId: string): Promise<void> {
    try {
      await this.repo.deleteComment(taskId, commentId);
    } catch (e: any) {
      if (e.message === "Comment not found") throw new NotFoundException(e.message);
      throw e;
    }
  }
}
