import "server-only";
import { prisma } from "./db";
import { COMPANY_ID, DEFAULT_COMPANY } from "./mappers";

/**
 * Sample data for demos and local development.
 *
 * This used to run on every page load; it is now explicit, so a real deployment
 * never has invented invoices appear in it.
 */
export async function seedDemoData(): Promise<void> {
  const now = new Date();
  const day = (days: number) => {
    const d = new Date(now);
    d.setDate(d.getDate() + days);
    return d.toISOString().slice(0, 10);
  };
  const stamp = (days: number) => {
    const d = new Date(now);
    d.setDate(d.getDate() + days);
    return d.toISOString();
  };

  await prisma.company.upsert({
    where: { id: COMPANY_ID },
    create: { id: COMPANY_ID, ...DEFAULT_COMPANY, logoDataUrl: null },
    update: {},
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
      issueDate: day(-5),
      dueDate: day(10),
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
      createdAt: stamp(-5),
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
      issueDate: day(-18),
      dueDate: day(-3),
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
      createdAt: stamp(-18),
      paidAt: day(-2),
      items: {
        create: [
          { id: "SEED-INV1-IT1", description: "Brand identity system", quantity: 1, rate: 2400, position: 0 },
          { id: "SEED-INV1-IT2", description: "Landing page design", quantity: 3, rate: 480, position: 1 },
        ],
      },
    },
  });
}

/** Ensures the company profile row exists, without inventing any documents. */
export async function ensureCompanyRow(): Promise<void> {
  await prisma.company.upsert({
    where: { id: COMPANY_ID },
    create: { id: COMPANY_ID, ...DEFAULT_COMPANY, logoDataUrl: null },
    update: {},
  });
}
