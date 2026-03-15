import { PrismaClient } from "@/generated/prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";
import { Pool } from "@neondatabase/serverless";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient() {
  const connStr = process.env.DATABASE_URL;

  // Debug: log connection info (masked) to diagnose production auth issues
  if (connStr) {
    try {
      const url = new URL(connStr);
      console.log("[prisma] DATABASE_URL host:", url.hostname);
      console.log("[prisma] DATABASE_URL user:", url.username);
      console.log("[prisma] DATABASE_URL has password:", !!url.password);
      console.log("[prisma] DATABASE_URL database:", url.pathname);
      console.log("[prisma] DATABASE_URL search params:", url.search);
    } catch (e) {
      console.log("[prisma] DATABASE_URL is not a valid URL:", String(e));
    }
  } else {
    console.log("[prisma] DATABASE_URL is UNDEFINED!");
  }

  // Test raw pool connection
  const pool = new Pool({ connectionString: connStr });
  pool.query("SELECT 1 as ok").then((res) => {
    console.log("[prisma] Raw pool test OK:", JSON.stringify(res.rows));
    pool.end();
  }).catch((err) => {
    console.log("[prisma] Raw pool test FAILED:", String(err));
    pool.end();
  });

  const adapter = new PrismaNeon({
    connectionString: connStr!,
  });
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
