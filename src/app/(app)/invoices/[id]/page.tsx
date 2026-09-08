"use client";

import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useState } from "react";
import { AnimatePresence } from "framer-motion";
import { useStore } from "@/lib/store";
import { InvoiceDocument } from "@/components/documents";
import { StatusPill, Field, inputCls } from "@/components/ui";
import { Modal } from "@/components/Modal";
import { formatDate, money, todayISO, totals } from "@/lib/format";
import type { PaymentMethod } from "@/lib/types";

const METHODS: PaymentMethod[] = [
  "Bank Transfer",
  "Card",
  "Cash",
  "Mobile Money",
  "PayPal",
  "Crypto",
  "Other",
];

export default function InvoiceDetail() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { getInvoice, company, deleteInvoice, createReceipt, sendInvoice, ready } =
    useStore();
  const inv = getInvoice(id);
  const [payOpen, setPayOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [busy, setBusy] = useState(false);
  const [sendMsg, setSendMsg] = useState<{ ok: boolean; text: string } | null>(null);

  if (ready && !inv) {
    return (
      <div className="mx-auto max-w-lg py-24 text-center">
        <p className="text-sm text-fg-muted">This invoice no longer exists.</p>
        <Link href="/invoices" className="mt-4 inline-block rounded-lg px-4 py-2 text-sm font-semibold text-white tri-bg">
          Back to invoices
        </Link>
      </div>
    );
  }
  if (!inv) return <div className="p-10 text-sm text-fg-dim">Loading…</div>;

  const t = totals(inv);

  const handleDelete = async () => {
    if (!confirm(`Delete ${inv.number}? This also removes any linked receipt.`)) return;
    setBusy(true);
    const result = await deleteInvoice(inv.id);
    setBusy(false);
    if (result.ok) {
      router.push("/invoices");
    } else {
      setSendMsg({ ok: false, text: result.error ?? "Could not delete this invoice." });
    }
  };

  const handleSend = async () => {
    if (!inv.to.email) {
      setSendMsg({ ok: false, text: "Add a client email before sending." });
      return;
    }
    setSending(true);
    setSendMsg(null);
    const result = await sendInvoice(inv.id);
    setSending(false);
    setSendMsg(
      result.ok
        ? { ok: true, text: `Sent to ${inv.to.email}` }
        : { ok: false, text: result.error ?? "Failed to send." }
    );
  };

  return (
    <div className="mx-auto max-w-[1180px]">
      {/* action bar */}
      <div className="no-print mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <Link href="/invoices" className="text-xs text-fg-dim hover:text-fg-muted">
            ← Invoices
          </Link>
          <div className="mt-1 flex items-center gap-3">
            <h1 className="font-display text-2xl font-bold text-fg">{inv.number}</h1>
            <StatusPill status={inv.status} />
          </div>
          {/* Sending is recorded server-side; surfacing it prevents the "did I
              already email this?" double-send. */}
          {inv.sentAt && (
            <p className="mt-1 text-[11px] text-fg-dim">
              Emailed to {inv.to.email} on {formatDate(inv.sentAt)}
            </p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {inv.status !== "paid" ? (
            <button
              onClick={() => setPayOpen(true)}
              className="rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition tri-bg hover:opacity-90 glow"
            >
              ✓ Mark paid & make receipt
            </button>
          ) : (
            inv.receiptId && (
              <Link
                href={`/receipts/${inv.receiptId}`}
                className="rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition tri-bg hover:opacity-90"
              >
                View receipt →
              </Link>
            )
          )}
          <button
            onClick={handleSend}
            disabled={sending}
            className="rounded-xl border border-black/10 bg-black/5 px-4 py-2.5 text-sm font-medium text-fg transition hover:bg-black/10 disabled:opacity-50"
          >
            {sending ? "Sending…" : "✉ Email to client"}
          </button>
          <button
            onClick={() => window.print()}
            className="rounded-xl border border-black/10 bg-black/5 px-4 py-2.5 text-sm font-medium text-fg transition hover:bg-black/10"
          >
            ⤓ Print / PDF
          </button>
          <Link
            href={`/invoices/new?id=${inv.id}`}
            className="rounded-xl border border-black/10 bg-black/5 px-4 py-2.5 text-sm font-medium text-fg transition hover:bg-black/10"
          >
            Edit
          </Link>
          <button
            onClick={handleDelete}
            disabled={busy}
            className="rounded-xl border border-black/10 bg-black/5 px-3 py-2.5 text-sm font-medium text-fg-muted transition hover:border-[#f43f6e]/40 hover:text-[#f43f6e] disabled:opacity-50"
            aria-label="Delete"
          >
            {busy ? "Deleting…" : "Delete"}
          </button>
        </div>
      </div>

      {sendMsg && (
        <div
          className={`no-print mb-4 rounded-xl border px-4 py-2.5 text-sm ${
            sendMsg.ok
              ? "border-[#0f9d63]/30 bg-[#0f9d63]/10 text-[#0f9d63]"
              : "border-[#f43f6e]/30 bg-[#f43f6e]/10 text-[#f43f6e]"
          }`}
        >
          {sendMsg.ok ? "✓ " : "⚠ "}
          {sendMsg.text}
        </div>
      )}

      <InvoiceDocument invoice={inv} logoDataUrl={company.logoDataUrl} />

      <AnimatePresence>
        {payOpen && (
          <PaymentModal
            defaultAmount={t.total}
            currency={inv.currency}
            onClose={() => setPayOpen(false)}
            onConfirm={async (data) => {
              const result = await createReceipt(inv.id, data);
              setPayOpen(false);
              if (result.receipt) {
                router.push(`/receipts/${result.receipt.id}`);
              } else {
                setSendMsg({
                  ok: false,
                  text: result.error ?? "Could not record that payment.",
                });
              }
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function PaymentModal({
  defaultAmount,
  currency,
  onClose,
  onConfirm,
}: {
  defaultAmount: number;
  currency: string;
  onClose: () => void;
  onConfirm: (data: {
    amount: number;
    method: PaymentMethod;
    reference: string;
    paidAt: string;
  }) => void | Promise<void>;
}) {
  const [amount, setAmount] = useState(defaultAmount);
  const [method, setMethod] = useState<PaymentMethod>("Bank Transfer");
  const [reference, setReference] = useState("");
  const [paidAt, setPaidAt] = useState(todayISO());
  const [submitting, setSubmitting] = useState(false);

  const amountValid = Number.isFinite(amount) && amount > 0;

  const submit = async () => {
    if (!amountValid || submitting) return;
    setSubmitting(true);
    await onConfirm({ amount, method, reference, paidAt });
    setSubmitting(false);
  };

  return (
    <Modal
      title="Record payment"
      description="Confirm the details and we'll generate a matching receipt instantly."
      onClose={onClose}
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        <div className="space-y-4">
          <Field label={`Amount received (${currency})`}>
            <input
              type="number"
              min={0}
              step="0.01"
              required
              className={inputCls}
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
            />
          </Field>
          <Field label="Payment method">
            <select className={inputCls} value={method} onChange={(e) => setMethod(e.target.value as PaymentMethod)}>
              {METHODS.map((m) => (
                <option key={m} value={m} className="bg-bg-soft">
                  {m}
                </option>
              ))}
            </select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Reference">
              <input className={inputCls} value={reference} onChange={(e) => setReference(e.target.value)} placeholder="TXN-…" />
            </Field>
            <Field label="Date paid">
              <input type="date" required className={inputCls} value={paidAt} onChange={(e) => setPaidAt(e.target.value)} />
            </Field>
          </div>
        </div>

        <div className="mt-6 flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-xl border border-black/10 bg-black/5 py-2.5 text-sm font-medium text-fg transition hover:bg-black/10"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!amountValid || submitting}
            className="flex-1 rounded-xl py-2.5 text-sm font-semibold text-white transition tri-bg hover:opacity-90 disabled:opacity-50 glow"
          >
            {submitting ? "Working…" : "Generate receipt →"}
          </button>
        </div>
        <div className="mt-3 text-center text-[11px] text-fg-dim">
          Marking as paid · {money(defaultAmount, currency)} due
        </div>
      </form>
    </Modal>
  );
}
