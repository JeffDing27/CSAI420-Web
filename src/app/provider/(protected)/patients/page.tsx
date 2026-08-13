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
    <div className="space-y-6">
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="app-title">My Patients</h1>
          <p className="app-subtitle mt-2">
            A list of all patients who have granted you access to their STEDI records.
          </p>
        </div>
      </div>

      <div className="app-panel p-4 md:p-5 flex gap-4">
        <form className="flex-1 max-w-sm flex">
          <input
            type="text"
            name="query"
            placeholder="Search patients..."
            defaultValue={query}
            className="app-input mt-0"
          />
          <button type="submit" className="ml-3 app-button-primary">
            Search
          </button>
        </form>
      </div>

      <div className="flex flex-col app-panel p-2 md:p-3">
        <div className="-my-2 -mx-4 overflow-x-auto sm:-mx-6 lg:-mx-8">
          <div className="inline-block min-w-full py-2 align-middle md:px-6 lg:px-8">
            <div className="overflow-hidden rounded-2xl border border-slate-200">
              <table className="min-w-full divide-y divide-gray-300">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="py-3.5 pl-4 pr-3 text-left text-sm font-extrabold text-slate-800 sm:pl-6">Name</th>
                    <th className="px-3 py-3.5 text-left text-sm font-extrabold text-slate-800">Email</th>
                    <th className="px-3 py-3.5 text-left text-sm font-extrabold text-slate-800">Phone</th>
                    <th className="px-3 py-3.5 text-left text-sm font-extrabold text-slate-800">DOB</th>
                    <th className="relative py-3.5 pl-3 pr-4 sm:pr-6">
                      <span className="sr-only">View</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {patients.length > 0 ? patients.map((patient) => (
                    <tr key={patient.id}>
                      <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-bold text-slate-900 sm:pl-6">
                        {patient.firstName} {patient.lastName}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-slate-600">{patient.email}</td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-slate-600">{patient.phone}</td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-slate-600">{patient.birthDate}</td>
                      <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                        <Link href={`/provider/patients/${patient.id}`} className="rounded-xl bg-sky-100 px-3 py-1.5 font-bold text-sky-800 hover:bg-sky-200">
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
