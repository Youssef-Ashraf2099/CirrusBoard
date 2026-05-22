/** Normalize team ids for comparisons (strip optional TEAM# prefix). */
export function normalizeTeamId(teamId?: string | null): string {
  if (!teamId) return "";
  return String(teamId).replace(/^TEAM#/, "").trim();
}

export function teamIdsMatch(
  a?: string | null,
  b?: string | null,
): boolean {
  const na = normalizeTeamId(a);
  const nb = normalizeTeamId(b);
  if (!na || !nb) return false;
  return na === nb;
}
