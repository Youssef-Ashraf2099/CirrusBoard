export const SqsConfig = {
  taskAssignQueueUrl:
    process.env.SQS_TASK_ASSIGN_QUEUE_URL || process.env.SQS_QUEUE_URL || "",
  region: process.env.AWS_REGION || "us-east-1",
  endpoint:
    process.env.SQS_ENDPOINT ||
    process.env.AWS_ENDPOINT ||
    process.env.LOCALSTACK_ENDPOINT ||
    undefined,
};
