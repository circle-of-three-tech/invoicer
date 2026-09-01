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
import * as api from "./actions";
import type { SendResult } from "./actions";

type StoreShape = {
  company: Company;
  invoices: Invoice[];
  receipts: Receipt[];
};

// Placeholder used only for the first server render / before the DB responds.
// The authoritative company profile is loaded from Postgres on mount.
const DEFAULT_COMPANY: Company = {
  name: "Circle of Three Technologies",
  email: "circleofthreetechnologies@gmail.com",
  phone: "+1 (000) 000-0000",
  address: "123 Innovation Way\nTech City",
  taxId: "",
  currency: "USD",
  accent: "iris",
};

type StoreCtx = {
  ready: boolean;
  company: Company;
  invoices: Invoice[];
  receipts: Receipt[];
  saveCompany: (c: Company) => Promise<void>;
  blankInvoice: () => Invoice;
  upsertInvoice: (inv: Invoice) => Promise<void>;
  deleteInvoice: (id: string) => Promise<void>;
  getInvoice: (id: string) => Invoice | undefined;
  getReceipt: (id: string) => Receipt | undefined;
  createReceipt: (
    invoiceId: string,
    data: Pick<Receipt, "amount" | "method" | "reference" | "paidAt">
  ) => Promise<Receipt | undefined>;
  sendInvoice: (id: string) => Promise<SendResult>;
  sendReceipt: (id: string) => Promise<SendResult>;
  resetDemo: () => Promise<void>;
};

const Ctx = createContext<StoreCtx | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<StoreShape>({
    company: DEFAULT_COMPANY,
    invoices: [],
    receipts: [],
  });
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    api
      .bootstrap()
      .then((data) => {
        if (!active) return;
        setState(data);
        setReady(true);
      })
      .catch((err) => {
        console.error("Failed to load data from the database", err);
        if (active) setReady(true);
      });
    return () => {
      active = false;
    };
  }, []);

  const saveCompany = useCallback(async (company: Company) => {
    setState((s) => ({ ...s, company })); // optimistic
    await api.saveCompany(company);
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

  const upsertInvoice = useCallback(async (inv: Invoice) => {
    setState((s) => {
      const exists = s.invoices.some((i) => i.id === inv.id);
      const invoices = exists
        ? s.invoices.map((i) => (i.id === inv.id ? inv : i))
        : [inv, ...s.invoices];
      return { ...s, invoices };
    });
    await api.saveInvoice(inv);
  }, []);

  const deleteInvoice = useCallback(async (id: string) => {
    setState((s) => ({
      ...s,
      invoices: s.invoices.filter((i) => i.id !== id),
      receipts: s.receipts.filter((r) => r.invoiceId !== id),
    }));
    await api.deleteInvoice(id);
  }, []);

  const createReceipt = useCallback<StoreCtx["createReceipt"]>(
    async (invoiceId, data) => {
      const receipt = await api.createReceipt(invoiceId, data);
      if (!receipt) return undefined;
      setState((s) => ({
        ...s,
        invoices: s.invoices.map((i) =>
          i.id === invoiceId
            ? { ...i, status: "paid" as const, paidAt: data.paidAt, receiptId: receipt.id }
            : i
        ),
        receipts: [receipt, ...s.receipts],
      }));
      return receipt;
    },
    []
  );

  const sendInvoice = useCallback<StoreCtx["sendInvoice"]>(async (id) => {
    const result = await api.sendInvoice(id);
    if (result.ok) {
      setState((s) => ({
        ...s,
        invoices: s.invoices.map((i) =>
          i.id === id && i.status === "draft"
            ? { ...i, status: "sent" as const }
            : i
        ),
      }));
    }
    return result;
  }, []);

  const sendReceipt = useCallback<StoreCtx["sendReceipt"]>(
    (id) => api.sendReceipt(id),
    []
  );

  const resetDemo = useCallback(async () => {
    const data = await api.resetDemo();
    setState(data);
  }, []);

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
      sendInvoice,
      sendReceipt,
      resetDemo,
    }),
    [
      ready,
      state,
      saveCompany,
      blankInvoice,
      upsertInvoice,
      deleteInvoice,
      createReceipt,
      sendInvoice,
      sendReceipt,
      resetDemo,
    ]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useStore must be used within StoreProvider");
  return ctx;
}
