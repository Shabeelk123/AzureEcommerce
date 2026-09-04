import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { env } from "@/env";

/**
 * Prisma 7 requires an explicit driver adapter — there is no default Rust
 * query engine anymore. `pg` speaks plain TCP, which works against Neon's
 * pooled connection string the same way it would against any Postgres,
 * without needing Neon's HTTP/WebSocket adapter (that one matters on edge
 * runtimes; we run in a long-lived Node container).
 *
 * The client is memoized on `globalThis` so Next.js dev-server HMR doesn't
 * open a fresh pool on every file save.
 */
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient() {
  const adapter = new PrismaPg({ connectionString: env.DATABASE_URL });
  return new PrismaClient({
    adapter,
    log: env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
