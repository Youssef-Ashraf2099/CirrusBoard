export const SnsConfig = {
  taskAssignTopicArn:
    process.env.SNS_TASK_ASSIGN_TOPIC_ARN || process.env.SNS_TOPIC_ARN || "",
  region: process.env.AWS_REGION || "us-east-1",
  endpoint:
    process.env.SNS_ENDPOINT ||
    process.env.AWS_ENDPOINT ||
    process.env.LOCALSTACK_ENDPOINT ||
    undefined,
};
