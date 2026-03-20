"use client";

import { Button } from "@/components/ui/button";

type ConfirmModalProps = {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel?: string;
  tone?: "default" | "danger";
  isLoading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export function ConfirmModal({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel = "Cancelar",
  tone = "default",
  isLoading = false,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/22 px-6 backdrop-blur-sm">
      <div className="glass-card-strong w-full max-w-lg rounded-[32px] p-6 shadow-[0_28px_90px_rgba(15,23,42,0.18)]">
        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Confirmar ação</p>
        <h3 className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-slate-950">{title}</h3>
        <p className="mt-3 text-sm leading-7 text-slate-600">{description}</p>

        <div className="mt-6 flex flex-wrap justify-end gap-3">
          <Button type="button" onClick={onCancel} variant="secondary" size="sm">
            {cancelLabel}
          </Button>
          <Button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            variant={tone === "danger" ? "danger" : "primary"}
            size="sm"
            className={tone === "danger" ? "disabled:bg-red-300" : "disabled:bg-slate-400 disabled:shadow-none"}
          >
            {isLoading ? "Confirmando..." : confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
