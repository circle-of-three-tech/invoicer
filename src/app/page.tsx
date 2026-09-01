"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { useStore } from "@/lib/store";
import { totals, money, formatDate } from "@/lib/format";
import { AnimatedNumber, Reveal, Stagger, StaggerItem } from "@/components/motion";
import { StatusPill } from "@/components/ui";
import { accentGradient } from "@/lib/accents";

export default function Dashboard() {
  const { invoices, receipts, company, ready } = useStore();

  const paid = invoices.filter((i) => i.status === "paid");
  const outstanding = invoices.filter((i) => i.status !== "paid");
  const totalPaid = paid.reduce((s, i) => s + totals(i).total, 0);
  const totalOutstanding = outstanding.reduce((s, i) => s + totals(i).total, 0);
  const cur = company.currency;

  const recent = invoices.slice(0, 5);

  return (
    <div className="mx-auto max-w-6xl">
      {/* Hero */}
      <Reveal>
        <div className="relative mb-8 overflow-hidden rounded-3xl border border-black/[0.07] p-8 sm:p-10 glass">
          <div
            className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full opacity-30 blur-3xl animate-float-slow"
            style={{ background: "var(--brand)" }}
          />
          <div className="relative">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-black/10 bg-black/5 px-3 py-1 text-[11px] font-medium text-fg-muted">
              <span className="h-1.5 w-1.5 rounded-full tri-bg" />
              {ready ? "Synced to this browser" : "Loading…"}
            </div>
            <h1 className="font-display text-3xl font-bold leading-tight text-fg sm:text-[40px]">
              Invoices & receipts,
              <br />
              <span className="tri-text">beautifully in sync.</span>
            </h1>
            <p className="mt-3 max-w-lg text-sm leading-relaxed text-fg-muted">
              Craft a stylish invoice, send it, and generate a matching receipt the
              moment it&apos;s paid — all under one roof at {company.name}.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/invoices/new"
                className="rounded-xl px-5 py-2.5 text-sm font-semibold text-white transition tri-bg hover:opacity-90 glow"
              >
                Create an invoice →
              </Link>
              <Link
                href="/invoices"
                className="rounded-xl border border-black/10 bg-black/5 px-5 py-2.5 text-sm font-medium text-fg transition hover:bg-black/10"
              >
                View all invoices
              </Link>
            </div>
          </div>
        </div>
      </Reveal>

      {/* Stats */}
      <Stagger className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Collected" value={<AnimatedNumber value={totalPaid} currency={cur} />} sub={`${paid.length} paid`} tone="mint" />
        <StatCard label="Outstanding" value={<AnimatedNumber value={totalOutstanding} currency={cur} />} sub={`${outstanding.length} open`} tone="gold" />
        <StatCard label="Invoices" value={<AnimatedNumber value={invoices.length} />} sub="all time" tone="iris" />
        <StatCard label="Receipts" value={<AnimatedNumber value={receipts.length} />} sub="issued" tone="aqua" />
      </Stagger>

      {/* Recent */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Reveal className="lg:col-span-2" delay={0.05}>
          <div className="rounded-3xl border border-black/[0.07] p-6 glass">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-display text-lg font-semibold text-fg">Recent invoices</h2>
              <Link href="/invoices" className="text-xs font-medium text-fg-muted hover:text-fg">
                See all
              </Link>
            </div>
            {recent.length === 0 ? (
              <Empty label="No invoices yet" cta />
            ) : (
              <div className="flex flex-col divide-y divide-black/[0.06]">
                {recent.map((inv, i) => (
                  <motion.div
                    key={inv.id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.06 * i }}
                  >
                    <Link
                      href={`/invoices/${inv.id}`}
                      className="group flex items-center justify-between gap-4 py-3 transition"
                    >
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium text-fg group-hover:text-fg">
                          {inv.to.name || "Untitled client"}
                        </div>
                        <div className="font-mono text-[11px] text-fg-dim">{inv.number}</div>
                      </div>
                      <div className="hidden text-right sm:block">
                        <div className="text-[11px] text-fg-dim">Due {formatDate(inv.dueDate)}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-mono text-sm font-semibold text-fg">
                          {money(totals(inv).total, inv.currency)}
                        </div>
                      </div>
                      <StatusPill status={inv.status} />
                    </Link>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </Reveal>

        <Reveal delay={0.1}>
          <div className="rounded-3xl border border-black/[0.07] p-6 glass">
            <h2 className="mb-4 font-display text-lg font-semibold text-fg">Latest receipts</h2>
            {receipts.length === 0 ? (
              <Empty label="Receipts appear here once invoices are paid" />
            ) : (
              <div className="flex flex-col gap-2.5">
                {receipts.slice(0, 5).map((r) => (
                  <Link
                    key={r.id}
                    href={`/receipts/${r.id}`}
                    className="flex items-center justify-between rounded-xl border border-black/[0.06] bg-black/[0.02] px-3.5 py-3 transition hover:bg-black/[0.05]"
                  >
                    <div>
                      <div className="font-mono text-[11px] text-fg-dim">{r.number}</div>
                      <div className="text-xs text-fg-muted">{r.to.name}</div>
                    </div>
                    <div className="font-mono text-sm font-semibold text-[#0f9d63]">
                      {money(r.amount, r.currency)}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </Reveal>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: React.ReactNode;
  sub: string;
  tone: string;
}) {
  return (
    <StaggerItem>
      <motion.div
        whileHover={{ y: -4 }}
        transition={{ type: "spring", stiffness: 300, damping: 20 }}
        className="relative overflow-hidden rounded-2xl border border-black/[0.07] p-5 glass"
      >
        <div
          className="absolute inset-x-0 top-0 h-[3px]"
          style={{ background: accentGradient(tone) }}
        />
        <div className="text-[11px] font-medium uppercase tracking-wider text-fg-dim">
          {label}
        </div>
        <div className="mt-2 font-mono text-2xl font-bold text-fg">{value}</div>
        <div className="mt-1 text-[11px] text-fg-dim">{sub}</div>
      </motion.div>
    </StaggerItem>
  );
}

function Empty({ label, cta }: { label: string; cta?: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-10 text-center">
      <div className="text-sm text-fg-dim">{label}</div>
      {cta && (
        <Link
          href="/invoices/new"
          className="rounded-lg px-4 py-2 text-xs font-semibold text-white tri-bg"
        >
          Create your first invoice
        </Link>
      )}
    </div>
  );
}
