import { NextResponse } from "next/server";

import { assertCanAccessAnalysis } from "@/lib/auth/access";
import { requireUser } from "@/lib/auth/auth";
import { AuthError } from "@/lib/auth/session";
import { generateTopicsForAnalysis } from "@/lib/generateTopics";
import { ServiceError } from "@/lib/serviceError";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireUser();
    const { id } = await params;
    await assertCanAccessAnalysis(user, id);
    const result = await generateTopicsForAnalysis(id);

    return NextResponse.json({
      message:
        result.source === "existing"
          ? "Esta análise já possui posts gerados. Retornando os existentes."
          : result.source === "fallback_invalid_json"
            ? "A IA saiu do formato esperado. Salvamos uma versão segura de posts para não interromper o fluxo."
          : result.usedOpenAI
            ? "Posts gerados com OpenAI e salvos."
            : "OPENAI_API_KEY ausente. Posts de fallback foram salvos para o fluxo local.",
      topics: result.topics,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ message: error.message }, { status: error.status });
    }

    const status = error instanceof ServiceError ? error.status : 500;
    const message = error instanceof Error ? error.message : "Erro interno ao gerar pautas.";

    return NextResponse.json({ message }, { status });
  }
}
