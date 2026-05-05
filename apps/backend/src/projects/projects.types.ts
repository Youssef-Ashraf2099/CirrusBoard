export interface ProjectItem {
  projectId: string;
  name: string;
  description?: string;
  ownerId?: string; // manager
  teamId?: string;
  createdAt?: string;
  updatedAt?: string;
}
