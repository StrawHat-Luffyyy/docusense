import { PrismaClient } from "../generated/prisma/client.js";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import { env } from "./env.js";

const prismaClientSingleton = () => {
  const connectionString = env.DATABASE_URL;
  const isProduction =
    env.NODE_ENV === "production" || Boolean(process.env.RENDER);
  const pool = new pg.Pool({
    connectionString,
    ...(isProduction ? { ssl: { rejectUnauthorized: false } } : {}),
  });
  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter });
};

declare global {
  var prismaGlobal: undefined | ReturnType<typeof prismaClientSingleton>;
}

export const db = globalThis.prismaGlobal ?? prismaClientSingleton();

if (env.NODE_ENV !== "production") globalThis.prismaGlobal = db;
