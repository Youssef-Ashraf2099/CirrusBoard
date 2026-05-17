import { Injectable, ForbiddenException, NotFoundException } from "@nestjs/common";
import { TasksRepository } from "./tasks.repository";
import { TaskItem } from "./tasks.model";
import { UserItem } from "../users/users.model";
import { v4 as uuidv4 } from "uuid";
import { CreateTaskDto } from "./dto/create-task.dto";
import { UpdateTaskDto } from "./dto/update-task.dto";
import { S3Service } from "../integrations/s3/s3.service";
import { LambdaService } from "../integrations/lambda/lambda.service";

@Injectable()
export class TasksService {
  constructor(
    private readonly repo: TasksRepository,
    private readonly s3?: S3Service,
    private readonly lambda?: LambdaService,
  ) {}

  async createTask(
    actor: UserItem,
   input: CreateTaskDto,
  ): Promise<TaskItem> {
    if (actor.role !== "MANAGER") {
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
      attachments: input.attachments ?? [],
      createdAt: now,
      updatedAt: now,
    };
    return this.repo.createTask(task as any);
  }

  async getTask(actor: UserItem, taskId: string): Promise<TaskItem> {
    const task = await this.repo.getTaskById(taskId);
    if (!task) throw new NotFoundException("Task not found");
    if (actor.role !== "MANAGER" && actor.primaryTeamId !== task.teamId) {
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
    if (actor.role !== "MANAGER") {
      throw new ForbiddenException(
        "Only managers can assign tasks",
      );
    }
  
    const task = await this.repo.getTaskById(taskId);
  
    if (!task) {
      throw new NotFoundException("Task not found");
    }
  
    const updated = await this.repo.updateTask(taskId, {
      assigneeId,
      updatedAt: new Date().toISOString(),
    });
  
    return updated;
  }

  async deleteTask(actor: UserItem, taskId: string): Promise<void> {
    const task = await this.repo.getTaskById(taskId);
    if (!task) throw new NotFoundException("Task not found");
    if (actor.role !== "MANAGER" && actor.primaryTeamId !== task.teamId) {
      throw new ForbiddenException("Access denied");
    }
    await this.repo.deleteTask(taskId);
  }

  async listTasksForTeam(
    actor: UserItem,
    teamId: string,
  ): Promise<TaskItem[]> {
    if (actor.role !== "MANAGER" && actor.primaryTeamId !== teamId) {
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
    if (actor.role !== "MANAGER" && actor.primaryTeamId !== task.teamId) {
      throw new ForbiddenException("Access denied to upload for this task");
    }
    const key = `tasks/${taskId}/attachments/${uuidv4()}_${filename}`;
    const uploadUrl = await this.s3.getPresignedUploadUrl(key, contentType);
    const objectUrl = this.s3.getObjectUrl(key);
    return { uploadUrl, key, objectUrl };
  }

  async invokeImageResize(functionName: string, payload: any) {
    if (!this.lambda) throw new Error("LambdaService not configured");
    const res = await this.lambda.invoke(functionName, payload, "RequestResponse");
    return res;
  }
}
