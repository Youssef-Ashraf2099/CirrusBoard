/** Sentinel for manager "all teams" task listing (no teamId query param). */
export const ALL_TEAMS_VALUE = '__all__'

/** teamId for GET /tasks, or undefined for manager company-wide list. */
export function resolveTaskListTeamId(
  canViewAllTeams: boolean,
  viewTeamId: string,
  employeeTeamId: string,
): string | undefined {
  if (!canViewAllTeams) return employeeTeamId
  if (viewTeamId === ALL_TEAMS_VALUE || !viewTeamId) return undefined
  return viewTeamId
}
