import path from "node:path";
import { defineConfig } from "prisma/config";

// Prisma 7 moves the connection URL out of schema.prisma. The CLI (db push,
// migrate, studio) reads it from here. It's injected via `dotenv -e .env.local`
// by the db:* npm scripts; the running app supplies it through the pg adapter.
export default defineConfig({
  schema: path.join("prisma", "schema.prisma"),
  migrations: {
    path: path.join("prisma", "migrations"),
  },
  datasource: {
    // Undefined during `prisma generate`; supplied via `dotenv -e .env.local`
    // for the migration/introspection commands that actually need it.
    url: process.env.DATABASE_URL,
  },
});
