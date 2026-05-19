export const AwsConfig = {
  region: process.env.AWS_REGION || "us-east-1",
  accessKeyId: process.env.AWS_ACCESS_KEY_ID || undefined,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || undefined,
  endpoint:
    process.env.AWS_ENDPOINT || process.env.DYNAMODB_ENDPOINT || undefined,
};

export function getAwsClientOptions() {
  const opts: Record<string, any> = { region: AwsConfig.region };
  if (AwsConfig.endpoint) opts.endpoint = AwsConfig.endpoint;
  if (AwsConfig.accessKeyId && AwsConfig.secretAccessKey) {
    opts.credentials = {
      accessKeyId: AwsConfig.accessKeyId,
      secretAccessKey: AwsConfig.secretAccessKey,
    };
  }
  return opts;
}
