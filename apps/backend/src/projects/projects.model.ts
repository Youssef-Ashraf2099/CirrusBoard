export interface ProjectItem {
  PK: string; // e.g. PROJECT#<projectId>
  projectId: string;
  name: string;
  description?: string;
  status?: "ACTIVE" | "ARCHIVED" | "COMPLETED";
  progress?: number;
  startDate?: string;
  endDate?: string;
  createdBy?: string;
  teamId?: string;
  /** User ids allowed as task assignees for this project */
  memberUserIds?: string[];
  createdAt?: string;
  updatedAt?: string;
}
