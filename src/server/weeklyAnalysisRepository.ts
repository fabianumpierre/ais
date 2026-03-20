import { prisma } from "@/lib/prisma";
import type { MetricsInsights } from "@/lib/metrics/metricsInsights";
import type { MetricsSummary } from "@/server/metricsAnalyzer";

export async function persistMetricsSummary(
  analysisId: string,
  metricsSummary: MetricsSummary,
) {
  await prisma.$executeRaw`
    UPDATE "WeeklyAnalysis"
    SET
      "metricsSummary" = ${JSON.stringify(metricsSummary)},
      "updatedAt" = CURRENT_TIMESTAMP
    WHERE "id" = ${analysisId}
  `;
}

export async function persistMetricsInsights(
  analysisId: string,
  metricsInsights: MetricsInsights,
) {
  await prisma.$executeRaw`
    UPDATE "WeeklyAnalysis"
    SET
      "metricsInsights" = ${JSON.stringify(metricsInsights)},
      "updatedAt" = CURRENT_TIMESTAMP
    WHERE "id" = ${analysisId}
  `;
}
