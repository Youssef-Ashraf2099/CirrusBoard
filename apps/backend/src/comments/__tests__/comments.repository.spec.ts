import { CommentsRepository } from "../comments.repository";

describe("CommentsRepository", () => {
  let repo: CommentsRepository;
  const mockClient: any = { send: jest.fn() };
  const table = "CommentsTestTable";

  beforeEach(() => {
    mockClient.send.mockReset();
    repo = new CommentsRepository(mockClient as any, table);
  });

  it("creates a comment", async () => {
    mockClient.send.mockResolvedValue({});
    const c = await repo.createComment({
      commentId: "1",
      taskId: "t1",
      authorId: "a1",
      content: "hi",
    } as any);
    expect(c.commentId).toBe("1");
  });
});
