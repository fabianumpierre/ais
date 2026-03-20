"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { ConfirmModal } from "@/components/confirm-modal";
import { Button } from "@/components/ui/button";

export function DeleteAnalysisButton({
  analysisId,
}: {
  analysisId: string;
}) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  async function handleDelete() {
    setIsDeleting(true);
    setMessage(null);

    const response = await fetch(`/api/analyses/${analysisId}`, {
      method: "DELETE",
    });

    const payload = (await response.json()) as { message?: string };

    if (!response.ok) {
      setIsDeleting(false);
      setMessage(payload.message ?? "Não foi possível excluir a análise.");
      return;
    }

    setIsModalOpen(false);
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <>
      <div className="flex flex-col items-start gap-2">
        <Button
          type="button"
          onClick={() => setIsModalOpen(true)}
          disabled={isDeleting}
          variant="danger"
          size="sm"
        >
          {isDeleting ? "Excluindo..." : "Apagar análise"}
        </Button>
        {message ? <p className="text-sm text-red-600">{message}</p> : null}
      </div>

      <ConfirmModal
        open={isModalOpen}
        title="Apagar análise"
        description="Essa ação remove a análise, as métricas importadas e os posts gerados vinculados a ela. Não será possível desfazer."
        confirmLabel="Sim, apagar"
        tone="danger"
        isLoading={isDeleting}
        onCancel={() => {
          if (!isDeleting) {
            setIsModalOpen(false);
          }
        }}
        onConfirm={handleDelete}
      />
    </>
  );
}
