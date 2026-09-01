"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { useState } from "react";
import { useStore } from "@/lib/store";
import { ReceiptDocument } from "@/components/documents";

export default function ReceiptDetail() {
  const { id } = useParams<{ id: string }>();
  const { getReceipt, company, sendReceipt, ready } = useStore();
  const receipt = getReceipt(id);
  const [sending, setSending] = useState(false);
  const [sendMsg, setSendMsg] = useState<{ ok: boolean; text: string } | null>(null);

  if (ready && !receipt) {
    return (
      <div className="mx-auto max-w-lg py-24 text-center">
        <p className="text-sm text-fg-muted">This receipt no longer exists.</p>
        <Link href="/receipts" className="mt-4 inline-block rounded-lg px-4 py-2 text-sm font-semibold text-white tri-bg">
          Back to receipts
        </Link>
      </div>
    );
  }
  if (!receipt) return <div className="p-10 text-sm text-fg-dim">Loading…</div>;

  const handleSend = async () => {
    if (!receipt.to.email) {
      setSendMsg({ ok: false, text: "This receipt has no client email." });
      return;
    }
    setSending(true);
    setSendMsg(null);
    const result = await sendReceipt(receipt.id);
    setSending(false);
    setSendMsg(
      result.ok
        ? { ok: true, text: `Sent to ${receipt.to.email}` }
        : { ok: false, text: result.error ?? "Failed to send." }
    );
  };

  return (
    <div className="mx-auto max-w-[1180px]">
      <div className="no-print mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <Link href="/receipts" className="text-xs text-fg-dim hover:text-fg-muted">
            ← Receipts
          </Link>
          <h1 className="mt-1 font-display text-2xl font-bold text-fg">{receipt.number}</h1>
        </div>
        <div className="flex gap-2">
          <Link
            href={`/invoices/${receipt.invoiceId}`}
            className="rounded-xl border border-black/10 bg-black/5 px-4 py-2.5 text-sm font-medium text-fg transition hover:bg-black/10"
          >
            View invoice {receipt.invoiceNumber}
          </Link>
          <button
            onClick={handleSend}
            disabled={sending}
            className="rounded-xl border border-black/10 bg-black/5 px-4 py-2.5 text-sm font-medium text-fg transition hover:bg-black/10 disabled:opacity-50"
          >
            {sending ? "Sending…" : "✉ Email to client"}
          </button>
          <button
            onClick={() => window.print()}
            className="rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition tri-bg hover:opacity-90 glow"
          >
            ⤓ Print / PDF
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

      <ReceiptDocument receipt={receipt} company={company} />
    </div>
  );
}
