import { PrismaClient } from '../generated/prisma/client.js';
import { PrismaPg } from '@prisma/adapter-pg';
import { env } from './env.js';

const prismaClientSingleton = () => {
  return new PrismaClient({
    adapter: new PrismaPg({ connectionString: env.DATABASE_URL })
  });
};

declare global {
  var prismaGlobal: undefined | ReturnType<typeof prismaClientSingleton>;
}

export const db = globalThis.prismaGlobal ?? prismaClientSingleton();

if (env.NODE_ENV !== 'production') globalThis.prismaGlobal = db;