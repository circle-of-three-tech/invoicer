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
- **Zero backend** — all data persists in the browser via `localStorage`. Comes seeded with demo data.

## Run it

```bash
npm install      # already done
npm run dev      # http://localhost:3000
npm run build    # production build
```

## Structure

- `src/lib/` — `types.ts`, `format.ts`, `accents.ts`, `store.tsx` (localStorage store + context)
- `src/components/` — `Shell`, `Backdrop`, `Logo`, `documents.tsx` (invoice/receipt paper), motion + ui helpers
- `src/app/` — dashboard, `invoices` (list / `new` builder / `[id]` detail), `receipts` (list / `[id]`), `settings`

Built with Next.js 16 (App Router), React 19, Tailwind CSS v4, and Framer Motion.
