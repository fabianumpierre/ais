"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";

export function UserMenu({
  name,
  role,
}: {
  name: string;
  role: "admin" | "editor";
}) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleLogout() {
    setIsSubmitting(true);
    await fetch("/api/auth/logout", {
      method: "POST",
    });
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="rounded-full border border-[var(--border)] bg-white/70 px-4 py-2 text-sm text-slate-700">
        <span className="font-semibold text-[var(--text)]">{name}</span>
        <span className="mx-2 text-slate-400">·</span>
        <span className="uppercase tracking-[0.14em] text-[var(--text-muted)]">{role}</span>
      </div>
      <Link
        href="/change-password"
        className="pill-button inline-flex items-center justify-center gap-2 border border-[var(--border)] bg-white/55 px-4 py-2 text-sm font-semibold text-[var(--text)] hover:bg-white/75"
      >
        Alterar senha
      </Link>
      <Button type="button" variant="ghost" size="sm" onClick={handleLogout} disabled={isSubmitting}>
        {isSubmitting ? "Saindo..." : "Sair"}
      </Button>
    </div>
  );
}
