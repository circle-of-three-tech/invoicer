export type LineItem = {
  id: string;
  description: string;
  quantity: number;
  rate: number;
};

export type Party = {
  name: string;
  email: string;
  address: string;
  phone: string;
};

export type InvoiceStatus = "draft" | "sent" | "paid";

export type Invoice = {
  id: string;
  number: string;
  status: InvoiceStatus;
  issueDate: string; // ISO date
  dueDate: string; // ISO date
  currency: string;
  from: Party;
  to: Party;
  items: LineItem[];
  taxRate: number; // percent
  discount: number; // flat amount in currency
  notes: string;
  accent: string; // accent theme key
  createdAt: string;
  paidAt?: string;
  receiptId?: string;
  sentAt?: string;
};

export type PaymentMethod =
  | "Bank Transfer"
  | "Card"
  | "Cash"
  | "Mobile Money"
  | "PayPal"
  | "Crypto"
  | "Other";

export type Receipt = {
  id: string;
  number: string;
  invoiceId: string;
  invoiceNumber: string;
  amount: number;
  currency: string;
  method: PaymentMethod;
  reference: string;
  paidAt: string; // ISO
  from: Party;
  to: Party;
  createdAt: string;
  sentAt?: string;
};

/** How a payment detail is presented — drives its icon and its label. */
export type PaymentDetailKind = "bank" | "link" | "mobile" | "crypto" | "other";

/**
 * One way a client can pay: a bank account, a payment link, a wallet address.
 * `details` is free-form multi-line text (account numbers, sort codes, memos)
 * and `url` is an optional link rendered as a button on the invoice.
 */
export type PaymentDetail = {
  id: string;
  label: string;
  kind: PaymentDetailKind;
  details: string;
  url: string;
  /** Off keeps a method on file without printing it on new documents. */
  enabled: boolean;
};

export type Company = {
  name: string;
  email: string;
  phone: string;
  address: string;
  taxId: string;
  currency: string;
  accent: string;
  /** Ordered payment methods shown on invoices and in invoice emails. */
  paymentDetails: PaymentDetail[];
  /**
   * Opaque stamp identifying the stored logo, or absent when there is none.
   * The bytes themselves are never carried in the snapshot — they are fetched
   * once from `/api/logo?v=<logoVersion>` and cached by the browser.
   */
  logoVersion?: string;
  /**
   * A *pending* logo change, set only by the settings form: a data URL to
   * store, or `null` to remove the current logo. The server never populates
   * it, and leaving it `undefined` means "leave the logo as it is" — which is
   * what keeps an ordinary profile save from wiping a logo the client is not
   * holding.
   */
  logoDataUrl?: string | null;
};

/** The full workspace as loaded from the database and held by the client store. */
export type Snapshot = {
  company: Company;
  invoices: Invoice[];
  receipts: Receipt[];
};
