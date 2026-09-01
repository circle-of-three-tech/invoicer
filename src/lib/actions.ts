"use server";

import type { Prisma } from "@prisma/client";
import { prisma } from "./db";
import { nextNumber } from "./format";
import { sendDocumentEmail } from "./email";
import type {
  Company,
  Invoice,
  InvoiceStatus,
  PaymentMethod,
  Receipt,
} from "./types";

const COMPANY_ID = "default";

const DEFAULT_COMPANY: Company = {
  name: "Circle of Three Technologies",
  email: "circleofthreetechnologies@gmail.com",
  phone: "+1 (000) 000-0000",
  address: "123 Innovation Way\nTech City",
  taxId: "",
  currency: "USD",
  accent: "iris",
};

/* -------------------------------------------------------------------------- */
/*  Mappers: flat DB rows <-> nested app types                                 */
/* -------------------------------------------------------------------------- */

type DbInvoice = Prisma.InvoiceGetPayload<{ include: { items: true } }>;
type DbReceipt = Prisma.ReceiptGetPayload<object>;
type DbCompany = Prisma.CompanyGetPayload<object>;

function mapCompany(row: DbCompany): Company {
  return {
    name: row.name,
    email: row.email,
    phone: row.phone,
    address: row.address,
    taxId: row.taxId,
    currency: row.currency,
    accent: row.accent,
    logoDataUrl: row.logoDataUrl ?? undefined,
  };
}

function mapInvoice(row: DbInvoice): Invoice {
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
    items: [...row.items]
      .sort((a, b) => a.position - b.position)
      .map((it) => ({
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
  };
}

function mapReceipt(row: DbReceipt): Receipt {
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
  };
}

function invoiceScalarData(inv: Invoice) {
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

/* -------------------------------------------------------------------------- */
/*  Seed (runs once, when the company row does not yet exist)                   */
/* -------------------------------------------------------------------------- */

async function seedIfEmpty(): Promise<void> {
  const existing = await prisma.company.findUnique({ where: { id: COMPANY_ID } });
  if (existing) return;

  const now = new Date();
  const iso = (days: number) => {
    const d = new Date(now);
    d.setDate(d.getDate() + days);
    return d.toISOString().slice(0, 10);
  };
  const full = (days: number) => {
    const d = new Date(now);
    d.setDate(d.getDate() + days);
    return d.toISOString();
  };

  await prisma.company.create({
    data: { id: COMPANY_ID, ...DEFAULT_COMPANY, logoDataUrl: null },
  });

  const from = {
    fromName: DEFAULT_COMPANY.name,
    fromEmail: DEFAULT_COMPANY.email,
    fromAddress: DEFAULT_COMPANY.address,
    fromPhone: DEFAULT_COMPANY.phone,
  };

  await prisma.invoice.create({
    data: {
      id: "SEED-INV-0002",
      number: "INV-2026-0002",
      status: "sent",
      issueDate: iso(-5),
      dueDate: iso(10),
      currency: "USD",
      ...from,
      toName: "Lumen Health",
      toEmail: "finance@lumen.health",
      toAddress: "500 Vitality Blvd\nAustin, TX",
      toPhone: "+1 (512) 555-0117",
      taxRate: 0,
      discount: 0,
      notes: "Net 15. Bank details on file.",
      accent: "aqua",
      createdAt: full(-5),
      items: {
        create: [
          { id: "SEED-INV2-IT1", description: "Mobile app — 2 week sprint", quantity: 2, rate: 6200, position: 0 },
          { id: "SEED-INV2-IT2", description: "QA & release management", quantity: 1, rate: 1500, position: 1 },
        ],
      },
    },
  });

  await prisma.invoice.create({
    data: {
      id: "SEED-INV-0001",
      number: "INV-2026-0001",
      status: "paid",
      issueDate: iso(-18),
      dueDate: iso(-3),
      currency: "USD",
      ...from,
      toName: "Northwind Studios",
      toEmail: "accounts@northwind.co",
      toAddress: "88 Harbour Street\nSeattle, WA",
      toPhone: "+1 (206) 555-0102",
      taxRate: 7.5,
      discount: 100,
      notes: "Thank you for your business. Payment received in full.",
      accent: "iris",
      createdAt: full(-18),
      paidAt: iso(-2),
      items: {
        create: [
          { id: "SEED-INV1-IT1", description: "Brand identity system", quantity: 1, rate: 2400, position: 0 },
          { id: "SEED-INV1-IT2", description: "Landing page design", quantity: 3, rate: 480, position: 1 },
        ],
      },
    },
  });
}

/* -------------------------------------------------------------------------- */
/*  Public server actions                                                      */
/* -------------------------------------------------------------------------- */

export async function bootstrap(): Promise<{
  company: Company;
  invoices: Invoice[];
  receipts: Receipt[];
}> {
  await seedIfEmpty();

  const [company, invoices, receipts] = await Promise.all([
    prisma.company.findUnique({ where: { id: COMPANY_ID } }),
    prisma.invoice.findMany({
      include: { items: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.receipt.findMany({ orderBy: { createdAt: "desc" } }),
  ]);

  return {
    company: company ? mapCompany(company) : { ...DEFAULT_COMPANY },
    invoices: invoices.map(mapInvoice),
    receipts: receipts.map(mapReceipt),
  };
}

export async function resetDemo(): Promise<{
  company: Company;
  invoices: Invoice[];
  receipts: Receipt[];
}> {
  await prisma.$transaction([
    prisma.receipt.deleteMany({}),
    prisma.lineItem.deleteMany({}),
    prisma.invoice.deleteMany({}),
    prisma.company.deleteMany({}),
  ]);
  return bootstrap();
}

export async function saveCompany(company: Company): Promise<void> {
  const data = {
    name: company.name,
    email: company.email,
    phone: company.phone,
    address: company.address,
    taxId: company.taxId,
    currency: company.currency,
    accent: company.accent,
    logoDataUrl: company.logoDataUrl ?? null,
  };
  await prisma.company.upsert({
    where: { id: COMPANY_ID },
    create: { id: COMPANY_ID, ...data },
    update: data,
  });
}

export async function saveInvoice(inv: Invoice): Promise<void> {
  const scalar = invoiceScalarData(inv);
  const items = inv.items.map((it, position) => ({
    id: it.id,
    description: it.description,
    quantity: Number(it.quantity) || 0,
    rate: Number(it.rate) || 0,
    position,
  }));

  // Replace line items wholesale — simplest correct approach for a small doc.
  await prisma.$transaction([
    prisma.invoice.upsert({
      where: { id: inv.id },
      create: { id: inv.id, ...scalar },
      update: scalar,
    }),
    prisma.lineItem.deleteMany({ where: { invoiceId: inv.id } }),
    prisma.lineItem.createMany({
      data: items.map((it) => ({ ...it, invoiceId: inv.id })),
    }),
  ]);
}

export async function deleteInvoice(id: string): Promise<void> {
  // Line items cascade; receipts reference the invoice loosely, remove them too.
  await prisma.$transaction([
    prisma.receipt.deleteMany({ where: { invoiceId: id } }),
    prisma.invoice.delete({ where: { id } }),
  ]);
}

export async function createReceipt(
  invoiceId: string,
  data: Pick<Receipt, "amount" | "method" | "reference" | "paidAt">,
): Promise<Receipt | null> {
  const inv = await prisma.invoice.findUnique({ where: { id: invoiceId } });
  if (!inv) return null;

  const existing = await prisma.receipt.findMany({ select: { number: true } });
  const number = nextNumber(
    "RCPT",
    existing.map((r) => r.number),
  );
  const id = `RCPT-${Date.now().toString(36).toUpperCase()}`;

  const [receipt] = await prisma.$transaction([
    prisma.receipt.create({
      data: {
        id,
        number,
        invoiceId: inv.id,
        invoiceNumber: inv.number,
        amount: data.amount,
        currency: inv.currency,
        method: data.method,
        reference: data.reference,
        paidAt: data.paidAt,
        fromName: inv.fromName,
        fromEmail: inv.fromEmail,
        fromAddress: inv.fromAddress,
        fromPhone: inv.fromPhone,
        toName: inv.toName,
        toEmail: inv.toEmail,
        toAddress: inv.toAddress,
        toPhone: inv.toPhone,
        createdAt: new Date().toISOString(),
      },
    }),
    prisma.invoice.update({
      where: { id: inv.id },
      data: { status: "paid", paidAt: data.paidAt, receiptId: id },
    }),
  ]);

  return mapReceipt(receipt);
}

export type SendResult = { ok: boolean; error?: string };

export async function sendInvoice(id: string): Promise<SendResult> {
  const row = await prisma.invoice.findUnique({
    where: { id },
    include: { items: true },
  });
  if (!row) return { ok: false, error: "Invoice not found." };

  const companyRow = await prisma.company.findUnique({ where: { id: COMPANY_ID } });
  const invoice = mapInvoice(row);
  if (!invoice.to.email) return { ok: false, error: "Client has no email address." };

  const result = await sendDocumentEmail({
    kind: "invoice",
    invoice,
    company: companyRow ? mapCompany(companyRow) : { ...DEFAULT_COMPANY },
  });
  if (!result.ok) return result;

  await prisma.invoice.update({
    where: { id },
    data: {
      sentAt: new Date().toISOString(),
      status: row.status === "draft" ? "sent" : row.status,
    },
  });
  return { ok: true };
}

export async function sendReceipt(id: string): Promise<SendResult> {
  const row = await prisma.receipt.findUnique({ where: { id } });
  if (!row) return { ok: false, error: "Receipt not found." };

  const companyRow = await prisma.company.findUnique({ where: { id: COMPANY_ID } });
  const receipt = mapReceipt(row);
  if (!receipt.to.email) return { ok: false, error: "Client has no email address." };

  const result = await sendDocumentEmail({
    kind: "receipt",
    receipt,
    company: companyRow ? mapCompany(companyRow) : { ...DEFAULT_COMPANY },
  });
  if (!result.ok) return result;

  await prisma.receipt.update({
    where: { id },
    data: { sentAt: new Date().toISOString() },
  });
  return { ok: true };
}
