import type {
  ActivityItem,
  Comment,
  Notification,
  Project,
  Task,
  TaskAttachment,
  TaskPriority,
  TaskStatus,
  Team,
  User,
  UserRole,
} from '@/lib/types'
import { DEFAULT_TEAM_ID } from '@/lib/config'

/** Backend user item (password omitted by API) */
export type ApiUser = {
  userId: string
  email: string
  name: string
  role: 'EMPLOYEE' | 'MANAGER' | 'ADMIN'
  primaryTeamId?: string
  teamIds?: string[]
  isActive?: boolean
  createdAt?: string
  updatedAt?: string
}

export type ApiProject = {
  projectId: string
  name: string
  description?: string
  status?: 'ACTIVE' | 'ARCHIVED' | 'COMPLETED'
  progress?: number
  startDate?: string
  endDate?: string
  teamId?: string
  createdAt?: string
  updatedAt?: string
}

export type ApiTaskAttachment = {
  attachmentId: string
  originalKey: string
  uploadedAt: string
  thumbnailKey?: string
  thumbnailUrl?: string
  filename?: string
  path?: string
  contentType?: string
  name?: string
  url?: string
  mimeType?: string
  size?: number
  uploadedBy?: string
  version?: number
}

export type TaskUploadPresignResponse = {
  uploadUrl: string
  key: string
  objectUrl: string
  attachment: ApiTaskAttachment
}

export type ApiTask = {
  taskId: string
  projectId: string
  teamId: string
  assigneeId?: string
  title: string
  description?: string
  status: 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'DONE'
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  deadline: string
  attachments?: ApiTaskAttachment[]
  tags?: string[]
  createdAt?: string
  updatedAt?: string
}

export type ApiTeam = {
  teamId: string
  name: string
  description?: string
  managerId: string
  memberUserIds?: string[]
  members?: ApiUser[]
  createdAt?: string
  updatedAt?: string
}

export type ApiNotification = {
  notificationId: string
  userId: string
  type:
    | 'TASK_ASSIGNED'
    | 'COMMENT_ADDED'
    | 'TASK_COMPLETED'
    | 'MENTION'
    | 'DEADLINE'
  title: string
  message: string
  read: boolean
  link?: string
  createdAt?: string
}

export type ApiActivity = {
  activityId: string
  teamId: string
  userId: string
  action: string
  target: string
  targetId: string
  createdAt?: string
}

export type ApiAuditLog = {
  PK?: string
  SK?: string
  action: string
  actorId: string
  oldValue?: string
  newValue?: string
  createdAt: string
}

export type TaskAuditLog = {
  id: string
  taskId: string
  action: string
  actorId: string
  actorName?: string
  oldValue?: string
  newValue?: string
  createdAt: string
}

export type ApiComment = {
  commentId: string
  taskId: string
  authorId: string
  content: string
  createdAt: string
  editedAt?: string
}

const STATUS_TO_UI: Record<ApiTask['status'], TaskStatus> = {
  TODO: 'todo',
  IN_PROGRESS: 'in_progress',
  IN_REVIEW: 'review',
  DONE: 'done',
}

const UI_TO_STATUS: Record<TaskStatus, ApiTask['status']> = {
  todo: 'TODO',
  in_progress: 'IN_PROGRESS',
  review: 'IN_REVIEW',
  done: 'DONE',
}

export function mapUiTaskStatusToApi(status: TaskStatus): ApiTask['status'] {
  return UI_TO_STATUS[status]
}

const PRIORITY_TO_UI: Record<ApiTask['priority'], TaskPriority> = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'urgent',
}

const UI_TO_PRIORITY: Record<TaskPriority, ApiTask['priority']> = {
  low: 'LOW',
  medium: 'MEDIUM',
  high: 'HIGH',
  urgent: 'CRITICAL',
}

export function mapApiRoleToUi(role: ApiUser['role']): UserRole {
  if (role === 'MANAGER') return 'manager'
  if (role === 'ADMIN') return 'admin'
  return 'employee'
}

export function mapUiRoleToApi(
  role: UserRole,
): ApiUser['role'] {
  if (role === 'employee') return 'EMPLOYEE'
  if (role === 'admin') return 'ADMIN'
  return 'MANAGER'
}

export function mapApiUserToUser(u: ApiUser): User {
  const teamId = u.primaryTeamId ?? DEFAULT_TEAM_ID
  return {
    id: u.userId,
    name: u.name,
    email: u.email,
    avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(u.email)}`,
    role: mapApiRoleToUi(u.role),
    teamId,
    createdAt: u.createdAt ?? new Date().toISOString(),
  }
}

export function mapApiAttachmentToTaskAttachment(
  taskId: string,
  a: ApiTaskAttachment,
): TaskAttachment {
  return {
    id: a.attachmentId,
    taskId,
    name: a.filename ?? a.name ?? a.originalKey.split('/').pop() ?? 'file',
    url: a.path ?? a.url ?? '',
    type: a.contentType ?? a.mimeType ?? 'application/octet-stream',
    size: a.size ?? 0,
    uploadedBy: a.uploadedBy ?? '',
    createdAt: a.uploadedAt,
    originalKey: a.originalKey,
    thumbnailUrl: a.thumbnailUrl,
  }
}

export function mapApiProjectToProject(p: ApiProject): Project {
  const status =
    p.status === 'ARCHIVED'
      ? 'archived'
      : p.status === 'COMPLETED'
        ? 'completed'
        : 'active'

  return {
    id: p.projectId,
    name: p.name,
    description: p.description ?? '',
    teamId: p.teamId ?? DEFAULT_TEAM_ID,
    status,
    progress: p.progress ?? 0,
    startDate: p.startDate ?? p.createdAt ?? new Date().toISOString(),
    endDate: p.endDate,
    createdAt: p.createdAt ?? new Date().toISOString(),
  }
}

export function mapApiTaskToTask(
  t: ApiTask,
  usersById: Map<string, User>,
  commentCount = 0,
): Task {
  const assignee = t.assigneeId
    ? usersById.get(t.assigneeId)
    : undefined

  return {
    id: t.taskId,
    title: t.title,
    description: t.description,
    status: STATUS_TO_UI[t.status] ?? 'todo',
    priority: PRIORITY_TO_UI[t.priority] ?? 'medium',
    projectId: t.projectId,
    assigneeId: t.assigneeId,
    assignee,
    teamId: t.teamId,
    dueDate: t.deadline,
    tags: t.tags ?? [],
    commentsCount: commentCount,
    attachmentsCount: t.attachments?.length ?? 0,
    attachments: (t.attachments ?? []).map((a) =>
      mapApiAttachmentToTaskAttachment(t.taskId, a),
    ),
    createdAt: t.createdAt ?? new Date().toISOString(),
    updatedAt: t.updatedAt ?? new Date().toISOString(),
  }
}

export function mapTaskToBackendCreateBody(input: {
  title: string
  description: string
  priority: TaskPriority
  dueDate: string
  assigneeId: string
  teamId: string
  projectId: string
  status?: TaskStatus
  attachments?: ApiTask['attachments']
  tags?: string[]
}) {
  return {
    title: input.title,
    description: input.description,
    priority: UI_TO_PRIORITY[input.priority],
    deadline: input.dueDate,
    assigneeId: input.assigneeId,
    teamId: input.teamId,
    projectId: input.projectId,
    status: input.status ? UI_TO_STATUS[input.status] : undefined,
    attachments: input.attachments,
    tags: input.tags,
  }
}

export function mapTaskToBackendPatchBody(input: {
  title?: string
  description?: string
  priority?: TaskPriority
  dueDate?: string
  assigneeId?: string
  status?: TaskStatus
  tags?: string[]
}): Record<string, unknown> {
  const body: Record<string, unknown> = {}
  if (input.title !== undefined) body.title = input.title
  if (input.description !== undefined) body.description = input.description
  if (input.priority !== undefined)
    body.priority = UI_TO_PRIORITY[input.priority]
  if (input.dueDate !== undefined) body.deadline = input.dueDate
  if (input.assigneeId !== undefined) body.assigneeId = input.assigneeId
  if (input.status !== undefined) body.status = UI_TO_STATUS[input.status]
  if (input.tags !== undefined) body.tags = input.tags
  return body
}

const NOTIFICATION_TYPE_UI: Record<ApiNotification['type'], Notification['type']> = {
  TASK_ASSIGNED: 'task_assigned',
  COMMENT_ADDED: 'comment_added',
  TASK_COMPLETED: 'task_completed',
  MENTION: 'mention',
  DEADLINE: 'deadline',
}

export function mapApiTeamToTeam(t: ApiTeam): Team {
  return {
    id: t.teamId,
    name: t.name,
    description: t.description,
    managerId: t.managerId,
    members: (t.members ?? []).map(mapApiUserToUser),
    createdAt: t.createdAt ?? new Date().toISOString(),
  }
}

export function mapApiNotificationToNotification(n: ApiNotification): Notification {
  return {
    id: n.notificationId,
    userId: n.userId,
    type: NOTIFICATION_TYPE_UI[n.type] ?? 'mention',
    title: n.title,
    message: n.message,
    read: n.read,
    link: n.link,
    createdAt: n.createdAt ?? new Date().toISOString(),
  }
}

export function mapApiActivityToActivity(
  a: ApiActivity,
  usersById: Map<string, User>,
): ActivityItem {
  const u = usersById.get(a.userId)
  return {
    id: a.activityId,
    userId: a.userId,
    user: u,
    action: a.action,
    target: a.target,
    targetId: a.targetId,
    createdAt: a.createdAt ?? new Date().toISOString(),
  }
}

export function mapApiAuditLogToTaskAuditLog(
  taskId: string,
  row: ApiAuditLog,
  usersById: Map<string, User>,
): TaskAuditLog {
  const actor = usersById.get(row.actorId)
  return {
    id: row.SK ?? row.createdAt,
    taskId,
    action: row.action,
    actorId: row.actorId,
    actorName: actor?.name,
    oldValue: row.oldValue,
    newValue: row.newValue,
    createdAt: row.createdAt,
  }
}

export function mapApiCommentToComment(
  c: ApiComment,
  usersById: Map<string, User>,
): Comment {
  const u = usersById.get(c.authorId)
  return {
    id: c.commentId,
    taskId: c.taskId,
    userId: c.authorId,
    user: u ?? {
      id: c.authorId,
      name: 'Unknown',
      email: '',
      role: 'employee',
      teamId: DEFAULT_TEAM_ID,
      createdAt: c.createdAt,
    },
    content: c.content,
    createdAt: c.createdAt,
    updatedAt: c.editedAt ?? c.createdAt,
  }
}
