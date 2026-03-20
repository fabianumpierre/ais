import { NextResponse } from "next/server";
import { z } from "zod";

import { requireAdmin } from "@/lib/auth/auth";
import { handleRouteError } from "@/lib/auth/http";
import { prisma } from "@/lib/prisma";

const clientSchema = z.object({
  name: z.string().min(2),
  segment: z.string().min(2),
  notes: z.string().optional().nullable(),
  brandContext: z.string().optional().nullable(),
  aiGuidelines: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdmin();
    const { id } = await params;
    const body = await request.json();
    const parsed = clientSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Preencha nome e segmento." }, { status: 400 });
    }

    await prisma.client.update({
      where: { id },
      data: {
        name: parsed.data.name,
        segment: parsed.data.segment,
        notes: parsed.data.notes || null,
        brandContext: parsed.data.brandContext || null,
        aiGuidelines: parsed.data.aiGuidelines || null,
        ...(typeof parsed.data.isActive === "boolean" ? { isActive: parsed.data.isActive } : {}),
      },
    });

    return NextResponse.json({ message: "Cliente atualizado com sucesso." });
  } catch (error) {
    if (error instanceof Error && error.message.includes("Record to update not found")) {
      return NextResponse.json({ error: "Cliente nao encontrado." }, { status: 404 });
    }

    return handleRouteError(error, "Erro interno ao atualizar cliente.");
  }
}
