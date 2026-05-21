export interface TaskAuditLogItem {
  PK: string; // TASK#<taskId>
  SK: string; // AUDIT#<timestamp>
  action: string;
  actorId: string;
  oldValue?: string;
  newValue?: string;
  createdAt: string;
  /** Team scope for activity feed (GSI partition key). */
  teamId?: string;
  /** Entity type for feed display, e.g. task, project, comment. */
  target?: string;
  /** Entity id for feed display (often taskId). */
  targetId?: string;
}

/** Shape returned by GET/POST /activity (mapped from audit rows). */
export type ActivityFeedItem = {
  activityId: string;
  teamId: string;
  userId: string;
  action: string;
  target: string;
  targetId: string;
  createdAt: string;
  taskId: string;
};

export function taskIdFromAuditPk(pk: string): string {
  return pk.startsWith('TASK#') ? pk.slice(5) : pk;
}

export function auditLogToActivityFeedItem(row: TaskAuditLogItem): ActivityFeedItem {
  const taskId = taskIdFromAuditPk(row.PK);
  return {
    activityId: row.SK || row.createdAt,
    teamId: row.teamId ?? '',
    userId: row.actorId,
    action: row.action,
    target: row.target ?? 'task',
    targetId: row.targetId ?? taskId,
    createdAt: row.createdAt,
    taskId,
  };
}
