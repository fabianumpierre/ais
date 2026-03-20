import { NextResponse } from "next/server";
import { z } from "zod";

import { assertCanAccessAnalysis } from "@/lib/auth/access";
import { requireUser } from "@/lib/auth/auth";
import { AuthError } from "@/lib/auth/session";
import { generateTopicsForAnalysis } from "@/lib/generateTopics";
import { ServiceError } from "@/lib/serviceError";

const requestSchema = z.object({
  analysisId: z.string().min(1),
});

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const body = await request.json();
    const parsed = requestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ message: "Informe um ID de análise válido." }, { status: 400 });
    }

    await assertCanAccessAnalysis(user, parsed.data.analysisId);
    const result = await generateTopicsForAnalysis(parsed.data.analysisId);

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
