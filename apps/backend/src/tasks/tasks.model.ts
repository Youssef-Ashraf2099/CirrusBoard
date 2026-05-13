
export interface Attachment {
  attachmentId: string;
  originalKey: string;
  thumbnailKey?: string;
  uploadedAt: string;
  version?: number;
}

export interface TaskItem {
  PK: string; // e.g. TASK#<taskId>
  taskId: string;
  projectId: string; // e.g. PROJECT#<projectId>
  teamId: string; // e.g. TEAM#<teamId>
  assigneeId?: string; // e.g. USER#<userId>
  title: string;
  description?: string;
  status: "TODO" | "IN_PROGRESS" | "IN_REVIEW" | "DONE";
  priority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  deadline: string; // ISO date or YYYY-MM-DD
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
  deleted?: boolean;
  latestThumbnailUrl?: string;
  attachments?: Attachment[];
  // helper attribute for GSIs
  statusDeadline?: string; // <STATUS>#<DEADLINE>
}
