export interface ActivityItem {
  PK: string;
  activityId: string;
  teamId: string;
  userId: string;
  action: string;
  target: string;
  targetId: string;
  createdAt?: string;
}
