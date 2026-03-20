"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type ClientItem = {
  id: string;
  name: string;
  segment: string;
  notes: string | null;
  brandContext: string | null;
  aiGuidelines: string | null;
  isActive: boolean;
  _count: {
    weeklyAnalyses: number;
  };
};

export function ClientsManager({ clients }: { clients: ClientItem[] }) {
  const router = useRouter();
  const [form, setForm] = useState({
    name: "",
    segment: "",
    notes: "",
    brandContext: "",
    aiGuidelines: "",
  });
  const [editingClientId, setEditingClientId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    name: "",
    segment: "",
    notes: "",
    brandContext: "",
    aiGuidelines: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [editMessage, setEditMessage] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setMessage(null);

    const response = await fetch("/api/clients", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(form),
    });

    const payload = (await response.json()) as { message?: string; error?: string };
    setIsSubmitting(false);

    if (!response.ok) {
      setMessage(payload.error ?? "Não foi possível cadastrar o cliente.");
      return;
    }

    setForm({
      name: "",
      segment: "",
      notes: "",
      brandContext: "",
      aiGuidelines: "",
    });
    setMessage(payload.message ?? "Cliente criado.");
    router.refresh();
  }

  function startEditing(client: ClientItem) {
    setEditingClientId(client.id);
    setEditForm({
      name: client.name,
      segment: client.segment,
      notes: client.notes ?? "",
      brandContext: client.brandContext ?? "",
      aiGuidelines: client.aiGuidelines ?? "",
    });
    setEditMessage(null);
  }

  async function toggleArchive(client: ClientItem) {
    setIsUpdating(true);
    setMessage(null);
    setEditMessage(null);

    const response = await fetch(`/api/clients/${client.id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: client.name,
        segment: client.segment,
        notes: client.notes ?? "",
        brandContext: client.brandContext ?? "",
        aiGuidelines: client.aiGuidelines ?? "",
        isActive: !client.isActive,
      }),
    });

    const payload = (await response.json()) as { message?: string; error?: string };
    setIsUpdating(false);

    if (!response.ok) {
      setMessage(payload.error ?? "Não foi possível atualizar o status do cliente.");
      return;
    }

    setMessage(
      client.isActive ? "Cliente arquivado com sucesso." : "Cliente reativado com sucesso.",
    );
    router.refresh();
  }

  function cancelEditing() {
    setEditingClientId(null);
    setEditMessage(null);
  }

  async function handleEditSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!editingClientId) {
      return;
    }

    setIsUpdating(true);
    setEditMessage(null);

    const response = await fetch(`/api/clients/${editingClientId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(editForm),
    });

    const payload = (await response.json()) as { message?: string; error?: string };

    setIsUpdating(false);

    if (!response.ok) {
      setEditMessage(payload.error ?? "Não foi possível atualizar o cliente.");
      return;
    }

    setEditMessage(payload.message ?? "Cliente atualizado.");
    setEditingClientId(null);
    router.refresh();
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
      <section className="glass-card rounded-[32px] p-6">
        <div className="mb-6">
          <h2 className="text-2xl font-semibold tracking-[-0.04em] text-slate-950">Clientes cadastrados</h2>
          <p className="mt-1 text-sm text-slate-500">Base inicial para criar análises semanais por conta.</p>
        </div>
        <div className="grid gap-4">
          {clients.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-500">
              Nenhum cliente ainda. Cadastre o primeiro ao lado.
            </div>
          ) : (
            clients.map((client) => (
              <article
                key={client.id}
                className={`hover-lift rounded-3xl border p-5 transition ${
                  client.isActive
                    ? "glass-card-strong"
                    : "border-amber-200/70 bg-amber-50/70 shadow-[0_20px_60px_rgba(120,53,15,0.06)] backdrop-blur"
                }`}
              >
                {editingClientId === client.id ? (
                  <form onSubmit={handleEditSubmit} className="grid gap-4">
                    <div className="flex items-center justify-between gap-4">
                      <h3 className="text-lg font-semibold text-slate-950">Editar cliente</h3>
                      <div className="flex items-center gap-2">
                        <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-600">
                          {client._count.weeklyAnalyses} análises
                        </span>
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${
                            client.isActive
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-amber-100 text-amber-700"
                          }`}
                        >
                          {client.isActive ? "ativo" : "inativo"}
                        </span>
                      </div>
                    </div>
                    <label className="space-y-2 text-sm text-slate-700">
                      <span className="font-medium">Nome</span>
                      <input
                        value={editForm.name}
                        onChange={(event) => setEditForm({ ...editForm, name: event.target.value })}
                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-sky-500"
                      />
                    </label>
                    <label className="space-y-2 text-sm text-slate-700">
                      <span className="font-medium">Segmento</span>
                      <input
                        value={editForm.segment}
                        onChange={(event) => setEditForm({ ...editForm, segment: event.target.value })}
                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-sky-500"
                      />
                    </label>
                    <label className="space-y-2 text-sm text-slate-700">
                      <span className="font-medium">Notas</span>
                      <textarea
                        value={editForm.notes}
                        onChange={(event) => setEditForm({ ...editForm, notes: event.target.value })}
                        rows={4}
                        className="w-full rounded-3xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-sky-500"
                      />
                    </label>
                    <label className="space-y-2 text-sm text-slate-700">
                      <span className="font-medium">Contexto da marca</span>
                      <textarea
                        value={editForm.brandContext}
                        onChange={(event) => setEditForm({ ...editForm, brandContext: event.target.value })}
                        rows={4}
                        placeholder="Ex.: tom acolhedor, público classe A/B, marca sofisticada e calorosa."
                        className="w-full rounded-3xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-sky-500"
                      />
                    </label>
                    <label className="space-y-2 text-sm text-slate-700">
                      <span className="font-medium">Diretrizes para IA</span>
                      <textarea
                        value={editForm.aiGuidelines}
                        onChange={(event) => setEditForm({ ...editForm, aiGuidelines: event.target.value })}
                        rows={4}
                        placeholder="Ex.: evitar promessas fortes, priorizar valor percebido e linguagem clara."
                        className="w-full rounded-3xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-sky-500"
                      />
                    </label>
                    <div className="flex flex-wrap gap-3">
                      <button
                        type="submit"
                        disabled={isUpdating}
                        className="rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
                      >
                        {isUpdating ? "Salvando..." : "Salvar alterações"}
                      </button>
                      <button
                        type="button"
                        onClick={cancelEditing}
                        className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
                      >
                        Cancelar
                      </button>
                    </div>
                    {editMessage ? <p className="text-sm text-slate-600">{editMessage}</p> : null}
                  </form>
                ) : (
                  <>
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <h3 className="text-lg font-semibold text-slate-950">{client.name}</h3>
                        <p className="text-sm text-slate-500">{client.segment}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-600">
                          {client._count.weeklyAnalyses} análises
                        </span>
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${
                            client.isActive
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-amber-100 text-amber-700"
                          }`}
                        >
                          {client.isActive ? "ativo" : "inativo"}
                        </span>
                      </div>
                    </div>
                    <p className="mt-3 text-sm leading-6 text-slate-600">{client.notes || "Sem notas adicionais."}</p>
                    {client.brandContext ? (
                      <p className="mt-3 text-sm leading-6 text-slate-600">
                        <span className="font-semibold text-slate-900">Contexto da marca:</span> {client.brandContext}
                      </p>
                    ) : null}
                    {client.aiGuidelines ? (
                      <p className="mt-3 text-sm leading-6 text-slate-600">
                        <span className="font-semibold text-slate-900">Diretrizes para IA:</span> {client.aiGuidelines}
                      </p>
                    ) : null}
                    <div className="mt-4 flex flex-wrap gap-3">
                      <button
                        type="button"
                        onClick={() => startEditing(client)}
                        className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        onClick={() => toggleArchive(client)}
                        disabled={isUpdating}
                        className={`rounded-full px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${
                          client.isActive
                            ? "border border-amber-200 bg-white text-amber-700 hover:bg-amber-50"
                            : "border border-emerald-200 bg-white text-emerald-700 hover:bg-emerald-50"
                        }`}
                      >
                        {client.isActive ? "Arquivar" : "Reativar"}
                      </button>
                    </div>
                  </>
                )}
              </article>
            ))
          )}
        </div>
      </section>
      <section className="glass-card rounded-[32px] p-6">
        <div className="mb-6">
          <h2 className="text-2xl font-semibold tracking-[-0.04em] text-slate-950">Novo cliente</h2>
          <p className="mt-1 text-sm text-slate-500">Cadastro simples para destravar o MVP.</p>
        </div>
        <form onSubmit={handleSubmit} className="grid gap-4">
          <label className="space-y-2 text-sm text-slate-700">
            <span className="font-medium">Nome</span>
            <input
              value={form.name}
              onChange={(event) => setForm({ ...form, name: event.target.value })}
              className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-sky-500"
            />
          </label>
          <label className="space-y-2 text-sm text-slate-700">
            <span className="font-medium">Segmento</span>
            <input
              value={form.segment}
              onChange={(event) => setForm({ ...form, segment: event.target.value })}
              className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-sky-500"
            />
          </label>
          <label className="space-y-2 text-sm text-slate-700">
            <span className="font-medium">Notas</span>
            <textarea
              value={form.notes}
              onChange={(event) => setForm({ ...form, notes: event.target.value })}
              rows={5}
              className="w-full rounded-3xl border border-slate-200 px-4 py-3 outline-none transition focus:border-sky-500"
            />
          </label>
          <label className="space-y-2 text-sm text-slate-700">
            <span className="font-medium">Contexto da marca</span>
            <textarea
              value={form.brandContext}
              onChange={(event) => setForm({ ...form, brandContext: event.target.value })}
              rows={4}
              placeholder="Ex.: tom de voz leve e premium, público 25-45, marca próxima e confiável."
              className="w-full rounded-3xl border border-slate-200 px-4 py-3 outline-none transition focus:border-sky-500"
            />
          </label>
          <label className="space-y-2 text-sm text-slate-700">
            <span className="font-medium">Diretrizes para IA</span>
            <textarea
              value={form.aiGuidelines}
              onChange={(event) => setForm({ ...form, aiGuidelines: event.target.value })}
              rows={4}
              placeholder="Ex.: evitar descontos agressivos, não usar gírias, reforçar autoridade e clareza."
              className="w-full rounded-3xl border border-slate-200 px-4 py-3 outline-none transition focus:border-sky-500"
            />
          </label>
          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
          >
            {isSubmitting ? "Salvando..." : "Salvar cliente"}
          </button>
          {message ? <p className="text-sm text-slate-600">{message}</p> : null}
        </form>
      </section>
    </div>
  );
}
