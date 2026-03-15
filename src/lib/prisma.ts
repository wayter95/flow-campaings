import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient() {
  let connectionString = process.env.DATABASE_URL!;
  connectionString = connectionString
    .replace("sslmode=verify-full", "sslmode=require")
    .replace("channel_binding=require", "");
  connectionString = connectionString.replace(/[&?]$/, "").replace("?&", "?");

  // Create an explicit pg.Pool so credentials are parsed by the pg driver
  // directly, avoiding the PrismaPg "(not available)" bug in standalone builds.
  // Use type assertion to bypass adapter-pg type mismatch with pg version.
  const pool = new pg.Pool({
    connectionString,
    ssl: { rejectUnauthorized: false },
    max: 10,
    idleTimeoutMillis: 60_000,
    connectionTimeoutMillis: 15_000,
    allowExitOnIdle: true,
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const adapter = new PrismaPg(pool as any);
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
