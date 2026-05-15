/**
 * Creates a predictable demo account for frontend testing (DynamoDB).
 *
 * Usage (from apps/backend):
 *   Real AWS:
 *     AWS_REGION=... AWS_ACCESS_KEY_ID=... AWS_SECRET_ACCESS_KEY=... USERS_TABLE=Users npm run seed:demo-user
 *   LocalStack / Dynamo-compatible local endpoint:
 *     AWS_REGION=us-east-1 USERS_TABLE=Users DYNAMODB_ENDPOINT=http://localhost:4566 npm run seed:demo-user
 *
 * Or start the API and POST /api/users — see printed JSON after a successful seed.
 */
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand, ScanCommand } from "@aws-sdk/lib-dynamodb";
import { randomUUID } from "crypto";

const DEMO = {
  email: "demo@cirrusboard.test",
  name: "Demo Tester",
  password: "DemoTest123!",
  role: "MANAGER" as const,
  primaryTeamId: "default-team",
  teamIds: ["default-team" as string],
};

async function main() {
  const region = process.env.AWS_REGION || "us-east-1";
  const table =
    process.env.USERS_TABLE || process.env.Users_TABLE || "Users";
  const endpoint = process.env.DYNAMODB_ENDPOINT;

  const low = new DynamoDBClient({
    region,
    ...(endpoint
      ? {
          endpoint,
          credentials: {
            accessKeyId: process.env.AWS_ACCESS_KEY_ID || "local",
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "local",
          },
        }
      : {}),
  });
  const doc = DynamoDBDocumentClient.from(low);

  const existing = await doc.send(
    new ScanCommand({
      TableName: table,
      FilterExpression: "#e = :e",
      ExpressionAttributeNames: { "#e": "email" },
      ExpressionAttributeValues: { ":e": DEMO.email },
      Limit: 10,
    }) as never,
  );
  const found = ((existing as { Items?: Array<{ userId?: string }> }).Items ??
    [])[0];
  if (found?.userId) {
    console.log(
      JSON.stringify(
        {
          ok: true,
          message: "User already exists (same email). Use these credentials to log in.",
          login: { email: DEMO.email, password: DEMO.password },
          userId: found.userId,
        },
        null,
        2,
      ),
    );
    return;
  }

  const now = new Date().toISOString();
  const userId = randomUUID();
  const item = {
    PK: `USER#${userId}`,
    userId,
    email: DEMO.email,
    name: DEMO.name,
    role: DEMO.role,
    password: DEMO.password,
    primaryTeamId: DEMO.primaryTeamId,
    teamIds: DEMO.teamIds,
    isActive: true,
    createdAt: now,
    updatedAt: now,
  };

  await doc.send(
    new PutCommand({
      TableName: table,
      Item: item,
    }) as never,
  );

  console.log(
    JSON.stringify(
      {
        ok: true,
        message: "Demo user created.",
        login: { email: DEMO.email, password: DEMO.password },
        userId,
        primaryTeamId: DEMO.primaryTeamId,
        bodyForApiReference: {
          email: DEMO.email,
          name: DEMO.name,
          password: DEMO.password,
          role: DEMO.role,
          primaryTeamId: DEMO.primaryTeamId,
          teamIds: DEMO.teamIds,
        },
      },
      null,
      2,
    ),
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
