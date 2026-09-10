import "server-only";
import type { Prisma } from "@prisma/client";
import type {
  Company,
  Invoice,
  InvoiceStatus,
  PaymentMethod,
  Receipt,
} from "./types";

/** Flat DB rows <-> the nested shapes the UI works with. */

export const COMPANY_ID = "default";

export const DEFAULT_COMPANY: Company = {
  name: "Circle of Three Technologies",
  email: "circleofthreetechnologies@gmail.com",
  phone: "+1 (000) 000-0000",
  address: "123 Innovation Way\nTech City",
  taxId: "",
  currency: "USD",
  accent: "iris",
};

type DbInvoice = Prisma.InvoiceGetPayload<{ include: { items: true } }>;
type DbReceipt = Prisma.ReceiptGetPayload<object>;
/**
 * Everything about the company except the logo bytes. `loadSnapshot` selects
 * exactly these columns, so a 256 KB data URL is neither read from Postgres nor
 * serialised into the page on requests that only need the profile.
 */
export const COMPANY_FIELDS = {
  id: true,
  name: true,
  email: true,
  phone: true,
  address: true,
  taxId: true,
  currency: true,
  accent: true,
  logoVersion: true,
} as const;

type DbCompany = Prisma.CompanyGetPayload<{ select: typeof COMPANY_FIELDS }>;

export function mapCompany(row: DbCompany): Company {
  return {
    name: row.name,
    email: row.email,
    phone: row.phone,
    address: row.address,
    taxId: row.taxId,
    currency: row.currency,
    accent: row.accent,
    logoVersion: row.logoVersion ?? undefined,
  };
}

export function mapInvoice(row: DbInvoice): Invoice {
  return {
    id: row.id,
    number: row.number,
    status: row.status as InvoiceStatus,
    issueDate: row.issueDate,
    dueDate: row.dueDate,
    currency: row.currency,
    from: {
      name: row.fromName,
      email: row.fromEmail,
      address: row.fromAddress,
      phone: row.fromPhone,
    },
    to: {
      name: row.toName,
      email: row.toEmail,
      address: row.toAddress,
      phone: row.toPhone,
    },
    // Ordered by `position` in the query, so no re-sort is needed here.
    items: row.items.map((it) => ({
      id: it.id,
      description: it.description,
      quantity: it.quantity,
      rate: it.rate,
    })),
    taxRate: row.taxRate,
    discount: row.discount,
    notes: row.notes,
    accent: row.accent,
    createdAt: row.createdAt,
    paidAt: row.paidAt ?? undefined,
    receiptId: row.receiptId ?? undefined,
    sentAt: row.sentAt ?? undefined,
  };
}

export function mapReceipt(row: DbReceipt): Receipt {
  return {
    id: row.id,
    number: row.number,
    invoiceId: row.invoiceId,
    invoiceNumber: row.invoiceNumber,
    amount: row.amount,
    currency: row.currency,
    method: row.method as PaymentMethod,
    reference: row.reference,
    paidAt: row.paidAt,
    from: {
      name: row.fromName,
      email: row.fromEmail,
      address: row.fromAddress,
      phone: row.fromPhone,
    },
    to: {
      name: row.toName,
      email: row.toEmail,
      address: row.toAddress,
      phone: row.toPhone,
    },
    createdAt: row.createdAt,
    sentAt: row.sentAt ?? undefined,
  };
}

/** The invoice's own columns, without its line items. */
export function invoiceScalarData(inv: Invoice) {
  return {
    number: inv.number,
    status: inv.status,
    issueDate: inv.issueDate,
    dueDate: inv.dueDate,
    currency: inv.currency,
    fromName: inv.from.name,
    fromEmail: inv.from.email,
    fromAddress: inv.from.address,
    fromPhone: inv.from.phone,
    toName: inv.to.name,
    toEmail: inv.to.email,
    toAddress: inv.to.address,
    toPhone: inv.to.phone,
    taxRate: inv.taxRate,
    discount: inv.discount,
    notes: inv.notes,
    accent: inv.accent,
    createdAt: inv.createdAt,
    paidAt: inv.paidAt ?? null,
    receiptId: inv.receiptId ?? null,
  };
}
