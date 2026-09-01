"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { useStore } from "@/lib/store";
import { ReceiptDocument } from "@/components/documents";

export default function ReceiptDetail() {
  const { id } = useParams<{ id: string }>();
  const { getReceipt, company, ready } = useStore();
  const receipt = getReceipt(id);

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
            onClick={() => window.print()}
            className="rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition tri-bg hover:opacity-90 glow"
          >
            ⤓ Print / PDF
          </button>
        </div>
      </div>

      <ReceiptDocument receipt={receipt} company={company} />
    </div>
  );
}
