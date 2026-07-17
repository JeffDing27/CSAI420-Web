import { withTwilioValidation } from "@/utils/validated-twilio-handler";
import { POST as handlePost } from "./handler";

export async function POST(request: Request) {
  return withTwilioValidation(request, handlePost);
}
