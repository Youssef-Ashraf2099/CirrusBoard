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
      updateTask: jest.fn(),
      updateAttachment: jest.fn(),
    } as any;
    s3 = {
      getPresignedUploadUrl: jest.fn(),
      getObjectUrl: jest.fn(),
      getObjectMetadata: jest.fn(),
    } as any;
    lambda = {
      invoke: jest.fn(),
    } as any;
    service = new TasksService(
      repo as any,
      undefined as any,
      s3 as any,
      lambda as any,
    );
  });

  it("returns presigned url for authorized user", async () => {
    (repo.getTaskById as jest.Mock).mockResolvedValue({
      taskId: "t1",
      teamId: "team-a",
      attachments: [],
    });
    (s3.getPresignedUploadUrl as jest.Mock).mockResolvedValue(
      "https://signed-url",
    );
    (s3.getObjectUrl as jest.Mock).mockReturnValue("https://bucket/key");

    const res = await service.getUploadUrlForTask(
      { role: "MANAGER" } as any,
      "t1",
      "a.png",
      "image/png",
    );

    expect(res.uploadUrl).toBe("https://signed-url");
    expect(res.objectUrl).toBe("https://bucket/key");
    expect(repo.updateTask).toHaveBeenCalled();
    const updatedArgs = (repo.updateTask as jest.Mock).mock.calls[0];
    expect(updatedArgs[0]).toBe("t1");
    expect(updatedArgs[1].attachments).toHaveLength(1);
  });

  it("invokes lambda and returns result", async () => {
    (lambda.invoke as jest.Mock).mockResolvedValue({
      StatusCode: 200,
      Payload: Buffer.from(JSON.stringify({ ok: true })),
    });
    const out = await service.invokeImageResize("resize-fn", { key: "k" });
    expect(lambda.invoke).toHaveBeenCalledWith(
      "resize-fn",
      { key: "k" },
      "RequestResponse",
    );
    expect(out.StatusCode).toBe(200);
  });

  it("confirms upload and updates attachment metadata", async () => {
    (repo.getTaskById as jest.Mock).mockResolvedValue({
      taskId: "t1",
      teamId: "team-a",
      attachments: [
        {
          attachmentId: "a1",
          originalKey: "tasks/t1/attachments/a.png",
          version: 1,
        },
      ],
    });
    (s3.getObjectMetadata as jest.Mock).mockResolvedValue({
      contentLength: 123,
      eTag: '"abc"',
    });
    (s3.getObjectUrl as jest.Mock).mockImplementation(
      (key: string) => `https://bucket/${key}`,
    );
    (repo.updateAttachment as jest.Mock).mockResolvedValue({
      taskId: "t1",
    });
    (lambda.invoke as jest.Mock).mockResolvedValue({ StatusCode: 202 });

    const res = await service.confirmUpload({ role: "MANAGER" } as any, "t1", {
      attachmentId: "a1",
      eTag: "abc",
    });

    expect(repo.updateAttachment).toHaveBeenCalledWith(
      "t1",
      "a1",
      expect.objectContaining({
        size: 123,
        version: 2,
        thumbnailKey: expect.any(String),
      }),
      expect.objectContaining({ latestThumbnailUrl: expect.any(String) }),
    );
    expect(lambda.invoke).toHaveBeenCalled();
    expect(res.taskId).toBe("t1");
  });

  it("rejects upload when ETag mismatch", async () => {
    (repo.getTaskById as jest.Mock).mockResolvedValue({
      taskId: "t1",
      teamId: "team-a",
      attachments: [
        {
          attachmentId: "a1",
          originalKey: "tasks/t1/attachments/a.png",
          version: 1,
        },
      ],
    });
    (s3.getObjectMetadata as jest.Mock).mockResolvedValue({
      contentLength: 123,
      eTag: '"abc"',
    });
    (s3.getObjectUrl as jest.Mock).mockImplementation(
      (key: string) => `https://bucket/${key}`,
    );

    await expect(
      service.confirmUpload({ role: "MANAGER" } as any, "t1", {
        attachmentId: "a1",
        eTag: "def",
      }),
    ).rejects.toThrow("ETag validation failed");
  });
});
