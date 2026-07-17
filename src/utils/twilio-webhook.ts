import twilio from "twilio";

export function validateTwilioWebhook(
  request: Request,
  body: URLSearchParams,
): boolean {
  if (
    process.env.NODE_ENV === "test" ||
    process.env.TWILIO_VALIDATE_WEBHOOKS !== "true"
  )
    return true;
  const authToken = process.env.TWILIO_AUTH_TOKEN?.trim();
  const signature = request.headers.get("x-twilio-signature");
  const publicBaseUrl = process.env.APP_BASE_URL?.replace(/\/$/, "");
  if (!authToken || !signature || !publicBaseUrl) return false;
  const incomingUrl = new URL(request.url);
  const publicUrl = `${publicBaseUrl}${incomingUrl.pathname}${incomingUrl.search}`;
  return twilio.validateRequest(
    authToken,
    signature,
    publicUrl,
    Object.fromEntries(body.entries()),
  );
}
