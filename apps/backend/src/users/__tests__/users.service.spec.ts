import { UsersService } from "../users.service";
import { UsersRepository } from "../users.repository";

describe("UsersService", () => {
  let service: UsersService;
  let repo: Partial<UsersRepository>;

  beforeEach(() => {
    repo = {
      createUser: jest.fn(),
      getUserById: jest.fn(),
      updateUser: jest.fn(),
      deleteUser: jest.fn(),
    };
    service = new UsersService(repo as UsersRepository);
  });

  it("creates a user", async () => {
    (repo.createUser as jest.Mock).mockResolvedValue({
      userId: "u1",
      email: "a@b.com",
    });
    const u = await service.createUser({ email: "a@b.com", name: "A" } as any);
    expect(u.userId).toBe("u1");
  });
});
