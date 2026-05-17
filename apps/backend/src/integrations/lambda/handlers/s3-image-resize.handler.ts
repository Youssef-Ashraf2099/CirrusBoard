import {
  S3Client,
  GetObjectCommand,
  PutObjectCommand,
} from "@aws-sdk/client-s3";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  GetCommand,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";
import { S3Config } from "../../../config/s3.config";
import sharp = require("sharp");

const region = process.env.AWS_REGION || S3Config.region;
const client = new S3Client({ region });
const dynamo = DynamoDBDocumentClient.from(
  new DynamoDBClient({
    region,
    endpoint: process.env.DYNAMODB_ENDPOINT,
  }),
);
const tasksTable = process.env.TASKS_TABLE;

const streamToBuffer = async (stream: any): Promise<Buffer> => {
  if (Buffer.isBuffer(stream)) return stream;
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    stream.on("data", (chunk: Buffer) => chunks.push(chunk));
    stream.on("end", () => resolve(Buffer.concat(chunks)));
    stream.on("error", reject);
  });
};

const buildObjectUrl = (bucket: string, key: string) => {
  if (S3Config.endpoint) {
    return `${S3Config.endpoint}/${bucket}/${key}`;
  }
  return `https://${bucket}.s3.${region}.amazonaws.com/${key}`;
};

const extractTaskId = (key: string) => {
  const match = key.match(/^tasks\/([^/]+)\/attachments\//);
  return match ? match[1] : null;
};

export const handler = async (event: any) => {
  const records = event.Records || [];
  const results: any[] = [];
  for (const r of records) {
    try {
      const bucket = r.s3.bucket.name;
      const key = decodeURIComponent(r.s3.object.key.replace(/\+/g, " "));
      const thumbKey = key.replace(/(\.[^.]+)$/, (m: string) => `-thumb${m}`);
      const getCmd = new GetObjectCommand({ Bucket: bucket, Key: key });
      const obj: any = await client.send(getCmd as any);
      const body = obj.Body as any;
      const buffer = await streamToBuffer(body);

      const resized = await sharp(buffer)
        .resize({ width: 512, height: 512, fit: "inside" })
        .toBuffer();

      const putCmd = new PutObjectCommand({
        Bucket: bucket,
        Key: thumbKey,
        Body: resized,
        ContentType: obj.ContentType || "image/jpeg",
      });
      await client.send(putCmd as any);

      if (!tasksTable) {
        results.push({
          key,
          thumbKey,
          size: resized.length,
          warning: "TASKS_TABLE not set",
        });
        continue;
      }

      const taskId = extractTaskId(key);
      if (!taskId) {
        results.push({
          key,
          thumbKey,
          size: resized.length,
          warning: "unrecognized key",
        });
        continue;
      }

      const pk = `TASK#${taskId}`;
      const taskRes = await dynamo.send(
        new GetCommand({ TableName: tasksTable, Key: { PK: pk } }) as any,
      );
      const taskItem = (taskRes as any).Item as any;
      if (!taskItem || !taskItem.attachments) {
        results.push({
          key,
          thumbKey,
          size: resized.length,
          warning: "task not found",
        });
        continue;
      }

      const attachments = taskItem.attachments ?? [];
      const idx = attachments.findIndex((a: any) => a.originalKey === key);
      if (idx === -1) {
        results.push({
          key,
          thumbKey,
          size: resized.length,
          warning: "attachment not found",
        });
        continue;
      }

      const thumbnailUrl = buildObjectUrl(bucket, thumbKey);
      const updatedAtt = {
        ...attachments[idx],
        thumbnailKey: thumbKey,
        thumbnailUrl,
        version: (attachments[idx].version ?? 1) + 1,
      };
      const newAttachments = [...attachments];
      newAttachments[idx] = updatedAtt;

      await dynamo.send(
        new UpdateCommand({
          TableName: tasksTable,
          Key: { PK: pk },
          UpdateExpression:
            "SET #attachments = :attachments, #latestThumbnailUrl = :latestThumbnailUrl, #updatedAt = :updatedAt",
          ExpressionAttributeNames: {
            "#attachments": "attachments",
            "#latestThumbnailUrl": "latestThumbnailUrl",
            "#updatedAt": "updatedAt",
          },
          ExpressionAttributeValues: {
            ":attachments": newAttachments,
            ":latestThumbnailUrl": thumbnailUrl,
            ":updatedAt": new Date().toISOString(),
          },
        }) as any,
      );

      results.push({ key, thumbKey, size: resized.length, taskId });
    } catch (e) {
      // continue on error
      results.push({ error: e.message || String(e) });
    }
  }
  return { results };
};
