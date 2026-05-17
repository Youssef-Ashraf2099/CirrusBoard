import {
  Injectable,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { TasksRepository } from "./tasks.repository";
import { TaskItem, Attachment } from "./tasks.model";
import { UserItem } from "../users/users.model";
import { v4 as uuidv4 } from "uuid";
import { CreateTaskDto } from "./dto/create-task.dto";
import { UpdateTaskDto } from "./dto/update-task.dto";
import { S3Service } from "../integrations/s3/s3.service";
import { LambdaService } from "../integrations/lambda/lambda.service";
import { SnsService } from "../integrations/sns/sns.service";
import { canManageWorkspace, hasTeamAccess } from "../common/auth/cognito-auth.utils";

@Injectable()
export class TasksService {
  constructor(
    private readonly repo: TasksRepository,
    private readonly s3?: S3Service,
    private readonly lambda?: LambdaService,
    private readonly sns?: SnsService,
  ) {}

  async createTask(actor: UserItem, input: CreateTaskDto): Promise<TaskItem> {
    if (!canManageWorkspace(actor)) {
      throw new ForbiddenException("Only managers may create tasks");
    }
    const now = new Date().toISOString();
    const task: Partial<TaskItem> = {
      taskId: uuidv4(),
      title: input.title ?? "Untitled",
      description: input.description,
      status: (input.status as any) ?? "TODO",
      priority: (input.priority as any) ?? "MEDIUM",
      deadline: input.deadline ?? now.split("T")[0],
      assigneeId: input.assigneeId,
      teamId: input.teamId!,
      createdBy: actor.userId,
      attachments: input.attachments ?? [],
      createdAt: now,
      updatedAt: now,
    };
    return this.repo.createTask(task as any);
  }

  async getTask(actor: UserItem, taskId: string): Promise<TaskItem> {
    const task = await this.repo.getTaskById(taskId);
    if (!task) throw new NotFoundException("Task not found");
    if (!hasTeamAccess(actor, task.teamId)) {
      throw new ForbiddenException("Access denied to this task");
    }
    return task;
  }

  async updateStatus(
    actor: UserItem,
    taskId: string,
    status: TaskItem["status"],
  ): Promise<TaskItem> {
    const task = await this.repo.getTaskById(taskId);
    if (!task) throw new NotFoundException("Task not found");
    // Employees can only update tasks assigned to them
    if (actor.role === "EMPLOYEE") {
      if (actor.userId !== task.assigneeId)
        throw new ForbiddenException("Not assigned to you");
    }
    const updates: Partial<TaskItem> = {
      status,
      updatedAt: new Date().toISOString(),
    };
    const updated = await this.repo.updateTask(taskId, updates);
    return updated;
  }
  async assignTask(
    actor: UserItem,
    taskId: string,
    assigneeId: string,
  ): Promise<TaskItem> {
    if (!canManageWorkspace(actor)) {
      throw new ForbiddenException("Only managers can assign tasks");
    }

    const task = await this.repo.getTaskById(taskId);

    if (!task) {
      throw new NotFoundException("Task not found");
    }

    const updated = await this.repo.updateTask(taskId, {
      assigneeId,
      updatedAt: new Date().toISOString(),
    });

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

    return updated;
  }

  async deleteTask(actor: UserItem, taskId: string): Promise<void> {
    const task = await this.repo.getTaskById(taskId);
    if (!task) throw new NotFoundException("Task not found");
    if (!hasTeamAccess(actor, task.teamId)) {
      throw new ForbiddenException("Access denied");
    }
    await this.repo.deleteTask(taskId);
  }

  async listTasksForTeam(actor: UserItem, teamId: string): Promise<TaskItem[]> {
    if (!hasTeamAccess(actor, teamId)) {
      throw new ForbiddenException("Access denied to team tasks");
    }
    return this.repo.queryTasksByTeamId(teamId);
  }

  async getUploadUrlForTask(
    actor: UserItem,
    taskId: string,
    filename: string,
    contentType: string,
  ) {
    if (!this.s3) throw new Error("S3Service not configured");
    const task = await this.repo.getTaskById(taskId);
    if (!task) throw new NotFoundException("Task not found");
    if (!hasTeamAccess(actor, task.teamId)) {
      throw new ForbiddenException("Access denied to upload for this task");
    }
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
    if (!this.s3) throw new Error("S3Service not configured");
    const task = await this.repo.getTaskById(taskId);
    if (!task) throw new NotFoundException("Task not found");
    if (!hasTeamAccess(actor, task.teamId)) {
      throw new ForbiddenException("Access denied to upload for this task");
    }

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

    return updatedTask;
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
