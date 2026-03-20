import { NextResponse } from "next/server";
import { z } from "zod";

import { assertCanAccessClient } from "@/lib/auth/access";
import { requireUser } from "@/lib/auth/auth";
import { handleRouteError } from "@/lib/auth/http";
import { prisma } from "@/lib/prisma";

const analysisSchema = z.object({
  clientId: z.string().min(1),
  date: z.string().min(1),
  insights: z.string().min(10),
  objective: z.string().min(3),
});

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const body = await request.json();
    const parsed = analysisSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Preencha cliente, data, objetivo e insights." }, { status: 400 });
    }

    await assertCanAccessClient(user, parsed.data.clientId);

    const analysis = await prisma.weeklyAnalysis.create({
      data: {
        clientId: parsed.data.clientId,
        date: new Date(parsed.data.date),
        insights: parsed.data.insights,
        objective: parsed.data.objective,
      },
    });

    return NextResponse.json({ id: analysis.id });
  } catch (error) {
    return handleRouteError(error, "Erro interno ao criar analise.");
  }
}
