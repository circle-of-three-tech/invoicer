import type { Invoice, LineItem } from "./types";

export const CURRENCIES: Record<string, { symbol: string; label: string }> = {
  NGN: { symbol: "₦", label: "Nigerian Naira" },
  USD: { symbol: "$", label: "US Dollar" },
};

export function currencySymbol(code: string) {
  return CURRENCIES[code]?.symbol ?? code + " ";
}

/**
 * Documents render on the server and hydrate on the client, so formatting must
 * be pinned to one locale. Left to the runtime default, Node would produce
 * "4,020.50 / Sep 15, 2026" while a German or British browser produced
 * "4.020,50 / 15. Sept. 2026" — a hydration mismatch on every invoice.
 */
const LOCALE = "en-US";

// Constructing an `Intl` formatter is expensive relative to using one, and a
// long invoice formats every rate, line total and date. Build each once.
const moneyFormatter = new Intl.NumberFormat(LOCALE, {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const countFormatter = new Intl.NumberFormat(LOCALE);

const dateFormatter = new Intl.DateTimeFormat(LOCALE, {
  year: "numeric",
  month: "short",
  day: "numeric",
});

export function money(amount: number, currency = "USD") {
  const value = Number.isFinite(amount) ? amount : 0;
  return `${currencySymbol(currency)}${moneyFormatter.format(value)}`;
}

/** Whole-number formatting that matches `money`'s locale. */
export function count(value: number) {
  return countFormatter.format(Math.round(value));
}

export function lineTotal(item: LineItem) {
  return (Number(item.quantity) || 0) * (Number(item.rate) || 0);
}

export function subtotal(items: LineItem[]) {
  return items.reduce((sum, it) => sum + lineTotal(it), 0);
}

export function totals(inv: Pick<Invoice, "items" | "taxRate" | "discount">) {
  const sub = subtotal(inv.items);
  const discount = Number(inv.discount) || 0;
  const taxed = Math.max(sub - discount, 0);
  const tax = taxed * ((Number(inv.taxRate) || 0) / 100);
  const total = taxed + tax;
  return { sub, discount, tax, total };
}

export function formatDate(iso: string) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return dateFormatter.format(d);
}

export function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export function addDaysISO(days: number) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export function uid() {
  return (
    Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
  ).toUpperCase();
}

/** The `PREFIX-YYYY-` stem that this year's document numbers share. */
export function numberPrefix(prefix: string, year = new Date().getFullYear()) {
  return `${prefix}-${year}-`;
}

/**
 * The next number in the `PREFIX-YYYY-NNNN` series.
 *
 * Only the counters from the current year are considered, so a hand-edited
 * number from a previous year cannot drag the sequence along with it.
 */
export function nextNumber(prefix: string, existing: string[]) {
  const year = new Date().getFullYear();
  const stem = numberPrefix(prefix, year);
  const max = existing.reduce((highest, candidate) => {
    if (!candidate.startsWith(stem)) return highest;
    const parsed = parseInt(candidate.slice(stem.length), 10);
    return Number.isFinite(parsed) && parsed > highest ? parsed : highest;
  }, 0);
  return `${stem}${String(max + 1).padStart(4, "0")}`;
}
