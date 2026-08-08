import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client.js";
import { PrismaPg } from "@prisma/adapter-pg";
import { logger } from "../src/utils/logger.js";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is not set");
}

const isRemoteDb =
  process.env.NODE_ENV === "production" ||
  Boolean(process.env.RENDER) ||
  process.env.DATABASE_URL.includes("render.com") ||
  process.env.DATABASE_URL.includes("sslmode=") ||
  (!process.env.DATABASE_URL.includes("localhost") &&
    !process.env.DATABASE_URL.includes("127.0.0.1"));

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
  max: 1,
  min: 0,
  connectionTimeoutMillis: 30_000,
  idleTimeoutMillis: 30_000,
  ...(isRemoteDb
    ? {
        ssl: {
          rejectUnauthorized: false,
        },
      }
    : {}),
});

const prisma = new PrismaClient({ adapter });

async function main() {
  logger.info("Starting database seed...");

  const user = await prisma.user.upsert({
    where: {
      email: "admin@docusense.local",
    },
    update: {},
    create: {
      id: "user_seed_admin",
      email: "admin@docusense.local",
      firstName: "Admin",
      lastName: "User",
    },
  });

  logger.info(
    {
      userId: user.id,
      email: user.email,
    },
    "Seed complete!",
  );
}

main()
  .catch((e) => {
    logger.error({ err: e }, "Seeding failed");
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
