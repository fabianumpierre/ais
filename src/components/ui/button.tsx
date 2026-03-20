import { ButtonHTMLAttributes } from "react";

import { cn } from "@/lib/cn";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type ButtonSize = "sm" | "md" | "lg";

const variantClasses: Record<ButtonVariant, string> = {
  primary: "button-primary text-white",
  secondary: "button-secondary text-[var(--text)]",
  ghost: "border border-[var(--border)] bg-white/55 text-[var(--text)] hover:bg-white/75",
  danger: "border border-red-200 bg-red-50/90 text-red-700 shadow-[0_10px_24px_rgba(127,29,29,0.08)] hover:bg-red-100",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "px-4 py-2 text-sm",
  md: "px-5 py-3 text-sm",
  lg: "px-6 py-3.5 text-base",
};

export function Button({
  className,
  variant = "secondary",
  size = "md",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
}) {
  return (
    <button
      className={cn(
        "pill-button inline-flex items-center justify-center gap-2 font-semibold disabled:cursor-not-allowed disabled:opacity-60",
        variantClasses[variant],
        sizeClasses[size],
        className,
      )}
      {...props}
    />
  );
}
