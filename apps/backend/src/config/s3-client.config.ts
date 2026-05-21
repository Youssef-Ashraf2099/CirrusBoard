import { AwsConfig } from "./aws.config";
import { S3Config } from "./s3.config";

/** Low-level S3 client options (separate from DynamoDB endpoint). */
export function getS3ClientOptions() {
  const opts: Record<string, unknown> = { region: S3Config.region };

  if (S3Config.endpoint) {
    opts.endpoint = S3Config.endpoint;
    opts.forcePathStyle = S3Config.forcePathStyle;
  }

  if (AwsConfig.accessKeyId && AwsConfig.secretAccessKey) {
    opts.credentials = {
      accessKeyId: AwsConfig.accessKeyId,
      secretAccessKey: AwsConfig.secretAccessKey,
    };
  } else if (S3Config.endpoint) {
    opts.credentials = {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID || "local",
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "local",
    };
  }

  return opts;
}
