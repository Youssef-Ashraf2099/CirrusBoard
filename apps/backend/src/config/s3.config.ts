export const S3Config = {
  bucketName: process.env.S3_BUCKET_NAME || "cirrusboard-upload",
  region: process.env.AWS_REGION || "us-east-1",
  endpoint: process.env.S3_ENDPOINT || undefined,
  forcePathStyle: process.env.S3_FORCE_PATH_STYLE === "true",
};

export function getS3BucketName() {
  return S3Config.bucketName;
}
