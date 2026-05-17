export const handler = async (event: any) => {
  const records = event.Records || [];
  const results: any[] = [];
  for (const record of records) {
    try {
      const body = record.body ? JSON.parse(record.body) : {};
      results.push({
        messageId: record.messageId,
        eventType: body.eventType,
        taskId: body.taskId,
      });
    } catch (e) {
      results.push({ error: e.message || String(e) });
    }
  }
  return { processed: results.length, results };
};
