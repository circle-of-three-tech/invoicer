/**
 * Central, fail-fast view of the environment.
 *
 * Values are read lazily rather than at import time: a missing variable should
 * fail the request that needs it with a clear message, not blow up `next build`
 * on a machine that has no runtime secrets.
 */

const isProd = process.env.NODE_ENV === "production";

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Missing required environment variable ${name}. See .env.example.`,
    );
  }
  return value;
}

function optional(name: string): string | undefined {
  const value = process.env[name];
  return value && value.length > 0 ? value : undefined;
}

export const IS_PRODUCTION = isProd;

/** Database connection string, consumed by the Prisma driver adapter. */
export function databaseUrl(): string {
  return required("DATABASE_URL");
}

/**
 * Secret used to sign session cookies. Required in production; in development
 * we fall back to a fixed value so `next dev` works with no setup.
 */
export function authSecret(): string {
  return isProd
    ? required("AUTH_SECRET")
    : (optional("AUTH_SECRET") ?? "dev-only-insecure-secret");
}

/**
 * The single password that unlocks the app. This is a single-tenant tool for
 * one business, so a shared passphrase is the right weight of auth — but it
 * must exist before the app is exposed to the internet.
 */
export function appPassword(): string {
  return isProd ? required("APP_PASSWORD") : (optional("APP_PASSWORD") ?? "dev");
}

/** Session lifetime — long enough to be convenient, short enough to expire. */
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 14; // 14 days

export function smtpConfig() {
  const port = Number(process.env.SMTP_PORT || 587);
  return {
    host: optional("SMTP_HOST"),
    port,
    user: optional("SMTP_USER"),
    pass: optional("SMTP_PASS"),
    secure: process.env.SMTP_SECURE
      ? process.env.SMTP_SECURE === "true"
      : port === 465,
    from: optional("MAIL_FROM"),
  };
}

/**
 * Demo seeding and the destructive "reset to demo data" action are opt-in, so
 * neither can touch a real database unless someone deliberately allows it.
 */
export function allowDemoData(): boolean {
  return process.env.ALLOW_DEMO_DATA === "true";
}
