import { ACCENTS } from "./accents";
import { CURRENCIES } from "./format";
import type {
  Company,
  Invoice,
  InvoiceStatus,
  LineItem,
  Party,
  PaymentMethod,
  Receipt,
} from "./types";

/**
 * Input validation for everything that crosses the client → server boundary.
 *
 * Server Actions are public endpoints, so payloads are untrusted no matter how
 * the UI is written. These helpers normalise as well as reject: they clamp
 * lengths and numbers so a well-formed but abusive payload cannot bloat a row.
 */

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}

/* ----------------------------- primitives -------------------------------- */

const LIMITS = {
  shortText: 200,
  email: 320,
  address: 500,
  notes: 2_000,
  description: 500,
  items: 200,
  /** Logos are inlined into every document and email, so keep them small. */
  logoBytes: 256 * 1024,
} as const;

const ID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_MONEY = 1e12;

function str(value: unknown, field: string, max: number, { required = false } = {}): string {
  if (value == null) {
    if (required) throw new ValidationError(`${field} is required.`);
    return "";
  }
  if (typeof value !== "string") throw new ValidationError(`${field} must be text.`);
  const trimmed = value.trim();
  if (required && !trimmed) throw new ValidationError(`${field} is required.`);
  if (trimmed.length > max) {
    throw new ValidationError(`${field} must be ${max} characters or fewer.`);
  }
  return trimmed;
}

function num(value: unknown, field: string, { min = 0, max = MAX_MONEY } = {}): number {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed)) throw new ValidationError(`${field} must be a number.`);
  if (parsed < min || parsed > max) {
    throw new ValidationError(`${field} must be between ${min} and ${max}.`);
  }
  return parsed;
}

export function id(value: unknown, field = "id"): string {
  const candidate = str(value, field, 64, { required: true });
  if (!ID_PATTERN.test(candidate)) throw new ValidationError(`${field} is malformed.`);
  return candidate;
}

function isoDate(value: unknown, field: string): string {
  const candidate = str(value, field, 10, { required: true });
  if (!DATE_PATTERN.test(candidate) || Number.isNaN(Date.parse(candidate))) {
    throw new ValidationError(`${field} must be a YYYY-MM-DD date.`);
  }
  return candidate;
}

function isoTimestamp(value: unknown, field: string): string {
  const candidate = str(value, field, 40, { required: true });
  const parsed = Date.parse(candidate);
  if (Number.isNaN(parsed)) throw new ValidationError(`${field} must be a date.`);
  return new Date(parsed).toISOString();
}

function email(value: unknown, field: string): string {
  const candidate = str(value, field, LIMITS.email);
  if (candidate && !EMAIL_PATTERN.test(candidate)) {
    throw new ValidationError(`${field} must be a valid email address.`);
  }
  return candidate;
}

function oneOf<T extends string>(value: unknown, field: string, allowed: readonly T[]): T {
  const candidate = str(value, field, 64, { required: true });
  if (!(allowed as readonly string[]).includes(candidate)) {
    throw new ValidationError(`${field} is not a supported value.`);
  }
  return candidate as T;
}

export function isEmailAddress(value: string): boolean {
  return EMAIL_PATTERN.test(value);
}

/* ------------------------------- domain ---------------------------------- */

const STATUSES: InvoiceStatus[] = ["draft", "sent", "paid"];
const METHODS: PaymentMethod[] = [
  "Bank Transfer",
  "Card",
  "Cash",
  "Mobile Money",
  "PayPal",
  "Crypto",
  "Other",
];
const ACCENT_KEYS = ACCENTS.map((a) => a.key);
const CURRENCY_CODES = Object.keys(CURRENCIES);

function party(value: unknown, field: string): Party {
  const raw = (value ?? {}) as Record<string, unknown>;
  return {
    name: str(raw.name, `${field} name`, LIMITS.shortText),
    email: email(raw.email, `${field} email`),
    address: str(raw.address, `${field} address`, LIMITS.address),
    phone: str(raw.phone, `${field} phone`, LIMITS.shortText),
  };
}

function lineItem(value: unknown, index: number): LineItem {
  const raw = (value ?? {}) as Record<string, unknown>;
  return {
    id: id(raw.id, `Line item ${index + 1} id`),
    description: str(raw.description, `Line item ${index + 1} description`, LIMITS.description),
    quantity: num(raw.quantity, `Line item ${index + 1} quantity`, { max: 1e6 }),
    rate: num(raw.rate, `Line item ${index + 1} rate`),
  };
}

/**
 * The logo is tri-state, because the client no longer holds the stored bytes:
 *
 * - `undefined` — no change requested; leave whatever is stored alone.
 * - `null`      — remove the current logo.
 * - a data URL  — replace it.
 *
 * Without that distinction, saving any other profile field would send
 * `logoDataUrl: undefined` and silently erase the logo.
 */
function logoDataUrl(value: unknown): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  if (typeof value !== "string") throw new ValidationError("Logo must be a data URL.");
  // SVG is excluded deliberately — it is active content, unlike raster formats.
  if (!/^data:image\/(png|jpeg|webp|gif);base64,[A-Za-z0-9+/=]+$/.test(value)) {
    throw new ValidationError("Logo must be a PNG, JPEG, WebP or GIF image.");
  }
  const bytes = Math.floor((value.length - value.indexOf(",") - 1) * 0.75);
  if (bytes > LIMITS.logoBytes) {
    throw new ValidationError(
      `Logo must be under ${Math.round(LIMITS.logoBytes / 1024)} KB.`,
    );
  }
  return value;
}

export function parseCompany(input: unknown): Company {
  const raw = (input ?? {}) as Record<string, unknown>;
  return {
    name: str(raw.name, "Business name", LIMITS.shortText, { required: true }),
    email: email(raw.email, "Business email"),
    phone: str(raw.phone, "Phone", LIMITS.shortText),
    address: str(raw.address, "Address", LIMITS.address),
    taxId: str(raw.taxId, "Tax ID", LIMITS.shortText),
    currency: oneOf(raw.currency, "Currency", CURRENCY_CODES),
    accent: oneOf(raw.accent, "Accent", ACCENT_KEYS),
    logoDataUrl: logoDataUrl(raw.logoDataUrl),
  };
}

export function parseInvoice(input: unknown): Invoice {
  const raw = (input ?? {}) as Record<string, unknown>;
  const items = Array.isArray(raw.items) ? raw.items : [];
  if (items.length === 0) throw new ValidationError("An invoice needs at least one line item.");
  if (items.length > LIMITS.items) {
    throw new ValidationError(`An invoice can hold at most ${LIMITS.items} line items.`);
  }

  return {
    id: id(raw.id, "Invoice id"),
    number: str(raw.number, "Invoice number", 64, { required: true }),
    status: oneOf(raw.status, "Status", STATUSES),
    issueDate: isoDate(raw.issueDate, "Issue date"),
    dueDate: isoDate(raw.dueDate, "Due date"),
    currency: oneOf(raw.currency, "Currency", CURRENCY_CODES),
    from: party(raw.from, "Sender"),
    to: party(raw.to, "Client"),
    items: items.map(lineItem),
    taxRate: num(raw.taxRate, "Tax rate", { max: 100 }),
    discount: num(raw.discount, "Discount"),
    notes: str(raw.notes, "Notes", LIMITS.notes),
    accent: oneOf(raw.accent, "Accent", ACCENT_KEYS),
    createdAt: isoTimestamp(raw.createdAt, "Created date"),
    paidAt: raw.paidAt ? isoDate(raw.paidAt, "Paid date") : undefined,
    receiptId: raw.receiptId ? id(raw.receiptId, "Receipt id") : undefined,
    sentAt: raw.sentAt ? isoTimestamp(raw.sentAt, "Sent date") : undefined,
  };
}

export type PaymentInput = Pick<Receipt, "amount" | "method" | "reference" | "paidAt">;

export function parsePayment(input: unknown): PaymentInput {
  const raw = (input ?? {}) as Record<string, unknown>;
  return {
    amount: num(raw.amount, "Amount"),
    method: oneOf(raw.method, "Payment method", METHODS),
    reference: str(raw.reference, "Reference", LIMITS.shortText),
    paidAt: isoDate(raw.paidAt, "Date paid"),
  };
}
