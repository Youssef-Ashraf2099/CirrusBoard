import {
  Injectable,
  ForbiddenException,
  NotFoundException,
} from "@nestjs/common";
import { TasksRepository } from "./tasks.repository";
import { TaskItem, UserPrincipal } from "./tasks.model";
import { v4 as uuidv4 } from "uuid";
import { CreateTaskDto } from "./dto/create-task.dto";
import { UpdateTaskDto } from "./dto/update-task.dto";

@Injectable()
export class TasksService {
  constructor(private readonly repo: TasksRepository) {}

  async createTask(
    actor: UserPrincipal,
   input: CreateTaskDto,
  ): Promise<TaskItem> {
    if (actor.role !== "Manager") {
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

  async getTask(actor: UserPrincipal, taskId: string): Promise<TaskItem> {
    const task = await this.repo.getTaskById(taskId);
    if (!task) throw new NotFoundException("Task not found");
    if (actor.role !== "Manager" && actor.teamId !== task.teamId) {
      throw new ForbiddenException("Access denied to this task");
    }
    return task;
  }

  async updateStatus(
    actor: UserPrincipal,
    taskId: string,
    status: TaskItem["status"],
  ): Promise<TaskItem> {
    const task = await this.repo.getTaskById(taskId);
    if (!task) throw new NotFoundException("Task not found");
    // Employees can only update tasks assigned to them
    if (actor.role === "Employee") {
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
    actor: UserPrincipal,
    taskId: string,
    assigneeId: string,
  ): Promise<TaskItem> {
    if (actor.role !== "Manager") {
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

  async deleteTask(actor: UserPrincipal, taskId: string): Promise<void> {
    const task = await this.repo.getTaskById(taskId);
    if (!task) throw new NotFoundException("Task not found");
    if (actor.role !== "Manager" && actor.teamId !== task.teamId) {
      throw new ForbiddenException("Access denied");
    }
    await this.repo.deleteTask(taskId);
  }

  async listTasksForTeam(
    actor: UserPrincipal,
    teamId: string,
  ): Promise<TaskItem[]> {
    if (actor.role !== "Manager" && actor.teamId !== teamId) {
      throw new ForbiddenException("Access denied to team tasks");
    }
    return this.repo.queryTasksByTeamId(teamId);
  }
}
