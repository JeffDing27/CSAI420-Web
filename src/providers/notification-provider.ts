export interface NotificationProvider {
  sendSMS(to: string, message: string): Promise<void>;
  makeCall(to: string, twimlUrl: string): Promise<void>;
}

export class MockNotificationProvider implements NotificationProvider {
  async sendSMS(to: string, message: string): Promise<void> {
    console.log(`[MOCK SMS] To: ${to} | Message: ${message}`);
  }

  async makeCall(to: string, twimlUrl: string): Promise<void> {
    console.log(`[MOCK CALL] To: ${to} | TwiML URL: ${twimlUrl}`);
  }
}
