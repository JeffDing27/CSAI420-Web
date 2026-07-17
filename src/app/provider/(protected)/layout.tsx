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
  if (!user || (user.role !== "CLINICIAN" && user.role !== "ADMIN")) {
    // Non-clinicians are forbidden from provider portal
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white p-8 rounded shadow-md text-center max-w-sm w-full">
          <h2 className="text-2xl font-bold text-red-600 mb-4">Access Denied</h2>
          <p className="text-gray-600">You must be a registered clinician to access this portal.</p>
          <Link href="/" className="mt-6 inline-block text-blue-600 hover:underline">Return Home</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-8">
            <h1 className="text-xl font-bold text-blue-600">STEDI Provider</h1>
            <nav className="hidden md:flex space-x-4">
              <Link href="/provider/patients" className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium">Patients</Link>
              <Link href="/provider/access-requests" className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium">Access Requests</Link>
              <Link href="/provider/settings" className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium">Settings</Link>
            </nav>
          </div>
          <div className="flex items-center">
            <span className="text-sm text-gray-500 mr-4">Dr. {user.lastName}</span>
            <Link href="/provider/logout" className="text-sm text-red-600 hover:text-red-800">Logout</Link>
          </div>
        </div>
      </header>
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        {children}
      </main>
    </div>
  );
}

