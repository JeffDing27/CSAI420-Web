import { validateTwilioWebhook } from "./twilio-webhook";

export async function withTwilioValidation(
  request: Request,
  handler: (request: Request) => Promise<Response>,
): Promise<Response> {
  const body = new URLSearchParams(await request.clone().text());
  if (!validateTwilioWebhook(request, body)) {
    return new Response("Invalid Twilio signature", { status: 403 });
  }
  return handler(request);
}
