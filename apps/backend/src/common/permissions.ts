import type { UserRole } from "../users/users.model";

/** Manager and admin can create/manage projects, tasks, teams (pre–Cognito). */
export function isPrivileged(role: UserRole): boolean {
  return role === "MANAGER" || role === "ADMIN";
}
