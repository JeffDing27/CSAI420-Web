import { NotificationProvider, MockNotificationProvider } from './notification-provider';

export class TwilioProvider implements NotificationProvider {
  async sendSMS(to: string, message: string): Promise<void> {
    console.log(`[REAL TWILIO] Sending SMS to ${to}...`);
    // Real Twilio SDK logic goes here
  }

  async makeCall(to: string, twimlUrl: string): Promise<void> {
    console.log(`[REAL TWILIO] Making call to ${to}...`);
    // Real Twilio SDK logic goes here
  }
}

export function getNotificationProvider(): NotificationProvider {
  if (process.env.TWILIO_ENABLED !== 'true' || process.env.TWILIO_DRY_RUN === 'true') {
    return new MockNotificationProvider();
  }
  return new TwilioProvider();
}
