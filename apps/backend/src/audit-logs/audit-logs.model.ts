export interface TaskAuditLogItem {
  PK: string; // TASK#<taskId>
  SK: string; // AUDIT#<timestamp>
  action: string;
  actorId: string;
  oldValue?: string;
  newValue?: string;
  createdAt: string;
}
