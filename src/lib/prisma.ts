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

  // Parse connection string explicitly to avoid PrismaPg "(not available)"
  // credentials bug in Next.js standalone builds
  const url = new URL(connectionString);
  const adapter = new PrismaPg({
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    host: url.hostname,
    port: url.port ? parseInt(url.port) : 5432,
    database: url.pathname.slice(1),
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
