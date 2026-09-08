import "server-only";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { databaseUrl, IS_PRODUCTION } from "./env";

// Prisma 7 takes the connection through a driver adapter rather than a `url` in
// schema.prisma. We run on Node (Fluid Compute), so the node-postgres adapter
// over the direct `DATABASE_URL` connection is the right fit.
function createClient() {
  const adapter = new PrismaPg({
    connectionString: databaseUrl(),
    // Fluid Compute reuses instances and runs requests concurrently, but many
    // instances share one Postgres. A small per-instance pool that recycles
    // idle sockets keeps the total connection count well inside the limit.
    max: Number(process.env.DATABASE_POOL_MAX || 5),
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 10_000,
  });
  return new PrismaClient({
    adapter,
    // Queries are noisy and can contain client data; keep production to errors.
    log: IS_PRODUCTION ? ["error"] : ["error", "warn"],
  });
}

// Cached on globalThis in every environment: in development it survives HMR,
// and in production it keeps a warm instance from opening a second pool.
const globalForPrisma = globalThis as unknown as {
  prisma?: ReturnType<typeof createClient>;
};

export const prisma = globalForPrisma.prisma ?? createClient();
globalForPrisma.prisma = prisma;
