import { headers, cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { AuthService } from "@/lib/service/auth.service";

export default async function ProviderPatientsPage({
  searchParams,
}: {
  searchParams?: { query?: string };
}) {
  const cookieStore = await cookies();
  const token = cookieStore.get("suresteps.session.token")?.value;
  const session = await AuthService.validateSession(token || "");
  if (!session) return null;

  const clinician = await prisma.user.findUnique({ where: { id: session.userId } });
  if (!clinician) return null;

  const sp = await searchParams;
  const query = sp?.query?.toLowerCase() || "";

  // Get emails of patients who have consented to this clinician
  const consented = await prisma.consentedClinician.findMany({
    where: { clinicianUsername: clinician.userName },
    select: { customer: true }
  });

  const patientEmails = consented.map(c => c.customer);

  // Fetch those patients
  let patients = await prisma.user.findMany({
    where: {
      email: { in: patientEmails },
      role: "PATIENT"
    },
    orderBy: { lastName: "asc" }
  });

  if (query) {
    patients = patients.filter(p => 
      p.firstName.toLowerCase().includes(query) ||
      p.lastName.toLowerCase().includes(query) ||
      p.email.toLowerCase().includes(query)
    );
  }

  return (
    <div>
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-2xl font-semibold text-gray-900">My Patients</h1>
          <p className="mt-2 text-sm text-gray-700">
            A list of all patients who have granted you access to their STEDI records.
          </p>
        </div>
      </div>

      <div className="mt-6 flex gap-4">
        <form className="flex-1 max-w-sm flex">
          <input
            type="text"
            name="query"
            placeholder="Search patients..."
            defaultValue={query}
            className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md py-2 px-3 border"
          />
          <button type="submit" className="ml-3 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none">
            Search
          </button>
        </form>
      </div>

      <div className="mt-8 flex flex-col">
        <div className="-my-2 -mx-4 overflow-x-auto sm:-mx-6 lg:-mx-8">
          <div className="inline-block min-w-full py-2 align-middle md:px-6 lg:px-8">
            <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
              <table className="min-w-full divide-y divide-gray-300">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6">Name</th>
                    <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Email</th>
                    <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Phone</th>
                    <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">DOB</th>
                    <th className="relative py-3.5 pl-3 pr-4 sm:pr-6">
                      <span className="sr-only">View</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {patients.length > 0 ? patients.map((patient) => (
                    <tr key={patient.id}>
                      <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6">
                        {patient.firstName} {patient.lastName}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{patient.email}</td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{patient.phone}</td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{patient.birthDate}</td>
                      <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                        <Link href={`/provider/patients/${patient.id}`} className="text-blue-600 hover:text-blue-900">
                          View profile<span className="sr-only">, {patient.firstName}</span>
                        </Link>
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={5} className="py-4 text-center text-sm text-gray-500">
                        No patients found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
