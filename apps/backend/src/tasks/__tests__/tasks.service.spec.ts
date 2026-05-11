import { TasksService } from "../tasks.service";
import { TasksRepository } from "../tasks.repository";
import { TaskItem, UserPrincipal } from "../tasks.model";

describe("TasksService", () => {
  let service: TasksService;
  let repo: Partial<TasksRepository>;

  beforeEach(() => {
    repo = {
      createTask: jest.fn(),
      getTaskById: jest.fn(),
      updateTask: jest.fn(),
      deleteTask: jest.fn(),
      queryTasksByTeamId: jest.fn(),
    };
    service = new TasksService(repo as TasksRepository);
  });

  it("allows manager to create task", async () => {
    const actor: UserPrincipal = { userId: "ali", role: "Manager" };
    (repo.createTask as jest.Mock).mockResolvedValue({
      taskId: "1",
      title: "x",
    } as any);
    const t = await service.createTask(actor, { title: "x", teamId: "team-a" });
    expect(repo.createTask).toHaveBeenCalled();
    expect(t.taskId).toBe("1");
  });

  it("prevents employee from creating task", async () => {
    const actor: UserPrincipal = {
      userId: "sara",
      role: "Employee",
      teamId: "team-a",
    };
    await expect(
      service.createTask(actor, { title: "x", teamId: "team-a" } as any),
    ).rejects.toBeTruthy();
  });

  it("allows assigned employee to update status", async () => {
    const actor: UserPrincipal = {
      userId: "sara",
      role: "Employee",
      teamId: "team-a",
    };
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
    const actor: UserPrincipal = {
      userId: "om",
      role: "Employee",
      teamId: "team-b",
    };
    (repo.getTaskById as jest.Mock).mockResolvedValue({
      taskId: "1",
      assigneeId: "sara",
      teamId: "team-a",
    } as any);
    await expect(
      service.updateStatus(actor, "1", "IN_PROGRESS"),
    ).rejects.toBeTruthy();
  });
});
