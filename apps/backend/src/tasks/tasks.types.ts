export type Role = 'Manager' | 'Employee' | 'Admin';

export interface UserPrincipal {
  userId: string;
  role: Role;
  teamId?: string; // employees have teamId
}

export interface TaskItem {
  taskId: string;
  title: string;
  description?: string;
  status: 'To Do' | 'In Progress' | 'In Review' | 'Done';
  priority?: 'Low' | 'Medium' | 'High';
  deadline?: string; // ISO date
  assigneeId?: string;
  teamId: string;
  attachments?: string[]; // S3 keys/URLs
  createdAt?: string;
  updatedAt?: string;
}
