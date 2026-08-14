import { cookies } from "next/headers";
import { getPatientPortalUser } from "../../portal-auth";

type RemoteUserProfile = {
  phone?: string;
};

type RemoteCustomerProfile = {
  customerName?: string;
  birthDay?: string;
  region?: string;
};

async function getRemoteUserProfile(email?: string | null): Promise<RemoteUserProfile | null> {
  if (!email) return null;

  try {
    const cookieStore = await cookies();
    const surestepsToken = cookieStore.get("suresteps.session.token")?.value;
    if (!surestepsToken) return null;

    const baseUrl = process.env.INTERNAL_API_BASE_URL || "http://localhost:3000";
    const response = await fetch(`${baseUrl}/user/${encodeURIComponent(email)}`, {
      method: "GET",
      headers: {
        accept: "application/json",
        "suresteps.session.token": surestepsToken,
      },
      cache: "no-store",
    });

    if (!response.ok) return null;

    return (await response.json()) as RemoteUserProfile;
  } catch {
    return null;
  }
}

async function getCustomerProfileFromLocalCustomerApi(
  phone?: string | null,
): Promise<RemoteCustomerProfile | null> {
  if (!phone) return null;

  try {
    const cookieStore = await cookies();
    const surestepsToken = cookieStore.get("suresteps.session.token")?.value;
    if (!surestepsToken) return null;

    const baseUrl = process.env.INTERNAL_API_BASE_URL || "http://localhost:3000";
    const response = await fetch(`${baseUrl}/customer/${encodeURIComponent(phone)}`, {
      method: "GET",
      headers: {
        accept: "application/json",
        "suresteps.session.token": surestepsToken,
      },
      cache: "no-store",
    });

    if (!response.ok) return null;

    return (await response.json()) as RemoteCustomerProfile;
  } catch {
    return null;
  }
}

export default async function PatientProfilePortalPage() {
  const { user, stediMode } = await getPatientPortalUser();

  const remoteUser = await getRemoteUserProfile(user.email);
  const phoneForLookup = user.phone || remoteUser?.phone || null;
  const customerProfile = await getCustomerProfileFromLocalCustomerApi(phoneForLookup);

  const displayName =
    customerProfile?.customerName?.trim() || `${user.firstName} ${user.lastName}`.trim();
  const displayBirthDate = customerProfile?.birthDay || user.birthDate || "—";
  const displayRegion = customerProfile?.region || user.region || "—";

  return (
    <section className="rounded-lg bg-white shadow">
      <div className="border-b border-slate-200 px-6 py-5">
        <h1 className="text-2xl font-semibold text-slate-900">Profile</h1>
        <p className="mt-1 text-sm text-slate-500">Your account and contact details.</p>
        {stediMode && !user.id ? (
          <p className="mt-2 text-xs text-amber-600">
            This account is authenticated through STEDI and does not have a mapped local patient profile yet.
          </p>
        ) : null}
      </div>
      <dl className="divide-y divide-slate-200 px-6 py-2">
        <div className="grid gap-2 py-4 sm:grid-cols-3">
          <dt className="text-sm font-medium text-slate-500">Full name</dt>
          <dd className="text-sm text-slate-900 sm:col-span-2">{displayName}</dd>
        </div>
        <div className="grid gap-2 py-4 sm:grid-cols-3">
          <dt className="text-sm font-medium text-slate-500">Username</dt>
          <dd className="text-sm text-slate-900 sm:col-span-2">{user.userName}</dd>
        </div>
        <div className="grid gap-2 py-4 sm:grid-cols-3">
          <dt className="text-sm font-medium text-slate-500">Email</dt>
          <dd className="text-sm text-slate-900 sm:col-span-2">{user.email}</dd>
        </div>
        <div className="grid gap-2 py-4 sm:grid-cols-3">
          <dt className="text-sm font-medium text-slate-500">Phone</dt>
          <dd className="text-sm text-slate-900 sm:col-span-2">{phoneForLookup || user.phone}</dd>
        </div>
        <div className="grid gap-2 py-4 sm:grid-cols-3">
          <dt className="text-sm font-medium text-slate-500">Birth date</dt>
          <dd className="text-sm text-slate-900 sm:col-span-2">{displayBirthDate}</dd>
        </div>
        <div className="grid gap-2 py-4 sm:grid-cols-3">
          <dt className="text-sm font-medium text-slate-500">Region</dt>
          <dd className="text-sm text-slate-900 sm:col-span-2">{displayRegion}</dd>
        </div>
      </dl>
    </section>
  );
}
