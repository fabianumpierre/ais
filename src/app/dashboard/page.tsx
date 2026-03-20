import Link from "next/link";

import { AppShell } from "@/components/app-shell";
import { Card } from "@/components/ui/card";
import { SectionHeader } from "@/components/ui/section-header";
import { requirePageUser } from "@/lib/auth/auth";
import { getDashboardData } from "@/lib/data";
import { formatDate, formatNumber } from "@/lib/utils";

export default async function DashboardPage() {
  const user = await requirePageUser();
  const dashboard = await getDashboardData();

  const statCards = [
    { label: "Clientes", value: dashboard.stats.clientsCount },
    { label: "Analises", value: dashboard.stats.analysesCount },
    { label: "Pautas recentes", value: dashboard.stats.topicsCount },
  ];

  return (
    <AppShell
      title="Dashboard"
      description="Visao geral do pipeline de insights, metricas e geracao de pautas para as contas da agencia."
      actions={
        <Link
          href="/analysis/new"
          className="pill-button button-secondary px-5 py-3 text-sm font-semibold text-slate-950"
        >
          Nova analise
        </Link>
      }
    >
      <div className="grid gap-6">
        <section className="grid gap-4 md:grid-cols-3">
          {statCards.map((card) => (
            <Card key={card.label} hover className="p-6">
              <p className="text-xs font-medium uppercase tracking-[0.2em] text-slate-500">{card.label}</p>
              <p className="mt-3 text-4xl font-semibold tracking-[-0.05em] text-slate-950">{formatNumber(card.value)}</p>
            </Card>
          ))}
        </section>
        <Card className="rounded-[32px] p-6">
          <SectionHeader
            title="Análises recentes"
            description="Atividades recentes com foco em contexto, performance e geração assistida por IA."
            actions={
              user.role === "admin" ? (
                <Link href="/clients" className="text-sm font-medium text-[var(--primary)]">
                  Gerenciar clientes
                </Link>
              ) : null
            }
            className="mb-6"
          />
          <div className="grid gap-4">
            {dashboard.latestAnalyses.length === 0 ? (
              <Card strong className="rounded-3xl border border-dashed p-6 text-sm text-slate-500">
                Nenhuma análise criada ainda. Comece cadastrando clientes e abrindo a primeira semana.
              </Card>
            ) : (
              dashboard.latestAnalyses.map((analysis: (typeof dashboard.latestAnalyses)[number]) => (
                <Link
                  key={analysis.id}
                  href={`/analysis/${analysis.id}`}
                  className="glass-card-strong hover-lift rounded-3xl p-5"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">{analysis.client.name}</p>
                      <h3 className="mt-2 text-xl font-semibold tracking-[-0.03em] text-slate-950">{analysis.objective}</h3>
                      <p className="mt-2 text-sm text-slate-500">{formatDate(analysis.date)} · {analysis.metrics.length} posts importados</p>
                    </div>
                    <div className="grid gap-2 text-sm text-slate-600">
                      <span>Melhor formato: {analysis.summary.bestFormat ?? "-"}</span>
                      <span>Tema mais engajador: {analysis.summary.mostEngagingTheme ?? "-"}</span>
                      <span>Temas gerados: {analysis.generatedTopics.length}</span>
                    </div>
                  </div>
                </Link>
              ))
            )}
          </div>
        </Card>
      </div>
    </AppShell>
  );
}
