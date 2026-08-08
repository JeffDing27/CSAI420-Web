import Link from "next/link";
import { getPatientPortalUser } from "../portal-auth";

export default async function PatientPortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = await getPatientPortalUser();

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-8">
            <Link href="/patient" className="text-lg font-semibold text-sky-700">
              STEDI Patient
            </Link>
            <nav className="hidden gap-3 md:flex">
              <Link href="/patient" className="rounded-md px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900">
                Dashboard
              </Link>
              <Link href="/patient/profile" className="rounded-md px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900">
                Profile
              </Link>
              <Link href="/patient/devices" className="rounded-md px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900">
                Devices
              </Link>
            </nav>
          </div>
          <div className="flex items-center gap-4">
            <span className="hidden text-sm text-slate-500 sm:inline">
              {user.firstName} {user.lastName}
            </span>
            <Link href="/patient/logout" className="text-sm font-medium text-rose-600 hover:text-rose-700">
              Logout
            </Link>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">{children}</main>
    </div>
  );
}
