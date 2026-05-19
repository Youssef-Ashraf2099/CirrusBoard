import { ProjectsService } from "../projects.service";
import { ProjectsRepository } from "../projects.repository";

describe("ProjectsService", () => {
  let service: ProjectsService;
  let repo: Partial<ProjectsRepository>;

  beforeEach(() => {
    repo = {
      createProject: jest.fn(),
      getProjectById: jest.fn(),
      updateProject: jest.fn(),
      deleteProject: jest.fn(),
    };
    service = new ProjectsService(repo as ProjectsRepository);
  });

  it("allows manager to create project", async () => {
    const actor: any = { userId: "ali", role: "MANAGER" };
    (repo.createProject as jest.Mock).mockResolvedValue({
      projectId: "1",
      name: "x",
    });
    const p = await service.createProject(actor, { name: "x" });
    expect(p.projectId).toBe("1");
  });
});
