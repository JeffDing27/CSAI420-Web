const { SQSClient, SendMessageCommand } = require("@aws-sdk/client-sqs");

const sqs = new SQSClient();

exports.handler = async (event) => {
  console.log("Processing SQS Escalation Event");

  for (const record of event.Records) {
    const body = JSON.parse(record.body);
    console.log(`Processing escalation ${body.escalationId}`);

    const enriched = {
      escalationId: body.escalationId,
      originalQuestion: body.originalQuestion,
      aiResponse: body.aiResponse,
      patientPhone: body.phoneNumber,
      questionTimestamp: body.questionTimestamp,
      escalationTimestamp: body.escalationTimestamp,
      responsePreference: body.responsePreference,
      waitingForResponse: body.waitingForResponse,
      priority: body.priority,
      category: body.category
    };

    console.log("Enriched Escalation:", JSON.stringify(enriched, null, 2));

    const queueUrl = process.env.SQS_QUEUE_URL ?? process.env.ESCALATION_QUEUE_URL;
    if (queueUrl && !body.enriched) {
      enriched.enriched = true; // prevent infinite loop if sending to same queue
      await sqs.send(new SendMessageCommand({
        QueueUrl: queueUrl,
        MessageBody: JSON.stringify(enriched)
      }));
      console.log(`Successfully enriched and queued ${body.escalationId}`);
    } else {
      console.log(`Successfully processed ${body.escalationId}`);
    }
  }

  return { statusCode: 200, body: "Success" };
};
