import PatientInformationCard from "@/components/PatientInformationCard";
import FallRiskScoreCard from "@/components/FallRiskScoreCard";

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

        <div className="mt-8">
          <PatientInformationCard
            name="John Smith"
            age={74}
            email="john.smith@example.com"
            assessmentDate="July 21, 2026"
            status="Assessment Complete"
          />

          <FallRiskScoreCard
            score={72}
            riskLevel="Moderate"
            recommendation="Schedule a follow-up balance assessment."
          />
        </div>
      </div>
    </main>
  );
}
