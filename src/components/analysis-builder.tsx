"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { ClientSelector } from "@/components/client-selector";
import { InsightsForm } from "@/components/insights-form";

type ClientItem = {
  id: string;
  name: string;
  segment: string;
};

export function AnalysisBuilder({ clients }: { clients: ClientItem[] }) {
  const router = useRouter();
  const [clientId, setClientId] = useState("");
  const [form, setForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    objective: "",
    insights: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);

    const response = await fetch("/api/analyses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        clientId,
        ...form,
      }),
    });

    const payload = (await response.json()) as { id?: string; error?: string };
    setIsSubmitting(false);

    if (!response.ok || !payload.id) {
      setError(payload.error ?? "Nao foi possivel criar a analise.");
      return;
    }

    router.push(`/analysis/${payload.id}`);
  }

  return (
    <form onSubmit={handleSubmit} className="glass-card grid gap-6 rounded-[32px] p-6">
      <ClientSelector clients={clients} value={clientId} onChange={setClientId} />
      <InsightsForm value={form} onChange={setForm} />
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm leading-6 text-slate-500">
          Depois de criar a análise, você poderá subir o CSV e gerar os posts com contexto completo.
        </p>
        <button
          type="submit"
          disabled={isSubmitting}
          className="pill-button rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white shadow-[0_16px_34px_rgba(15,23,42,0.16)] hover:bg-slate-900 disabled:cursor-not-allowed disabled:bg-slate-400 disabled:shadow-none"
        >
          {isSubmitting ? "Criando..." : "Criar analise"}
        </button>
      </div>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
    </form>
  );
}
