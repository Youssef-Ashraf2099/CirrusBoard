import {
  S3Client,
  PutObjectCommand,
  HeadObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { getAwsClientOptions } from "../../config/aws.config";
import { S3Config } from "../../config/s3.config";

export class S3Service {
  private client = new S3Client(getAwsClientOptions());

  async getPresignedUploadUrl(
    key: string,
    contentType: string,
    expires = 900,
  ): Promise<string> {
    const cmd = new PutObjectCommand({
      Bucket: S3Config.bucketName,
      Key: key,
      ContentType: contentType,
    });
    return getSignedUrl(this.client, cmd, { expiresIn: expires });
  }

  async getObjectMetadata(key: string) {
    const cmd = new HeadObjectCommand({
      Bucket: S3Config.bucketName,
      Key: key,
    });
    const res: any = await this.client.send(cmd as any);
    return {
      contentLength: res.ContentLength,
      eTag: res.ETag,
      contentType: res.ContentType,
      lastModified: res.LastModified,
    };
  }

  getObjectUrl(key: string): string {
    if (S3Config.endpoint) {
      return `${S3Config.endpoint}/${S3Config.bucketName}/${key}`;
    }
    return `https://${S3Config.bucketName}.s3.${S3Config.region}.amazonaws.com/${key}`;
  }
}
