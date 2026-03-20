import { Card } from "@/components/ui/card";
import { SectionHeader } from "@/components/ui/section-header";
import type { MetricsInsights as MetricsInsightsData } from "@/lib/metrics/metricsInsights";

export function MetricsInsights({ insights }: { insights: MetricsInsightsData }) {
  if (insights.insights.length === 0) {
    return null;
  }

  return (
    <Card className="p-6">
      <SectionHeader
        title="Insights de métricas"
        description="Leitura automatizada do desempenho recente para afinar a próxima rodada de posts."
        className="mb-5"
      />
      <ul className="grid gap-3">
        {insights.insights.map((insight) => (
          <Card key={insight} strong hover className="rounded-2xl px-4 py-3 text-sm leading-6 text-slate-700">
            • {insight}
          </Card>
        ))}
      </ul>
    </Card>
  );
}
