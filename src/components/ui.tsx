"use client";

import type { InvoiceStatus } from "@/lib/types";

export function StatusPill({ status }: { status: InvoiceStatus }) {
  const map: Record<InvoiceStatus, { label: string; dot: string; cls: string }> = {
    draft: {
      label: "Draft",
      dot: "#a7abce",
      cls: "text-fg-muted bg-black/5 border-black/10",
    },
    sent: {
      label: "Sent",
      dot: "#d99a15",
      cls: "text-[#b7791f] bg-[#d99a15]/10 border-[#d99a15]/30",
    },
    paid: {
      label: "Paid",
      dot: "#12a366",
      cls: "text-[#0f9d63] bg-[#12a366]/10 border-[#12a366]/30",
    },
  };
  const s = map[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium ${s.cls}`}
    >
      <span
        className="h-1.5 w-1.5 rounded-full"
        style={{ background: s.dot }}
      />
      {s.label}
    </span>
  );
}

export function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[11px] font-medium uppercase tracking-wider text-fg-dim">
        {label}
      </span>
      {children}
      {hint && <span className="mt-1 block text-[11px] text-fg-dim">{hint}</span>}
    </label>
  );
}

export const inputCls =
  "w-full rounded-xl border border-black/10 bg-black/[0.03] px-3.5 py-2.5 text-sm text-fg outline-none transition placeholder:text-fg-dim focus:border-iris/60 focus:bg-black/[0.05] focus:ring-2 focus:ring-iris/20";
