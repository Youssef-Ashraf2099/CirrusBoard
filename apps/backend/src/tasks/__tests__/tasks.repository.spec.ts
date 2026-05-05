import { TasksRepository } from "../tasks.repository";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { TaskItem } from "../tasks.types";

describe("TasksRepository", () => {
  let repo: TasksRepository;
  const mockClient: any = { send: jest.fn() };
  const table = "TasksTestTable";

  beforeEach(() => {
    mockClient.send.mockReset();
    repo = new TasksRepository(mockClient as DynamoDBDocumentClient, table);
  });

  it("creates and returns a task", async () => {
    const task: TaskItem = {
      taskId: "1",
      title: "T",
      status: "To Do",
      teamId: "team-a",
    } as TaskItem;
    mockClient.send.mockResolvedValue({});
    const res = await repo.createTask(task);
    expect(mockClient.send).toHaveBeenCalled();
    expect(res.taskId).toBe("1");
  });

  it("gets task by id", async () => {
    mockClient.send.mockResolvedValue({
      Item: { taskId: "1", title: "T", status: "To Do", teamId: "team-a" },
    });
    const res = await repo.getTaskById("1");
    expect(res).toBeTruthy();
    expect((res as TaskItem).taskId).toBe("1");
  });

  it("updates task and returns new attributes", async () => {
    mockClient.send.mockResolvedValue({
      Attributes: { taskId: "1", status: "In Progress" },
    });
    const updated = await repo.updateTask("1", { status: "In Progress" });
    expect(updated.status).toBe("In Progress");
  });

  it("deletes task", async () => {
    mockClient.send.mockResolvedValue({});
    await expect(repo.deleteTask("1")).resolves.toBeUndefined();
    expect(mockClient.send).toHaveBeenCalled();
  });

  it("queries tasks by team id", async () => {
    mockClient.send.mockResolvedValue({
      Items: [{ taskId: "1", teamId: "team-a" }],
    });
    const items = await repo.queryTasksByTeamId("team-a");
    expect(items.length).toBe(1);
    expect(items[0].teamId).toBe("team-a");
  });
});
