import { CommentsService } from "../comments.service";
import { CommentsRepository } from "../comments.repository";

describe("CommentsService", () => {
  let service: CommentsService;
  let repo: Partial<CommentsRepository>;

  beforeEach(() => {
    repo = { createComment: jest.fn(), queryCommentsByTask: jest.fn() };
    service = new CommentsService(repo as CommentsRepository);
  });

  it("adds a comment", async () => {
    (repo.createComment as jest.Mock).mockResolvedValue({ commentId: "1" });
    const res = await service.addComment("a1", "t1", "hello");
    expect(res.commentId).toBe("1");
  });
});
