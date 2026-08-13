import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AuthService } from "@/lib/service/auth.service";
import Link from "next/link";
import { prisma } from "@/lib/prisma";

export default async function ProviderLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const token = cookieStore.get("suresteps.session.token")?.value || "";
  
  if (!token) {
    // Basic fallback to cookie auth if present, but since we are doing API mostly,
    // let's just assume they need a valid token. If no token, redirect to login.
    redirect("/provider/login");
  }

  const session = await AuthService.validateSession(token);
  if (!session) {
    redirect("/provider/login");
  }

  const user = await prisma.user.findUnique({ where: { id: session.userId } });
  if (!user || user.role !== "CLINICIAN") {
    // Non-clinicians are forbidden from provider portal
    return (
      <div className="app-shell flex items-center justify-center px-4">
        <div className="app-panel p-8 text-center max-w-md w-full">
          <h2 className="text-3xl font-extrabold text-rose-600 mb-3">Access Denied</h2>
          <p className="text-slate-600">You must be a registered clinician to access this portal.</p>
          <Link href="/" className="mt-6 inline-flex rounded-2xl bg-slate-100 px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-200">Return Home</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="app-shell flex flex-col px-4 py-6 md:px-6">
      <header className="app-panel max-w-7xl mx-auto w-full">
        <div className="px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center space-x-8">
            <h1 className="text-2xl font-extrabold text-slate-900">STEDI Provider</h1>
            <nav className="hidden md:flex space-x-4">
              <Link href="/provider/patients" className="text-slate-700 hover:text-slate-900 hover:bg-slate-100 px-4 py-2 rounded-2xl text-sm font-bold">Patients</Link>
              <Link href="/provider/access-requests" className="text-slate-700 hover:text-slate-900 hover:bg-slate-100 px-4 py-2 rounded-2xl text-sm font-bold">Access Requests</Link>
            </nav>
          </div>
          <div className="flex items-center">
            <span className="text-sm text-slate-500 mr-4">Dr. {user.lastName}</span>
            <Link href="/provider/logout" className="rounded-2xl bg-rose-100 px-3 py-1.5 text-sm font-bold text-rose-700 hover:bg-rose-200">Logout</Link>
          </div>
        </div>
      </header>
      <main className="flex-1 max-w-7xl mx-auto px-1 sm:px-2 lg:px-2 py-8 w-full">
        {children}
      </main>
    </div>
  );
}
