import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient() {
  // During Next.js build, DATABASE_URL may not be available
  let connectionString = process.env.DATABASE_URL || "";

  if (!connectionString) {
    // Return a PrismaClient without adapter for build-time type checking
    return new PrismaClient();
  }

  // Use sslmode=require instead of verify-full to avoid cold-start timeouts on Neon
  connectionString = connectionString
    .replace("sslmode=verify-full", "sslmode=require")
    .replace("channel_binding=require", "");
  // Clean up trailing & or ?
  connectionString = connectionString.replace(/[&?]$/, "").replace("?&", "?");

  const adapter = new PrismaPg({
    connectionString,
    max: 10, // max connections in pool
    idleTimeoutMillis: 60_000, // close idle connections after 60s
    connectionTimeoutMillis: 15_000, // 15s timeout for Neon cold starts
    allowExitOnIdle: true, // don't keep process alive for idle connections
  });
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
