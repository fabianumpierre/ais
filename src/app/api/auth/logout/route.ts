import { NextResponse } from "next/server";

import { clearSessionCookie } from "@/lib/auth/session";

export async function POST() {
  const response = NextResponse.json({ message: "Sessão encerrada com sucesso." });
  return clearSessionCookie(response);
}
