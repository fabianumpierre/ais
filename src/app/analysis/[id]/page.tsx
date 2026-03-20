import { notFound } from "next/navigation";

import { AnalysisWorkspace } from "@/components/analysis-workspace";
import { AppShell } from "@/components/app-shell";
import { DeleteAnalysisButton } from "@/components/delete-analysis-button";
import { MetricsInsights } from "@/components/MetricsInsights";
import { MetricsSummary } from "@/components/metrics-summary";
import { TopicsList } from "@/components/topics-list";
import { requirePageUser } from "@/lib/auth/auth";
import { getAnalysisById } from "@/lib/data";
import { formatDate } from "@/lib/utils";

export default async function AnalysisDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requirePageUser();
  const { id } = await params;
  const analysis = await getAnalysisById(id);

  if (!analysis) {
    notFound();
  }

  return (
    <AppShell
      title={analysis.client.name}
      description={`${analysis.objective} · Analise de ${formatDate(analysis.date)}`}
      actions={<DeleteAnalysisButton analysisId={analysis.id} />}
    >
      <div className="grid gap-6">
        <section className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="glass-card rounded-[32px] p-6">
            <p className="text-[11px] font-medium uppercase tracking-[0.24em] text-slate-500">Cliente</p>
            <h2 className="mt-4 text-3xl font-semibold tracking-[-0.04em] text-slate-950">{analysis.client.name}</h2>
            <p className="mt-2 text-sm text-slate-500">{analysis.client.segment}</p>
            <p className="mt-5 text-sm leading-7 text-slate-600">{analysis.client.notes || "Sem notas adicionais."}</p>
          </div>
          <div className="glass-card rounded-[32px] p-6">
            <p className="text-[11px] font-medium uppercase tracking-[0.24em] text-slate-500">Objetivos desta pauta</p>
            <p className="mt-4 whitespace-pre-line text-sm leading-7 text-slate-700">{analysis.insights}</p>
          </div>
        </section>
        <section className="grid gap-6">
          <AnalysisWorkspace analysisId={analysis.id} hasMetrics={analysis.metrics.length > 0} />
          <MetricsSummary summary={analysis.summary} />
          <MetricsInsights insights={analysis.metricsInsights} />
          <TopicsList topics={analysis.generatedTopics} />
        </section>
      </div>
    </AppShell>
  );
}
