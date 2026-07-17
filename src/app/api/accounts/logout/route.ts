import { cookies } from "next/headers";
import { AuthService } from "@/lib/service/auth.service";

export async function POST() {
  const cookieStore = await cookies();
  const token = cookieStore.get("suresteps.session.token")?.value;
  if (token) await AuthService.logout(token);
  cookieStore.delete("suresteps.session.token");
  return Response.json({ loggedOut: true });
}
