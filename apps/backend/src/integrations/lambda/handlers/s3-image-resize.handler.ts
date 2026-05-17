import {
  S3Client,
  GetObjectCommand,
  PutObjectCommand,
} from "@aws-sdk/client-s3";
import { S3Config } from "../../../config/s3.config";

const client = new S3Client({ region: S3Config.region });

export const handler = async (event: any) => {
  const records = event.Records || [];
  const results: any[] = [];
  for (const r of records) {
    try {
      const bucket = r.s3.bucket.name;
      const key = decodeURIComponent(r.s3.object.key.replace(/\+/g, " "));
      // For now, perform a copy of the object to a thumbnail key as a placeholder for actual resizing
      const thumbKey = key.replace(/(\.[^.]+)$/, (m: string) => `-thumb${m}`);
      // get original object
      const getCmd = new GetObjectCommand({ Bucket: bucket, Key: key });
      const obj = await client.send(getCmd as any);
      const body = obj.Body as any;
      // upload to thumbnail key (no actual resize implemented here)
      const putCmd = new PutObjectCommand({
        Bucket: bucket,
        Key: thumbKey,
        Body: body,
      });
      await client.send(putCmd as any);
      results.push({ key, thumbKey });
    } catch (e) {
      // continue on error
      results.push({ error: e.message || String(e) });
    }
  }
  return { results };
};
