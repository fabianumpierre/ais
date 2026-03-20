import { prisma } from "@/lib/prisma";
import { CurrentUser } from "@/lib/auth/auth";
import { AuthError } from "@/lib/auth/session";

export function canAccessClient(user: CurrentUser, clientId: string) {
  return user.role === "admin" || user.clientIds.includes(clientId);
}

export async function assertCanAccessClient(user: CurrentUser, clientId: string) {
  if (!canAccessClient(user, clientId)) {
    throw new AuthError("Voce nao tem acesso a este cliente.", 403);
  }
}

export async function assertCanAccessAnalysis(user: CurrentUser, analysisId: string) {
  if (user.role === "admin") {
    return;
  }

  const analysis = await prisma.weeklyAnalysis.findUnique({
    where: { id: analysisId },
    select: {
      clientId: true,
    },
  });

  if (!analysis) {
    throw new AuthError("Analise nao encontrada.", 404);
  }

  if (!user.clientIds.includes(analysis.clientId)) {
    throw new AuthError("Voce nao tem acesso a esta analise.", 403);
  }
}
