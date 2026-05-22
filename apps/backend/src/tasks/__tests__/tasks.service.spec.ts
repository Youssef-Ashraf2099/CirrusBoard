import { TasksService } from "../tasks.service";
import { TasksRepository } from "../tasks.repository";
import { UserItem } from "../../users/users.model";
import { SnsService } from "../../integrations/sns/sns.service";
import { UsersRepository } from "../../users/users.repository";
import { NotificationsService } from "../../notifications/notifications.service";
import { ProjectsRepository } from "../../projects/projects.repository";

describe("TasksService", () => {
  let service: TasksService;
  let repo: Partial<TasksRepository>;
  let projectsRepo: Partial<ProjectsRepository>;
  let usersRepo: Partial<UsersRepository>;
  let sns: Partial<SnsService>;
  let notifications: Partial<NotificationsService>;
  let cloudwatchSend: jest.Mock;

  beforeEach(() => {
    repo = {
      createTask: jest.fn(),
      getTaskById: jest.fn(),
      updateTask: jest.fn(),
      deleteTask: jest.fn(),
      queryTasksByTeamId: jest.fn(),
      queryTasksByAssigneeId: jest.fn(),
      queryTasksByDeadline: jest.fn(),
      listAllTasks: jest.fn(),
    };
    usersRepo = {
      getUserById: jest.fn().mockResolvedValue({
        userId: "sara",
        primaryTeamId: "team-a",
      }),
    };
    projectsRepo = {
      getProjectById: jest.fn(),
    };
    sns = {
      publishTaskAssigned: jest.fn(),
    } as any;
    notifications = {
      create: jest.fn(),
    } as any;
    service = new TasksService(
      repo as TasksRepository,
      usersRepo as UsersRepository,
      projectsRepo as ProjectsRepository,
      undefined,
      undefined,
      sns as any,
      notifications as any,
    );
    cloudwatchSend = jest.fn().mockResolvedValue({});
    (service as any).cloudwatchClient = {
      send: cloudwatchSend,
    };
  });

  it("allows manager to create task", async () => {
    const actor: UserItem = { userId: "ali", role: "MANAGER" } as any;
    (projectsRepo.getProjectById as jest.Mock).mockResolvedValue({
      projectId: "p1",
      memberUserIds: ["u2"],
    });
    (repo.createTask as jest.Mock).mockResolvedValue({
      taskId: "1",
      projectId: "p1",
      title: "x",
      teamId: "team-a",
    } as any);
    const t = await service.createTask(actor, {
      title: "x",
      teamId: "team-a",
    } as any);
    expect(repo.createTask).toHaveBeenCalled();
    expect(t.taskId).toBe("1");
    expect(cloudwatchSend).toHaveBeenCalledWith(
      expect.objectContaining({
        input: expect.objectContaining({
          Namespace: "CirrusBoard",
          MetricData: [
            expect.objectContaining({
              MetricName: "TasksCreated",
              Value: 1,
            }),
          ],
        }),
      }),
    );
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

  it("publishes close metrics when a task reaches done", async () => {
    const actor: UserItem = {
      userId: "sara",
      role: "EMPLOYEE",
      primaryTeamId: "team-a",
    } as any;
    (repo.getTaskById as jest.Mock).mockResolvedValue({
      taskId: "1",
      assigneeId: "sara",
      teamId: "team-a",
      status: "IN_PROGRESS",
      createdAt: "2026-05-22T00:00:00.000Z",
    } as any);
    (repo.updateTask as jest.Mock).mockResolvedValue({
      taskId: "1",
      status: "DONE",
      teamId: "team-a",
      createdAt: "2026-05-22T00:00:00.000Z",
    } as any);

    await service.updateStatus(actor, "1", "DONE");

    expect(cloudwatchSend).toHaveBeenCalledWith(
      expect.objectContaining({
        input: expect.objectContaining({
          Namespace: "CirrusBoard",
          MetricData: [
            expect.objectContaining({
              MetricName: "TasksClosed",
              Value: 1,
            }),
          ],
        }),
      }),
    );
    expect(cloudwatchSend).toHaveBeenCalledWith(
      expect.objectContaining({
        input: expect.objectContaining({
          Namespace: "CirrusBoard",
          MetricData: [
            expect.objectContaining({
              MetricName: "TimeToClose",
              Unit: "Hours",
            }),
          ],
        }),
      }),
    );
  });

  it("counts overdue tasks and publishes the overdue metric", async () => {
    (repo.queryTasksByDeadline as jest.Mock).mockResolvedValue([
      { taskId: "1", deadline: "2026-05-20", status: "IN_PROGRESS" },
      { taskId: "2", deadline: "2026-05-21", status: "DONE" },
      { taskId: "3", deadline: "2026-05-21", status: "TODO" },
    ]);

    const originalToISOString = Date.prototype.toISOString;
    Date.prototype.toISOString = jest.fn(
      () => "2026-05-22T10:00:00.000Z",
    ) as any;

    const overdueCount = await service.checkOverdueTasks();

    Date.prototype.toISOString = originalToISOString;

    expect(overdueCount).toBe(2);
    expect(cloudwatchSend).toHaveBeenCalledWith(
      expect.objectContaining({
        input: expect.objectContaining({
          Namespace: "CirrusBoard",
          MetricData: [
            expect.objectContaining({
              MetricName: "OverdueTasks",
              Value: 2,
              Unit: "Count",
            }),
          ],
        }),
      }),
    );
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

  it("lists only assigned tasks for employee", async () => {
    const actor: UserItem = {
      userId: "sara",
      role: "EMPLOYEE",
      primaryTeamId: "team-a",
    } as any;
    (repo.queryTasksByAssigneeId as jest.Mock).mockResolvedValue([
      { taskId: "a", assigneeId: "sara", teamId: "team-a" },
      { taskId: "b", assigneeId: "sara", teamId: "team-b" },
    ]);
    const tasks = await service.listTasks(actor);
    expect(tasks).toHaveLength(1);
    expect(tasks[0].taskId).toBe("a");
  });

  it("allows manager to update task fields", async () => {
    const actor: UserItem = { userId: "ali", role: "MANAGER" } as any;
    (repo.getTaskById as jest.Mock).mockResolvedValue({
      taskId: "1",
      teamId: "team-a",
      assigneeId: "sara",
      status: "TODO",
      deadline: "2026-05-20",
    });
    (repo.updateTask as jest.Mock).mockResolvedValue({
      taskId: "1",
      title: "Updated",
      status: "IN_PROGRESS",
    });
    const updated = await service.updateTask(actor, "1", {
      title: "Updated",
      status: "IN_PROGRESS",
    } as any);
    expect(repo.updateTask).toHaveBeenCalled();
    expect(updated.title).toBe("Updated");
  });

  it("publishes task assignment event", async () => {
    const actor: UserItem = { userId: "ali", role: "MANAGER" } as any;
    (projectsRepo.getProjectById as jest.Mock).mockResolvedValue({
      projectId: "p1",
      memberUserIds: ["u2"],
    });
    (repo.getTaskById as jest.Mock).mockResolvedValue({
      taskId: "1",
      projectId: "p1",
      teamId: "team-a",
    } as any);
    (usersRepo.getUserById as jest.Mock).mockResolvedValue({
      userId: "u2",
      primaryTeamId: "team-a",
    });
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
    expect(notifications.create).toHaveBeenCalledWith(
      actor,
      expect.objectContaining({
        userId: "u2",
        type: "TASK_ASSIGNED",
        title: "Task assigned",
      }),
    );
  });
});
