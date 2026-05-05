import { TasksService } from "../tasks.service";
import { TasksRepository } from "../tasks.repository";
import { TaskItem, UserPrincipal } from "../tasks.types";

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
    } as TaskItem);
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
    } as TaskItem);
    (repo.updateTask as jest.Mock).mockResolvedValue({
      taskId: "1",
      status: "In Progress",
    } as TaskItem);
    const updated = await service.updateStatus(actor, "1", "In Progress");
    expect(repo.updateTask).toHaveBeenCalled();
    expect(updated.status).toBe("In Progress");
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
    } as TaskItem);
    await expect(
      service.updateStatus(actor, "1", "In Progress"),
    ).rejects.toBeTruthy();
  });
});
