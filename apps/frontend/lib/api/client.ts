import type { TaskPriority, TaskStatus } from "@/lib/types";
import {
  mapApiActivityToActivity,
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
  type ApiComment,
  type ApiNotification,
  type ApiProject,
  type ApiTask,
  type ApiTeam,
  type ApiUser,
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

function getStoredCognitoToken(): string | null {
  if (typeof window === "undefined") return null;
  const direct =
    localStorage.getItem("cognitoAccessToken") ||
    localStorage.getItem("accessToken") ||
    localStorage.getItem("idToken");
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
      const accessKey = `${prefix}.${lastAuthUser}.accessToken`;
      const accessToken = localStorage.getItem(accessKey);
      if (accessToken) return accessToken;
      const idKey = `${prefix}.${lastAuthUser}.idToken`;
      const idToken = localStorage.getItem(idKey);
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

async function request<T>(
  path: string,
  init?: RequestInit & { json?: unknown },
): Promise<T> {
  const { json, headers, ...rest } = init ?? {};
  const body =
    json !== undefined ? JSON.stringify(json) : (rest as RequestInit).body;
  const resolvedHeaders = new Headers(headers);
  if (json !== undefined && !resolvedHeaders.has("Content-Type")) {
    resolvedHeaders.set("Content-Type", "application/json");
  }
  const token = getStoredCognitoToken();
  if (token && !resolvedHeaders.has("authorization")) {
    resolvedHeaders.set("authorization", `Bearer ${token}`);
  }

  const res = await fetch(path, {
    ...rest,
    body,
    headers: resolvedHeaders,
    cache: "no-store",
  });
  if (!res.ok) {
    let errBody: unknown;
    try {
      errBody = await res.json();
    } catch {
      errBody = await res.text();
    }
    const msg =
      typeof errBody === "object" && errBody && "message" in errBody
        ? String((errBody as { message?: string }).message)
        : res.statusText;
    throw new ApiError(res.status, msg || "Request failed", errBody);
  }
  if (res.status === 204) return undefined as T;
  return parseJson<T>(res);
}

function buildUserMap(users: User[]) {
  return new Map(users.map((u) => [u.id, u]));
}

export const api = {
  async login(email: string, password: string): Promise<User> {
    const raw = await request<ApiUser>("/api/users/login", {
      method: "POST",
      json: { email, password },
    });
    return mapApiUserToUser(raw);
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
    const raw = await request<ApiUser>("/api/users", {
      method: "POST",
      json: {
        ...input,
        primaryTeamId: input.primaryTeamId ?? DEFAULT_TEAM_ID,
      },
    });
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
    const qs = `?userId=${encodeURIComponent(userId)}`;
    const rows = await request<ApiNotification[]>(`/api/notifications${qs}`);
    return rows.map(mapApiNotificationToNotification);
  },

  async createNotification(input: {
    userId: string;
    type: ApiNotification["type"];
    title: string;
    message: string;
    link?: string;
  }): Promise<Notification> {
    const raw = await request<ApiNotification>("/api/notifications", {
      method: "POST",
      json: input,
    });
    return mapApiNotificationToNotification(raw);
  },

  async patchNotification(id: string, read: boolean): Promise<Notification> {
    const raw = await request<ApiNotification>(
      `/api/notifications/${encodeURIComponent(id)}`,
      { method: "PATCH", json: { read } },
    );
    return mapApiNotificationToNotification(raw);
  },

  async deleteNotification(id: string): Promise<void> {
    await request(`/api/notifications/${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
  },

  async listActivity(teamId: string, limit?: number): Promise<ActivityItem[]> {
    const sp = new URLSearchParams({ teamId });
    if (limit !== undefined) sp.set("limit", String(limit));
    const rows = await request<ApiActivity[]>(`/api/activity?${sp.toString()}`);
    const users = await this.listUsers(teamId).catch(() => []);
    const map = buildUserMap(users);
    return rows.map((a) => mapApiActivityToActivity(a, map));
  },

  async createActivity(input: {
    teamId: string;
    userId: string;
    action: string;
    target: string;
    targetId: string;
  }): Promise<ActivityItem> {
    const raw = await request<ApiActivity>("/api/activity", {
      method: "POST",
      json: input,
    });
    const users = await this.listUsers(input.teamId).catch(() => []);
    const map = buildUserMap(users);
    return mapApiActivityToActivity(raw, map);
  },

  /** Mirrors Nest GET /api/projects/team/:teamId */
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

  /** Mirrors Nest GET /api/tasks/team/:teamId */
  async listTasksForTeam(teamId: string): Promise<ApiTask[]> {
    return request<ApiTask[]>(`/api/tasks/team/${encodeURIComponent(teamId)}`);
  },

  async getTask(id: string): Promise<ApiTask> {
    return request<ApiTask>(`/api/tasks/${encodeURIComponent(id)}`);
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

  async assignTask(id: string, assigneeId: string) {
    return request<ApiTask>(`/api/tasks/${encodeURIComponent(id)}/assign`, {
      method: "PATCH",
      json: { assigneeId },
    });
  },

  async deleteTask(id: string) {
    await request(`/api/tasks/${encodeURIComponent(id)}`, { method: "DELETE" });
  },

  async listComments(taskId: string): Promise<Comment[]> {
    const raw = await request<ApiComment[]>(
      `/api/comments/task/${encodeURIComponent(taskId)}`,
    );
    const users = await this.listUsers().catch(() => []);
    const map = buildUserMap(users);
    return raw.map((c) => mapApiCommentToComment(c, map));
  },

  /**
   * Mirrors Nest POST /api/comments body: CreateCommentDto
   * (`taskId`, `content`; optional `authorId` defaults to `"dummy"` on server).
   */
  async addComment(
    taskId: string,
    content: string,
    options?: { authorId?: string },
  ): Promise<Comment> {
    const body: { taskId: string; content: string; authorId?: string } = {
      taskId,
      content,
    };
    if (options?.authorId) body.authorId = options.authorId;
    const raw = await request<ApiComment>("/api/comments", {
      method: "POST",
      json: body,
    });
    const users = await this.listUsers().catch(() => []);
    const map = buildUserMap(users);
    return mapApiCommentToComment(raw, map);
  },

  /** Nest PATCH /api/comments/:taskId/:commentId — body: { content } */
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

  /** Nest DELETE /api/comments/:taskId/:commentId */
  async deleteComment(taskId: string, commentId: string): Promise<void> {
    await request(
      `/api/comments/${encodeURIComponent(taskId)}/${encodeURIComponent(commentId)}`,
      { method: "DELETE" },
    );
  },

  async hydrateTasks(tasks: ApiTask[], teamId: string): Promise<Task[]> {
    const users = await this.listUsers(teamId).catch(() => []);
    const userMap = buildUserMap(users);
    return tasks.map((t) => mapApiTaskToTask(t, userMap, 0));
  },

  async loadTasksWithMeta(teamId: string): Promise<Task[]> {
    const raw = await this.listTasksForTeam(teamId);
    return this.hydrateTasks(raw, teamId);
  },
};
