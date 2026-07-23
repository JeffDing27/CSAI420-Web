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

        <p>
          <span className="font-medium">Status:</span> {status}
        </p>
      </div>
    </section>
  );
}
