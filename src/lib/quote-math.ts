import type { CostBreakdown, Quote, QuoteTotals, SingaporeBenchmark } from "./types";

export const medicalKeys: (keyof CostBreakdown)[] = [
  "treatment",
  "doctorFee",
  "hospitalFee",
  "diagnostics",
  "medication",
];

export const travelKeys: (keyof CostBreakdown)[] = ["ferry", "hotel", "localTransport", "otherServices"];

export const breakdownLabels: Record<keyof CostBreakdown, string> = {
  treatment: "Treatment cost",
  doctorFee: "Doctor fee",
  hospitalFee: "Hospital fee",
  diagnostics: "Diagnostics",
  medication: "Medication",
  ferry: "Ferry",
  hotel: "Hotel",
  localTransport: "Local transport",
  otherServices: "Other services",
};

export function benchmarkTotal(b: SingaporeBenchmark) {
  return b.treatment + b.travel + b.accommodation;
}

export function computeTotals(breakdown: CostBreakdown, benchmark: SingaporeBenchmark): QuoteTotals {
  const medicalSubtotal = medicalKeys.reduce((sum, k) => sum + (breakdown[k] || 0), 0);
  const travelSubtotal = travelKeys.reduce((sum, k) => sum + (breakdown[k] || 0), 0);
  const packageTotal = medicalSubtotal + travelSubtotal;
  const bench = benchmarkTotal(benchmark);
  const savings = bench - packageTotal;
  return {
    medicalSubtotal,
    travelSubtotal,
    packageTotal,
    benchmarkTotal: bench,
    savings,
    savingsPct: bench > 0 ? (savings / bench) * 100 : 0,
  };
}

export const quoteTotals = (quote: Quote) => computeTotals(quote.breakdown, quote.singaporeBenchmark);
