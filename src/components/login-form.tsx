"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export function LoginForm() {
  const router = useRouter();
  const [form, setForm] = useState({
    email: "",
    password: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);

    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(form),
    });

    const payload = (await response.json()) as { error?: string };
    setIsSubmitting(false);

    if (!response.ok) {
      setError(payload.error ?? "Nao foi possivel entrar.");
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <Card className="mx-auto w-full max-w-md rounded-[32px] p-6 sm:p-8">
      <div className="mb-6">
        <p className="text-[11px] font-medium uppercase tracking-[0.24em] text-slate-500">
          Acesso seguro
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-slate-950">
          Entrar na plataforma
        </h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          Use seu e-mail corporativo para acessar clientes, análises e geração assistida por IA.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="grid gap-4">
        <label className="space-y-2 text-sm text-slate-700">
          <span className="font-medium">E-mail</span>
          <input
            type="email"
            value={form.email}
            onChange={(event) => setForm({ ...form, email: event.target.value })}
            className="w-full rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 outline-none transition focus:border-[var(--primary)]"
            placeholder="voce@aldeia.biz"
            autoComplete="email"
            required
          />
        </label>

        <label className="space-y-2 text-sm text-slate-700">
          <span className="font-medium">Senha</span>
          <input
            type="password"
            value={form.password}
            onChange={(event) => setForm({ ...form, password: event.target.value })}
            className="w-full rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 outline-none transition focus:border-[var(--primary)]"
            placeholder="Digite sua senha"
            autoComplete="current-password"
            required
          />
        </label>

        {error ? <p className="text-sm text-red-600">{error}</p> : null}

        <Button type="submit" variant="primary" className="mt-2 w-full" disabled={isSubmitting}>
          {isSubmitting ? "Entrando..." : "Entrar"}
        </Button>
      </form>
    </Card>
  );
}
