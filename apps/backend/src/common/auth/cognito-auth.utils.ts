import { UserItem, UserRole } from "../../users/users.model";

export type CognitoClaims = Record<string, any>;

export type AuthenticatedUser = Omit<UserItem, "cognitoSub"> & {
  cognitoSub: string;
  claims: CognitoClaims;
};

export function extractBearerToken(
  authorizationHeader: string | string[] | undefined,
): string {
  if (!authorizationHeader) {
    throw new Error("Missing Authorization header");
  }

  const raw = Array.isArray(authorizationHeader)
    ? authorizationHeader[0]
    : authorizationHeader;
  const [scheme, token] = raw.split(" ");

  if (!scheme || !token || scheme.toLowerCase() !== "bearer") {
    throw new Error("Authorization header must be a Bearer token");
  }

  return token;
}

export function normalizeRole(value: unknown): UserRole {
  const raw = Array.isArray(value) ? value[0] : value;
  const role = String(raw ?? "").toUpperCase();
  if (role === "ADMIN") return "ADMIN";
  return role === "MANAGER" ? "MANAGER" : "EMPLOYEE";
}

function parseCsvOrJsonArray(value: unknown): string[] {
  if (!value) return [];
  if (Array.isArray(value))
    return value.map((item) => String(item)).filter(Boolean);

  const raw = String(value).trim();
  if (!raw) return [];

  if (raw.startsWith("[") && raw.endsWith("]")) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.map((item) => String(item)).filter(Boolean);
      }
    } catch {
      // fall through to CSV parsing
    }
  }

  return raw
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function normalizeTeamIds(claims: CognitoClaims): string[] {
  const teamIds = [
    ...parseCsvOrJsonArray(claims["custom:teamIds"]),
    ...parseCsvOrJsonArray(claims.teamIds),
  ];

  const primaryTeamId = claims["custom:teamId"] || claims.teamId;
  if (primaryTeamId) {
    teamIds.push(String(primaryTeamId));
  }

  return [...new Set(teamIds.map((teamId) => String(teamId)).filter(Boolean))];
}

export function normalizePrimaryTeamId(
  claims: CognitoClaims,
): string | undefined {
  const primaryTeamId = claims["custom:teamId"] || claims.teamId;
  return primaryTeamId ? String(primaryTeamId) : undefined;
}

export function normalizeDisplayName(claims: CognitoClaims): string {
  return String(
    claims.name ||
      claims.given_name ||
      claims.preferred_username ||
      claims.email ||
      claims.sub ||
      "",
  ).trim();
}

export function hasTeamAccess(
  actor: Pick<UserItem, "role" | "primaryTeamId" | "teamIds">,
  teamId: string,
): boolean {
  if (actor.role === "MANAGER" || actor.role === "ADMIN") return true;
  if (!teamId) return false;

  const accessibleTeams = new Set(
    [actor.primaryTeamId, ...(actor.teamIds ?? [])].filter(Boolean),
  );

  return accessibleTeams.has(teamId);
}

export function canManageWorkspace(
  actor: Pick<UserItem, "role" | "primaryTeamId" | "teamIds">,
): boolean {
  return actor.role === "MANAGER" || actor.role === "ADMIN";
}

export function buildCognitoUserItem(
  claims: CognitoClaims,
  existing?: Partial<UserItem> | null,
): UserItem {
  const cognitoSub = String(claims.sub || existing?.cognitoSub || "").trim();
  if (!cognitoSub) {
    throw new Error("Cognito token is missing the sub claim");
  }

  const now = new Date().toISOString();

  // ← FIX: prefer existing DB role, only use Cognito groups as fallback
  const role = existing?.role
    ? existing.role
    : normalizeRole(claims["cognito:groups"]);

  const primaryTeamId =
    normalizePrimaryTeamId(claims) ?? existing?.primaryTeamId;
  const teamIds = normalizeTeamIds(claims);
  if (primaryTeamId && !teamIds.includes(primaryTeamId)) {
    teamIds.unshift(primaryTeamId);
  }

  return {
    PK: existing?.PK ?? `USER#${cognitoSub}`,
    userId: existing?.userId ?? cognitoSub,
    email: String(claims.email ?? existing?.email ?? "").trim(),
    name: normalizeDisplayName(claims) || existing?.name || cognitoSub,
    role, // ← uses existing DB role
    password: existing?.password,
    primaryTeamId,
    teamIds,
    cognitoSub,
    isActive: existing?.isActive ?? true,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };
}
