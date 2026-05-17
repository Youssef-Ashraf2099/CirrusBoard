import { TasksService } from "../tasks.service";
import { TasksRepository } from "../tasks.repository";
import { TaskItem } from "../tasks.model";
import { UserItem } from "../../users/users.model";
import { SnsService } from "../../integrations/sns/sns.service";

describe("TasksService", () => {
  let service: TasksService;
  let repo: Partial<TasksRepository>;
  let sns: Partial<SnsService>;

  beforeEach(() => {
    repo = {
      createTask: jest.fn(),
      getTaskById: jest.fn(),
      updateTask: jest.fn(),
      deleteTask: jest.fn(),
      queryTasksByTeamId: jest.fn(),
    };
    sns = {
      publishTaskAssigned: jest.fn(),
    } as any;
    service = new TasksService(
      repo as TasksRepository,
      undefined,
      undefined,
      sns as any,
    );
  });

  it("allows manager to create task", async () => {
    const actor: UserItem = { userId: "ali", role: "MANAGER" } as any;
    (repo.createTask as jest.Mock).mockResolvedValue({
      taskId: "1",
      title: "x",
    } as any);
    const t = await service.createTask(actor, {
      title: "x",
      teamId: "team-a",
    } as any);
    expect(repo.createTask).toHaveBeenCalled();
    expect(t.taskId).toBe("1");
  });

  it("prevents employee from creating task", async () => {
    const actor: UserItem = {
      userId: "sara",
      role: "EMPLOYEE",
      primaryTeamId: "team-a",
    } as any;
    await expect(
      service.createTask(actor, { title: "x", teamId: "team-a" } as any),
    ).rejects.toBeTruthy();
  });

  it("allows assigned employee to update status", async () => {
    const actor: UserItem = {
      userId: "sara",
      role: "EMPLOYEE",
      primaryTeamId: "team-a",
    } as any;
    (repo.getTaskById as jest.Mock).mockResolvedValue({
      taskId: "1",
      assigneeId: "sara",
      teamId: "team-a",
    } as any);
    (repo.updateTask as jest.Mock).mockResolvedValue({
      taskId: "1",
      status: "IN_PROGRESS",
    } as any);
    const updated = await service.updateStatus(actor, "1", "IN_PROGRESS");
    expect(repo.updateTask).toHaveBeenCalled();
    expect(updated.status).toBe("IN_PROGRESS");
  });

  it("prevents employee from updating others task", async () => {
    const actor: UserItem = {
      userId: "om",
      role: "EMPLOYEE",
      primaryTeamId: "team-b",
    } as any;
    (repo.getTaskById as jest.Mock).mockResolvedValue({
      taskId: "1",
      assigneeId: "sara",
      teamId: "team-a",
    } as any);
    await expect(
      service.updateStatus(actor, "1", "IN_PROGRESS"),
    ).rejects.toBeTruthy();
  });

  it("publishes task assignment event", async () => {
    const actor: UserItem = { userId: "ali", role: "MANAGER" } as any;
    (repo.getTaskById as jest.Mock).mockResolvedValue({
      taskId: "1",
      teamId: "team-a",
    } as any);
    (repo.updateTask as jest.Mock).mockResolvedValue({
      taskId: "1",
      assigneeId: "u2",
    } as any);

    await service.assignTask(actor, "1", "u2");

    expect(sns.publishTaskAssigned).toHaveBeenCalledWith({
      taskId: "1",
      teamId: "team-a",
      assigneeId: "u2",
      assignedBy: "ali",
    });
  });
});
