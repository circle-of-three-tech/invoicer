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
  Prisma Postgres as the source of truth, via server actions. Comes seeded with demo data.

## Database (Prisma Postgres)

Provisioned through the Vercel Marketplace; the connection lives in `DATABASE_URL`
(`.env.local`, pulled with `vercel env pull`). Prisma 7 takes the connection through the
`@prisma/adapter-pg` driver adapter — see [src/lib/db.ts](src/lib/db.ts).

```bash
npm run db:push     # sync schema (prisma/schema.prisma) to the database
npm run db:studio   # browse data in Prisma Studio
```

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

## Run it

```bash
npm install      # already done
npm run dev      # http://localhost:3000
npm run build    # production build (runs prisma generate first)
```

## Structure

- `src/lib/` — `types.ts`, `format.ts`, `accents.ts`, `store.tsx` (DB-backed store + context),
  `db.ts` (Prisma client), `actions.ts` (server actions), `email.ts` (Nodemailer + HTML templates)
- `prisma/schema.prisma` + `prisma.config.ts` — data model and Prisma 7 CLI config
- `src/components/` — `Shell`, `Backdrop`, `Logo`, `documents.tsx` (invoice/receipt paper), motion + ui helpers
- `src/app/` — dashboard, `invoices` (list / `new` builder / `[id]` detail), `receipts` (list / `[id]`), `settings`

Built with Next.js 16 (App Router), React 19, Prisma Postgres, Nodemailer, Tailwind CSS v4, and Framer Motion.
