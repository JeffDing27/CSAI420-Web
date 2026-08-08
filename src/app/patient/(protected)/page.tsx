import PatientInformationCard from "@/components/PatientInformationCard";
import { prisma } from "@/lib/prisma";
import { DeviceService } from "@/services/device.service";
import { getPatientPortalUser } from "../portal-auth";

function calculateAge(birthDate: string) {
  const dob = new Date(birthDate);
  if (Number.isNaN(dob.getTime())) {
    return 0;
  }

  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const monthOffset = today.getMonth() - dob.getMonth();
  if (monthOffset < 0 || (monthOffset === 0 && today.getDate() < dob.getDate())) {
    age -= 1;
  }
  return age;
}

export default async function PatientPortalHomePage() {
  const { user, stediMode } = await getPatientPortalUser();
  const hasLocalUser = Boolean(user.id);
  const [tests, assignments] = hasLocalUser
    ? await Promise.all([
        prisma.rapidStepTest.findMany({
          where: { userId: user.id },
          orderBy: { completedAt: "desc" },
          take: 5,
        }),
        DeviceService.getActiveAssignmentsForUser(user.id!),
      ])
    : [[], []];

  const latestTest = tests[0];

  return (
    <div className="space-y-8">
      <section className="rounded-2xl bg-gradient-to-r from-sky-700 via-sky-600 to-cyan-500 p-8 text-white shadow-lg">
        <p className="text-sm uppercase tracking-[0.2em] text-sky-100">Patient overview</p>
        <h1 className="mt-3 text-3xl font-semibold">Welcome back, {user.firstName}.</h1>
        <p className="mt-3 max-w-2xl text-sm text-sky-50">
          Review your account details, check assigned devices, and keep track of your most recent rapid step tests.
        </p>
        {stediMode && !hasLocalUser ? (
          <p className="mt-3 text-sm text-sky-100">
            Connected with STEDI token. Local patient profile data is unavailable for this account.
          </p>
        ) : null}
      </section>

      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <PatientInformationCard
          name={`${user.firstName} ${user.lastName}`}
          age={calculateAge(user.birthDate)}
          email={user.email}
          assessmentDate={latestTest?.completedAt ? new Date(latestTest.completedAt).toLocaleDateString() : "No assessment yet"}
          status={assignments.length > 0 ? "Device connected" : "No device assigned"}
        />

        <section className="rounded-lg bg-white p-6 shadow">
          <h2 className="text-xl font-semibold text-slate-900">At a glance</h2>
          <dl className="mt-4 space-y-4 text-sm text-slate-700">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <dt>Assigned devices</dt>
              <dd className="font-semibold text-slate-900">{assignments.length}</dd>
            </div>
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <dt>Recorded tests</dt>
              <dd className="font-semibold text-slate-900">{tests.length}</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt>Portal access</dt>
              <dd className="font-semibold text-emerald-600">Active</dd>
            </div>
          </dl>
        </section>
      </div>

      <section className="rounded-lg bg-white p-6 shadow">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">Recent rapid step tests</h2>
            <p className="mt-1 text-sm text-slate-500">Latest assessments associated with your account.</p>
          </div>
        </div>

        <div className="mt-6 overflow-hidden rounded-lg border border-slate-200">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50 text-left text-sm font-semibold text-slate-700">
              <tr>
                <th className="px-4 py-3">Completed</th>
                <th className="px-4 py-3">Source</th>
                <th className="px-4 py-3">External ID</th>
                <th className="px-4 py-3">Score</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white text-sm text-slate-700">
              {tests.length > 0 ? (
                tests.map((test: any) => (
                  <tr key={test.id}>
                    <td className="px-4 py-3">{test.completedAt ? new Date(test.completedAt).toLocaleString() : "Pending"}</td>
                    <td className="px-4 py-3">{test.source}</td>
                    <td className="px-4 py-3">{test.externalTestId || "-"}</td>
                    <td className="px-4 py-3">{String((test.testData as any)?.score ?? "N/A")}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="px-4 py-8 text-center text-slate-500" colSpan={4}>
                    No rapid step tests found for this account.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
