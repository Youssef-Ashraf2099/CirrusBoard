import type { TaskPriority, TaskStatus } from "@/lib/types";
import {
  mapApiActivityToActivity,
  mapApiAuditLogToTaskAuditLog,
  mapApiCommentToComment,
  mapApiNotificationToNotification,
  mapApiProjectToProject,
  mapApiTaskToTask,
  mapApiTeamToTeam,
  mapApiUserToUser,
  mapTaskToBackendCreateBody,
  mapTaskToBackendPatchBody,
  mapUiTaskStatusToApi,
  type ApiActivity,
  type ApiAuditLog,
  type ApiComment,
  type TaskAuditLog,
  type ApiNotification,
  type ApiProject,
  type ApiTask,
  type ApiTaskAttachment,
  type ApiTeam,
  type ApiUser,
  type TaskUploadPresignResponse,
} from "@/lib/api/mappers";
import type {
  ActivityItem,
  Comment,
  Notification,
  Project,
  Task,
  Team,
  User,
} from "@/lib/types";
import { DEFAULT_TEAM_ID } from "@/lib/config";

async function parseJson<T>(res: Response): Promise<T> {
  const text = await res.text();
  if (!text) return undefined as T;
  return JSON.parse(text) as T;
}

export class ApiError extends Error {
  status: number;
  body: unknown;

  constructor(status: number, message: string, body?: unknown) {
    super(message);
    this.status = status;
    this.body = body;
  }
}

type LoginTokens = {
  accessToken: string;
  idToken: string;
  refreshToken?: string;
  expiresIn?: number;
  tokenType?: string;
};

type LoginResponse =
  | ApiUser
  | {
      user: ApiUser;
      tokens?: LoginTokens;
    };

export type LoginResult = {
  user: User;
  tokens?: LoginTokens;
};

const ACCESS_TOKEN_KEYS = ["cognitoAccessToken", "accessToken", "idToken"];
const REFRESH_TOKEN_KEYS = ["cognitoRefreshToken", "refreshToken"];

function decodeJwtExpiry(token: string): number | null {
  const parts = token.split(".");
  if (parts.length < 2) return null;

  try {
    const payload = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = payload.padEnd(Math.ceil(payload.length / 4) * 4, "=");
    const parsed = JSON.parse(atob(padded)) as { exp?: number };
    return typeof parsed.exp === "number" ? parsed.exp : null;
  } catch {
    return null;
  }
}

function isJwtExpired(token: string): boolean {
  const exp = decodeJwtExpiry(token);
  if (!exp) return false;
  return Date.now() >= exp * 1000 - 30_000;
}

function readTokenFromKeys(keys: string[]): string | null {
  if (typeof window === "undefined") return null;

  for (const key of keys) {
    const token = localStorage.getItem(key);
    if (token && !isJwtExpired(token)) {
      return token;
    }
  }

  for (const key of keys) {
    const token = localStorage.getItem(key);
    if (token) {
      return token;
    }
  }

  return null;
}

function getStoredCognitoToken(): string | null {
  if (typeof window === "undefined") return null;

  const direct = readTokenFromKeys(ACCESS_TOKEN_KEYS);
  if (direct) return direct;

  const lastAuthUserKey = Object.keys(localStorage).find(
    (key) =>
      key.startsWith("CognitoIdentityServiceProvider.") &&
      key.endsWith(".LastAuthUser"),
  );
  if (lastAuthUserKey) {
    const lastAuthUser = localStorage.getItem(lastAuthUserKey);
    const prefix = lastAuthUserKey.replace(/\.LastAuthUser$/, "");
    if (lastAuthUser) {
      const accessToken = localStorage.getItem(
        `${prefix}.${lastAuthUser}.accessToken`,
      );
      if (accessToken) return accessToken;
      const idToken = localStorage.getItem(`${prefix}.${lastAuthUser}.idToken`);
      if (idToken) return idToken;
    }
  }

  const accessTokenKey = Object.keys(localStorage).find(
    (key) =>
      key.startsWith("CognitoIdentityServiceProvider.") &&
      key.endsWith(".accessToken"),
  );
  if (accessTokenKey) return localStorage.getItem(accessTokenKey);

  const idTokenKey = Object.keys(localStorage).find(
    (key) =>
      key.startsWith("CognitoIdentityServiceProvider.") &&
      key.endsWith(".idToken"),
  );
  if (idTokenKey) return localStorage.getItem(idTokenKey);

  return null;
}

function readStoredUser(): {
  id?: string;
  email?: string;
  name?: string;
} | null {
  if (typeof window === "undefined") return null;

  const raw = localStorage.getItem("taskflow_user");
  if (!raw) return null;

  try {
    return JSON.parse(raw) as { id?: string; email?: string; name?: string };
  } catch {
    return null;
  }
}

function writeSessionTokens(tokens: LoginTokens) {
  if (tokens.accessToken) {
    localStorage.setItem("cognitoAccessToken", tokens.accessToken);
    localStorage.setItem("accessToken", tokens.accessToken);
  }
  if (tokens.idToken) {
    localStorage.setItem("cognitoIdToken", tokens.idToken);
    localStorage.setItem("idToken", tokens.idToken);
  }
  if (tokens.refreshToken) {
    localStorage.setItem("cognitoRefreshToken", tokens.refreshToken);
    localStorage.setItem("refreshToken", tokens.refreshToken);
  }
}

function clearSessionTokens() {
  [
    "cognitoAccessToken",
    "accessToken",
    "cognitoIdToken",
    "idToken",
    "cognitoRefreshToken",
    "refreshToken",
  ].forEach((key) => localStorage.removeItem(key));
}

function getStoredRefreshToken(): string | null {
  return readTokenFromKeys(REFRESH_TOKEN_KEYS);
}

function getStoredEmail(): string | null {
  const user = readStoredUser();
  return user?.email?.trim().toLowerCase() || null;
}

async function refreshStoredSession(): Promise<LoginTokens | null> {
  if (typeof window === "undefined") return null;

  const email = getStoredEmail();
  const refreshToken = getStoredRefreshToken();
  if (!email || !refreshToken) return null;

  const res = await fetch("/api/users/refresh", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, refreshToken }),
    cache: "no-store",
  });

  if (!res.ok) return null;

  const payload = (await parseJson<LoginResponse>(res)) as
    | { user: ApiUser; tokens?: LoginTokens }
    | ApiUser;

  if (payload && typeof payload === "object" && "user" in payload) {
    localStorage.setItem(
      "taskflow_user",
      JSON.stringify(mapApiUserToUser(payload.user)),
    );
    if (payload.tokens) {
      writeSessionTokens(payload.tokens);
      return payload.tokens;
    }
  }

  return null;
}

async function request<T>(
  path: string,
  init?: RequestInit & { json?: unknown },
  options?: { allowRefresh?: boolean },
): Promise<T> {
  const allowRefresh = options?.allowRefresh ?? true;
  const { json, headers, ...rest } = init ?? {};
  const body = json !== undefined ? JSON.stringify(json) : rest.body;
  const resolvedHeaders = new Headers(headers);
  if (json !== undefined && !resolvedHeaders.has("Content-Type")) {
    resolvedHeaders.set("Content-Type", "application/json");
  }

  const send = async (token?: string | null) => {
    const nextHeaders = new Headers(resolvedHeaders);
    if (token && !nextHeaders.has("authorization")) {
      nextHeaders.set("authorization", `Bearer ${token}`);
      nextHeaders.set("x-cognito-access-token", token);
    }
    return fetch(path, {
      ...rest,
      body,
      headers: nextHeaders,
      cache: "no-store",
    });
  };

  let res = await send(getStoredCognitoToken());

  if (
    allowRefresh &&
    res.status === 401 &&
    typeof window !== "undefined" &&
    path !== "/api/users/refresh"
  ) {
    const refreshed = await refreshStoredSession();
    const refreshedToken = refreshed?.accessToken || refreshed?.idToken;
    if (refreshedToken) {
      res = await send(refreshedToken);
    }
  }

  if (!res.ok) {
    let errBody: unknown;
    try {
      errBody = await res.json();
    } catch {
      errBody = await res.text();
    }
    if (path.includes("/activity") || path.includes("/notifications")) {
      const tag = path.includes("/activity") ? "Activity" : "Notifications";
      console.error(`[CirrusBoard:${tag}] HTTP ${res.status} ${path}`, errBody);
    }
    let msg = res.statusText;
    if (typeof errBody === "object" && errBody && "message" in errBody) {
      const raw = (errBody as { message?: string | string[] }).message;
      msg = Array.isArray(raw) ? raw.join(", ") : String(raw ?? msg);
    } else if (typeof errBody === "string" && errBody.trim()) {
      msg = errBody;
    }
    throw new ApiError(res.status, msg || "Request failed", errBody);
  }

  if (res.status === 204) return undefined as T;
  return parseJson<T>(res);
}

export function buildUserMap(users: User[]) {
  return new Map(users.map((u) => [u.id, u]));
}

export const api = {
  async login(email: string, password: string): Promise<LoginResult> {
    const raw = await request<LoginResponse>(
      "/api/users/login",
      { method: "POST", json: { email, password } },
      { allowRefresh: false },
    );
    const payload =
      typeof raw === "object" && raw !== null && "user" in raw
        ? (raw as { user: ApiUser; tokens?: LoginTokens })
        : ({ user: raw as ApiUser } satisfies {
            user: ApiUser;
            tokens?: LoginTokens;
          });
    return {
      user: mapApiUserToUser(payload.user),
      tokens: payload.tokens,
    };
  },

  async listUsers(teamId?: string): Promise<User[]> {
    const qs = teamId ? `?teamId=${encodeURIComponent(teamId)}` : "";
    const rows = await request<ApiUser[]>(`/api/users${qs}`);
    return rows.map(mapApiUserToUser);
  },

  async getUser(id: string): Promise<User> {
    const raw = await request<ApiUser>(`/api/users/${encodeURIComponent(id)}`);
    return mapApiUserToUser(raw);
  },

  async createUser(input: {
    name: string;
    email: string;
    password: string;
    role: "EMPLOYEE" | "MANAGER" | "ADMIN";
    primaryTeamId?: string;
    teamIds?: string[];
  }): Promise<User> {
    const raw = await request<ApiUser>(
      "/api/users",
      {
        method: "POST",
        json: {
          ...input,
          primaryTeamId: input.primaryTeamId ?? DEFAULT_TEAM_ID,
        },
      },
      { allowRefresh: false },
    );
    return mapApiUserToUser(raw);
  },

  async updateUser(
    id: string,
    patch: Partial<{
      name: string;
      email: string;
      role: "EMPLOYEE" | "MANAGER" | "ADMIN";
      password: string;
      primaryTeamId: string;
      teamIds: string[];
      isActive: boolean;
    }>,
  ): Promise<User> {
    const raw = await request<ApiUser>(`/api/users/${encodeURIComponent(id)}`, {
      method: "PATCH",
      json: patch,
    });
    return mapApiUserToUser(raw);
  },

  async deleteUser(id: string): Promise<void> {
    await request(`/api/users/${encodeURIComponent(id)}`, { method: "DELETE" });
  },

  async listTeams(): Promise<Team[]> {
    const rows = await request<ApiTeam[]>("/api/teams");
    return rows.map(mapApiTeamToTeam);
  },

  async getTeam(id: string): Promise<Team> {
    const raw = await request<ApiTeam>(
      `/api/teams/${encodeURIComponent(id)}?expand=members`,
    );
    return mapApiTeamToTeam(raw);
  },

  async createTeam(input: {
    name: string;
    description?: string;
    managerId?: string;
    memberUserIds?: string[];
  }): Promise<Team> {
    const raw = await request<ApiTeam>("/api/teams", {
      method: "POST",
      json: input,
    });
    return mapApiTeamToTeam(raw);
  },

  async updateTeam(
    id: string,
    patch: Partial<{
      name: string;
      description: string;
      managerId: string;
      memberUserIds: string[];
    }>,
  ): Promise<Team> {
    const raw = await request<ApiTeam>(`/api/teams/${encodeURIComponent(id)}`, {
      method: "PATCH",
      json: patch,
    });
    return mapApiTeamToTeam(raw);
  },

  async deleteTeam(id: string): Promise<void> {
    await request(`/api/teams/${encodeURIComponent(id)}`, { method: "DELETE" });
  },

  async listNotifications(userId: string): Promise<Notification[]> {
    const path = `/api/notifications?userId=${encodeURIComponent(userId)}`;
    console.log("[CirrusBoard:Notifications] api.listNotifications → GET", path);
    try {
      const rows = await request<ApiNotification[]>(path);
      console.log("[CirrusBoard:Notifications] api.listNotifications ← OK", {
        count: rows?.length ?? 0,
        sample: rows?.[0],
      });
      return rows.map(mapApiNotificationToNotification);
    } catch (err) {
      console.error("[CirrusBoard:Notifications] api.listNotifications ← FAILED", err);
      throw err;
    }
  },

  async createNotification(input: {
    userId: string;
    type: ApiNotification["type"];
    title: string;
    message: string;
    link?: string;
  }): Promise<Notification> {
    console.log("[CirrusBoard:Notifications] api.createNotification → POST /api/notifications", input);
    try {
      const raw = await request<ApiNotification>("/api/notifications", {
        method: "POST",
        json: input,
      });
      console.log("[CirrusBoard:Notifications] api.createNotification ← OK", raw);
      return mapApiNotificationToNotification(raw);
    } catch (err) {
      console.error("[CirrusBoard:Notifications] api.createNotification ← FAILED", err);
      throw err;
    }
  },

  async patchNotification(id: string, read: boolean): Promise<Notification> {
    const path = `/api/notifications/${encodeURIComponent(id)}`;
    console.log("[CirrusBoard:Notifications] api.patchNotification → PATCH", path, { read });
    try {
      const raw = await request<ApiNotification>(path, {
        method: "PATCH",
        json: { read },
      });
      console.log("[CirrusBoard:Notifications] api.patchNotification ← OK", raw);
      return mapApiNotificationToNotification(raw);
    } catch (err) {
      console.error("[CirrusBoard:Notifications] api.patchNotification ← FAILED", err);
      throw err;
    }
  },

  async deleteNotification(id: string): Promise<void> {
    const path = `/api/notifications/${encodeURIComponent(id)}`;
    console.log("[CirrusBoard:Notifications] api.deleteNotification → DELETE", path);
    try {
      await request(path, { method: "DELETE" });
      console.log("[CirrusBoard:Notifications] api.deleteNotification ← OK");
    } catch (err) {
      console.error("[CirrusBoard:Notifications] api.deleteNotification ← FAILED", err);
      throw err;
    }
  },

  async listActivity(teamId: string, limit?: number): Promise<ActivityItem[]> {
    const sp = new URLSearchParams({ teamId });
    if (limit !== undefined) sp.set("limit", String(limit));
    const path = `/api/activity?${sp.toString()}`;
    console.log("[CirrusBoard:Activity] api.listActivity → GET", path);
    try {
      const rows = await request<ApiActivity[]>(path);
      console.log("[CirrusBoard:Activity] api.listActivity ← raw response", {
        count: rows?.length ?? 0,
        sample: rows?.[0],
      });
      const users = await this.listUsers(teamId).catch((e) => {
        console.warn("[CirrusBoard:Activity] listUsers for mapping failed (non-fatal)", e);
        return [];
      });
      const map = buildUserMap(users);
      const mapped = rows.map((a) => mapApiActivityToActivity(a, map));
      console.log("[CirrusBoard:Activity] api.listActivity ← mapped", {
        count: mapped.length,
      });
      return mapped;
    } catch (err) {
      console.error("[CirrusBoard:Activity] api.listActivity ← FAILED", err);
      throw err;
    }
  },

  async createActivity(input: {
    teamId: string;
    userId: string;
    action: string;
    target: string;
    targetId: string;
    taskId?: string;
  }): Promise<ActivityItem> {
    console.log("[CirrusBoard:Activity] api.createActivity → POST /api/activity", input);
    try {
      const raw = await request<ApiActivity>("/api/activity", {
        method: "POST",
        json: input,
      });
      console.log("[CirrusBoard:Activity] api.createActivity ← OK", raw);
      const users = await this.listUsers(input.teamId).catch((e) => {
        console.warn("[CirrusBoard:Activity] listUsers for mapping failed (non-fatal)", e);
        return [];
      });
      const map = buildUserMap(users);
      return mapApiActivityToActivity(raw, map);
    } catch (err) {
      console.error("[CirrusBoard:Activity] api.createActivity ← FAILED", err);
      throw err;
    }
  },

  async listProjects(teamId: string): Promise<Project[]> {
    const rows = await request<ApiProject[]>(
      `/api/projects/team/${encodeURIComponent(teamId)}`,
    );
    return rows.map(mapApiProjectToProject);
  },

  async getProject(id: string): Promise<Project> {
    const raw = await request<ApiProject>(
      `/api/projects/${encodeURIComponent(id)}`,
    );
    return mapApiProjectToProject(raw);
  },

  async createProject(input: {
    name: string;
    description?: string;
    teamId?: string;
    status?: "ACTIVE" | "ARCHIVED" | "COMPLETED";
    progress?: number;
    startDate?: string;
    endDate?: string;
  }): Promise<Project> {
    const raw = await request<ApiProject>("/api/projects", {
      method: "POST",
      json: {
        name: input.name,
        description: input.description,
        teamId: input.teamId ?? DEFAULT_TEAM_ID,
        status: input.status,
        progress: input.progress,
        startDate: input.startDate,
        endDate: input.endDate,
      },
    });
    return mapApiProjectToProject(raw);
  },

  async updateProject(
    id: string,
    patch: Partial<{
      name: string;
      description: string;
      status: "ACTIVE" | "ARCHIVED" | "COMPLETED";
      progress?: number;
      startDate?: string;
      endDate?: string;
    }>,
  ): Promise<Project> {
    const raw = await request<ApiProject>(
      `/api/projects/${encodeURIComponent(id)}`,
      {
        method: "PATCH",
        json: patch,
      },
    );
    return mapApiProjectToProject(raw);
  },

  async deleteProject(id: string): Promise<void> {
    await request(`/api/projects/${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
  },

  /** List tasks: employees get assigned only; managers get all or optional team filter. */
  async listTasks(teamId?: string): Promise<ApiTask[]> {
    const path =
      teamId != null && teamId !== ""
        ? `/api/tasks?teamId=${encodeURIComponent(teamId)}`
        : "/api/tasks";
    return request<ApiTask[]>(path);
  },

  /** @deprecated Use listTasks(teamId) */
  async listTasksForTeam(teamId: string): Promise<ApiTask[]> {
    return this.listTasks(teamId);
  },

  async getTask(id: string): Promise<ApiTask> {
    return request<ApiTask>(`/api/tasks/${encodeURIComponent(id)}`);
  },

  /** Full task for detail view (assignee, attachments, comment count). */
  async getTaskWithMeta(taskId: string): Promise<Task> {
    const [raw, comments] = await Promise.all([
      this.getTask(taskId),
      this.listComments(taskId).catch(() => []),
    ]);
    const users = await this.listUsers().catch(() => []);
    return mapApiTaskToTask(raw, buildUserMap(users), comments.length);
  },

  async createTask(fields: {
    title: string;
    description: string;
    priority: TaskPriority;
    dueDate: string;
    assigneeId: string;
    teamId: string;
    projectId: string;
    status?: TaskStatus;
    attachments?: ApiTask["attachments"];
    tags?: string[];
  }): Promise<ApiTask> {
    return request<ApiTask>("/api/tasks", {
      method: "POST",
      json: mapTaskToBackendCreateBody(fields),
    });
  },

  async patchTask(
    id: string,
    patch: Parameters<typeof mapTaskToBackendPatchBody>[0],
  ) {
    const body = mapTaskToBackendPatchBody(patch);
    if (Object.keys(body).length === 0) return;
    return request<ApiTask>(`/api/tasks/${encodeURIComponent(id)}`, {
      method: "PATCH",
      json: body,
    });
  },

  async patchTaskStatus(id: string, status: TaskStatus) {
    return request<ApiTask>(`/api/tasks/${encodeURIComponent(id)}/status`, {
      method: "PATCH",
      json: { status: mapUiTaskStatusToApi(status) },
    });
  },

  async assignTask(id: string, assigneeId: string): Promise<Task> {
    const raw = await request<ApiTask>(
      `/api/tasks/${encodeURIComponent(id)}/assign`,
      {
        method: "PATCH",
        json: { assigneeId },
      },
    );
    const users = await this.listUsers().catch(() => []);
    return mapApiTaskToTask(raw, buildUserMap(users), 0);
  },

  async listAuditLogsForTask(taskId: string): Promise<TaskAuditLog[]> {
    const rows = await request<ApiAuditLog[]>(
      `/api/audit-logs/task/${encodeURIComponent(taskId)}`,
    );
    const users = await this.listUsers().catch(() => []);
    const map = buildUserMap(users);
    return rows.map((r) => mapApiAuditLogToTaskAuditLog(taskId, r, map));
  },

  async createAuditLog(
    taskId: string,
    input: {
      action: string;
      actorId: string;
      oldValue?: string;
      newValue?: string;
    },
  ): Promise<TaskAuditLog> {
    const raw = await request<ApiAuditLog>(
      `/api/audit-logs/task/${encodeURIComponent(taskId)}`,
      {
        method: "POST",
        json: { taskId, ...input },
      },
    );
    const users = await this.listUsers().catch(() => []);
    return mapApiAuditLogToTaskAuditLog(
      taskId,
      raw,
      buildUserMap(users),
    );
  },

  async resizeTaskAttachment(
    taskId: string,
    body: { attachmentId?: string; key?: string; functionName?: string },
  ): Promise<unknown> {
    return request(
      `/api/tasks/${encodeURIComponent(taskId)}/resize`,
      { method: "POST", json: body },
    );
  },

  async deleteTask(id: string) {
    await request(`/api/tasks/${encodeURIComponent(id)}`, { method: "DELETE" });
  },

  async requestTaskUploadUrl(
    taskId: string,
    body: { filename: string; contentType: string },
  ): Promise<TaskUploadPresignResponse> {
    return request<TaskUploadPresignResponse>(
      `/api/tasks/${encodeURIComponent(taskId)}/upload-url`,
      { method: "POST", json: body },
    );
  },

  async confirmTaskUpload(
    taskId: string,
    body: {
      attachmentId: string;
      key: string;
      eTag?: string;
      size?: number;
    },
  ): Promise<ApiTask> {
    return request<ApiTask>(
      `/api/tasks/${encodeURIComponent(taskId)}/upload-complete`,
      { method: "POST", json: body },
    );
  },

  async getAttachmentDownloadUrl(
    taskId: string,
    attachmentId: string,
  ): Promise<{ url: string; expiresIn: number }> {
    return request<{ url: string; expiresIn: number }>(
      `/api/tasks/${encodeURIComponent(taskId)}/attachments/${encodeURIComponent(attachmentId)}/download-url`,
    );
  },

  /**
   * PUT file bytes directly to S3 (not through Next proxy). Requires bucket CORS.
   */
  putFileToPresignedUrl(
    uploadUrl: string,
    file: File,
    onProgress?: (percent: number) => void,
  ): Promise<string | null> {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("PUT", uploadUrl);
      xhr.setRequestHeader(
        "Content-Type",
        file.type || "application/octet-stream",
      );

      if (onProgress) {
        xhr.upload.onprogress = (ev) => {
          if (ev.lengthComputable) {
            onProgress(Math.round((ev.loaded / ev.total) * 100));
          }
        };
      }

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          const raw = xhr.getResponseHeader("ETag");
          resolve(raw ? raw.replace(/"/g, "") : null);
        } else {
          reject(
            new ApiError(
              xhr.status,
              `S3 upload failed (${xhr.status})`,
              xhr.responseText,
            ),
          );
        }
      };

      xhr.onerror = () => {
        reject(
          new ApiError(
            0,
            "S3 upload failed — check bucket CORS and network",
            null,
          ),
        );
      };

      xhr.send(file);
    });
  },

  async listComments(taskId: string): Promise<Comment[]> {
    const raw = await request<ApiComment[]>(
      `/api/comments/task/${encodeURIComponent(taskId)}`,
    );
    const users = await this.listUsers().catch(() => []);
    const map = buildUserMap(users);
    return raw.map((c) => mapApiCommentToComment(c, map));
  },

  async addComment(taskId: string, content: string): Promise<Comment> {
    const body: { taskId: string; content: string } = {
      taskId,
      content,
    };
    const raw = await request<ApiComment>("/api/comments", {
      method: "POST",
      json: body,
    });
    const users = await this.listUsers().catch(() => []);
    const map = buildUserMap(users);
    return mapApiCommentToComment(raw, map);
  },

  async updateComment(
    taskId: string,
    commentId: string,
    content: string,
  ): Promise<Comment> {
    const raw = await request<ApiComment>(
      `/api/comments/${encodeURIComponent(taskId)}/${encodeURIComponent(commentId)}`,
      { method: "PATCH", json: { content } },
    );
    const users = await this.listUsers().catch(() => []);
    const map = buildUserMap(users);
    return mapApiCommentToComment(raw, map);
  },

  async deleteComment(taskId: string, commentId: string): Promise<void> {
    await request(
      `/api/comments/${encodeURIComponent(taskId)}/${encodeURIComponent(commentId)}`,
      { method: "DELETE" },
    );
  },

  async hydrateTasks(tasks: ApiTask[], teamId?: string): Promise<Task[]> {
    const users = teamId
      ? await this.listUsers(teamId).catch(() => [])
      : await this.listUsers().catch(() => []);
    const userMap = buildUserMap(users);
    const counts = await fetchCommentCountsForTasks(tasks.map((t) => t.taskId));
    return tasks.map((t) =>
      mapApiTaskToTask(t, userMap, counts.get(t.taskId) ?? 0),
    );
  },

  async loadTasksWithMeta(
    teamId?: string,
    options?: { employeeScope?: boolean },
  ): Promise<Task[]> {
    const raw = options?.employeeScope
      ? await this.listTasks()
      : await this.listTasks(teamId);
    return this.hydrateTasks(raw, teamId);
  },
};

async function fetchCommentCountsForTasks(
  taskIds: string[],
): Promise<Map<string, number>> {
  if (taskIds.length === 0) return new Map();
  const pairs = await Promise.all(
    taskIds.map(async (taskId) => {
      try {
        const raw = await request<ApiComment[]>(
          `/api/comments/task/${encodeURIComponent(taskId)}`,
        );
        return [taskId, raw.length] as const;
      } catch {
        return [taskId, 0] as const;
      }
    }),
  );
  return new Map(pairs);
}
