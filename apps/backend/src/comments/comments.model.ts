export interface CommentItem {
  // DynamoDB item keys
  PK: string; // TASK#<taskId>
  SK: string; // COMMENT#<timestamp>#<commentId>

  commentId: string;
  taskId: string;
  authorId: string;
  content: string;
  createdAt: string;
  editedAt?: string;
  deleted?: boolean;
}
