import { redirect } from "next/navigation";

import { LoginForm } from "@/components/login-form";
import { Logo } from "@/components/logo";
import { getCurrentUser } from "@/lib/auth/auth";

export default async function LoginPage() {
  const user = await getCurrentUser();

  if (user) {
    redirect(user.mustChangePassword ? "/change-password" : "/dashboard");
  }

  return (
    <main className="app-background min-h-screen px-6 py-16">
      <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
        <section className="glass-card rounded-[40px] p-8 text-slate-900 sm:p-10">
          <Logo />
          <h1 className="mt-6 max-w-3xl text-5xl font-semibold tracking-[-0.05em] text-slate-950">
            Aldeia Insight Scheduler
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600">
            Plataforma interna da agência para organizar clientes, análises semanais, métricas e geração de posts com IA.
          </p>
          <div className="mt-8 rounded-3xl border border-white/70 bg-white/60 p-5 text-sm leading-7 text-slate-600">
            <p className="font-semibold text-slate-950">Admin padrão</p>
            <p>E-mail: fabian@aldeia.biz</p>
            <p>Senha inicial: Aldeia123!</p>
          </div>
        </section>
        <LoginForm />
      </div>
    </main>
  );
}
