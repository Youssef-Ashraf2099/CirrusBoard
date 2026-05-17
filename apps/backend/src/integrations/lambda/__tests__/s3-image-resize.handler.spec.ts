import { Readable } from "stream";

let s3SendMock: jest.Mock;
let ddbSendMock: jest.Mock;

jest.mock("@aws-sdk/client-s3", () => {
  return {
    S3Client: jest.fn().mockImplementation(() => ({
      send: (...args: any[]) => s3SendMock(...args),
    })),
    GetObjectCommand: class {
      input: any;
      constructor(input: any) {
        this.input = input;
      }
    },
    PutObjectCommand: class {
      input: any;
      constructor(input: any) {
        this.input = input;
      }
    },
  };
});

jest.mock("@aws-sdk/client-dynamodb", () => {
  return {
    DynamoDBClient: jest.fn(),
  };
});

jest.mock("@aws-sdk/lib-dynamodb", () => {
  return {
    DynamoDBDocumentClient: {
      from: jest.fn().mockImplementation(() => ({
        send: (...args: any[]) => ddbSendMock(...args),
      })),
    },
    GetCommand: class {
      input: any;
      constructor(input: any) {
        this.input = input;
      }
    },
    UpdateCommand: class {
      input: any;
      constructor(input: any) {
        this.input = input;
      }
    },
  };
});

jest.mock("sharp", () => {
  return jest.fn(() => ({
    resize: jest.fn().mockReturnThis(),
    toBuffer: jest.fn().mockResolvedValue(Buffer.from("resized")),
  }));
});

describe("s3-image-resize handler", () => {
  beforeEach(() => {
    jest.resetModules();
    s3SendMock = jest.fn();
    ddbSendMock = jest.fn();
    process.env.TASKS_TABLE = "Tasks";
    process.env.AWS_REGION = "us-east-1";
    delete process.env.S3_ENDPOINT;
  });

  it("resizes image and updates task attachment", async () => {
    s3SendMock
      .mockResolvedValueOnce({
        Body: Readable.from([Buffer.from("image")]),
        ContentType: "image/png",
      })
      .mockResolvedValueOnce({});

    ddbSendMock
      .mockResolvedValueOnce({
        Item: {
          attachments: [
            {
              attachmentId: "a1",
              originalKey: "tasks/t1/attachments/a.png",
              version: 1,
            },
          ],
        },
      })
      .mockResolvedValueOnce({});

    const { handler } = await import("../handlers/s3-image-resize.handler");
    const event = {
      Records: [
        {
          s3: {
            bucket: { name: "bucket-1" },
            object: { key: "tasks/t1/attachments/a.png" },
          },
        },
      ],
    };

    const res = await handler(event);

    expect(res.results[0].thumbKey).toBe("tasks/t1/attachments/a-thumb.png");
    expect(s3SendMock).toHaveBeenCalledTimes(2);
    expect(ddbSendMock).toHaveBeenCalledTimes(2);

    const updateInput = ddbSendMock.mock.calls[1][0].input;
    const updatedAttachments =
      updateInput.ExpressionAttributeValues[":attachments"];
    expect(updatedAttachments[0].thumbnailKey).toBe(
      "tasks/t1/attachments/a-thumb.png",
    );
    expect(updatedAttachments[0].thumbnailUrl).toBe(
      "https://bucket-1.s3.us-east-1.amazonaws.com/tasks/t1/attachments/a-thumb.png",
    );
    expect(updateInput.ExpressionAttributeValues[":latestThumbnailUrl"]).toBe(
      "https://bucket-1.s3.us-east-1.amazonaws.com/tasks/t1/attachments/a-thumb.png",
    );
  });
});
