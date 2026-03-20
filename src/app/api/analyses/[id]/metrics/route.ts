import { NextResponse } from "next/server";

import { assertCanAccessAnalysis } from "@/lib/auth/access";
import { requireUser } from "@/lib/auth/auth";
import { handleRouteError } from "@/lib/auth/http";
import {
  CsvMappingRequiredError,
  parseMetricsCSV,
} from "@/lib/csv/parseMetricsCSV";
import { generateMetricsInsights } from "@/lib/metrics/metricsInsights";
import { prisma } from "@/lib/prisma";
import { analyzeMetrics } from "@/server/metricsAnalyzer";
import {
  persistMetricsInsights,
  persistMetricsSummary,
} from "@/server/weeklyAnalysisRepository";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireUser();
    const { id } = await params;
    await assertCanAccessAnalysis(user, id);
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ message: "Envie um arquivo CSV." }, { status: 400 });
    }

    const text = await file.text();
    const manualMappingValue = formData.get("mapping");
    const manualMapping =
      typeof manualMappingValue === "string" && manualMappingValue.length > 0
        ? (JSON.parse(manualMappingValue) as Record<string, string>)
        : undefined;
    const parsedCsv = parseMetricsCSV(text, {
      manualMapping,
    });
    const metricsSummary = analyzeMetrics(parsedCsv.rows);
    const metricsInsights = generateMetricsInsights(parsedCsv.rows);

    await prisma.$transaction([
      prisma.postMetrics.deleteMany({
        where: { analysisId: id },
      }),
      prisma.postMetrics.createMany({
        data: parsedCsv.rows.map((row) => ({
          analysisId: id,
          date: row.date,
          format: row.format,
          theme: row.theme,
          reach: row.reach,
          likes: row.likes,
          comments: row.comments,
          saves: row.saves,
          shares: row.shares,
        })),
      }),
    ]);

    await persistMetricsSummary(id, metricsSummary);
    await persistMetricsInsights(id, metricsInsights);

    return NextResponse.json({
      message: `${parsedCsv.rows.length} linhas importadas com sucesso.`,
      mapping: parsedCsv.mapping,
      warnings: parsedCsv.warnings,
    });
  } catch (error) {
    if (error instanceof CsvMappingRequiredError) {
      return NextResponse.json(
        {
          code: error.code,
          message: error.message,
          ...error.details,
        },
        { status: 400 },
      );
    }

    return handleRouteError(error, "Falha ao processar o CSV.");
  }
}
