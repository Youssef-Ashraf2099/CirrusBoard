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
    return this.repo.queryCommentsByTask(taskId);
  }
}
