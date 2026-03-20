import { NextResponse } from "next/server";
import { z } from "zod";

import { requireUser } from "@/lib/auth/auth";
import { handleRouteError } from "@/lib/auth/http";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { applySessionCookie } from "@/lib/auth/session";
import { createSessionToken } from "@/lib/auth/token";
import { prisma } from "@/lib/prisma";

const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(6),
    newPassword: z.string().min(8),
    confirmPassword: z.string().min(8),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "A confirmação da nova senha não confere.",
    path: ["confirmPassword"],
  });

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const body = await request.json();
    const parsed = changePasswordSchema.parse(body);

    const currentUser = await prisma.user.findUnique({
      where: { id: user.id },
    });

    if (!currentUser) {
      return NextResponse.json({ error: "Usuário não encontrado." }, { status: 404 });
    }

    const validPassword = await verifyPassword(parsed.currentPassword, currentUser.passwordHash);

    if (!validPassword) {
      return NextResponse.json({ error: "Senha atual inválida." }, { status: 400 });
    }

    const passwordHash = await hashPassword(parsed.newPassword);

    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        mustChangePassword: false,
      },
    });

    const token = await createSessionToken({
      sub: updatedUser.id,
      email: updatedUser.email,
      name: updatedUser.name,
      role: updatedUser.role,
      mustChangePassword: false,
    });

    const response = NextResponse.json({ message: "Senha alterada com sucesso." });
    return applySessionCookie(response, token);
  } catch (error) {
    return handleRouteError(error, "Erro interno ao alterar senha.");
  }
}
