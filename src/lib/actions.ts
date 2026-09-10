"use server";

import { createHash, randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "./db";
import { allowDemoData } from "./env";
import { loadSnapshot, type Snapshot } from "./data";
import { sendDocumentEmail } from "./email";
import { nextNumber, numberPrefix } from "./format";
import {
  COMPANY_FIELDS,
  COMPANY_ID,
  DEFAULT_COMPANY,
  invoiceScalarData,
  mapCompany,
  mapInvoice,
  mapReceipt,
} from "./mappers";
import { rateLimit } from "./rate-limit";
import { requireSession } from "./session";
import { seedDemoData } from "./seed";
import type { Company, Invoice, Receipt } from "./types";
import {
  ValidationError,
  id as parseId,
  parseCompany,
  parseInvoice,
  parsePayment,
} from "./validate";

/**
 * Write side of the data layer.
 *
 * Every export here is a public POST endpoint, so each one authorises first and
 * validates its input before touching the database. Failures come back as
 * `{ ok: false, error }` rather than thrown errors, so the UI can show them.
 */

export type ActionResult<T = undefined> =
  | ({ ok: true } & (T extends undefined ? { data?: never } : { data: T }))
  | { ok: false; error: string };

function failure(error: unknown): { ok: false; error: string } {
  if (error instanceof ValidationError) return { ok: false, error: error.message };
  // Anything else may carry internal detail (SQL, connection strings), so log
  // it server-side and hand the client a generic message.
  console.error("[action]", error);
  return { ok: false, error: "Something went wrong. Please try again." };
}

/* -------------------------------------------------------------------------- */
/*  Document numbering                                                         */
/* -------------------------------------------------------------------------- */

/**
 * Numbers are `PREFIX-YYYY-NNNN` and zero-padded, so within one year's prefix
 * the lexicographically greatest row is also the highest number — a single
 * indexed lookup instead of reading every number in the table.
 *
 * Scoping to this year's prefix matters: numbers are editable, so an invoice
 * hand-numbered "ZZZ" would otherwise sort to the top and yield a suggestion
 * that starts back at 0001 and collides forever.
 */
async function nextInvoiceNumber(): Promise<string> {
  const stem = numberPrefix("INV");
  const latest = await prisma.invoice.findFirst({
    where: { number: { startsWith: stem } },
    orderBy: { number: "desc" },
    select: { number: true },
  });
  return nextNumber("INV", latest ? [latest.number] : []);
}

async function nextReceiptNumber(): Promise<string> {
  const stem = numberPrefix("RCPT");
  const latest = await prisma.receipt.findFirst({
    where: { number: { startsWith: stem } },
    orderBy: { number: "desc" },
    select: { number: true },
  });
  return nextNumber("RCPT", latest ? [latest.number] : []);
}

function isDuplicateNumber(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002" &&
    String(error.meta?.target ?? "").includes("number")
  );
}

/** The next free invoice number, so the builder can prefill one. */
export async function suggestInvoiceNumber(): Promise<ActionResult<string>> {
  try {
    await requireSession();
    return { ok: true, data: await nextInvoiceNumber() };
  } catch (error) {
    return failure(error);
  }
}

/* -------------------------------------------------------------------------- */
/*  Company                                                                    */
/* -------------------------------------------------------------------------- */

/** An opaque, stable stamp for a logo's bytes — the cache key for /api/logo. */
function logoVersionOf(dataUrl: string): string {
  return createHash("sha256").update(dataUrl).digest("hex").slice(0, 32);
}

export async function saveCompany(input: unknown): Promise<ActionResult<Company>> {
  try {
    await requireSession();
    const company = parseCompany(input);
    const profile = {
      name: company.name,
      email: company.email,
      phone: company.phone,
      address: company.address,
      taxId: company.taxId,
      currency: company.currency,
      accent: company.accent,
    };

    // `logoDataUrl` is tri-state: undefined leaves the stored logo untouched
    // (the client does not hold the bytes, so it cannot round-trip them), null
    // removes it, and a data URL replaces it.
    const logo =
      company.logoDataUrl === undefined
        ? {}
        : company.logoDataUrl === null
          ? { logoDataUrl: null, logoVersion: null }
          : {
              logoDataUrl: company.logoDataUrl,
              logoVersion: logoVersionOf(company.logoDataUrl),
            };

    const row = await prisma.company.upsert({
      where: { id: COMPANY_ID },
      create: { id: COMPANY_ID, ...profile, ...logo },
      update: { ...profile, ...logo },
      select: COMPANY_FIELDS,
    });
    // Handing the saved row back lets the store pick up the new `logoVersion`
    // without reloading the whole workspace.
    return { ok: true, data: mapCompany(row) };
  } catch (error) {
    return failure(error);
  }
}

/* -------------------------------------------------------------------------- */
/*  Invoices                                                                   */
/* -------------------------------------------------------------------------- */

async function writeInvoice(inv: Invoice): Promise<Invoice> {
  const scalar = invoiceScalarData(inv);
  const items = inv.items.map((it, position) => ({
    id: it.id,
    invoiceId: inv.id,
    description: it.description,
    quantity: it.quantity,
    rate: it.rate,
    position,
  }));

  // One round-trip, and atomic: the invoice never exists with a half-written
  // set of line items. Replacing them wholesale is the simplest correct edit
  // for a document this small.
  const [row] = await prisma.$transaction([
    prisma.invoice.upsert({
      where: { id: inv.id },
      create: { id: inv.id, ...scalar },
      update: scalar,
    }),
    prisma.lineItem.deleteMany({ where: { invoiceId: inv.id } }),
    prisma.lineItem.createMany({ data: items }),
  ]);

  return { ...inv, number: row.number };
}

export async function saveInvoice(input: unknown): Promise<ActionResult<Invoice>> {
  try {
    await requireSession();
    const invoice = parseInvoice(input);

    // Two tabs (or two people) can pick the same number. Each retry re-reads
    // the highest number, which now includes the row that just won the race, so
    // the sequence converges instead of colliding on the same value again.
    let candidate = invoice;
    for (let attempt = 0; attempt < 4; attempt++) {
      try {
        return { ok: true, data: await writeInvoice(candidate) };
      } catch (error) {
        if (!isDuplicateNumber(error)) throw error;
        candidate = { ...invoice, number: await nextInvoiceNumber() };
      }
    }
    return {
      ok: false,
      error: "That invoice number is already taken. Try a different one.",
    };
  } catch (error) {
    return failure(error);
  }
}

export async function deleteInvoice(input: unknown): Promise<ActionResult> {
  try {
    await requireSession();
    const invoiceId = parseId(input, "Invoice id");
    // Line items cascade; receipts reference the invoice loosely, so remove
    // them explicitly in the same transaction.
    await prisma.$transaction([
      prisma.receipt.deleteMany({ where: { invoiceId } }),
      prisma.invoice.delete({ where: { id: invoiceId } }),
    ]);
    return { ok: true };
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      // Already gone — the caller's intent is satisfied either way.
      return { ok: true };
    }
    return failure(error);
  }
}

/* -------------------------------------------------------------------------- */
/*  Receipts                                                                   */
/* -------------------------------------------------------------------------- */

export async function createReceipt(
  invoiceIdInput: unknown,
  paymentInput: unknown,
): Promise<ActionResult<Receipt>> {
  try {
    await requireSession();
    const invoiceId = parseId(invoiceIdInput, "Invoice id");
    const payment = parsePayment(paymentInput);

    const inv = await prisma.invoice.findUnique({ where: { id: invoiceId } });
    if (!inv) return { ok: false, error: "That invoice no longer exists." };

    // Two payments recorded in the same millisecond would otherwise be handed
    // the same id, and the resulting collision is on `id` rather than `number`
    // — so the retry below would not catch it and the save would just fail.
    const id = `RCPT-${Date.now().toString(36).toUpperCase()}-${randomUUID()
      .replace(/-/g, "")
      .slice(0, 8)
      .toUpperCase()}`;

    // Recording a payment races the same way saving an invoice does: two
    // clients can read the same highest receipt number before either writes.
    // Each retry re-reads it, so the sequence converges.
    for (let attempt = 0; attempt < 4; attempt++) {
      try {
        const [receipt] = await prisma.$transaction([
          prisma.receipt.create({
            data: {
              id,
              number: await nextReceiptNumber(),
              invoiceId: inv.id,
              invoiceNumber: inv.number,
              amount: payment.amount,
              currency: inv.currency,
              method: payment.method,
              reference: payment.reference,
              paidAt: payment.paidAt,
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
            data: { status: "paid", paidAt: payment.paidAt, receiptId: id },
          }),
        ]);

        return { ok: true, data: mapReceipt(receipt) };
      } catch (error) {
        if (!isDuplicateNumber(error)) throw error;
      }
    }

    return {
      ok: false,
      error: "Could not allocate a receipt number. Please try again.",
    };
  } catch (error) {
    return failure(error);
  }
}

/* -------------------------------------------------------------------------- */
/*  Email                                                                      */
/* -------------------------------------------------------------------------- */

/**
 * Sending burns a real SMTP quota and lands in someone's inbox, so it is capped
 * twice: per document (no accidental double-sends or resend loops) and overall
 * (the mailbox cannot be turned into a relay by a stolen session).
 */
function checkSendQuota(documentId: string): string | null {
  const perDocument = rateLimit(`send:${documentId}`, 5, 60 * 60);
  if (!perDocument.ok) {
    return `This document was emailed several times already. Try again in ${Math.ceil(
      perDocument.retryAfterSeconds / 60,
    )} minutes.`;
  }
  const overall = rateLimit("send:all", 100, 60 * 60);
  if (!overall.ok) {
    return "Hourly email limit reached. Please try again later.";
  }
  return null;
}

export async function sendInvoice(input: unknown): Promise<ActionResult> {
  try {
    await requireSession();
    const invoiceId = parseId(input, "Invoice id");

    const quotaError = checkSendQuota(invoiceId);
    if (quotaError) return { ok: false, error: quotaError };

    const [row, companyRow] = await Promise.all([
      prisma.invoice.findUnique({
        where: { id: invoiceId },
        include: { items: { orderBy: { position: "asc" } } },
      }),
      prisma.company.findUnique({
        where: { id: COMPANY_ID },
        select: COMPANY_FIELDS,
      }),
    ]);
    if (!row) return { ok: false, error: "Invoice not found." };

    const invoice = mapInvoice(row);
    if (!invoice.to.email) return { ok: false, error: "Client has no email address." };

    const result = await sendDocumentEmail({
      kind: "invoice",
      invoice,
      company: companyRow ? mapCompany(companyRow) : { ...DEFAULT_COMPANY },
    });
    if (!result.ok) return result;

    await prisma.invoice.update({
      where: { id: invoiceId },
      data: {
        sentAt: new Date().toISOString(),
        status: row.status === "draft" ? "sent" : row.status,
      },
    });
    return { ok: true };
  } catch (error) {
    return failure(error);
  }
}

export async function sendReceipt(input: unknown): Promise<ActionResult> {
  try {
    await requireSession();
    const receiptId = parseId(input, "Receipt id");

    const quotaError = checkSendQuota(receiptId);
    if (quotaError) return { ok: false, error: quotaError };

    const [row, companyRow] = await Promise.all([
      prisma.receipt.findUnique({ where: { id: receiptId } }),
      prisma.company.findUnique({
        where: { id: COMPANY_ID },
        select: COMPANY_FIELDS,
      }),
    ]);
    if (!row) return { ok: false, error: "Receipt not found." };

    const receipt = mapReceipt(row);
    if (!receipt.to.email) return { ok: false, error: "Client has no email address." };

    const result = await sendDocumentEmail({
      kind: "receipt",
      receipt,
      company: companyRow ? mapCompany(companyRow) : { ...DEFAULT_COMPANY },
    });
    if (!result.ok) return result;

    await prisma.receipt.update({
      where: { id: receiptId },
      data: { sentAt: new Date().toISOString() },
    });
    return { ok: true };
  } catch (error) {
    return failure(error);
  }
}

/* -------------------------------------------------------------------------- */
/*  Demo data (opt-in only)                                                    */
/* -------------------------------------------------------------------------- */

/**
 * Wipes every invoice, receipt and setting, then reinstates the sample data.
 * Guarded by ALLOW_DEMO_DATA so it cannot be reached on a real deployment even
 * with a valid session.
 */
export async function resetDemo(): Promise<ActionResult<Snapshot>> {
  try {
    await requireSession();
    if (!allowDemoData()) {
      return {
        ok: false,
        error: "Demo data is disabled on this deployment.",
      };
    }

    await prisma.$transaction([
      prisma.receipt.deleteMany({}),
      prisma.lineItem.deleteMany({}),
      prisma.invoice.deleteMany({}),
      prisma.company.deleteMany({}),
    ]);
    await seedDemoData();
    return { ok: true, data: await loadSnapshot() };
  } catch (error) {
    return failure(error);
  }
}
