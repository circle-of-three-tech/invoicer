import "server-only";
import { prisma } from "./db";
import {
  COMPANY_FIELDS,
  COMPANY_ID,
  DEFAULT_COMPANY,
  mapCompany,
  mapInvoice,
  mapReceipt,
} from "./mappers";
import type { Snapshot } from "./types";

/**
 * Read side of the data layer.
 *
 * These are plain server functions rather than Server Actions on purpose: the
 * layout calls them during the server render, so the browser gets the data in
 * the initial HTML instead of paying for a POST round-trip after hydration —
 * and no read endpoint is exposed publicly.
 */

export type { Snapshot } from "./types";

export async function loadSnapshot(): Promise<Snapshot> {
  const [company, invoices, receipts] = await Promise.all([
    // Selecting explicitly leaves `logoDataUrl` in the database, where it
    // belongs: the bytes are served once from /api/logo and cached, rather
    // than re-read and re-serialised on every page load.
    prisma.company.findUnique({
      where: { id: COMPANY_ID },
      select: COMPANY_FIELDS,
    }),
    prisma.invoice.findMany({
      // Order the items in SQL so the mapper does not sort in JS per invoice.
      include: { items: { orderBy: { position: "asc" } } },
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

/** The snapshot the UI falls back to when the database is unreachable. */
export const EMPTY_SNAPSHOT: Snapshot = {
  company: { ...DEFAULT_COMPANY },
  invoices: [],
  receipts: [],
};
