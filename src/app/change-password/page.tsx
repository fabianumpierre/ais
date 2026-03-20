import { redirect } from "next/navigation";

import { ChangePasswordForm } from "@/components/change-password-form";
import { Logo } from "@/components/logo";
import { getCurrentUser } from "@/lib/auth/auth";

export default async function ChangePasswordPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <main className="app-background min-h-screen px-6 py-16">
      <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
        <section className="glass-card rounded-[40px] p-8 text-slate-900 sm:p-10">
          <Logo />
          <h1 className="mt-6 max-w-3xl text-5xl font-semibold tracking-[-0.05em] text-slate-950">
            Proteja seu acesso
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600">
            A Aldeia Insight Scheduler agora exige uma senha pessoal antes de liberar o uso do dashboard, dos clientes e das análises.
          </p>
        </section>
        <ChangePasswordForm mustChangePassword={user.mustChangePassword} />
      </div>
    </main>
  );
}
