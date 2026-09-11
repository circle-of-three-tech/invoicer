import type { Company, PaymentDetail, PaymentDetailKind } from "./types";

/**
 * Shared vocabulary for payment methods.
 *
 * Kept out of `validate.ts` (server-only concerns) and `documents.tsx` (client
 * only) so the settings form, the rendered invoice, the emailed invoice and the
 * validator all describe the same five kinds in the same words.
 */

export type PaymentKindMeta = {
  key: PaymentDetailKind;
  label: string;
  /** Shown in the details textarea to suggest what belongs there. */
  placeholder: string;
  /** The call to action on the link button, when the method carries a URL. */
  action: string;
};

export const PAYMENT_KINDS: PaymentKindMeta[] = [
  {
    key: "bank",
    label: "Bank account",
    placeholder: "Account name\nAccount number\nBank / sort code / IBAN",
    action: "Pay by transfer",
  },
  {
    key: "link",
    label: "Payment link",
    placeholder: "Anything the client should know before paying",
    action: "Pay online",
  },
  {
    key: "mobile",
    label: "Mobile money",
    placeholder: "Provider\nPhone number\nRegistered name",
    action: "Open",
  },
  {
    key: "crypto",
    label: "Crypto wallet",
    placeholder: "Network (e.g. Bitcoin, USDT — TRC20)\nWallet address",
    action: "Open wallet",
  },
  {
    key: "other",
    label: "Other",
    placeholder: "How to pay using this method",
    action: "Open",
  },
];

export const PAYMENT_KIND_KEYS = PAYMENT_KINDS.map((k) => k.key);

export function paymentKind(key?: string): PaymentKindMeta {
  return PAYMENT_KINDS.find((k) => k.key === key) ?? PAYMENT_KINDS[PAYMENT_KINDS.length - 1];
}

/** The methods that should actually be printed on a document. */
export function activePaymentDetails(company?: Pick<Company, "paymentDetails">): PaymentDetail[] {
  return (company?.paymentDetails ?? []).filter((p) => p.enabled);
}

/** A blank method, ready for the settings form. */
export function blankPaymentDetail(id: string, kind: PaymentDetailKind = "bank"): PaymentDetail {
  return { id, label: "", kind, details: "", url: "", enabled: true };
}
