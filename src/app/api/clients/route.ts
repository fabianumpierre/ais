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
});

export async function POST(request: Request) {
  try {
    await requireAdmin();
    const body = await request.json();
    const parsed = clientSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Preencha nome e segmento." }, { status: 400 });
    }

    await prisma.client.create({
      data: {
        name: parsed.data.name,
        segment: parsed.data.segment,
        notes: parsed.data.notes || null,
        brandContext: parsed.data.brandContext || null,
        aiGuidelines: parsed.data.aiGuidelines || null,
        isActive: true,
      },
    });

    return NextResponse.json({ message: "Cliente criado com sucesso." });
  } catch (error) {
    return handleRouteError(error, "Erro interno ao salvar cliente.");
  }
}
