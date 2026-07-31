type FallRiskScoreCardProps = {
  score: number;
  riskLevel: string;
  recommendation: string;
};

export default function FallRiskScoreCard({
  score,
  riskLevel,
  recommendation,
}: FallRiskScoreCardProps) {
  return (
    <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
      <h2 className="mb-4 text-xl font-semibold text-gray-900">
        Fall Risk Score
      </h2>

      <div className="space-y-3">
        <p className="text-4xl font-bold text-gray-900">{score}</p>

        <p className="text-sm text-gray-600">
          Risk Level:{" "}
          <span className="font-semibold text-gray-900">{riskLevel}</span>
        </p>

        <p className="text-sm text-gray-600">
          Recommendation:{" "}
          <span className="font-medium text-gray-900">{recommendation}</span>
        </p>
      </div>
    </section>
  );
}
