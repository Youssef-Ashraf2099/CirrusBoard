import type { UserRole } from "../users/users.model";

/** Manager and admin can create/manage projects, tasks, teams (pre–Cognito). */
export function isPrivileged(role: UserRole): boolean {
  return role === "MANAGER" || role === "ADMIN";
}

export function isTeamMember(
  actor: { primaryTeamId?: string; teamIds?: string[] },
  teamId: string,
): boolean {
  return (
    actor.primaryTeamId === teamId || (actor.teamIds ?? []).includes(teamId)
  );
}
