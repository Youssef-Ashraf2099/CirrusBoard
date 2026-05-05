import { ProjectsRepository } from "../projects.repository";

describe("ProjectsRepository", () => {
  let repo: ProjectsRepository;
  const mockClient: any = { send: jest.fn() };
  const table = "ProjectsTestTable";

  beforeEach(() => {
    mockClient.send.mockReset();
    repo = new ProjectsRepository(mockClient as any, table);
  });

  it("creates a project", async () => {
    mockClient.send.mockResolvedValue({});
    const p = await repo.createProject({ projectId: "1", name: "P" } as any);
    expect(p.projectId).toBe("1");
    expect(mockClient.send).toHaveBeenCalled();
  });
});
