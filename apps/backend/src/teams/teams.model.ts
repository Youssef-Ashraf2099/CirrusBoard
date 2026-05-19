export interface TeamItem {
  PK: string;
  teamId: string;
  name: string;
  description?: string;
  managerId: string;
  memberUserIds?: string[];
  createdAt?: string;
  updatedAt?: string;
}
