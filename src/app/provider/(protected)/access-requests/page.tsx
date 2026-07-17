import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { AuthService } from "@/lib/service/auth.service";
import ProviderAccessRequestsPage from "./client";

export default async function AccessRequestsServerPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get("suresteps.session.token")?.value;
  const session = await AuthService.validateSession(token || "");
  if (!session) return null;

  const clinician = await prisma.user.findUnique({ where: { id: session.userId } });
  if (!clinician) return null;

  const requests = await prisma.clinicianAccessRequest.findMany({
    where: { clinicianUsername: clinician.userName },
    orderBy: { requestDate: "desc" }
  });

  return <ProviderAccessRequestsPage requests={requests} />;
}
