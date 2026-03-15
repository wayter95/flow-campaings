import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient() {
  // Debug: log DATABASE_URL host to verify runtime env is correct
  const dbUrl = process.env.DATABASE_URL!;
  try {
    const parsed = new URL(dbUrl);
    console.log(`[prisma] Connecting to host: ${parsed.hostname}, user: ${parsed.username.substring(0, 3)}***, db: ${parsed.pathname.slice(1)}`);
  } catch {
    console.log(`[prisma] DATABASE_URL parse error, length: ${dbUrl?.length}`);
  }

  // Pass DATABASE_URL as-is to pg.Pool — pg v8.x handles sslmode=verify-full
  // natively and ignores unknown params like channel_binding.
  // Using explicit pg.Pool with serverExternalPackages avoids bundling issues.
  const pool = new pg.Pool({
    connectionString: dbUrl,
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
