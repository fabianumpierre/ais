import Link from "next/link";
import { ReactNode } from "react";

import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { UserMenu } from "@/components/user-menu";
import { getCurrentUser } from "@/lib/auth/auth";

const navItems = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/clients", label: "Clientes" },
  { href: "/analysis/new", label: "Nova analise" },
];

export async function AppShell({
  title,
  description,
  actions,
  children,
}: {
  title: string;
  description: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  const user = await getCurrentUser();
  const items =
    user?.role === "admin"
      ? [...navItems, { href: "/admin/users", label: "Usuarios" }]
      : navItems.filter((item) => item.href !== "/clients");

  return (
    <div className="app-background min-h-screen">
      <div className="mx-auto max-w-7xl px-6 py-8">
        <header className="glass-card mb-8 rounded-[36px] p-7 text-slate-900">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-4">
              <div>
                <Logo />
                <h1 className="mt-3 text-4xl font-semibold tracking-[-0.04em] text-slate-950">{title}</h1>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">{description}</p>
              </div>
              <nav className="flex flex-wrap gap-3">
                {items.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="pill-button button-secondary px-4 py-2 text-sm font-medium text-[var(--text)] hover:border-[color:rgba(79,70,229,0.28)] hover:text-[var(--text)]"
                  >
                    {item.label}
                  </Link>
                ))}
              </nav>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              {user ? <UserMenu name={user.name} role={user.role} /> : null}
              <ThemeToggle />
              {actions}
            </div>
          </div>
        </header>
        {children}
      </div>
    </div>
  );
}
