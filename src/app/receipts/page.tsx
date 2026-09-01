"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { useStore } from "@/lib/store";
import { formatDate, money } from "@/lib/format";
import { Reveal } from "@/components/motion";

export default function ReceiptsPage() {
  const { receipts } = useStore();

  return (
    <div className="mx-auto max-w-5xl">
      <Reveal>
        <div className="mb-6">
          <h1 className="font-display text-2xl font-bold text-fg sm:text-3xl">Receipts</h1>
          <p className="mt-1 text-sm text-fg-muted">
            Every receipt is generated from a paid invoice — always in sync.
          </p>
        </div>
      </Reveal>

      {receipts.length === 0 ? (
        <div className="rounded-3xl border border-black/[0.07] py-20 text-center glass">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl tri-bg">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>
          </div>
          <p className="text-sm text-fg-muted">No receipts yet.</p>
          <p className="mt-1 text-xs text-fg-dim">
            Open an invoice and mark it as paid to create one.
          </p>
          <Link href="/invoices" className="mt-5 inline-block rounded-lg px-4 py-2 text-sm font-semibold text-white tri-bg">
            Go to invoices
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {receipts.map((r, i) => (
            <motion.div
              key={r.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <Link
                href={`/receipts/${r.id}`}
                className="group block overflow-hidden rounded-2xl border border-black/[0.07] p-5 transition glass hover:border-black/20"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-mono text-[11px] text-fg-dim">{r.number}</div>
                    <div className="mt-0.5 text-sm font-semibold text-fg">{r.to.name}</div>
                  </div>
                  <span className="rounded-full border border-[#12a366]/25 bg-[#12a366]/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-[#0f9d63]">
                    Paid
                  </span>
                </div>
                <div className="mt-4 flex items-end justify-between">
                  <div className="text-[11px] text-fg-dim">
                    {r.method} · {formatDate(r.paidAt)}
                  </div>
                  <div className="font-mono text-xl font-bold text-fg transition group-hover:text-fg">
                    {money(r.amount, r.currency)}
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
