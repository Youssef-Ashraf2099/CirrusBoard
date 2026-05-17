export type UserRole = "EMPLOYEE" | "MANAGER" | "ADMIN";

export interface UserItem {
  PK: string; // USER#<userId>
  userId: string;
  email: string;
  name: string;
  role: UserRole;
  password?: string; // hashed
  primaryTeamId?: string;
  teamIds?: string[];
  cognitoSub?: string;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}
