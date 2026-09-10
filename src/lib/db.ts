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

function getClient() {
  globalForPrisma.prisma ??= createClient();
  return globalForPrisma.prisma;
}

// Construction is deferred to the first property access rather than done at
// import time. `next build` imports every route module to collect page data,
// and it does that with no runtime secrets — a client built eagerly here would
// read DATABASE_URL then and fail the build. With the proxy, a build-time
// import is inert and only an actual query needs the connection string.
export const prisma = new Proxy({} as ReturnType<typeof createClient>, {
  get(_target, prop, receiver) {
    return Reflect.get(getClient(), prop, receiver);
  },
  set(_target, prop, value, receiver) {
    return Reflect.set(getClient(), prop, value, receiver);
  },
  has(_target, prop) {
    return Reflect.has(getClient(), prop);
  },
});
