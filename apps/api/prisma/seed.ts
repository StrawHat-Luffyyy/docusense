import { PrismaClient } from "../src/generated/prisma/client.js";
import { PrismaPg } from "@prisma/adapter-pg";
import { logger } from "../src/utils/logger.js";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is not set");
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

async function main() {
  logger.info("Starting database seed...");

  const user = await prisma.user.upsert({
    where: { email: "admin@docusense.local" },
    update: {},
    create: {
      email: "admin@docusense.local",
    },
  });

  logger.info({ user }, "Seed complete!");
}

main()
  .catch((e) => {
    logger.error({ err: e }, "Seeding failed");
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
