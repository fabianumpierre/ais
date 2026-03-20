import { NextResponse } from "next/server";
import { z } from "zod";

import { requireAdmin } from "@/lib/auth/auth";
import { handleRouteError } from "@/lib/auth/http";
import { hashPassword } from "@/lib/auth/password";
import { prisma } from "@/lib/prisma";

const createUserSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
  role: z.enum(["admin", "editor"]),
  clientIds: z.array(z.string()).default([]),
});

export async function POST(request: Request) {
  try {
    await requireAdmin();

    const body = await request.json();
    const parsed = createUserSchema.parse(body);
    const passwordHash = await hashPassword(parsed.password);

    await prisma.user.create({
      data: {
        name: parsed.name,
        email: parsed.email.toLowerCase(),
        passwordHash,
        role: parsed.role,
        mustChangePassword: true,
        userClients:
          parsed.role === "editor" && parsed.clientIds.length > 0
            ? {
                create: parsed.clientIds.map((clientId) => ({
                  clientId,
                })),
              }
            : undefined,
      },
    });

    return NextResponse.json({ message: "Usuário criado com sucesso." });
  } catch (error) {
    if (error instanceof Error && error.message.includes("Unique constraint")) {
      return NextResponse.json({ error: "Já existe um usuário com este e-mail." }, { status: 409 });
    }

    return handleRouteError(error, "Erro interno ao criar usuário.");
  }
}
