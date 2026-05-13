export interface ProjectItem {
  PK: string; // e.g. PROJECT#<projectId>
  projectId: string;
  name: string;
  title: string;
  description?: string;
  status?: "ACTIVE" | "ARCHIVED";
  createdBy?: string;
  teamId?: string;
  createdAt?: string;
  updatedAt?: string;
}
