"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import type { Company, Invoice, Receipt, Snapshot } from "./types";
import { addDaysISO, nextNumber, todayISO, uid } from "./format";
import * as api from "./actions";

/**
 * Client-side cache of the workspace.
 *
 * The initial state arrives from the server render, so there is no load
 * waterfall and no empty first paint. Mutations apply optimistically and roll
 * back if the server rejects them, so the UI can never drift silently out of
 * sync with the database.
 */

type StoreShape = Snapshot;

export type Result = { ok: boolean; error?: string };

type StoreCtx = {
  /** Retained for call-site compatibility; data is present from first render. */
  ready: boolean;
  /** Whether this deployment permits the destructive demo reset. */
  demoEnabled: boolean;
  company: Company;
  invoices: Invoice[];
  receipts: Receipt[];
  saveCompany: (c: Company) => Promise<Result>;
  blankInvoice: () => Invoice;
  upsertInvoice: (inv: Invoice) => Promise<Result & { invoice?: Invoice }>;
  deleteInvoice: (id: string) => Promise<Result>;
  getInvoice: (id: string) => Invoice | undefined;
  getReceipt: (id: string) => Receipt | undefined;
  createReceipt: (
    invoiceId: string,
    data: Pick<Receipt, "amount" | "method" | "reference" | "paidAt">,
  ) => Promise<Result & { receipt?: Receipt }>;
  sendInvoice: (id: string) => Promise<Result>;
  sendReceipt: (id: string) => Promise<Result>;
  resetDemo: () => Promise<Result & { snapshot?: Snapshot }>;
};

const Ctx = createContext<StoreCtx | null>(null);

/** Turns a rejected action or a network failure into a displayable message. */
function toError(error: unknown): Result {
  console.error("[store]", error);
  return { ok: false, error: "Could not reach the server. Please try again." };
}

export function StoreProvider({
  initial,
  demoEnabled = false,
  children,
}: {
  initial: Snapshot;
  demoEnabled?: boolean;
  children: React.ReactNode;
}) {
  const [state, setState] = useState<StoreShape>(initial);

  const saveCompany = useCallback(async (company: Company): Promise<Result> => {
    let previous: Company | undefined;
    setState((s) => {
      previous = s.company;
      return { ...s, company };
    });
    try {
      const result = await api.saveCompany(company);
      if (!result.ok && previous) {
        const rollback = previous;
        setState((s) => ({ ...s, company: rollback }));
      }
      return result;
    } catch (error) {
      if (previous) {
        const rollback = previous;
        setState((s) => ({ ...s, company: rollback }));
      }
      return toError(error);
    }
  }, []);

  const blankInvoice = useCallback((): Invoice => {
    const now = new Date().toISOString();
    return {
      id: uid(),
      // A provisional number: the server reassigns it if another tab claimed
      // the same one first, and hands the final value back on save.
      number: nextNumber(
        "INV",
        state.invoices.map((i) => i.number),
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

  const upsertInvoice = useCallback<StoreCtx["upsertInvoice"]>(async (inv) => {
    let previous: Invoice[] = [];
    setState((s) => {
      previous = s.invoices;
      const exists = s.invoices.some((i) => i.id === inv.id);
      return {
        ...s,
        invoices: exists
          ? s.invoices.map((i) => (i.id === inv.id ? inv : i))
          : [inv, ...s.invoices],
      };
    });

    try {
      const result = await api.saveInvoice(inv);
      if (!result.ok) {
        setState((s) => ({ ...s, invoices: previous }));
        return result;
      }
      // The server is authoritative about the number it actually stored.
      const saved = result.data;
      setState((s) => ({
        ...s,
        invoices: s.invoices.map((i) => (i.id === saved.id ? saved : i)),
      }));
      return { ok: true, invoice: saved };
    } catch (error) {
      setState((s) => ({ ...s, invoices: previous }));
      return toError(error);
    }
  }, []);

  const deleteInvoice = useCallback<StoreCtx["deleteInvoice"]>(async (id) => {
    let previous: StoreShape | undefined;
    setState((s) => {
      previous = s;
      return {
        ...s,
        invoices: s.invoices.filter((i) => i.id !== id),
        receipts: s.receipts.filter((r) => r.invoiceId !== id),
      };
    });

    try {
      const result = await api.deleteInvoice(id);
      if (!result.ok && previous) setState(previous);
      return result;
    } catch (error) {
      if (previous) setState(previous);
      return toError(error);
    }
  }, []);

  const createReceipt = useCallback<StoreCtx["createReceipt"]>(
    async (invoiceId, data) => {
      // No optimistic write here: the receipt's number and id are assigned by
      // the server, so there is nothing meaningful to show until it replies.
      try {
        const result = await api.createReceipt(invoiceId, data);
        if (!result.ok) return result;

        const receipt = result.data;
        setState((s) => ({
          ...s,
          invoices: s.invoices.map((i) =>
            i.id === invoiceId
              ? {
                  ...i,
                  status: "paid" as const,
                  paidAt: data.paidAt,
                  receiptId: receipt.id,
                }
              : i,
          ),
          receipts: [receipt, ...s.receipts],
        }));
        return { ok: true, receipt };
      } catch (error) {
        return toError(error);
      }
    },
    [],
  );

  const sendInvoice = useCallback<StoreCtx["sendInvoice"]>(async (id) => {
    try {
      const result = await api.sendInvoice(id);
      if (result.ok) {
        const sentAt = new Date().toISOString();
        setState((s) => ({
          ...s,
          invoices: s.invoices.map((i) =>
            i.id === id
              ? { ...i, sentAt, status: i.status === "draft" ? ("sent" as const) : i.status }
              : i,
          ),
        }));
      }
      return result;
    } catch (error) {
      return toError(error);
    }
  }, []);

  const sendReceipt = useCallback<StoreCtx["sendReceipt"]>(async (id) => {
    try {
      const result = await api.sendReceipt(id);
      if (result.ok) {
        const sentAt = new Date().toISOString();
        setState((s) => ({
          ...s,
          receipts: s.receipts.map((r) => (r.id === id ? { ...r, sentAt } : r)),
        }));
      }
      return result;
    } catch (error) {
      return toError(error);
    }
  }, []);

  const resetDemo = useCallback<StoreCtx["resetDemo"]>(async () => {
    try {
      const result = await api.resetDemo();
      if (!result.ok) return result;
      setState(result.data);
      return { ok: true, snapshot: result.data };
    } catch (error) {
      return toError(error);
    }
  }, []);

  // Lookups are split out so they do not re-create the whole context value.
  const getInvoice = useCallback(
    (id: string) => state.invoices.find((i) => i.id === id),
    [state.invoices],
  );
  const getReceipt = useCallback(
    (id: string) => state.receipts.find((r) => r.id === id),
    [state.receipts],
  );

  const value = useMemo<StoreCtx>(
    () => ({
      ready: true,
      demoEnabled,
      company: state.company,
      invoices: state.invoices,
      receipts: state.receipts,
      saveCompany,
      blankInvoice,
      upsertInvoice,
      deleteInvoice,
      getInvoice,
      getReceipt,
      createReceipt,
      sendInvoice,
      sendReceipt,
      resetDemo,
    }),
    [
      demoEnabled,
      state.company,
      state.invoices,
      state.receipts,
      saveCompany,
      blankInvoice,
      upsertInvoice,
      deleteInvoice,
      getInvoice,
      getReceipt,
      createReceipt,
      sendInvoice,
      sendReceipt,
      resetDemo,
    ],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useStore must be used within StoreProvider");
  return ctx;
}
