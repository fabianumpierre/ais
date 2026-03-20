import { NextResponse } from "next/server";
import { z } from "zod";

import { requireUser } from "@/lib/auth/auth";
import { handleRouteError } from "@/lib/auth/http";
import { AuthError } from "@/lib/auth/session";
import { regenerateTopicById } from "@/lib/generateTopics";
import { prisma } from "@/lib/prisma";
import { ServiceError } from "@/lib/serviceError";

const updateTopicSchema = z.object({
  title: z.string().min(3, "O título precisa ter pelo menos 3 caracteres."),
  caption: z.string().min(20, "A legenda precisa ter pelo menos 20 caracteres.").max(1200),
  headline: z.string().min(3, "A headline precisa ter pelo menos 3 caracteres.").max(60),
  subheadline: z.string().max(90).optional().nullable(),
  visualScript: z
    .array(z.string().min(5, "Cada passo do roteiro visual precisa ter pelo menos 5 caracteres."))
    .min(1, "Informe pelo menos 1 passo no roteiro visual.")
    .max(8, "O roteiro visual pode ter no máximo 8 passos."),
  visualIdea: z.string().min(10, "A ideia visual precisa ter pelo menos 10 caracteres."),
  cta: z.string().min(3, "O CTA precisa ter pelo menos 3 caracteres."),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const body = await request.json();
    const parsed = updateTopicSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { message: parsed.error.issues[0]?.message ?? "Dados inválidos para atualizar o post." },
        { status: 400 },
      );
    }

    const topic = await prisma.generatedTopic.findUnique({
      where: { id },
    });

    if (!topic) {
      return NextResponse.json({ message: "Post gerado não encontrado." }, { status: 404 });
    }

    if (user.role !== "admin") {
      const analysis = await prisma.weeklyAnalysis.findUnique({
        where: { id: topic.analysisId },
        select: { clientId: true },
      });

      if (!analysis || !user.clientIds.includes(analysis.clientId)) {
        throw new AuthError("Voce nao tem acesso a este post.", 403);
      }
    }

    const updated = await prisma.generatedTopic.update({
      where: { id },
      data: {
        ...parsed.data,
        subheadline: parsed.data.subheadline?.trim() ? parsed.data.subheadline.trim() : null,
      },
    });

    return NextResponse.json({
      message: "Post atualizado com sucesso.",
      topic: updated,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ message: error.message }, { status: error.status });
    }

    return handleRouteError(error, "Erro interno ao atualizar o post.");
  }
}

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const topic = await prisma.generatedTopic.findUnique({
      where: { id },
      select: { analysisId: true },
    });

    if (!topic) {
      return NextResponse.json({ message: "Post gerado não encontrado." }, { status: 404 });
    }

    if (user.role !== "admin") {
      const analysis = await prisma.weeklyAnalysis.findUnique({
        where: { id: topic.analysisId },
        select: { clientId: true },
      });

      if (!analysis || !user.clientIds.includes(analysis.clientId)) {
        throw new AuthError("Voce nao tem acesso a este post.", 403);
      }
    }

    const result = await regenerateTopicById(id);

    return NextResponse.json({
      message:
        result.source === "fallback"
          ? "OPENAI_API_KEY ausente. Geramos uma nova versão local para este post."
          : result.source === "fallback_invalid_json"
            ? "A IA saiu do formato esperado. Salvamos uma nova versão segura para este post."
            : "Post regenerado com sucesso.",
      topic: result.topic,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ message: error.message }, { status: error.status });
    }

    const status = error instanceof ServiceError ? error.status : 500;
    const message = error instanceof Error ? error.message : "Erro interno ao regenerar o post.";

    return NextResponse.json({ message }, { status });
  }
}
