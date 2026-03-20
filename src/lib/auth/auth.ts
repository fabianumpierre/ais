import { redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { AuthError, getSessionPayload } from "@/lib/auth/session";

export type CurrentUser = {
  id: string;
  name: string;
  email: string;
  role: "admin" | "editor";
  mustChangePassword: boolean;
  clientIds: string[];
};

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const payload = await getSessionPayload();

  if (!payload?.sub) {
    return null;
  }

  const user = await prisma.user.findUnique({
    where: { id: payload.sub },
    include: {
      userClients: {
        select: {
          clientId: true,
        },
      },
    },
  });

  if (!user) {
    return null;
  }

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    mustChangePassword: user.mustChangePassword,
    clientIds: user.userClients.map((item) => item.clientId),
  };
}

export async function requireUser() {
  const user = await getCurrentUser();

  if (!user) {
    throw new AuthError("Nao autenticado.", 401);
  }

  return user;
}

export async function requireAdmin() {
  const user = await requireUser();

  if (user.role !== "admin") {
    throw new AuthError("Acesso restrito a administradores.", 403);
  }

  return user;
}

export async function requirePageUser() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  return user;
}

export async function requireAdminPage() {
  const user = await requirePageUser();

  if (user.role !== "admin") {
    redirect("/dashboard");
  }

  return user;
}
