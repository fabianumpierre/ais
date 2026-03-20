/* eslint-disable @typescript-eslint/no-require-imports */
const path = require("node:path");
const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: `file:${path.resolve(process.cwd(), "prisma", "./dev.db")}`,
    },
  },
});

async function main() {
  const email = "fabian@aldeia.biz";
  const name = "Fabian";
  const password = process.env.DEFAULT_ADMIN_PASSWORD || "Aldeia123!";
  const passwordHash = await bcrypt.hash(password, 10);

  await prisma.user.upsert({
    where: { email },
    update: {
      name,
      role: "admin",
      passwordHash,
      mustChangePassword: true,
    },
    create: {
      name,
      email,
      passwordHash,
      role: "admin",
      mustChangePassword: true,
    },
  });
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
