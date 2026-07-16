export interface QueueProvider {
  sendMessage(queueUrl: string, messageBody: any): Promise<void>;
}

export class MockQueueProvider implements QueueProvider {
  async sendMessage(queueUrl: string, messageBody: any): Promise<void> {
    console.log(`[MOCK SQS] Message sent to ${queueUrl}:`, JSON.stringify(messageBody));
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 100));
  }
}

export class SQSProvider implements QueueProvider {
  async sendMessage(queueUrl: string, messageBody: any): Promise<void> {
    if (!process.env.AWS_REGION) {
      throw new Error("AWS credentials not configured");
    }
    console.log(`[REAL SQS] Would send message to ${queueUrl}`);
    // Real implementation goes here (e.g., using @aws-sdk/client-sqs)
  }
}

export function getQueueProvider(): QueueProvider {
  // If AWS isn't fully configured or explicitly mocked, use mock
  if (process.env.AWS_MOCK === 'true' || !process.env.AWS_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID === 'dummy_key') {
    return new MockQueueProvider();
  }
  return new SQSProvider();
}
