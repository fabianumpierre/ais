import { NextResponse } from "next/server";

import { assertCanAccessAnalysis } from "@/lib/auth/access";
import { requireUser } from "@/lib/auth/auth";
import { handleRouteError } from "@/lib/auth/http";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireUser();
    const { id } = await params;
    await assertCanAccessAnalysis(user, id);

    await prisma.weeklyAnalysis.delete({
      where: { id },
    });

    return NextResponse.json({ message: "Análise excluída com sucesso." });
  } catch (error) {
    if (error instanceof Error && error.message.includes("Record to delete does not exist")) {
      return NextResponse.json({ message: "Análise não encontrada." }, { status: 404 });
    }

    return handleRouteError(error, "Erro interno ao excluir análise.");
  }
}
