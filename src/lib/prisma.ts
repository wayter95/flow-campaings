import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient() {
  // Strip channel_binding=require from the URL — the Neon pooler (PgBouncer)
  // does not support channel binding, causing SCRAM auth to fail.
  // Keep sslmode=verify-full intact as pg v8.x handles it correctly.
  let connStr = process.env.DATABASE_URL!;
  connStr = connStr
    .replace(/[&?]channel_binding=require/, "")
    .replace(/\?&/, "?")
    .replace(/[?&]$/, "");

  const pool = new pg.Pool({
    connectionString: connStr,
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
