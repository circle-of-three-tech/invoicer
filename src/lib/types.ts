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
};

export type Company = {
  name: string;
  email: string;
  phone: string;
  address: string;
  taxId: string;
  currency: string;
  accent: string;
  logoDataUrl?: string;
};
