"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useStore } from "@/lib/store";
import { formatDate, money, totals } from "@/lib/format";
import { StatusPill } from "@/components/ui";
import { Reveal } from "@/components/motion";
import type { InvoiceStatus } from "@/lib/types";

const FILTERS: (InvoiceStatus | "all")[] = ["all", "draft", "sent", "paid"];

export default function InvoicesPage() {
  const { invoices } = useStore();
  const [filter, setFilter] = useState<InvoiceStatus | "all">("all");
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    return invoices.filter((i) => {
      const okStatus = filter === "all" || i.status === filter;
      const okQ =
        !q ||
        i.number.toLowerCase().includes(q.toLowerCase()) ||
        i.to.name.toLowerCase().includes(q.toLowerCase());
      return okStatus && okQ;
    });
  }, [invoices, filter, q]);

  return (
    <div className="mx-auto max-w-6xl">
      <Reveal>
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl font-bold text-fg sm:text-3xl">Invoices</h1>
            <p className="mt-1 text-sm text-fg-muted">
              {invoices.length} total · manage, view, and collect.
            </p>
          </div>
          <Link
            href="/invoices/new"
            className="rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition tri-bg hover:opacity-90 glow"
          >
            + New Invoice
          </Link>
        </div>
      </Reveal>

      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-1.5 rounded-xl border border-black/[0.07] bg-black/[0.02] p-1">
          {FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className="relative rounded-lg px-3.5 py-1.5 text-xs font-medium capitalize transition"
            >
              {filter === f && (
                <motion.span
                  layoutId="inv-filter"
                  className="absolute inset-0 rounded-lg bg-black/10"
                  transition={{ type: "spring", stiffness: 400, damping: 32 }}
                />
              )}
              <span className={`relative z-10 ${filter === f ? "text-fg" : "text-fg-dim"}`}>
                {f}
              </span>
            </button>
          ))}
        </div>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search client or number…"
          className="w-full rounded-xl border border-black/10 bg-black/[0.03] px-3.5 py-2 text-sm text-fg outline-none transition placeholder:text-fg-dim focus:border-iris/60 sm:w-64"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-3xl border border-black/[0.07] py-16 text-center glass">
          <p className="text-sm text-fg-dim">No invoices match.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-3xl border border-black/[0.07] glass">
          <div className="hidden grid-cols-[1.4fr_1fr_1fr_0.9fr_auto] gap-4 border-b border-black/[0.06] px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-fg-dim sm:grid">
            <div>Client</div>
            <div>Number</div>
            <div>Due</div>
            <div className="text-right">Total</div>
            <div className="text-right">Status</div>
          </div>
          <AnimatePresence initial={false}>
            {filtered.map((inv, i) => (
              <motion.div
                key={inv.id}
                layout
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ delay: Math.min(i * 0.03, 0.3) }}
              >
                <Link
                  href={`/invoices/${inv.id}`}
                  className="grid grid-cols-2 gap-2 border-b border-black/[0.05] px-5 py-4 transition hover:bg-black/[0.03] sm:grid-cols-[1.4fr_1fr_1fr_0.9fr_auto] sm:items-center sm:gap-4"
                >
                  <div className="col-span-2 sm:col-span-1">
                    <div className="text-sm font-medium text-fg">
                      {inv.to.name || "Untitled client"}
                    </div>
                    <div className="text-[11px] text-fg-dim sm:hidden">{inv.number}</div>
                  </div>
                  <div className="hidden font-mono text-xs text-fg-muted sm:block">
                    {inv.number}
                  </div>
                  <div className="hidden text-xs text-fg-muted sm:block">
                    {formatDate(inv.dueDate)}
                  </div>
                  <div className="font-mono text-sm font-semibold text-fg sm:text-right">
                    {money(totals(inv).total, inv.currency)}
                  </div>
                  <div className="flex justify-end">
                    <StatusPill status={inv.status} />
                  </div>
                </Link>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
