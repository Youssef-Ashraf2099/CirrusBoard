import { TasksRepository } from "../tasks.repository";

describe("TasksRepository.updateTask", () => {
  it("does not set statusDeadline twice when service already provides it", async () => {
    const sent: { ExpressionAttributeNames?: Record<string, string> }[] =
      [];
    const client = {
      send: jest.fn(async (cmd: { input?: Record<string, unknown> }) => {
        sent.push(
          (cmd as { input?: Record<string, unknown> }).input ?? (cmd as any),
        );
        return { Attributes: { taskId: "1", status: "IN_PROGRESS" } };
      }),
    };

    const repo = new TasksRepository(client as any, "Tasks");
    await repo.updateTask("1", {
      status: "IN_PROGRESS",
      updatedAt: "2026-05-19T00:00:00.000Z",
      statusDeadline: "IN_PROGRESS#2026-05-20",
    });

    expect(sent).toHaveLength(1);
    const names = Object.values(sent[0].ExpressionAttributeNames ?? {});
    expect(names.filter((n) => n === "statusDeadline").length).toBe(1);
  });
});
