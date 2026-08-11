import { DeviceService } from "@/services/device.service";
import ClaimDeviceForm from "./claim-form";
import { getPatientPortalUser } from "../../portal-auth";

export default async function PatientDevicesPage() {
  const { user, stediMode } = await getPatientPortalUser();
  const hasLocalUser = Boolean(user.id);
  const assignments = hasLocalUser
    ? await DeviceService.getActiveAssignmentsForUser(user.id!)
    : [];

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
                assignments.map((assignment: any) => (
                  <tr key={assignment.id}>
                    <td className="px-6 py-4 font-medium text-slate-900">{assignment.device.deviceId}</td>
                    <td className="px-6 py-4">{assignment.device.status}</td>
                    <td className="px-6 py-4">{new Date(assignment.assignedAt).toLocaleString()}</td>
                    <td className="px-6 py-4">{assignment.device.lastSeenAt ? new Date(assignment.device.lastSeenAt).toLocaleString() : "Never"}</td>
                  </tr>
                ))
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
