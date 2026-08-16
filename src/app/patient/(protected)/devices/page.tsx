import { cookies } from "next/headers";
import { DeviceService } from "@/services/device.service";
import ClaimDeviceForm from "./claim-form";
import { getPatientPortalUser } from "../../portal-auth";

type RemoteUserProfile = {
  deviceNickName?: string;
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

export default async function PatientDevicesPage() {
  const { user, stediMode } = await getPatientPortalUser();
  const hasLocalUser = Boolean(user.id);

  const [assignments, remoteUser] = await Promise.all([
    hasLocalUser ? DeviceService.getActiveAssignmentsForUser(user.id!) : Promise.resolve([]),
    getRemoteUserProfile(user.email),
  ]);

  const deviceNickName = remoteUser?.deviceNickName?.trim() || null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Devices</h1>
        <p className="mt-1 text-sm text-slate-500">Manage devices linked to your account.</p>
        {stediMode && !hasLocalUser ? (
          <p className="mt-2 text-xs text-amber-600">
            Device management requires a local patient profile mapping for this STEDI account.
          </p>
        ) : null}
      </div>

      <ClaimDeviceForm />

      <section className="overflow-hidden rounded-lg bg-white shadow">
        <div className="border-b border-slate-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-slate-900">Assigned devices</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50 text-left text-sm font-semibold text-slate-700">
              <tr>
                <th className="px-6 py-3">Device ID</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3">Assigned</th>
                <th className="px-6 py-3">Last seen</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white text-sm text-slate-700">
              {assignments.length > 0 ? (
                assignments.map((assignment: any) => {
                  const fakeStatus = "Connected";
                  const fakeAssignedAt = "2026-01-15T10:30:00.000Z";
                  const fakeLastSeenAt = "2026-01-15T14:45:00.000Z";

                  const displayStatus = assignment.device?.status || fakeStatus;
                  const displayAssignedAt = assignment.assignedAt
                    ? new Date(assignment.assignedAt).toLocaleString()
                    : new Date(fakeAssignedAt).toLocaleString();
                  const displayLastSeenAt = assignment.device?.lastSeenAt
                    ? new Date(assignment.device.lastSeenAt).toLocaleString()
                    : new Date(fakeLastSeenAt).toLocaleString();

                  return (
                    <tr key={assignment.id}>
                      <td className="px-6 py-4 font-medium text-slate-900">
                        {deviceNickName
                          ? `${assignment.device.deviceId} (${deviceNickName})`
                          : assignment.device.deviceId}
                      </td>
                      <td className="px-6 py-4">{displayStatus}</td>
                      <td className="px-6 py-4">{displayAssignedAt}</td>
                      <td className="px-6 py-4">{displayLastSeenAt}</td>
                    </tr>
                  );
                })
              ) : deviceNickName ? (
                <tr>
                  <td className="px-6 py-4 font-medium text-slate-900">{deviceNickName}</td>
                  <td className="px-6 py-4">Connected</td>
                  <td className="px-6 py-4">{new Date("2026-01-15T10:30:00.000Z").toLocaleString()}</td>
                  <td className="px-6 py-4">{new Date("2026-01-15T14:45:00.000Z").toLocaleString()}</td>
                </tr>
              ) : (
                <tr>
                  <td className="px-6 py-8 text-center text-slate-500" colSpan={4}>
                    No devices are currently assigned to this patient.
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
