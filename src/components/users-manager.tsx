"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

type ClientOption = {
  id: string;
  name: string;
};

type UserItem = {
  id: string;
  name: string;
  email: string;
  role: "admin" | "editor";
  userClients: Array<{
    clientId: string;
  }>;
};

type UserFormState = {
  name: string;
  email: string;
  password: string;
  role: "admin" | "editor";
  clientIds: string[];
};

const emptyForm: UserFormState = {
  name: "",
  email: "",
  password: "",
  role: "editor",
  clientIds: [],
};

function buildUserEdits(users: UserItem[]) {
  return Object.fromEntries(
    users.map((user) => [
      user.id,
      {
        name: user.name,
        email: user.email,
        password: "",
        role: user.role,
        clientIds: user.userClients.map((item) => item.clientId),
      },
    ]),
  ) as Record<string, UserFormState>;
}

export function UsersManager({
  users,
  clients,
}: {
  users: UserItem[];
  clients: ClientOption[];
}) {
  const router = useRouter();
  const [form, setForm] = useState<UserFormState>(emptyForm);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [savingUserId, setSavingUserId] = useState<string | null>(null);
  const [edits, setEdits] = useState<Record<string, UserFormState>>(buildUserEdits(users));

  function toggleClient(clientIds: string[], clientId: string) {
    return clientIds.includes(clientId)
      ? clientIds.filter((id) => id !== clientId)
      : [...clientIds, clientId];
  }

  async function handleCreateUser(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setMessage(null);
    setError(null);

    const response = await fetch("/api/admin/users", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(form),
    });

    const payload = (await response.json()) as { error?: string; message?: string };
    setIsSubmitting(false);

    if (!response.ok) {
      setError(payload.error ?? "Nao foi possivel criar o usuario.");
      return;
    }

    setMessage(payload.message ?? "Usuário criado com sucesso.");
    setForm(emptyForm);
    router.refresh();
  }

  async function handleUpdateUser(userId: string) {
    const user = users.find((item) => item.id === userId);
    const payload =
      edits[userId] ??
      (user
        ? {
            name: user.name,
            email: user.email,
            password: "",
            role: user.role,
            clientIds: user.userClients.map((item) => item.clientId),
          }
        : undefined);

    if (!payload) {
      return;
    }

    setSavingUserId(userId);
    setMessage(null);
    setError(null);

    const response = await fetch(`/api/admin/users/${userId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const body = (await response.json()) as { error?: string; message?: string };
    setSavingUserId(null);

    if (!response.ok) {
      setError(body.error ?? "Nao foi possivel atualizar o usuario.");
      return;
    }

    setMessage(body.message ?? "Usuário atualizado com sucesso.");
    router.refresh();
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
      <Card className="rounded-[32px] p-6">
        <div className="mb-6">
          <h2 className="text-2xl font-semibold tracking-[-0.04em] text-slate-950">Novo usuário</h2>
          <p className="mt-2 text-sm text-slate-500">
            Crie acessos e defina se o usuário verá todos os clientes ou apenas os atribuídos.
          </p>
        </div>

        <form onSubmit={handleCreateUser} className="grid gap-4">
          <label className="space-y-2 text-sm text-slate-700">
            <span className="font-medium">Nome</span>
            <input
              value={form.name}
              onChange={(event) => setForm({ ...form, name: event.target.value })}
              className="w-full rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 outline-none transition focus:border-[var(--primary)]"
            />
          </label>
          <label className="space-y-2 text-sm text-slate-700">
            <span className="font-medium">E-mail</span>
            <input
              type="email"
              value={form.email}
              onChange={(event) => setForm({ ...form, email: event.target.value })}
              className="w-full rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 outline-none transition focus:border-[var(--primary)]"
            />
          </label>
          <label className="space-y-2 text-sm text-slate-700">
            <span className="font-medium">Senha inicial</span>
            <input
              type="password"
              value={form.password}
              onChange={(event) => setForm({ ...form, password: event.target.value })}
              className="w-full rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 outline-none transition focus:border-[var(--primary)]"
            />
          </label>
          <label className="space-y-2 text-sm text-slate-700">
            <span className="font-medium">Perfil</span>
            <select
              value={form.role}
              onChange={(event) =>
                setForm({
                  ...form,
                  role: event.target.value as "admin" | "editor",
                  clientIds: event.target.value === "admin" ? [] : form.clientIds,
                })
              }
              className="w-full rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 outline-none transition focus:border-[var(--primary)]"
            >
              <option value="editor">Editor</option>
              <option value="admin">Admin</option>
            </select>
          </label>

          {form.role === "editor" ? (
            <div className="space-y-3">
              <p className="text-sm font-medium text-slate-700">Clientes permitidos</p>
              <div className="grid gap-2">
                {clients.map((client) => (
                  <label
                    key={client.id}
                    className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white/70 px-4 py-3 text-sm text-slate-700"
                  >
                    <input
                      type="checkbox"
                      checked={form.clientIds.includes(client.id)}
                      onChange={() =>
                        setForm({
                          ...form,
                          clientIds: toggleClient(form.clientIds, client.id),
                        })
                      }
                    />
                    <span>{client.name}</span>
                  </label>
                ))}
              </div>
            </div>
          ) : null}

          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          {message ? <p className="text-sm text-emerald-600">{message}</p> : null}

          <Button type="submit" variant="primary" disabled={isSubmitting}>
            {isSubmitting ? "Criando..." : "Criar usuário"}
          </Button>
        </form>
      </Card>

      <div className="grid gap-4">
        {users.map((user) => {
          const draft =
            edits[user.id] ?? {
              name: user.name,
              email: user.email,
              password: "",
              role: user.role,
              clientIds: user.userClients.map((item) => item.clientId),
            };

          return (
            <Card key={user.id} className="rounded-[32px] p-6">
              <div className="grid gap-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="text-xl font-semibold text-slate-950">{user.name}</h3>
                    <p className="mt-1 text-sm text-slate-500">{user.email}</p>
                  </div>
                  <span className="rounded-full bg-[var(--primary-soft)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--primary)]">
                    {user.role}
                  </span>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <label className="space-y-2 text-sm text-slate-700">
                    <span className="font-medium">Nome</span>
                    <input
                      value={draft.name}
                      onChange={(event) =>
                        setEdits({
                          ...edits,
                          [user.id]: { ...draft, name: event.target.value },
                        })
                      }
                      className="w-full rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 outline-none transition focus:border-[var(--primary)]"
                    />
                  </label>
                  <label className="space-y-2 text-sm text-slate-700">
                    <span className="font-medium">Perfil</span>
                    <select
                      value={draft.role}
                      onChange={(event) =>
                        setEdits({
                          ...edits,
                          [user.id]: {
                            ...draft,
                            role: event.target.value as "admin" | "editor",
                            clientIds: event.target.value === "admin" ? [] : draft.clientIds,
                          },
                        })
                      }
                      className="w-full rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 outline-none transition focus:border-[var(--primary)]"
                    >
                      <option value="editor">Editor</option>
                      <option value="admin">Admin</option>
                    </select>
                  </label>
                </div>

                {draft.role === "editor" ? (
                  <div className="grid gap-2">
                    <p className="text-sm font-medium text-slate-700">Clientes permitidos</p>
                    {clients.map((client) => (
                      <label
                        key={client.id}
                        className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white/70 px-4 py-3 text-sm text-slate-700"
                      >
                        <input
                          type="checkbox"
                          checked={draft.clientIds.includes(client.id)}
                          onChange={() =>
                            setEdits({
                              ...edits,
                              [user.id]: {
                                ...draft,
                                clientIds: toggleClient(draft.clientIds, client.id),
                              },
                            })
                          }
                        />
                        <span>{client.name}</span>
                      </label>
                    ))}
                  </div>
                ) : null}

                <div className="flex justify-end">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => handleUpdateUser(user.id)}
                    disabled={savingUserId === user.id}
                  >
                    {savingUserId === user.id ? "Salvando..." : "Salvar usuário"}
                  </Button>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
