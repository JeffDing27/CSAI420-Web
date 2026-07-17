import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import LogoutButton from "@/components/logout-button";
import { prisma } from "@/lib/prisma";
import { AuthService } from "@/lib/service/auth.service";

export default async function AccountPage() {
  const token = (await cookies()).get("suresteps.session.token")?.value;
  if (!token) redirect("/account/login");

  const session = await AuthService.validateSession(token);
  if (!session) redirect("/account/login");

  const user = await prisma.user.findUnique({ where: { id: session.userId } });
  if (!user) redirect("/account/login");
  if (user.role === "CLINICIAN" || user.role === "ADMIN") {
    redirect("/provider/patients");
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-12 text-slate-950">
      <div className="mx-auto max-w-3xl">
        <div className="rounded-2xl bg-white p-8 shadow-lg ring-1 ring-slate-200">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="font-semibold text-blue-700">STEDI Voice patient account</p>
              <h1 className="mt-2 text-3xl font-bold">
                Welcome, {user.firstName}
              </h1>
            </div>
            <LogoutButton />
          </div>

          <dl className="mt-8 grid gap-5 rounded-xl bg-slate-50 p-6 sm:grid-cols-2">
            <div>
              <dt className="text-sm text-slate-500">Email</dt>
              <dd className="font-medium">{user.email}</dd>
            </div>
            <div>
              <dt className="text-sm text-slate-500">IVR phone</dt>
              <dd className="font-medium">{user.phone}</dd>
            </div>
            <div>
              <dt className="text-sm text-slate-500">Region</dt>
              <dd className="font-medium">{user.region}</dd>
            </div>
            <div>
              <dt className="text-sm text-slate-500">Voice line</dt>
              <dd className="font-medium">(608) 200-4701</dd>
            </div>
          </dl>

          <div className="mt-8 rounded-xl border border-blue-200 bg-blue-50 p-5">
            <h2 className="font-bold text-blue-950">Try STEDI Voice</h2>
            <p className="mt-1 text-blue-900">
              Call (608) 200-4701 and enter the phone number shown above when prompted.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
