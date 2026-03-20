import { ReactNode } from "react";

import { cn } from "@/lib/cn";

type BadgeTone = "neutral" | "engagement" | "education" | "conversion" | "awareness";

const toneClasses: Record<BadgeTone, string> = {
  neutral: "border border-[var(--border)] bg-white/72 text-slate-600",
  engagement: "bg-[var(--purple-soft)] text-[var(--purple)]",
  education: "bg-[var(--blue-soft)] text-[var(--blue)]",
  conversion: "bg-[var(--green-soft)] text-[var(--green)]",
  awareness: "bg-[var(--orange-soft)] text-[var(--orange)]",
};

export function Badge({
  tone = "neutral",
  className,
  children,
}: {
  tone?: BadgeTone;
  className?: string;
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em]",
        toneClasses[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
