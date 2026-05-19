import type { DynamoDBClientConfig } from "@aws-sdk/client-dynamodb";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";

/**
 * Shared DynamoDB low-level client. When `DYNAMODB_ENDPOINT` is set (LocalStack,
 * Dynamo Local, etc.), inject static credentials — the AWS SDK credential chain
 * often fails otherwise. Real AWS relies on env/profile/role when no endpoint.
 */
export function createSharedDynamoDBClient(): DynamoDBClient {
  const region = process.env.AWS_REGION || "us-east-1";
  const endpoint = process.env.DYNAMODB_ENDPOINT;

  const config: DynamoDBClientConfig = {
    region,
    ...(endpoint
      ? {
          endpoint,
          credentials: {
            accessKeyId: process.env.AWS_ACCESS_KEY_ID ?? "local",
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY ?? "local",
          },
        }
      : {}),
  };

  return new DynamoDBClient(config);
}
