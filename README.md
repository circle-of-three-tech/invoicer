# Circle of Three — Invoicing & Receipts

A stylish, animated invoicing and receipt-generation platform for **Circle of Three Technologies**.
Receipts are generated in direct correspondence with invoices — mark an invoice paid and a
matching receipt is created instantly.

## Highlights

- **Signature tri-tone design** (Iris · Aqua · Ember) — the "Circle of Three" motif runs through
  the animated logo, gradients, and document accents.
- **Animated everything** — floating gradient backdrop, staggered reveals, animated stat counters,
  spring-based line-item add/remove, layout-animated nav, and a modal payment flow (Framer Motion).
- **Live invoice builder** — edit on the left, watch a print-quality document update in real time
  on the right. Six accent themes, 9 currencies, tax & discount.
- **Invoice → Receipt in one click** — "Mark paid & make receipt" records the payment and links the
  documents together.
- **Print / PDF** — every document prints cleanly (use your browser's *Save as PDF*).
- **Email to clients** — send a styled invoice or receipt straight to the client's inbox
  (Nodemailer over SMTP) from the document's action bar.
- **Postgres record-keeping** — invoices, receipts, and your business profile persist in
  Prisma Postgres as the source of truth. Pages are server-rendered with their data already
  in place, so there is no empty first paint and no load waterfall.
- **Password-protected** — the workspace sits behind a shared passphrase, with rate-limited
  sign-in and an authorization check inside every server action.

## Authentication

The app is single-tenant: one business, one shared passphrase. Sign-in sets an HMAC-signed,
`HttpOnly` session cookie that lasts 14 days.

| Var | Required | Notes |
|-----|----------|-------|
| `AUTH_SECRET` | production | Signs session cookies. Generate with `openssl rand -base64 32` |
| `APP_PASSWORD` | production | The passphrase that unlocks the workspace |

In development both fall back to insecure defaults (`dev`) so `npm run dev` works with no setup.
**In production the app refuses to start a session without them.**

Two layers enforce access, and both matter:

- [src/proxy.ts](src/proxy.ts) redirects unauthenticated visitors to `/login`. This is an
  optimistic gate — it keeps people out of the UI, nothing more.
- Every server action calls `requireSession()` from [src/lib/session.ts](src/lib/session.ts),
  and the app layout re-checks at render time. Server Actions are public POST endpoints, so
  this is the boundary that actually holds.

## Database (Prisma Postgres)

Provisioned through the Vercel Marketplace; the connection lives in `DATABASE_URL`
(`.env.local`, pulled with `vercel env pull`). Prisma 7 takes the connection through the
`@prisma/adapter-pg` driver adapter — see [src/lib/db.ts](src/lib/db.ts).

```bash
npm run db:migrate  # create + apply a migration during development
npm run db:deploy   # apply pending migrations (use this in production)
npm run db:studio   # browse data in Prisma Studio
npm run db:push     # schema sync without a migration — development only
```

### Migrating an existing database

The schema was originally created with `db push`, so the tables already exist without any
migration history. Baseline the database once, then use migrations from then on:

```bash
npm run db:baseline   # marks 0_init as already applied
```

New databases just need `npm run db:deploy`.

## Email (Nodemailer / SMTP)

Sending is configured via env vars in `.env.local`. Until they're set, the app runs fine and
the "Email to client" buttons report that email isn't configured.

| Var | Example | Notes |
|-----|---------|-------|
| `SMTP_HOST` | `smtp.gmail.com` | Your SMTP server |
| `SMTP_PORT` | `587` | `465` for implicit TLS |
| `SMTP_USER` | `you@gmail.com` | SMTP username |
| `SMTP_PASS` | `abcd efgh ijkl mnop` | Gmail requires an [App Password](https://myaccount.google.com/apppasswords) |
| `SMTP_SECURE` | `false` | `true` only for port 465 |
| `MAIL_FROM` | `you@gmail.com` | Optional; defaults to `SMTP_USER` |

For production, add the same variables with `vercel env add`.

Sending is rate limited — 5 sends per document per hour and 100 overall — so a stolen session
cannot turn the mailbox into an open relay.

## Run it

```bash
npm install
npm run dev        # http://localhost:3000
npm run build      # production build (runs prisma generate first)
npm run typecheck  # tsc --noEmit
npm run lint       # eslint
```

## Deploying

1. Set every variable from [.env.example](.env.example) in the Vercel project —
   `DATABASE_URL`, `AUTH_SECRET` and `APP_PASSWORD` are mandatory.
2. Set `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY` to a stable value so encrypted Server Action
   closures survive across instances and redeploys.
3. Leave `ALLOW_DEMO_DATA` unset. With it on, the Settings page can wipe the database and
   reinstate sample invoices; with it off, the control is hidden *and* the action is refused
   server-side.
4. Apply migrations with `npm run db:deploy` (baseline first — see above).

`GET /api/health` returns `200 {"status":"ok"}` when the app can reach Postgres and `503`
when it cannot. It is deliberately public and reveals nothing else, so uptime monitors can
poll it without a session.

### What is hardened

- Security headers, including a Content-Security-Policy, are set in
  [next.config.ts](next.config.ts); `X-Powered-By` and browser source maps are off.
- Every action input is validated and clamped in [src/lib/validate.ts](src/lib/validate.ts) —
  lengths, numeric ranges, allowed currencies and accents, and a 256 KB cap on logo uploads
  (SVG rejected, since it is active content).
- Internal errors are logged server-side; clients get a generic message rather than SQL or
  SMTP detail.
- The demo seed no longer runs on page load, so a real deployment never grows invented invoices.
- Currency and date formatting is pinned to one locale. Documents render on the server and
  hydrate on the client, so leaving it to the runtime default would make a German or British
  browser disagree with the server's HTML and break hydration.
- Document numbers are allocated per year and retried on conflict, so two tabs saving at once
  converge on distinct numbers instead of colliding.
- The payment dialog traps focus, closes on Escape, and restores focus on exit.

## Structure

- `src/lib/` — `types.ts`, `format.ts`, `accents.ts`, `env.ts` (validated config),
  `session.ts` / `session-token.ts` (auth), `rate-limit.ts`, `validate.ts` (input parsing),
  `db.ts` (Prisma client), `data.ts` (server-side reads), `mappers.ts` (row ↔ domain),
  `actions.ts` (server actions), `store.tsx` (client cache, server-seeded),
  `email.ts` (Nodemailer + HTML templates), `seed.ts` (opt-in demo data)
- `prisma/schema.prisma` + `prisma.config.ts` — data model and Prisma 7 CLI config
- `src/components/` — `Shell`, `Backdrop`, `Logo`, `documents.tsx` (invoice/receipt paper), motion + ui helpers
- `src/app/(app)/` — the authenticated shell: dashboard, `invoices` (list / `new` builder /
  `[id]` detail), `receipts` (list / `[id]`), `settings`
- `src/app/login/` — sign-in, outside the shell; `src/proxy.ts` — the auth gate

Built with Next.js 16 (App Router), React 19, Prisma Postgres, Nodemailer, Tailwind CSS v4, and Framer Motion.
