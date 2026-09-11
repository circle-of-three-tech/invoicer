"use client";

import { motion } from "framer-motion";
import type { Company, Invoice, PaymentDetail, Receipt } from "@/lib/types";
import { formatDate, lineTotal, logoUrl, money, totals } from "@/lib/format";
import { accent, accentGradient } from "@/lib/accents";
import { paymentKind } from "@/lib/payments";

function Triad({ color = "#7c5cff" }: { color?: string }) {
  return (
    <svg width="30" height="30" viewBox="0 0 48 48" fill="none">
      <circle cx="24" cy="15" r="9.5" stroke={color} strokeWidth="2.4" />
      <circle cx="15.5" cy="30" r="9.5" stroke={color} strokeWidth="2.4" opacity="0.7" />
      <circle cx="32.5" cy="30" r="9.5" stroke={color} strokeWidth="2.4" opacity="0.5" />
      <circle cx="24" cy="24" r="2.6" fill={color} />
    </svg>
  );
}

/* Paper wrapper — light "document" surface that also prints cleanly */
export function Paper({
  children,
  accentKey,
}: {
  children: React.ReactNode;
  accentKey?: string;
}) {
  const a = accent(accentKey);
  return (
    <motion.div
      initial={{ opacity: 0, y: 24, rotateX: 6 }}
      animate={{ opacity: 1, y: 0, rotateX: 0 }}
      transition={{ type: "spring", stiffness: 90, damping: 16 }}
      className="print-area relative mx-auto w-full max-w-[820px] overflow-hidden rounded-2xl bg-white text-[#14151c] shadow-[0_40px_120px_-40px_rgba(0,0,0,0.7)]"
      style={{ transformPerspective: 1200 }}
    >
      <div className="h-1.5 w-full" style={{ background: accentGradient(a.key) }} />
      <div
        className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full opacity-[0.08] blur-2xl"
        style={{ background: accentGradient(a.key) }}
      />
      <div className="relative p-8 sm:p-11">{children}</div>
    </motion.div>
  );
}

function PartyBlock({
  label,
  name,
  email,
  address,
  phone,
  color,
}: {
  label: string;
  name: string;
  email: string;
  address: string;
  phone: string;
  color: string;
}) {
  return (
    <div>
      <div
        className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.2em]"
        style={{ color }}
      >
        {label}
      </div>
      <div className="text-[15px] font-semibold text-[#14151c]">
        {name || "—"}
      </div>
      {address && (
        <div className="mt-0.5 whitespace-pre-line text-[12.5px] leading-relaxed text-[#5a5d70]">
          {address}
        </div>
      )}
      {email && <div className="text-[12.5px] text-[#5a5d70]">{email}</div>}
      {phone && <div className="text-[12.5px] text-[#5a5d70]">{phone}</div>}
    </div>
  );
}

/** "How to pay" — the enabled payment methods, printed under the totals. */
function PaymentDetailsBlock({
  details,
  color,
}: {
  details: PaymentDetail[];
  color: string;
}) {
  return (
    <div className="mt-8 rounded-xl border border-[#eceef4] p-4">
      <div
        className="mb-3 text-[10px] font-semibold uppercase tracking-wider"
        style={{ color }}
      >
        How to pay
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {details.map((d) => {
          const meta = paymentKind(d.kind);
          return (
            <div key={d.id} className="rounded-lg bg-[#f7f8fc] p-3">
              <div className="text-[12.5px] font-semibold text-[#20222c]">
                {d.label || meta.label}
              </div>
              <div className="text-[10px] uppercase tracking-wider text-[#a2a5b8]">
                {meta.label}
              </div>
              {d.details && (
                <div className="mt-1.5 whitespace-pre-line text-[12px] leading-relaxed text-[#5a5d70]">
                  {d.details}
                </div>
              )}
              {d.url && (
                <a
                  href={d.url}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="mt-2 inline-block break-all rounded-lg px-3 py-1.5 text-[11.5px] font-semibold text-white"
                  style={{ background: color }}
                >
                  {meta.action} →
                </a>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function InvoiceDocument({
  invoice,
  logoVersion,
  paymentDetails = [],
}: {
  invoice: Invoice;
  logoVersion?: string;
  /**
   * The company's enabled payment methods. They live on the profile rather
   * than on the invoice, so a settings change is reflected on every unpaid
   * invoice at once — and a paid one stops asking for money.
   */
  paymentDetails?: PaymentDetail[];
}) {
  const logo = logoUrl(logoVersion);
  const a = accent(invoice.accent);
  const t = totals(invoice);
  const paid = invoice.status === "paid";

  return (
    <Paper accentKey={invoice.accent}>
      {paid && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div
            className="rotate-[-18deg] rounded-2xl border-[3px] px-8 py-3 text-4xl font-black uppercase tracking-widest opacity-[0.10]"
            style={{ color: a.solid, borderColor: a.solid }}
          >
            Paid
          </div>
        </div>
      )}

      {/* header */}
      <div className="flex items-start justify-between gap-6">
        <div className="flex items-center gap-3">
          {logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logo} alt="" className="h-11 w-11 rounded-lg object-cover" />
          ) : (
            <Triad color={a.solid} />
          )}
          <div>
            <div className="text-[15px] font-bold leading-tight">{invoice.from.name}</div>
            <div className="text-[11.5px] text-[#7a7d92]">{invoice.from.email}</div>
          </div>
        </div>
        <div className="text-right">
          <div
            className="text-2xl font-black uppercase tracking-tight"
            style={{ color: a.solid }}
          >
            Invoice
          </div>
          <div className="font-mono text-[12.5px] text-[#5a5d70]">{invoice.number}</div>
        </div>
      </div>

      <div className="my-7 h-px w-full bg-[#ecedf3]" />

      {/* parties + meta */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
        <PartyBlock label="Billed To" {...invoice.to} color={a.solid} />
        <PartyBlock label="From" {...invoice.from} color={a.solid} />
        <div className="sm:text-right">
          <MetaRow label="Issued" value={formatDate(invoice.issueDate)} />
          <MetaRow label="Due" value={formatDate(invoice.dueDate)} />
          <MetaRow label="Currency" value={invoice.currency} />
        </div>
      </div>

      {/* items */}
      <div className="mt-8 overflow-hidden rounded-xl border border-[#eceef4]">
        <div
          className="grid grid-cols-[1fr_70px_110px_120px] gap-2 px-4 py-2.5 text-[10.5px] font-semibold uppercase tracking-wider text-white"
          style={{ background: accentGradient(a.key) }}
        >
          <div>Description</div>
          <div className="text-center">Qty</div>
          <div className="text-right">Rate</div>
          <div className="text-right">Amount</div>
        </div>
        {invoice.items.map((it, i) => (
          <div
            key={it.id}
            className={`grid grid-cols-[1fr_70px_110px_120px] gap-2 px-4 py-3 text-[13px] ${
              i % 2 ? "bg-[#fafbfe]" : "bg-white"
            }`}
          >
            <div className="font-medium text-[#20222c]">
              {it.description || <span className="text-[#b9bccb]">Item description</span>}
            </div>
            <div className="text-center text-[#5a5d70]">{it.quantity}</div>
            <div className="text-right text-[#5a5d70]">{money(it.rate, invoice.currency)}</div>
            <div className="text-right font-semibold text-[#20222c]">
              {money(lineTotal(it), invoice.currency)}
            </div>
          </div>
        ))}
      </div>

      {/* totals */}
      <div className="mt-6 flex justify-end">
        <div className="w-full max-w-[290px] space-y-1.5">
          <TotalRow label="Subtotal" value={money(t.sub, invoice.currency)} />
          {t.discount > 0 && (
            <TotalRow label="Discount" value={`− ${money(t.discount, invoice.currency)}`} />
          )}
          {invoice.taxRate > 0 && (
            <TotalRow
              label={`Tax (${invoice.taxRate}%)`}
              value={money(t.tax, invoice.currency)}
            />
          )}
          <div
            className="mt-2 flex items-center justify-between rounded-xl px-4 py-3 text-white"
            style={{ background: accentGradient(a.key) }}
          >
            <span className="text-[12px] font-semibold uppercase tracking-wider opacity-90">
              Total Due
            </span>
            <span className="font-mono text-lg font-bold">
              {money(t.total, invoice.currency)}
            </span>
          </div>
        </div>
      </div>

      {!paid && paymentDetails.length > 0 && (
        <PaymentDetailsBlock details={paymentDetails} color={a.solid} />
      )}

      {invoice.notes && (
        <div className="mt-8 rounded-xl bg-[#f7f8fc] p-4">
          <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider" style={{ color: a.solid }}>
            Notes
          </div>
          <p className="whitespace-pre-line text-[12.5px] leading-relaxed text-[#5a5d70]">
            {invoice.notes}
          </p>
        </div>
      )}

      <div className="mt-8 flex items-center justify-center gap-2 text-[11px] text-[#a7aabb]">
        <Triad color={a.solid} />
        <span>Generated with Circle of Three</span>
      </div>
    </Paper>
  );
}

export function ReceiptDocument({
  receipt,
  company,
}: {
  receipt: Receipt;
  company?: Company;
}) {
  const a = accent(company?.accent ?? "mint");
  const companyLogo = logoUrl(company?.logoVersion);
  return (
    <Paper accentKey={company?.accent ?? "mint"}>
      <div className="flex items-start justify-between gap-6">
        <div className="flex items-center gap-3">
          {companyLogo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={companyLogo} alt="" className="h-11 w-11 rounded-lg object-cover" />
          ) : (
            <Triad color={a.solid} />
          )}
          <div>
            <div className="text-[15px] font-bold leading-tight">{receipt.from.name}</div>
            <div className="text-[11.5px] text-[#7a7d92]">{receipt.from.email}</div>
          </div>
        </div>
        <div className="text-right">
          <div
            className="flex items-center gap-1.5 text-2xl font-black uppercase tracking-tight"
            style={{ color: a.solid }}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={a.solid} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 6L9 17l-5-5" />
            </svg>
            Receipt
          </div>
          <div className="font-mono text-[12.5px] text-[#5a5d70]">{receipt.number}</div>
        </div>
      </div>

      <div className="my-7 h-px w-full bg-[#ecedf3]" />

      {/* Amount hero */}
      <div className="flex flex-col items-center gap-1 py-3 text-center">
        <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#8a8da0]">
          Amount Paid
        </div>
        <div className="font-mono text-4xl font-black" style={{ color: a.solid }}>
          {money(receipt.amount, receipt.currency)}
        </div>
        <div className="text-[12px] text-[#7a7d92]">
          Received on {formatDate(receipt.paidAt)}
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2">
        <PartyBlock label="Received From" {...receipt.to} color={a.solid} />
        <div className="sm:text-right">
          <MetaRow label="For Invoice" value={receipt.invoiceNumber} />
          <MetaRow label="Payment Method" value={receipt.method} />
          {receipt.reference && <MetaRow label="Reference" value={receipt.reference} />}
        </div>
      </div>

      <div
        className="mt-8 flex items-center justify-between rounded-xl px-4 py-3 text-white"
        style={{ background: accentGradient(a.key) }}
      >
        <span className="text-[12px] font-semibold uppercase tracking-wider opacity-90">
          Status
        </span>
        <span className="font-mono text-sm font-bold">PAID IN FULL</span>
      </div>

      <div className="mt-8 flex items-center justify-center gap-2 text-[11px] text-[#a7aabb]">
        <Triad color={a.solid} />
        <span>Generated with Circle of Three</span>
      </div>
    </Paper>
  );
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="mb-1.5 flex items-center justify-between gap-4 sm:justify-end">
      <span className="text-[10px] font-semibold uppercase tracking-wider text-[#a2a5b8]">
        {label}
      </span>
      <span className="text-[12.5px] font-medium text-[#20222c]">{value}</span>
    </div>
  );
}

function TotalRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between px-1 text-[13px]">
      <span className="text-[#7a7d92]">{label}</span>
      <span className="font-medium text-[#20222c]">{value}</span>
    </div>
  );
}
