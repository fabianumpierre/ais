import Link from "next/link";

import { AnalysisBuilder } from "@/components/analysis-builder";
import { AppShell } from "@/components/app-shell";
import { requirePageUser } from "@/lib/auth/auth";
import { getClients } from "@/lib/data";

export default async function NewAnalysisPage() {
  const user = await requirePageUser();
  const clients = await getClients();

  return (
    <AppShell
      title="Nova analise semanal"
      description="Selecione o cliente, registre o contexto da semana e crie a analise base para receber o CSV e gerar pautas."
      actions={
        user.role === "admin" ? (
          <Link
            href="/clients"
            className="pill-button rounded-full border border-white/70 bg-white/70 px-5 py-3 text-sm font-semibold text-slate-800 shadow-[0_12px_28px_rgba(15,23,42,0.08)] hover:bg-white"
          >
            Criar cliente primeiro
          </Link>
        ) : null
      }
    >
      {clients.length === 0 ? (
        <section className="rounded-[32px] border border-slate-200 bg-white p-8 shadow-sm">
          <h2 className="text-2xl font-semibold text-slate-950">Cadastre ao menos um cliente</h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
            O fluxo da analise depende do cliente para contextualizar insights, metricas e geracao de pautas.
          </p>
          {user.role === "admin" ? (
            <Link
              href="/clients"
              className="mt-6 inline-flex rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              Ir para clientes
            </Link>
          ) : null}
        </section>
      ) : (
        <AnalysisBuilder
          clients={clients.map((client: { id: string; name: string; segment: string }) => ({
            id: client.id,
            name: client.name,
            segment: client.segment,
          }))}
        />
      )}
    </AppShell>
  );
}
