import PatientInformationCard from "@/components/PatientInformationCard";

export default function DashboardPage() {
  return (
    <main className="min-h-screen bg-gray-100 p-6">
      <div className="mx-auto max-w-5xl">
        <h1 className="text-3xl font-bold text-gray-900">
          Patient Risk Dashboard
        </h1>

        <p className="mt-2 text-gray-600">
          View patient information and fall-risk assessment results.
        </p>

        {/* Note: This page currently uses static demonstration data. It does not dynamically load the logged-in patient. */}


        <div className="mt-8">
          <PatientInformationCard
            name="John Smith"
            age={74}
            email="john.smith@example.com"
            assessmentDate="July 21, 2026"
            status="Assessment Complete"
          />
        </div>
      </div>
    </main>
  );
}
