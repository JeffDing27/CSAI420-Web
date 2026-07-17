import { headers, cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { AuthService } from "@/lib/service/auth.service";
import { notFound } from "next/navigation";

export default async function PatientProfilePage({
  params
}: {
  params: { patientId: string }
}) {
  const p = await params;
  const cookieStore = await cookies();
  const token = cookieStore.get("suresteps.session.token")?.value;
  const session = await AuthService.validateSession(token || "");
  if (!session) return null;

  const clinician = await prisma.user.findUnique({ where: { id: session.userId } });
  if (!clinician) return null;

  const patient = await prisma.user.findUnique({ where: { id: p.patientId } });
  if (!patient || patient.role !== "PATIENT") {
    return notFound();
  }

  // Verify access
  const hasAccess = await prisma.consentedClinician.findFirst({
    where: {
      customer: patient.email,
      clinicianUsername: clinician.userName
    }
  });

  if (!hasAccess) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold text-red-600">Access Denied</h2>
        <p className="mt-2 text-gray-600">You do not have permission to view this patient's records.</p>
        <Link href="/provider/patients" className="mt-4 text-blue-600 hover:underline inline-block">Return to Patients List</Link>
      </div>
    );
  }

  const tests = await prisma.rapidStepTest.findMany({
    where: { userId: patient.id },
    orderBy: { completedAt: "desc" }
  });

  const escalations = await prisma.escalation.findMany({
    where: { userId: patient.id },
    orderBy: { escalationTimestamp: "desc" }
  });

  return (
    <div>
      <div className="mb-6">
        <Link href="/provider/patients" className="text-sm text-blue-600 hover:underline">
          &larr; Back to Patients
        </Link>
      </div>

      <div className="bg-white shadow overflow-hidden sm:rounded-lg mb-8">
        <div className="px-4 py-5 sm:px-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900">Patient Profile</h3>
          <p className="mt-1 max-w-2xl text-sm text-gray-500">Personal details and contact information.</p>
        </div>
        <div className="border-t border-gray-200 px-4 py-5 sm:p-0">
          <dl className="sm:divide-y sm:divide-gray-200">
            <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500">Full name</dt>
              <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{patient.firstName} {patient.lastName}</dd>
            </div>
            <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500">Email address</dt>
              <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{patient.email}</dd>
            </div>
            <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500">Phone number</dt>
              <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{patient.phone}</dd>
            </div>
            <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500">Date of Birth</dt>
              <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{patient.birthDate}</dd>
            </div>
          </dl>
        </div>
      </div>

      <h3 className="text-lg font-medium text-gray-900 mb-4">Rapid Step Tests</h3>
      <div className="bg-white shadow overflow-hidden sm:rounded-lg mb-8">
        <ul className="divide-y divide-gray-200">
          {tests.length > 0 ? tests.map(test => (
            <li key={test.id} className="px-4 py-4 sm:px-6">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-blue-600 truncate">
                  Score: {(test.testData as any)?.score || "N/A"}
                </p>
                <div className="ml-2 flex-shrink-0 flex">
                  <p className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                    Source: {test.source}
                  </p>
                </div>
              </div>
              <div className="mt-2 sm:flex sm:justify-between">
                <div className="sm:flex">
                  <p className="flex items-center text-sm text-gray-500">
                    Ext ID: {test.externalTestId}
                  </p>
                </div>
                <div className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0">
                  <p>
                    Completed on <time dateTime={test.completedAt.toISOString()}>{new Date(test.completedAt).toLocaleDateString()}</time>
                  </p>
                </div>
              </div>
            </li>
          )) : (
            <li className="px-4 py-4 sm:px-6 text-sm text-gray-500 text-center">No test results found.</li>
          )}
        </ul>
      </div>

      <h3 className="text-lg font-medium text-gray-900 mb-4">Escalations</h3>
      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
        <ul className="divide-y divide-gray-200">
          {escalations.length > 0 ? escalations.map(esc => (
            <li key={esc.escalationId} className="px-4 py-4 sm:px-6">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-blue-600 truncate">
                  {esc.category}
                </p>
                <div className="ml-2 flex-shrink-0 flex">
                  <p className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${esc.status === 'RESOLVED' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                    {esc.status}
                  </p>
                </div>
              </div>
              <div className="mt-2">
                <p className="text-sm text-gray-900">{esc.originalQuestion}</p>
                <p className="text-sm text-gray-500 mt-1 line-clamp-2">AI: {esc.aiResponse}</p>
              </div>
              <div className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0">
                <p>
                  Escalated on <time dateTime={esc.escalationTimestamp.toISOString()}>{new Date(esc.escalationTimestamp).toLocaleDateString()}</time>
                </p>
              </div>
            </li>
          )) : (
            <li className="px-4 py-4 sm:px-6 text-sm text-gray-500 text-center">No escalations found.</li>
          )}
        </ul>
      </div>
    </div>
  );
}
