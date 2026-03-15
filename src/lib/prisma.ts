import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient() {
  let connectionString = process.env.DATABASE_URL!;
  connectionString = connectionString
    .replace("sslmode=verify-full", "sslmode=require")
    .replace("channel_binding=require", "");
  connectionString = connectionString.replace(/[&?]$/, "").replace("?&", "?");

  // Pass connectionString as PoolConfig property so pg driver parses
  // credentials itself — avoids PrismaPg "(not available)" bug in standalone builds
  const adapter = new PrismaPg({
    connectionString,
    ssl: { rejectUnauthorized: false },
    max: 10,
    idleTimeoutMillis: 60_000,
    connectionTimeoutMillis: 15_000,
    allowExitOnIdle: true,
  });
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
