exports.handler = async (event) => {
  console.log("Processing SQS Escalation Event:", JSON.stringify(event, null, 2));

  for (const record of event.Records) {
    const body = JSON.parse(record.body);
    console.log(`Processing escalation ${body.escalationId}`);
    
    // In a real system, this worker might:
    // 1. Analyze the escalation text again via LangGraph
    // 2. Fetch the user's history from DynamoDB
    // 3. Send a message to a clinician dashboard via WebSocket
    
    console.log(`Successfully processed ${body.escalationId}`);
  }

  return { statusCode: 200, body: 'Success' };
};
