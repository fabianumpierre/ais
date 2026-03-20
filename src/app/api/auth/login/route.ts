import { NextResponse } from "next/server";
import { z } from "zod";

import { verifyPassword } from "@/lib/auth/password";
import { applySessionCookie } from "@/lib/auth/session";
import { createSessionToken } from "@/lib/auth/token";
import { prisma } from "@/lib/prisma";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = loginSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Informe e-mail e senha válidos." }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: {
        email: parsed.data.email.toLowerCase(),
      },
    });

    if (!user) {
      return NextResponse.json({ error: "Usuário ou senha inválidos." }, { status: 401 });
    }

    const validPassword = await verifyPassword(parsed.data.password, user.passwordHash);

    if (!validPassword) {
      return NextResponse.json({ error: "Usuário ou senha inválidos." }, { status: 401 });
    }

    const token = await createSessionToken({
      sub: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      mustChangePassword: user.mustChangePassword,
    });

    const response = NextResponse.json({ message: "Login realizado com sucesso." });
    return applySessionCookie(response, token);
  } catch {
    return NextResponse.json({ error: "Erro interno ao autenticar usuário." }, { status: 500 });
  }
}
