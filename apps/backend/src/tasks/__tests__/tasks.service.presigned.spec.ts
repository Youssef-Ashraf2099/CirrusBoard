import { TasksService } from "../tasks.service";
import { TasksRepository } from "../tasks.repository";
import { S3Service } from "../../integrations/s3/s3.service";
import { LambdaService } from "../../integrations/lambda/lambda.service";

describe("TasksService presigned + lambda", () => {
  let repo: Partial<TasksRepository>;
  let s3: Partial<S3Service>;
  let lambda: Partial<LambdaService>;
  let service: TasksService;

  beforeEach(() => {
    repo = {
      getTaskById: jest.fn(),
    } as any;
    s3 = {
      getPresignedUploadUrl: jest.fn(),
      getObjectUrl: jest.fn(),
    } as any;
    lambda = {
      invoke: jest.fn(),
    } as any;
    service = new TasksService(repo as any, s3 as any, lambda as any);
  });

  it("returns presigned url for authorized user", async () => {
    (repo.getTaskById as jest.Mock).mockResolvedValue({ taskId: "t1", teamId: "team-a" });
    (s3.getPresignedUploadUrl as jest.Mock).mockResolvedValue("https://signed-url");
    (s3.getObjectUrl as jest.Mock).mockReturnValue("https://bucket/key");

    const res = await service.getUploadUrlForTask({ role: "MANAGER" } as any, "t1", "a.png", "image/png");
    expect(res.uploadUrl).toBe("https://signed-url");
    expect(res.objectUrl).toBe("https://bucket/key");
  });

  it("invokes lambda and returns result", async () => {
    (lambda.invoke as jest.Mock).mockResolvedValue({ StatusCode: 200, Payload: Buffer.from(JSON.stringify({ ok: true })) });
    const out = await service.invokeImageResize("resize-fn", { key: "k" });
    expect(lambda.invoke).toHaveBeenCalledWith("resize-fn", { key: "k" }, "RequestResponse");
    expect(out.StatusCode).toBe(200);
  });
});
