import type { Invoice, LineItem } from "./types";

export const CURRENCIES: Record<string, { symbol: string; label: string }> = {
  NGN: { symbol: "₦", label: "Nigerian Naira" },
  USD: { symbol: "$", label: "US Dollar" },
};

export function currencySymbol(code: string) {
  return CURRENCIES[code]?.symbol ?? code + " ";
}

export function money(amount: number, currency = "USD") {
  const value = Number.isFinite(amount) ? amount : 0;
  return `${currencySymbol(currency)}${value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
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
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
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

export function nextNumber(prefix: string, existing: string[]) {
  const year = new Date().getFullYear();
  const nums = existing
    .map((n) => {
      const m = n.match(/(\d+)$/);
      return m ? parseInt(m[1], 10) : 0;
    })
    .filter((n) => Number.isFinite(n));
  const max = nums.length ? Math.max(...nums) : 0;
  return `${prefix}-${year}-${String(max + 1).padStart(4, "0")}`;
}
