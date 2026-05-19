export type NotificationType =
  | "TASK_ASSIGNED"
  | "COMMENT_ADDED"
  | "TASK_COMPLETED"
  | "MENTION"
  | "DEADLINE";

export interface NotificationItem {
  PK: string;
  notificationId: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  read: boolean;
  link?: string;
  createdAt?: string;
}
