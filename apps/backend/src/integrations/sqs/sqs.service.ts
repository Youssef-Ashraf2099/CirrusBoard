import { SQSClient, SendMessageCommand } from "@aws-sdk/client-sqs";
import { SqsConfig } from "../../config/sqs.config";

export class SqsService {
  private client = new SQSClient({
    region: SqsConfig.region,
    endpoint: SqsConfig.endpoint,
  });

  async sendMessage(
    queueUrl: string,
    body: string,
    attributes?: Record<string, string>,
  ) {
    const MessageAttributes = attributes
      ? Object.fromEntries(
          Object.entries(attributes).map(([key, value]) => [
            key,
            { DataType: "String", StringValue: value },
          ]),
        )
      : undefined;

    const cmd = new SendMessageCommand({
      QueueUrl: queueUrl,
      MessageBody: body,
      MessageAttributes,
    });
    return this.client.send(cmd);
  }

  async sendTaskAssigned(payload: {
    taskId: string;
    teamId: string;
    assigneeId: string;
    assignedBy: string;
  }) {
    if (!SqsConfig.taskAssignQueueUrl) {
      throw new Error("SQS task assignment queue not configured");
    }
    return this.sendMessage(
      SqsConfig.taskAssignQueueUrl,
      JSON.stringify({ eventType: "TASK_ASSIGNED", ...payload }),
      { eventType: "TASK_ASSIGNED" },
    );
  }
}
