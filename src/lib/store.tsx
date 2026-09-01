"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { Company, Invoice, Receipt } from "./types";
import { addDaysISO, nextNumber, todayISO, uid } from "./format";

const KEY = "co3.store.v1";

type StoreShape = {
  company: Company;
  invoices: Invoice[];
  receipts: Receipt[];
};

const DEFAULT_COMPANY: Company = {
  name: "Circle of Three Technologies",
  email: "circleofthreetechnologies@gmail.com",
  phone: "+1 (000) 000-0000",
  address: "123 Innovation Way\nTech City",
  taxId: "",
  currency: "USD",
  accent: "iris",
};

function seed(): StoreShape {
  const company = { ...DEFAULT_COMPANY };
  const inv1: Invoice = {
    id: "SEED-INV-0001",
    number: "INV-2026-0001",
    status: "paid",
    issueDate: addDaysISO(-18),
    dueDate: addDaysISO(-3),
    currency: "USD",
    from: {
      name: company.name,
      email: company.email,
      address: company.address,
      phone: company.phone,
    },
    to: {
      name: "Northwind Studios",
      email: "accounts@northwind.co",
      address: "88 Harbour Street\nSeattle, WA",
      phone: "+1 (206) 555-0102",
    },
    items: [
      { id: "SEED-INV1-IT1", description: "Brand identity system", quantity: 1, rate: 2400 },
      { id: "SEED-INV1-IT2", description: "Landing page design", quantity: 3, rate: 480 },
    ],
    taxRate: 7.5,
    discount: 100,
    notes: "Thank you for your business. Payment received in full.",
    accent: "iris",
    createdAt: addDaysISO(-18),
    paidAt: addDaysISO(-2),
  };
  const inv2: Invoice = {
    id: "SEED-INV-0002",
    number: "INV-2026-0002",
    status: "sent",
    issueDate: addDaysISO(-5),
    dueDate: addDaysISO(10),
    currency: "USD",
    from: {
      name: company.name,
      email: company.email,
      address: company.address,
      phone: company.phone,
    },
    to: {
      name: "Lumen Health",
      email: "finance@lumen.health",
      address: "500 Vitality Blvd\nAustin, TX",
      phone: "+1 (512) 555-0117",
    },
    items: [
      { id: "SEED-INV2-IT1", description: "Mobile app — 2 week sprint", quantity: 2, rate: 6200 },
      { id: "SEED-INV2-IT2", description: "QA & release management", quantity: 1, rate: 1500 },
    ],
    taxRate: 0,
    discount: 0,
    notes: "Net 15. Bank details on file.",
    accent: "aqua",
    createdAt: addDaysISO(-5),
  };
  return { company, invoices: [inv2, inv1], receipts: [] };
}

function load(): StoreShape {
  if (typeof window === "undefined") return seed();
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return seed();
    const parsed = JSON.parse(raw) as StoreShape;
    return {
      company: { ...DEFAULT_COMPANY, ...parsed.company },
      invoices: parsed.invoices ?? [],
      receipts: parsed.receipts ?? [],
    };
  } catch {
    return seed();
  }
}

type StoreCtx = {
  ready: boolean;
  company: Company;
  invoices: Invoice[];
  receipts: Receipt[];
  saveCompany: (c: Company) => void;
  blankInvoice: () => Invoice;
  upsertInvoice: (inv: Invoice) => void;
  deleteInvoice: (id: string) => void;
  getInvoice: (id: string) => Invoice | undefined;
  getReceipt: (id: string) => Receipt | undefined;
  createReceipt: (
    invoiceId: string,
    data: Pick<Receipt, "amount" | "method" | "reference" | "paidAt">
  ) => Receipt | undefined;
  resetDemo: () => void;
};

const Ctx = createContext<StoreCtx | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<StoreShape>(() => seed());
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setState(load());
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    localStorage.setItem(KEY, JSON.stringify(state));
  }, [state, ready]);

  const saveCompany = useCallback((company: Company) => {
    setState((s) => ({ ...s, company }));
  }, []);

  const blankInvoice = useCallback((): Invoice => {
    const now = new Date().toISOString();
    return {
      id: uid(),
      number: nextNumber(
        "INV",
        state.invoices.map((i) => i.number)
      ),
      status: "draft",
      issueDate: todayISO(),
      dueDate: addDaysISO(14),
      currency: state.company.currency,
      from: {
        name: state.company.name,
        email: state.company.email,
        address: state.company.address,
        phone: state.company.phone,
      },
      to: { name: "", email: "", address: "", phone: "" },
      items: [{ id: uid(), description: "", quantity: 1, rate: 0 }],
      taxRate: 0,
      discount: 0,
      notes: "Thank you for your business.",
      accent: state.company.accent,
      createdAt: now,
    };
  }, [state.invoices, state.company]);

  const upsertInvoice = useCallback((inv: Invoice) => {
    setState((s) => {
      const exists = s.invoices.some((i) => i.id === inv.id);
      const invoices = exists
        ? s.invoices.map((i) => (i.id === inv.id ? inv : i))
        : [inv, ...s.invoices];
      return { ...s, invoices };
    });
  }, []);

  const deleteInvoice = useCallback((id: string) => {
    setState((s) => ({
      ...s,
      invoices: s.invoices.filter((i) => i.id !== id),
      receipts: s.receipts.filter((r) => r.invoiceId !== id),
    }));
  }, []);

  const createReceipt = useCallback<StoreCtx["createReceipt"]>(
    (invoiceId, data) => {
      let created: Receipt | undefined;
      setState((s) => {
        const inv = s.invoices.find((i) => i.id === invoiceId);
        if (!inv) return s;
        const receipt: Receipt = {
          id: uid(),
          number: nextNumber(
            "RCPT",
            s.receipts.map((r) => r.number)
          ),
          invoiceId: inv.id,
          invoiceNumber: inv.number,
          amount: data.amount,
          currency: inv.currency,
          method: data.method,
          reference: data.reference,
          paidAt: data.paidAt,
          from: inv.from,
          to: inv.to,
          createdAt: new Date().toISOString(),
        };
        created = receipt;
        const invoices = s.invoices.map((i) =>
          i.id === inv.id
            ? { ...i, status: "paid" as const, paidAt: data.paidAt, receiptId: receipt.id }
            : i
        );
        return { ...s, invoices, receipts: [receipt, ...s.receipts] };
      });
      return created;
    },
    []
  );

  const value = useMemo<StoreCtx>(
    () => ({
      ready,
      company: state.company,
      invoices: state.invoices,
      receipts: state.receipts,
      saveCompany,
      blankInvoice,
      upsertInvoice,
      deleteInvoice,
      getInvoice: (id) => state.invoices.find((i) => i.id === id),
      getReceipt: (id) => state.receipts.find((r) => r.id === id),
      createReceipt,
      resetDemo: () => setState(seed()),
    }),
    [
      ready,
      state,
      saveCompany,
      blankInvoice,
      upsertInvoice,
      deleteInvoice,
      createReceipt,
    ]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useStore must be used within StoreProvider");
  return ctx;
}
