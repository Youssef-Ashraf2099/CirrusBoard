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
  createdAt?: string;
  updatedAt?: string;
}
