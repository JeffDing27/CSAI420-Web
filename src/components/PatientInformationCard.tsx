type PatientInformationCardProps = {
  name: string;
  age: number;
  email: string;
  assessmentDate: string;
  status: string;
};

export default function PatientInformationCard({
  name,
  age,
  email,
  assessmentDate,
  status,
}: PatientInformationCardProps) {
  const isConnected = status.trim().toLowerCase() === "device connected";

  return (
    <section className="rounded-lg bg-white p-6 shadow">
      <h2 className="text-xl font-semibold text-gray-900">
        Patient Information
      </h2>

      <div className="mt-4 space-y-2 text-gray-700">
        <p>
          <span className="font-medium">Name:</span> {name}
        </p>

        <p>
          <span className="font-medium">Age:</span> {age}
        </p>

        <p>
          <span className="font-medium">Email:</span> {email}
        </p>

        <p>
          <span className="font-medium">Assessment Date:</span> {assessmentDate}
        </p>

        <div className="mt-4 grid gap-4">
          <div>
            <p className="text-sm font-medium text-slate-500">Status</p>
            <p
              className={`text-sm font-semibold ${
                isConnected ? "text-emerald-600" : "text-slate-900"
              }`}
            >
              {status}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
