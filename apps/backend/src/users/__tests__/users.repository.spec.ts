import { UsersRepository } from "../users.repository";

describe("UsersRepository", () => {
  let repo: UsersRepository;
  const mockClient: any = { send: jest.fn() };
  const table = "UsersTestTable";

  beforeEach(() => {
    mockClient.send.mockReset();
    repo = new UsersRepository(mockClient as any, table);
  });

  it("creates a user", async () => {
    mockClient.send.mockResolvedValue({});
    const u = await repo.createUser({
      userId: "u1",
      email: "a@b.com",
      name: "A",
    } as any);
    expect(u.userId).toBe("u1");
    expect(mockClient.send).toHaveBeenCalled();
  });
});
