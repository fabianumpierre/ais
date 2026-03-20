"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SectionHeader } from "@/components/ui/section-header";

export function GenerateTopicsButton({
  analysisId,
  hasMetrics,
  onGenerated,
}: {
  analysisId: string;
  hasMetrics?: boolean;
  onGenerated: () => void;
}) {
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleClick() {
    setIsLoading(true);
    setMessage(null);

    const response = await fetch("/api/generate-topics", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        analysisId,
      }),
    });

    const payload = (await response.json()) as { message?: string };

    setIsLoading(false);
    setMessage(payload.message ?? (response.ok ? "Posts gerados." : "Falha ao gerar posts."));

    if (response.ok) {
      onGenerated();
    }
  }

  return (
    <Card className="p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <SectionHeader
            title="Gerador de posts"
            description="Envia o contexto estratégico para a IA e salva os posts completos no banco."
          />
          <p className="mt-2 text-xs text-slate-400">
            {hasMetrics
              ? "Com CSV importado, a IA também considera o histórico de performance."
              : "Sem CSV, a IA usa os insights da semana e as informações do cliente para montar os posts."}
          </p>
        </div>
        <Button
          type="button"
          onClick={handleClick}
          disabled={isLoading}
          variant="primary"
          className="min-w-[190px] disabled:bg-slate-400 disabled:shadow-none"
        >
          {isLoading ? (
            <>
              <span className="size-4 animate-spin rounded-full border-2 border-white/35 border-t-white" />
              Gerando...
            </>
          ) : (
            "Gerar posts com IA"
          )}
        </Button>
      </div>
      {message ? <p className="mt-4 text-sm text-slate-700">{message}</p> : null}
    </Card>
  );
}
