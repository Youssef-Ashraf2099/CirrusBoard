import { SNSClient, PublishCommand } from "@aws-sdk/client-sns";
import { SnsConfig } from "../../config/sns.config";

export class SnsService {
  private client = new SNSClient({
    region: SnsConfig.region,
    endpoint: SnsConfig.endpoint,
  });

  async publish(
    topicArn: string,
    message: string,
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

    const cmd = new PublishCommand({
      TopicArn: topicArn,
      Message: message,
      MessageAttributes,
    });
    return this.client.send(cmd);
  }

  async publishTaskAssigned(payload: {
    taskId: string;
    teamId: string;
    assigneeId: string;
    assignedBy: string;
  }) {
    if (!SnsConfig.taskAssignTopicArn) {
      throw new Error("SNS task assignment topic not configured");
    }
    return this.publish(
      SnsConfig.taskAssignTopicArn,
      JSON.stringify({ eventType: "TASK_ASSIGNED", ...payload }),
      { eventType: "TASK_ASSIGNED" },
    );
  }
}
