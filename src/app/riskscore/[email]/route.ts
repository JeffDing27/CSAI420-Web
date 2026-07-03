import { forwardRequest } from "@/utils/pass-through";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ email: string }> }
) {
  const { email } = await params;
  return forwardRequest(request, `/riskscore/${email}`);
}
