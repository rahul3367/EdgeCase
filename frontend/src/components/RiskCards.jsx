const CATEGORY_LABELS = {
  renewal: "Renewal",
  termination: "Termination",
  penalty: "Penalty",
  one_sided: "One-Sided Clause",
  payment: "Payment",
};

const SEVERITY_STYLES = {
  high: "border-red-400 bg-red-50 text-red-800",
  medium: "border-amber-400 bg-amber-50 text-amber-800",
  low: "border-emerald-400 bg-emerald-50 text-emerald-800",
};

const SEVERITY_DOT = {
  high: "bg-red-500",
  medium: "bg-amber-500",
  low: "bg-emerald-500",
};

export default function RiskCards({ riskSummary }) {
  if (!riskSummary) {
    return (
      <div className="text-sm text-gray-400 p-4">
        Risk analysis will appear here once a document finishes processing.
      </div>
    );
  }

  const { risks = [], overall_risk_level: overallRisk } = riskSummary;

  if (risks.length === 0) {
    return (
      <div className="p-4">
        <p className="text-sm text-emerald-700 font-medium">
          No significant risks detected in the sampled clauses.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between px-1">
        <h3 className="font-semibold text-gray-800">Identified Risks</h3>
        {overallRisk && (
          <span
            className={`text-xs font-medium px-2 py-1 rounded-full border ${SEVERITY_STYLES[overallRisk] || ""}`}
          >
            Overall: {overallRisk}
          </span>
        )}
      </div>

      {risks.map((risk, idx) => (
        <div
          key={idx}
          className={`rounded-lg border p-3 ${SEVERITY_STYLES[risk.severity] || "border-gray-300 bg-gray-50"}`}
        >
          <div className="flex items-center gap-2 mb-1">
            <span className={`h-2 w-2 rounded-full ${SEVERITY_DOT[risk.severity] || "bg-gray-400"}`} />
            <span className="text-xs font-semibold uppercase tracking-wide">
              {CATEGORY_LABELS[risk.category] || risk.category}
            </span>
            <span className="text-xs opacity-70 ml-auto">
              {risk.severity} severity
              {risk.page ? ` · p.${risk.page}` : ""}
            </span>
          </div>
          <p className="text-sm italic mb-1">&ldquo;{risk.clause_excerpt}&rdquo;</p>
          <p className="text-sm">{risk.explanation}</p>
        </div>
      ))}
    </div>
  );
}
