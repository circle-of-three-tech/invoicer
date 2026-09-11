"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { useStore } from "@/lib/store";
import type { Invoice, LineItem } from "@/lib/types";
import { CURRENCIES, money, totals, uid } from "@/lib/format";
import { activePaymentDetails } from "@/lib/payments";
import { ACCENTS } from "@/lib/accents";
import { Field, inputCls } from "@/components/ui";
import { InvoiceDocument } from "@/components/documents";

export default function NewInvoicePage() {
  return (
    <Suspense fallback={<div className="p-10 text-sm text-fg-dim">Loading…</div>}>
      <Builder />
    </Suspense>
  );
}

function Builder() {
  const { blankInvoice, upsertInvoice, getInvoice, company } = useStore();
  const router = useRouter();
  const params = useSearchParams();
  const editId = params.get("id");

  // The store is populated by the server render, so the right invoice is known
  // on the very first pass — no effect, no "preparing…" placeholder.
  const load = () => (editId ? getInvoice(editId) : undefined) ?? blankInvoice();

  const [inv, setInv] = useState<Invoice>(load);
  const [loadedId, setLoadedId] = useState(editId);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Switching between "new" and "edit" without unmounting: re-derive during
  // render rather than in an effect, which would render the stale invoice once.
  if (loadedId !== editId) {
    setLoadedId(editId);
    setInv(load());
  }

  const set = (patch: Partial<Invoice>) => setInv({ ...inv, ...patch });
  const setTo = (patch: Partial<Invoice["to"]>) =>
    setInv({ ...inv, to: { ...inv.to, ...patch } });
  const setFrom = (patch: Partial<Invoice["from"]>) =>
    setInv({ ...inv, from: { ...inv.from, ...patch } });

  const updateItem = (id: string, patch: Partial<LineItem>) =>
    setInv({
      ...inv,
      items: inv.items.map((it) => (it.id === id ? { ...it, ...patch } : it)),
    });
  const addItem = () =>
    setInv({
      ...inv,
      items: [...inv.items, { id: uid(), description: "", quantity: 1, rate: 0 }],
    });
  const removeItem = (id: string) =>
    setInv({ ...inv, items: inv.items.filter((it) => it.id !== id) });

  const save = async (status: Invoice["status"]) => {
    if (saving) return;
    setSaving(true);
    setError(null);
    const result = await upsertInvoice({ ...inv, status });
    setSaving(false);
    if (result.ok) {
      router.push(`/invoices/${inv.id}`);
    } else {
      setError(result.error ?? "Could not save this invoice.");
    }
  };

  const t = totals(inv);

  return (
    <div className="mx-auto max-w-[1300px]">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <Link href="/invoices" className="text-xs text-fg-dim hover:text-fg-muted">
            ← Invoices
          </Link>
          <h1 className="mt-1 font-display text-2xl font-bold text-fg sm:text-3xl">
            {editId ? "Edit invoice" : "New invoice"}
          </h1>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => save("draft")}
            disabled={saving}
            className="rounded-xl border border-black/10 bg-black/5 px-4 py-2.5 text-sm font-medium text-fg transition hover:bg-black/10 disabled:opacity-50"
          >
            Save draft
          </button>
          <button
            onClick={() => save("sent")}
            disabled={saving}
            className="rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition tri-bg hover:opacity-90 disabled:opacity-50 glow"
          >
            {saving ? "Saving…" : "Save & finalize →"}
          </button>
        </div>
      </div>

      {error && (
        <p
          role="alert"
          className="mb-5 rounded-xl border border-[#f43f6e]/30 bg-[#f43f6e]/10 px-4 py-2.5 text-sm text-[#f43f6e]"
        >
          ⚠ {error}
        </p>
      )}

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
        {/* FORM */}
        <div className="space-y-5">
          <Card title="Client details" step="01">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Client name">
                <input className={inputCls} value={inv.to.name} onChange={(e) => setTo({ name: e.target.value })} placeholder="Acme Inc." />
              </Field>
              <Field label="Client email">
                <input className={inputCls} value={inv.to.email} onChange={(e) => setTo({ email: e.target.value })} placeholder="billing@acme.com" />
              </Field>
              <Field label="Phone">
                <input className={inputCls} value={inv.to.phone} onChange={(e) => setTo({ phone: e.target.value })} placeholder="+1 …" />
              </Field>
              <Field label="Address">
                <input className={inputCls} value={inv.to.address} onChange={(e) => setTo({ address: e.target.value })} placeholder="Street, City" />
              </Field>
            </div>
          </Card>

          <Card title="Invoice meta" step="02">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <Field label="Number">
                <input className={inputCls} value={inv.number} onChange={(e) => set({ number: e.target.value })} />
              </Field>
              <Field label="Issue date">
                <input type="date" className={inputCls} value={inv.issueDate} onChange={(e) => set({ issueDate: e.target.value })} />
              </Field>
              <Field label="Due date">
                <input type="date" className={inputCls} value={inv.dueDate} onChange={(e) => set({ dueDate: e.target.value })} />
              </Field>
              <Field label="Currency">
                <select className={inputCls} value={inv.currency} onChange={(e) => set({ currency: e.target.value })}>
                  {Object.entries(CURRENCIES).map(([code, c]) => (
                    <option key={code} value={code} className="bg-bg-soft">
                      {code} — {c.symbol}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Tax %">
                <input type="number" min={0} className={inputCls} value={inv.taxRate} onChange={(e) => set({ taxRate: Number(e.target.value) })} />
              </Field>
              <Field label="Discount">
                <input type="number" min={0} className={inputCls} value={inv.discount} onChange={(e) => set({ discount: Number(e.target.value) })} />
              </Field>
            </div>
          </Card>

          <Card title="Line items" step="03">
            <div className="space-y-3">
              <AnimatePresence initial={false}>
                {inv.items.map((it) => (
                  <motion.div
                    key={it.id}
                    layout
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0, marginTop: 0 }}
                    transition={{ type: "spring", stiffness: 400, damping: 34 }}
                    className="grid grid-cols-[1fr_64px_92px_auto] items-center gap-2 overflow-hidden"
                  >
                    <input className={inputCls} value={it.description} onChange={(e) => updateItem(it.id, { description: e.target.value })} placeholder="Description of work" />
                    <input type="number" min={0} className={`${inputCls} text-center`} value={it.quantity} onChange={(e) => updateItem(it.id, { quantity: Number(e.target.value) })} />
                    <input type="number" min={0} className={`${inputCls} text-right`} value={it.rate} onChange={(e) => updateItem(it.id, { rate: Number(e.target.value) })} />
                    <button
                      onClick={() => removeItem(it.id)}
                      disabled={inv.items.length === 1}
                      className="rounded-lg border border-black/10 bg-black/5 p-2 text-fg-dim transition hover:border-[#f43f6e]/40 hover:text-[#f43f6e] disabled:opacity-30"
                      aria-label="Remove item"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" /></svg>
                    </button>
                  </motion.div>
                ))}
              </AnimatePresence>
              <button
                onClick={addItem}
                className="w-full rounded-xl border border-dashed border-black/15 py-2.5 text-sm font-medium text-fg-muted transition hover:border-iris/50 hover:text-fg"
              >
                + Add line item
              </button>
            </div>
          </Card>

          <Card title="Notes & style" step="04">
            <Field label="Notes / payment terms">
              <textarea rows={3} className={inputCls} value={inv.notes} onChange={(e) => set({ notes: e.target.value })} placeholder="Thank you for your business." />
            </Field>
            <div className="mt-4">
              <span className="mb-2 block text-[11px] font-medium uppercase tracking-wider text-fg-dim">Accent</span>
              <div className="flex flex-wrap gap-2">
                {ACCENTS.map((a) => (
                  <button
                    key={a.key}
                    onClick={() => set({ accent: a.key })}
                    className={`h-8 w-8 rounded-full ring-2 ring-offset-2 ring-offset-white transition ${
                      inv.accent === a.key ? "ring-[#6d4bff]" : "ring-transparent hover:ring-black/30"
                    }`}
                    style={{ background: a.solid }}
                    aria-label={a.label}
                    title={a.label}
                  />
                ))}
              </div>
            </div>
          </Card>

          <details className="rounded-2xl border border-black/[0.07] px-5 py-4 glass">
            <summary className="cursor-pointer text-sm font-medium text-fg-muted">
              Sender details (from {company.name})
            </summary>
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Business name">
                <input className={inputCls} value={inv.from.name} onChange={(e) => setFrom({ name: e.target.value })} />
              </Field>
              <Field label="Business email">
                <input className={inputCls} value={inv.from.email} onChange={(e) => setFrom({ email: e.target.value })} />
              </Field>
              <Field label="Phone">
                <input className={inputCls} value={inv.from.phone} onChange={(e) => setFrom({ phone: e.target.value })} />
              </Field>
              <Field label="Address">
                <input className={inputCls} value={inv.from.address} onChange={(e) => setFrom({ address: e.target.value })} />
              </Field>
            </div>
          </details>
        </div>

        {/* LIVE PREVIEW */}
        <div className="lg:sticky lg:top-6 lg:h-fit">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-[11px] font-medium uppercase tracking-wider text-fg-dim">
              Live preview
            </span>
            <motion.span
              key={t.total}
              initial={{ scale: 1.15, color: "#0fb5aa" }}
              animate={{ scale: 1, color: "#4c4f63" }}
              className="font-mono text-xs"
            >
              Total {money(t.total, inv.currency)}
            </motion.span>
          </div>
          <div className="rounded-3xl border border-black/[0.06] bg-black/[0.015] p-4 sm:p-6">
            <InvoiceDocument
              invoice={inv}
              logoVersion={company.logoVersion}
              paymentDetails={activePaymentDetails(company)}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function Card({
  title,
  step,
  children,
}: {
  title: string;
  step: string;
  children: React.ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="rounded-2xl border border-black/[0.07] p-5 glass"
    >
      <div className="mb-4 flex items-center gap-3">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg text-[11px] font-bold text-white tri-bg">
          {step}
        </span>
        <h3 className="font-display text-base font-semibold text-fg">{title}</h3>
      </div>
      {children}
    </motion.div>
  );
}
