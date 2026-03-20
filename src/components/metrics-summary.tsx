import { Card } from "@/components/ui/card";
import { SectionHeader } from "@/components/ui/section-header";
import { formatNumber } from "@/lib/utils";
import type { MetricsSummary as MetricsSummaryData } from "@/server/metricsAnalyzer";

export function MetricsSummary({ summary }: { summary: MetricsSummaryData }) {
  const cards = [
    { label: "Posts", value: formatNumber(summary.totalPosts) },
    { label: "Reach", value: formatNumber(summary.totalReach) },
    { label: "Engajamento medio", value: formatNumber(summary.avgEngagement) },
    { label: "Melhor formato", value: summary.bestFormat ?? "-" },
    { label: "Tema mais engajador", value: summary.mostEngagingTheme ?? "-" },
  ];

  return (
    <Card className="p-6">
      <SectionHeader
        title="Resumo das métricas"
        description="Leitura compacta da semana para orientar a geração com mais contexto."
        className="mb-6"
      />
      <div className="grid gap-4 md:grid-cols-5">
        {cards.map((card) => (
          <Card key={card.label} strong hover className="rounded-[26px] p-4">
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">{card.label}</p>
            <p className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-slate-950">{card.value}</p>
          </Card>
        ))}
      </div>
      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <MetricChip label="Formato com melhor engajamento" value={summary.bestFormatByEngagement ?? "-"} />
        <MetricChip label="Tema com mais comentarios" value={summary.mostCommentedTheme ?? "-"} />
        <MetricChip label="Tema com mais salvamentos" value={summary.mostSavedTheme ?? "-"} />
      </div>
    </Card>
  );
}

function MetricChip({ label, value }: { label: string; value: string }) {
  return (
    <Card strong className="rounded-2xl px-4 py-3 text-sm text-slate-600">
      {label}: <span className="font-semibold text-slate-900">{value}</span>
    </Card>
  );
}
