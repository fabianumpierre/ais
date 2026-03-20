"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export function ChangePasswordForm({
  mustChangePassword,
}: {
  mustChangePassword: boolean;
}) {
  const router = useRouter();
  const [form, setForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);

    if (form.newPassword !== form.confirmPassword) {
      setError("A confirmação da nova senha não confere.");
      return;
    }

    setIsSubmitting(true);

    const response = await fetch("/api/auth/change-password", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(form),
    });

    const payload = (await response.json()) as { error?: string; message?: string };
    setIsSubmitting(false);

    if (!response.ok) {
      setError(payload.error ?? "Nao foi possivel alterar a senha.");
      return;
    }

    setMessage(payload.message ?? "Senha alterada com sucesso.");
    setForm({
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    });

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <Card className="mx-auto w-full max-w-lg rounded-[32px] p-6 sm:p-8">
      <div className="mb-6">
        <p className="text-[11px] font-medium uppercase tracking-[0.24em] text-slate-500">
          Segurança da conta
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-slate-950">
          Alterar senha
        </h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          {mustChangePassword
            ? "Para continuar usando a plataforma, troque sua senha inicial agora."
            : "Atualize sua senha para manter o acesso protegido."}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="grid gap-4">
        <label className="space-y-2 text-sm text-slate-700">
          <span className="font-medium">Senha atual</span>
          <input
            type="password"
            value={form.currentPassword}
            onChange={(event) => setForm({ ...form, currentPassword: event.target.value })}
            className="w-full rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 outline-none transition focus:border-[var(--primary)]"
            autoComplete="current-password"
            required
          />
        </label>

        <label className="space-y-2 text-sm text-slate-700">
          <span className="font-medium">Nova senha</span>
          <input
            type="password"
            value={form.newPassword}
            onChange={(event) => setForm({ ...form, newPassword: event.target.value })}
            className="w-full rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 outline-none transition focus:border-[var(--primary)]"
            autoComplete="new-password"
            minLength={8}
            required
          />
        </label>

        <label className="space-y-2 text-sm text-slate-700">
          <span className="font-medium">Confirmar nova senha</span>
          <input
            type="password"
            value={form.confirmPassword}
            onChange={(event) => setForm({ ...form, confirmPassword: event.target.value })}
            className="w-full rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 outline-none transition focus:border-[var(--primary)]"
            autoComplete="new-password"
            minLength={8}
            required
          />
        </label>

        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        {message ? <p className="text-sm text-emerald-600">{message}</p> : null}

        <Button type="submit" variant="primary" className="mt-2 w-full" disabled={isSubmitting}>
          {isSubmitting ? "Salvando..." : "Salvar nova senha"}
        </Button>
      </form>
    </Card>
  );
}
