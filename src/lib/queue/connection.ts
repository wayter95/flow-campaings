/**
 * Redis connection config for BullMQ.
 * Uses plain connection options — BullMQ manages its own ioredis instances internally.
 */

const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";

interface RedisConnectionOptions {
  host: string;
  port: number;
  password?: string;
  username?: string;
  db?: number;
  tls?: object;
  maxRetriesPerRequest: null;
  enableReadyCheck: boolean;
}

function parseRedisUrl(url: string): RedisConnectionOptions {
  try {
    const parsed = new URL(url);
    return {
      host: parsed.hostname || "localhost",
      port: parseInt(parsed.port || "6379", 10),
      password: parsed.password || undefined,
      username: parsed.username || undefined,
      db: parsed.pathname ? parseInt(parsed.pathname.slice(1) || "0", 10) : 0,
      tls: parsed.protocol === "rediss:" ? {} : undefined,
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
    };
  } catch {
    return {
      host: "localhost",
      port: 6379,
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
    };
  }
}

/**
 * Queue prefix for namespacing all BullMQ keys in Redis.
 * Use this when creating Queue/Worker instances via the `prefix` option.
 */
export const QUEUE_PREFIX = process.env.REDIS_PREFIX || "flow-campaigns:";

/**
 * Returns connection options for BullMQ Queue constructors.
 */
export function getConnectionOptions(): RedisConnectionOptions {
  return parseRedisUrl(REDIS_URL);
}

/**
 * Returns a fresh connection options object for BullMQ Worker constructors.
 * Workers need their own connection (BullMQ requirement).
 */
export function getWorkerConnectionOptions(): RedisConnectionOptions {
  return parseRedisUrl(REDIS_URL);
}
