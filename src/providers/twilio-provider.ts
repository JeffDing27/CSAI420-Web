import twilio, { type Twilio } from "twilio";
import {
  MockNotificationProvider,
  type NotificationProvider,
} from "./notification-provider";

function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required when Twilio is enabled`);
  return value;
}

function requireE164(name: string, value: string): string {
  if (!/^\+[1-9]\d{7,14}$/.test(value)) {
    throw new Error(`${name} must use E.164 format (for example +15551234567)`);
  }
  return value;
}

export class TwilioProvider implements NotificationProvider {
  private readonly client: Twilio;
  private readonly fromNumber: string;
  private readonly messagingServiceSid?: string;

  constructor() {
    const accountSid = required("TWILIO_ACCOUNT_SID");
    const apiKeySid = process.env.TWILIO_API_KEY_SID?.trim();
    const apiKeySecret = process.env.TWILIO_API_KEY_SECRET?.trim();
    if ((apiKeySid && !apiKeySecret) || (!apiKeySid && apiKeySecret)) {
      throw new Error(
        "TWILIO_API_KEY_SID and TWILIO_API_KEY_SECRET must be set together",
      );
    }
    this.client = twilio(
      apiKeySid || accountSid,
      apiKeySecret || required("TWILIO_AUTH_TOKEN"),
      { accountSid, autoRetry: true, maxRetries: 3 },
    );
    this.fromNumber = requireE164(
      "TWILIO_PHONE_NUMBER",
      required("TWILIO_PHONE_NUMBER"),
    );
    this.messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID?.trim();
  }

  async sendSMS(to: string, message: string): Promise<void> {
    await this.client.messages.create({
      to: requireE164("SMS destination", to),
      body: message,
      ...(this.messagingServiceSid
        ? { messagingServiceSid: this.messagingServiceSid }
        : { from: this.fromNumber }),
    });
  }

  async makeCall(to: string, twimlUrl: string): Promise<void> {
    const url = new URL(twimlUrl);
    if (url.protocol !== "https:") {
      throw new Error("Twilio call webhook URL must use HTTPS");
    }
    await this.client.calls.create({
      to: requireE164("Call destination", to),
      from: this.fromNumber,
      url: url.toString(),
      method: "POST",
    });
  }
}

export function getNotificationProvider(): NotificationProvider {
  if (
    process.env.TWILIO_ENABLED !== "true" ||
    process.env.TWILIO_DRY_RUN === "true"
  ) {
    return new MockNotificationProvider();
  }
  return new TwilioProvider();
}
