import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { AuthError } from "@/lib/auth/session";

export function handleRouteError(error: unknown, fallbackMessage: string) {
  if (error instanceof AuthError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }

  if (error instanceof ZodError) {
    return NextResponse.json({ error: "Dados invalidos enviados." }, { status: 400 });
  }

  return NextResponse.json({ error: fallbackMessage }, { status: 500 });
}
