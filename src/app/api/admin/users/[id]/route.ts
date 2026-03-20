import { NextResponse } from "next/server";
import { z } from "zod";

import { requireAdmin } from "@/lib/auth/auth";
import { handleRouteError } from "@/lib/auth/http";
import { prisma } from "@/lib/prisma";

const updateUserSchema = z.object({
  name: z.string().min(2),
  role: z.enum(["admin", "editor"]),
  clientIds: z.array(z.string()).default([]),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const admin = await requireAdmin();
    const { id } = await params;
    const body = await request.json();
    const parsed = updateUserSchema.parse(body);

    if (admin.id === id && parsed.role !== "admin") {
      return NextResponse.json(
        { error: "Você não pode remover seu próprio perfil de admin." },
        { status: 400 },
      );
    }

    await prisma.$transaction([
      prisma.user.update({
        where: { id },
        data: {
          name: parsed.name,
          role: parsed.role,
        },
      }),
      prisma.userClient.deleteMany({
        where: { userId: id },
      }),
      ...(parsed.role === "editor" && parsed.clientIds.length > 0
        ? [
            prisma.userClient.createMany({
              data: parsed.clientIds.map((clientId) => ({
                userId: id,
                clientId,
              })),
            }),
          ]
        : []),
    ]);

    return NextResponse.json({ message: "Usuário atualizado com sucesso." });
  } catch (error) {
    return handleRouteError(error, "Erro interno ao atualizar usuário.");
  }
}
