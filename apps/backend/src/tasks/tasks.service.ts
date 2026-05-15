import {
  Injectable,
  ForbiddenException,
  NotFoundException,
} from "@nestjs/common";
import { TasksRepository } from "./tasks.repository";
import { TaskItem } from "./tasks.model";
import { UserItem } from "../users/users.model";
import { v4 as uuidv4 } from "uuid";
import { CreateTaskDto } from "./dto/create-task.dto";
import { UpdateTaskDto } from "./dto/update-task.dto";
import { isPrivileged } from "../common/permissions";

@Injectable()
export class TasksService {
  constructor(private readonly repo: TasksRepository) {}

  async createTask(
    actor: UserItem,
   input: CreateTaskDto,
  ): Promise<TaskItem> {
    if (!isPrivileged(actor.role)) {
      throw new ForbiddenException("Only managers may create tasks");
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
      attachments: input.attachments ?? [],
      tags: input.tags ?? [],
      createdAt: now,
      updatedAt: now,
    };
    return this.repo.createTask(task as any);
  }

  async getTask(actor: UserItem, taskId: string): Promise<TaskItem> {
    const task = await this.repo.getTaskById(taskId);
    if (!task) throw new NotFoundException("Task not found");
    if (!isPrivileged(actor.role) && actor.primaryTeamId !== task.teamId) {
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
      statusDeadline: `${status}#${task.deadline}`,
    };
    const updated = await this.repo.updateTask(taskId, updates);
    return updated;
  }
  async assignTask(
    actor: UserItem,
    taskId: string,
    assigneeId: string,
  ): Promise<TaskItem> {
    if (!isPrivileged(actor.role)) {
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

  async updateTask(
    actor: UserItem,
    taskId: string,
    input: UpdateTaskDto,
  ): Promise<TaskItem> {
    const task = await this.repo.getTaskById(taskId);
    if (!task) throw new NotFoundException("Task not found");
    if (actor.role === "EMPLOYEE" && actor.userId !== task.assigneeId) {
      throw new ForbiddenException("Not assigned to you");
    }
    if (!isPrivileged(actor.role) && actor.primaryTeamId !== task.teamId) {
      throw new ForbiddenException("Access denied");
    }
    const updates: Partial<TaskItem> = {
      updatedAt: new Date().toISOString(),
    };
    if (input.title !== undefined) updates.title = input.title;
    if (input.description !== undefined) updates.description = input.description;
    if (input.priority !== undefined)
      updates.priority = input.priority as TaskItem["priority"];
    if (input.deadline !== undefined) updates.deadline = input.deadline;
    if (input.assigneeId !== undefined) updates.assigneeId = input.assigneeId;
    if (input.status !== undefined)
      updates.status = input.status as TaskItem["status"];
    if (input.tags !== undefined) updates.tags = input.tags;
    if (
      input.status !== undefined ||
      input.deadline !== undefined
    ) {
      const mergedStatus =
        (input.status as TaskItem["status"] | undefined) ?? task.status;
      const mergedDeadline = input.deadline ?? task.deadline;
      updates.statusDeadline = `${mergedStatus}#${mergedDeadline}`;
    }
    return this.repo.updateTask(taskId, updates);
  }

  async deleteTask(actor: UserItem, taskId: string): Promise<void> {
    const task = await this.repo.getTaskById(taskId);
    if (!task) throw new NotFoundException("Task not found");
    if (!isPrivileged(actor.role) && actor.primaryTeamId !== task.teamId) {
      throw new ForbiddenException("Access denied");
    }
    await this.repo.deleteTask(taskId);
  }

  async listTasksForTeam(
    actor: UserItem,
    teamId: string,
  ): Promise<TaskItem[]> {
    if (!isPrivileged(actor.role) && actor.primaryTeamId !== teamId) {
      throw new ForbiddenException("Access denied to team tasks");
    }
    return this.repo.queryTasksByTeamId(teamId);
  }
}
