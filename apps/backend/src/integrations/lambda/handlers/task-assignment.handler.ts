import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";

const parseRecordBody = (record: any) => {
  if (!record?.body) {
    return {};
  }

  const outerBody = JSON.parse(record.body);
  // SNS -> SQS deliveries wrap the message in a Message field.
  if (outerBody?.Message) {
    return JSON.parse(outerBody.Message);
  }

  return outerBody;
};

const buildSesClient = () => {
  const region = process.env.AWS_REGION || "us-east-1";
  const endpoint =
    process.env.SES_ENDPOINT ||
    process.env.AWS_ENDPOINT ||
    process.env.LOCALSTACK_ENDPOINT;

  return new SESClient({
    region,
    ...(endpoint ? { endpoint } : {}),
  });
};

const sendAssignmentEmail = async (payload: any) => {
  const fromAddress = process.env.SES_FROM_ADDRESS;
  const toAddress = process.env.SES_TO_ADDRESS || payload?.assigneeEmail;
  if (!fromAddress || !toAddress) {
    return { skipped: true, reason: "missing_from_or_to" };
  }

  const subject = `Task assignment: ${payload?.taskId || "unknown task"}`;
  const bodyText =
    payload?.message ||
    `You were assigned to task ${payload?.taskId || "unknown task"}.`;

  const client = buildSesClient();
  const response = await client.send(
    new SendEmailCommand({
      Source: fromAddress,
      Destination: { ToAddresses: [toAddress] },
      Message: {
        Subject: { Data: subject },
        Body: { Text: { Data: bodyText } },
      },
    }),
  );

  return { sent: true, sesMessageId: response.MessageId };
};

export const handler = async (event: any) => {
  const records = event.Records || [];
  const results: any[] = [];

  for (const record of records) {
    try {
      const body = parseRecordBody(record);
      const emailResult = await sendAssignmentEmail(body);
      results.push({
        messageId: record.messageId,
        eventType: body.eventType,
        taskId: body.taskId,
        email: emailResult,
      });
    } catch (e) {
      results.push({
        messageId: record.messageId,
        error: e.message || String(e),
      });
    }
  }

  return { processed: results.length, results };
};
