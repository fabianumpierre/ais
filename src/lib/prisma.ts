import path from "node:path";

import { Prisma, PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as {
  prisma?: PrismaClient;
};

function resolveDatabaseUrl() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl || !databaseUrl.startsWith("file:")) {
    return databaseUrl;
  }

  const filePath = databaseUrl.slice("file:".length);

  if (!filePath.startsWith(".")) {
    return databaseUrl;
  }

  return `file:${path.resolve(process.cwd(), "prisma", filePath)}`;
}

export const prisma =
  globalForPrisma.prisma ??
  (() => {
    const databaseUrl = resolveDatabaseUrl();
    const options: Prisma.PrismaClientOptions = {
      log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
    };

    if (databaseUrl) {
      options.datasources = {
        db: {
          url: databaseUrl,
        },
      };
    }

    return new PrismaClient(options);
  })();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
