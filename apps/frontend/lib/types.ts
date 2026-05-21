// Task Management Types

export type UserRole = 'admin' | 'manager' | 'employee'

export type TaskStatus = 'todo' | 'in_progress' | 'review' | 'done'

export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent'

export interface User {
  id: string
  name: string
  email: string
  avatar?: string
  role: UserRole
  teamId: string
  createdAt: string
}

export interface Team {
  id: string
  name: string
  description?: string
  members: User[]
  managerId: string
  createdAt: string
}

export interface Project {
  id: string
  name: string
  description?: string
  teamId: string
  status: 'active' | 'completed' | 'archived'
  progress: number
  startDate: string
  endDate?: string
  createdAt: string
}

export interface TaskAttachment {
  id: string
  taskId: string
  name: string
  /** Public or path URL from API; use download API for private buckets */
  url: string
  type: string
  size: number
  uploadedBy: string
  createdAt: string
  originalKey?: string
  thumbnailUrl?: string
}

export interface Task {
  id: string
  title: string
  description?: string
  status: TaskStatus
  priority: TaskPriority
  projectId: string
  assigneeId?: string
  assignee?: User
  teamId: string
  dueDate?: string
  tags: string[]
  commentsCount: number
  attachmentsCount: number
  attachments?: TaskAttachment[]
  createdAt: string
  updatedAt: string
}

export interface Comment {
  id: string
  taskId: string
  userId: string
  user?: User
  content: string
  createdAt: string
  updatedAt: string
}

export interface Attachment {
  id: string
  taskId: string
  name: string
  url: string
  type: string
  size: number
  uploadedBy: string
  createdAt: string
}

export interface Notification {
  id: string
  userId: string
  type: 'task_assigned' | 'comment_added' | 'task_completed' | 'mention' | 'deadline'
  title: string
  message: string
  read: boolean
  link?: string
  createdAt: string
}

export interface DashboardStats {
  totalTasks: number
  completedTasks: number
  inProgressTasks: number
  overdueTasks: number
  totalProjects: number
  activeProjects: number
  teamMembers: number
  completionRate: number
}

export interface ActivityItem {
  id: string
  userId: string
  user?: User
  action: string
  target: string
  targetId: string
  createdAt: string
}
