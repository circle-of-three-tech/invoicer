import path from "node:path";
import { config as loadEnv } from "dotenv";
import { defineConfig } from "prisma/config";

// Prisma 7 moves the connection URL out of schema.prisma and, unlike Prisma 6,
// no longer auto-loads .env — so the CLI is loaded here instead. Existing
// variables win (dotenv never overwrites), which keeps Vercel/CI env and the
// `dotenv -e ... --` npm scripts authoritative; this is only the fallback that
// makes a bare `npx prisma migrate dev` work the same way.
loadEnv({ path: [".env.local", ".env"], quiet: true });

export default defineConfig({
  schema: path.join("prisma", "schema.prisma"),
  migrations: {
    path: path.join("prisma", "migrations"),
  },
  datasource: {
    // Still undefined during `prisma generate` on a machine with no secrets;
    // only the migration/introspection commands actually require it.
    url: process.env.DATABASE_URL,
  },
});
