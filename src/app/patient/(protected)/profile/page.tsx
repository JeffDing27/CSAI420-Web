import { getPatientPortalUser } from "../../portal-auth";

export default async function PatientProfilePortalPage() {
  const { user, stediMode } = await getPatientPortalUser();

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
          <dd className="text-sm text-slate-900 sm:col-span-2">{user.firstName} {user.lastName}</dd>
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
          <dd className="text-sm text-slate-900 sm:col-span-2">{user.phone}</dd>
        </div>
        <div className="grid gap-2 py-4 sm:grid-cols-3">
          <dt className="text-sm font-medium text-slate-500">Birth date</dt>
          <dd className="text-sm text-slate-900 sm:col-span-2">{user.birthDate}</dd>
        </div>
        <div className="grid gap-2 py-4 sm:grid-cols-3">
          <dt className="text-sm font-medium text-slate-500">Region</dt>
          <dd className="text-sm text-slate-900 sm:col-span-2">{user.region}</dd>
        </div>
      </dl>
    </section>
  );
}
