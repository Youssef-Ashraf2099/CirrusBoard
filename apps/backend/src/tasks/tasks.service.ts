import {
  Injectable,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { TasksRepository } from "./tasks.repository";
import { TaskItem, Attachment } from "./tasks.model";
import { UserItem } from "../users/users.model";
import { UsersRepository } from "../users/users.repository";
import { assertCanReadTask } from "./task-access";
import { v4 as uuidv4 } from "uuid";
import { CreateTaskDto } from "./dto/create-task.dto";
import { UpdateTaskDto } from "./dto/update-task.dto";
import { isPrivileged } from "../common/permissions";
import { S3Service } from "../integrations/s3/s3.service";
import { LambdaService } from "../integrations/lambda/lambda.service";
import { SnsService } from "../integrations/sns/sns.service";
import { AuditLogsService } from "../audit-logs/audit-logs.service";
import { NotificationsService } from "../notifications/notifications.service";
import { ProjectsRepository } from "../projects/projects.repository";
import { isTeamMember } from "../common/permissions";

@Injectable()
export class TasksService {
  constructor(
    private readonly repo: TasksRepository,
    private readonly usersRepo: UsersRepository,
    private readonly projectsRepo: ProjectsRepository,
    private readonly s3?: S3Service,
    private readonly lambda?: LambdaService,
    private readonly sns?: SnsService,
    private readonly notifications?: NotificationsService,
    private readonly auditLogs?: AuditLogsService,
  ) {}

  private normalizeTeamId(teamId: string): string {
    return teamId.replace(/^TEAM#/, "");
  }

  private async resolveUser(userId: string): Promise<UserItem | null> {
    const direct = await this.usersRepo.getUserById(userId);
    if (direct) return direct;
    return this.usersRepo.getUserByCognitoSub(userId);
  }

  private async validateAssigneeForTeam(
    teamId: string,
    assigneeId: string,
  ): Promise<UserItem> {
    if (!assigneeId) {
      throw new BadRequestException("Assignee is required");
    }
    const assignee = await this.resolveUser(assigneeId);
    if (!assignee) {
      throw new NotFoundException("Assignee not found");
    }
    const taskTeam = this.normalizeTeamId(teamId);
    if (!isTeamMember(assignee, taskTeam)) {
      throw new BadRequestException(
        "Assignee must belong to the selected task team",
      );
    }
    return assignee;
  }

  private async validateAssigneeForProject(
    projectId: string,
    assigneeId: string,
    teamId: string,
  ): Promise<UserItem> {
    const assignee = await this.validateAssigneeForTeam(teamId, assigneeId);
    const project = await this.projectsRepo.getProjectById(projectId);
    if (!project) {
      throw new NotFoundException("Project not found");
    }
    const roster = project.memberUserIds ?? [];
    if (roster.length > 0 && !roster.includes(assignee.userId)) {
      throw new BadRequestException(
        "Assignee must be assigned to this project",
      );
    }
    return assignee;
  }

  /** Load task and enforce read access (used by comments and other modules). */
  async assertTaskAccess(actor: UserItem, taskId: string): Promise<TaskItem> {
    const task = await this.repo.getTaskById(taskId);
    if (!task) throw new NotFoundException("Task not found");
    assertCanReadTask(actor, task);
    return task;
  }

  private serializeAuditValue(value: unknown) {
    if (value === undefined || value === null) return undefined;
    if (typeof value === "string") return value;
    try {
      return JSON.stringify(value);
    } catch (e) {
      return String(value);
    }
  }

  private async recordAuditLog(
    taskId: string,
    actorId: string,
    action: string,
    teamId: string,
    oldValue?: unknown,
    newValue?: unknown,
    meta?: { target?: string; targetId?: string },
  ) {
    const payload = {
      taskId,
      action,
      actorId,
      teamId,
      target: meta?.target ?? "task",
      targetId: meta?.targetId ?? taskId,
      oldValue: this.serializeAuditValue(oldValue),
      newValue: this.serializeAuditValue(newValue),
    };

    const auditFn =
      process.env.TASK_AUDIT_LOG_FUNCTION || process.env.AUDIT_LOG_LAMBDA || "";

    if (this.lambda && auditFn) {
      try {
        await this.lambda.invoke(auditFn, payload, "Event");
        return;
      } catch (e) {
        // fall back to direct audit log write
      }
    }

    if (this.auditLogs) {
      try {
        await this.auditLogs.addAuditLog(taskId, payload as any);
      } catch (e) {
        // ignore audit log failures
      }
    }
  }

  async createTask(actor: UserItem, input: CreateTaskDto): Promise<TaskItem> {
    if (!isPrivileged(actor.role)) {
      throw new ForbiddenException("Only managers may create tasks");
    }
    if (!input.teamId) {
      throw new BadRequestException("teamId is required");
    }
    if (input.assigneeId) {
      if (!input.projectId) {
        throw new BadRequestException("projectId is required");
      }
      await this.validateAssigneeForProject(
        input.projectId,
        input.assigneeId,
        input.teamId,
      );
    }
    const now = new Date().toISOString();
    const task: Partial<TaskItem> = {
      taskId: uuidv4(),
      projectId: input.projectId,
      title: input.title ?? "Untitled",
      description: input.description,
      status: (input.status as any) ?? "TODO",
      priority: (input.priority as any) ?? "MEDIUM",
      deadline: input.deadline ?? now.split("T")[0],
      assigneeId: input.assigneeId,
      teamId: input.teamId!,
      createdBy: actor.userId,
      attachments: input.attachments ?? [],
      tags: input.tags ?? [],
      createdAt: now,
      updatedAt: now,
    };
    const created = await this.repo.createTask(task as any);
    await this.recordAuditLog(
      created.taskId,
      actor.userId,
      "TASK_CREATED",
      created.teamId,
      undefined,
      {
        title: created.title,
        status: created.status,
        assigneeId: created.assigneeId,
      },
    );
    return created;
  }

  async getTask(actor: UserItem, taskId: string): Promise<TaskItem> {
    return this.assertTaskAccess(actor, taskId);
  }

  async listTasks(actor: UserItem, teamId?: string): Promise<TaskItem[]> {
    if (isPrivileged(actor.role)) {
      if (teamId) {
        return this.repo.queryTasksByTeamId(teamId);
      }
      return this.repo.listAllTasks();
    }
    if (teamId && !isTeamMember(actor, teamId)) {
      throw new ForbiddenException("Access denied to team tasks");
    }
    const assigned = await this.repo.queryTasksByAssigneeId(actor.userId);
    return assigned.filter((t) => isTeamMember(actor, t.teamId));
  }

  async updateStatus(
    actor: UserItem,
    taskId: string,
    status: TaskItem["status"],
  ): Promise<TaskItem> {
    const task = await this.repo.getTaskById(taskId);
    if (!task) throw new NotFoundException("Task not found");
    if (actor.role === "EMPLOYEE") {
      assertCanReadTask(actor, task);
    }
    const updates: Partial<TaskItem> = {
      status,
      updatedAt: new Date().toISOString(),
      statusDeadline: `${status}#${task.deadline}`,
    };
    const updated = await this.repo.updateTask(taskId, updates);
    await this.recordAuditLog(
      taskId,
      actor.userId,
      "TASK_STATUS_UPDATED",
      task.teamId,
      { status: task.status },
      { status },
    );
    return updated;
  }
  async assignTask(
    actor: UserItem,
    taskId: string,
    assigneeId: string,
  ): Promise<TaskItem> {
    if (!isPrivileged(actor.role)) {
      throw new ForbiddenException("Only managers can assign tasks");
    }

    const task = await this.repo.getTaskById(taskId);

    if (!task) {
      throw new NotFoundException("Task not found");
    }

    const assignee = await this.validateAssigneeForProject(
      task.projectId,
      assigneeId,
      task.teamId,
    );

    const previousAssignee = task.assigneeId;
    const updated = await this.repo.updateTask(taskId, {
      assigneeId,
      updatedAt: new Date().toISOString(),
    });

    await this.recordAuditLog(
      taskId,
      actor.userId,
      "TASK_ASSIGNED",
      task.teamId,
      { assigneeId: previousAssignee },
      { assigneeId },
    );

    if (this.sns) {
      try {
        await this.sns.publishTaskAssigned({
          taskId,
          teamId: task.teamId,
          assigneeId,
          assignedBy: actor.userId,
        });
      } catch (e) {
        // ignore notification errors for now
      }
    }

    if (this.notifications) {
      try {
        await this.notifications.create(actor, {
          userId: assignee.userId,
          type: "TASK_ASSIGNED",
          title: "Task assigned",
          message: `You were assigned to ${task.title}`,
          link: `/dashboard/tasks/${taskId}`,
        });
      } catch (e) {
        // ignore in-app notification failures for now
      }
    }

    return updated;
  }

  async updateTask(
    actor: UserItem,
    taskId: string,
    input: UpdateTaskDto,
  ): Promise<TaskItem> {
    const task = await this.repo.getTaskById(taskId);
    if (!task) throw new NotFoundException("Task not found");
    if (!isPrivileged(actor.role)) {
      throw new ForbiddenException(
        "Only managers may update task fields; use status endpoint",
      );
    }
    if (
      input.assigneeId !== undefined &&
      input.assigneeId !== task.assigneeId
    ) {
      await this.validateAssigneeForProject(
        task.projectId,
        input.assigneeId,
        task.teamId,
      );
    }
    const updates: Partial<TaskItem> = {
      updatedAt: new Date().toISOString(),
    };
    if (input.title !== undefined) updates.title = input.title;
    if (input.description !== undefined)
      updates.description = input.description;
    if (input.priority !== undefined)
      updates.priority = input.priority as TaskItem["priority"];
    if (input.deadline !== undefined) updates.deadline = input.deadline;
    if (input.assigneeId !== undefined) updates.assigneeId = input.assigneeId;
    if (input.status !== undefined)
      updates.status = input.status as TaskItem["status"];
    if (input.tags !== undefined) updates.tags = input.tags;
    if (input.status !== undefined || input.deadline !== undefined) {
      const mergedStatus =
        (input.status as TaskItem["status"] | undefined) ?? task.status;
      const mergedDeadline = input.deadline ?? task.deadline;
      updates.statusDeadline = `${mergedStatus}#${mergedDeadline}`;
    }
    return this.repo.updateTask(taskId, updates);
  }

  async deleteTask(actor: UserItem, taskId: string): Promise<void> {
    if (!isPrivileged(actor.role)) {
      throw new ForbiddenException("Only managers may delete tasks");
    }
    const task = await this.repo.getTaskById(taskId);
    if (!task) throw new NotFoundException("Task not found");
    await this.recordAuditLog(
      taskId,
      actor.userId,
      "TASK_DELETED",
      task.teamId,
      { status: task.status, assigneeId: task.assigneeId },
    );
    await this.repo.deleteTask(taskId);
  }

  async listTasksForTeam(actor: UserItem, teamId: string): Promise<TaskItem[]> {
    return this.listTasks(actor, teamId);
  }

  async getUploadUrlForTask(
    actor: UserItem,
    taskId: string,
    filename: string,
    contentType: string,
  ) {
    if (!this.s3) {
      throw new BadRequestException(
        "File storage is not configured (S3). Set S3_BUCKET_NAME and AWS credentials.",
      );
    }
    const task = await this.repo.getTaskById(taskId);
    if (!task) throw new NotFoundException("Task not found");
    assertCanReadTask(actor, task);
    const key = `tasks/${taskId}/attachments/${uuidv4()}_${filename}`;
    const uploadUrl = await this.s3.getPresignedUploadUrl(key, contentType);
    const objectUrl = this.s3.getObjectUrl(key);
    // create attachment metadata and persist to task
    const attachment: Attachment = {
      attachmentId: uuidv4(),
      originalKey: key,
      filename,
      path: objectUrl,
      contentType,
      uploadedAt: new Date().toISOString(),
      version: 1,
    };
    const newAttachments = [...(task.attachments || []), attachment];
    await this.repo.updateTask(taskId, {
      attachments: newAttachments,
      updatedAt: new Date().toISOString(),
    });
    return { uploadUrl, key, objectUrl, attachment };
  }

  async confirmUpload(
    actor: UserItem,
    taskId: string,
    body: { attachmentId?: string; key?: string; eTag?: string; size?: number },
  ) {
    if (!this.s3) {
      throw new BadRequestException(
        "File storage is not configured (S3). Set S3_BUCKET_NAME and AWS credentials.",
      );
    }
    const task = await this.repo.getTaskById(taskId);
    if (!task) throw new NotFoundException("Task not found");
    assertCanReadTask(actor, task);

    // find attachment by id or key
    let att = null as any;
    if (body.attachmentId) {
      att = (task.attachments || []).find(
        (a) => a.attachmentId === body.attachmentId,
      );
    }
    if (!att && body.key) {
      att = (task.attachments || []).find((a) => a.originalKey === body.key);
    }
    if (!att) throw new NotFoundException("Attachment not found on task");

    const key = body.key ?? att.originalKey;
    const meta = await this.s3.getObjectMetadata(key);
    const size = meta.contentLength ?? body.size;

    if (body.eTag) {
      const actual = meta.eTag ? meta.eTag.replace(/"/g, "") : undefined;
      const expected = body.eTag.replace(/"/g, "");
      if (!actual || actual !== expected) {
        throw new BadRequestException("ETag validation failed");
      }
    }

    const thumbnailKey = key.replace(/(\.[^.]+)$/, (m: string) => `-thumb${m}`);
    const thumbnailUrl = this.s3.getObjectUrl(thumbnailKey);

    // update attachment with size and uploadedAt
    const updatedTask = await this.repo.updateAttachment(
      taskId,
      att.attachmentId,
      {
        size,
        uploadedAt: new Date().toISOString(),
        version: (att.version ?? 1) + 1,
        thumbnailKey,
        thumbnailUrl,
      } as any,
      { latestThumbnailUrl: thumbnailUrl },
    );

    // optionally invoke resize lambda
    if (this.lambda) {
      try {
        const fn = process.env.IMAGE_RESIZE_FUNCTION || "image-resize";
        const res = await this.lambda.invoke(
          fn,
          { key, taskId, attachmentId: att.attachmentId },
          "Event",
        );
        // if lambda returns a thumbnailKey in payload, update attachment
        if (res && (res as any).Payload) {
          try {
            const payload = JSON.parse((res as any).Payload as string);
            if (payload.thumbnailKey) {
              const latestUrl = this.s3.getObjectUrl(payload.thumbnailKey);
              await this.repo.updateAttachment(
                taskId,
                att.attachmentId,
                {
                  thumbnailKey: payload.thumbnailKey,
                  thumbnailUrl: latestUrl,
                } as any,
                { latestThumbnailUrl: latestUrl },
              );
            }
          } catch (e) {
            // ignore parse errors
          }
        }
      } catch (e) {
        // ignore lambda errors for now
      }
    }

    await this.recordAuditLog(
      taskId,
      actor.userId,
      "TASK_ATTACHMENT_CONFIRMED",
      task.teamId,
      undefined,
      { attachmentId: att.attachmentId, key },
      { target: "attachment", targetId: att.attachmentId },
    );

    return updatedTask;
  }

  async getAttachmentDownloadUrl(
    actor: UserItem,
    taskId: string,
    attachmentId: string,
  ): Promise<{ url: string; expiresIn: number }> {
    if (!this.s3) {
      throw new BadRequestException(
        "File storage is not configured (S3). Set S3_BUCKET_NAME and AWS credentials.",
      );
    }
    const task = await this.repo.getTaskById(taskId);
    if (!task) throw new NotFoundException("Task not found");
    assertCanReadTask(actor, task);
    const att = (task.attachments || []).find(
      (a) => a.attachmentId === attachmentId,
    );
    if (!att?.originalKey) {
      throw new NotFoundException("Attachment not found");
    }
    const expiresIn = 3600;
    const url = await this.s3.getPresignedDownloadUrl(
      att.originalKey,
      expiresIn,
    );
    return { url, expiresIn };
  }

  async invokeImageResize(functionName: string, payload: any) {
    if (!this.lambda) throw new Error("LambdaService not configured");
    const res = await this.lambda.invoke(
      functionName,
      payload,
      "RequestResponse",
    );
    return res;
  }
}
