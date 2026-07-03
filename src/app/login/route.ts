import { forwardRequest } from "@/utils/pass-through";

export async function POST(request: Request) {
  return forwardRequest(request, "/login");
}
