import "dotenv/config";

const has = (name: string) => Boolean(process.env[name]?.trim());
const enabled = (name: string) => process.env[name] === "true";
const checks = [
  ["Postgres", has("DATABASE_URL") && has("DIRECT_URL")],
  ["STEDI API", has("STEDI_API_BASE_URL")],
  [
    "Twilio REST",
    !enabled("TWILIO_ENABLED") ||
      (has("TWILIO_ACCOUNT_SID") &&
        has("TWILIO_PHONE_NUMBER") &&
        ((has("TWILIO_API_KEY_SID") && has("TWILIO_API_KEY_SECRET")) ||
          has("TWILIO_AUTH_TOKEN"))),
  ],
  [
    "Twilio webhooks",
    !enabled("TWILIO_VALIDATE_WEBHOOKS") ||
      (has("TWILIO_AUTH_TOKEN") && has("APP_BASE_URL")),
  ],
  ["OpenAI", !enabled("OPENAI_ENABLED") || has("OPENAI_API_KEY")],
  [
    "AWS queue",
    process.env.QUEUE_PROVIDER !== "sqs" ||
      (has("AWS_REGION") && has("SQS_QUEUE_URL")),
  ],
] as const;

for (const [name, ready] of checks) {
  console.log(`${ready ? "READY" : "MISSING"}  ${name}`);
}
if (checks.some(([, ready]) => !ready)) process.exitCode = 1;
