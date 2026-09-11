import "server-only";
import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";
import type { Company, Invoice, Receipt } from "./types";
import { smtpConfig } from "./env";
import { formatDate, lineTotal, money, totals } from "./format";
import { activePaymentDetails, paymentKind } from "./payments";
import { isEmailAddress } from "./validate";

/* -------------------------------------------------------------------------- */
/*  SMTP transport (configured via env — see .env.example / README)            */
/* -------------------------------------------------------------------------- */

// Creating a transport opens a TLS handshake, so it is built once and reused.
// Fluid Compute keeps instances warm, which makes a pooled connection the
// difference between ~1s and ~50ms on repeat sends.
const globalForMail = globalThis as unknown as {
  mailTransport?: Transporter | null;
};

function getTransport(): Transporter | null {
  if (globalForMail.mailTransport !== undefined) return globalForMail.mailTransport;

  const { host, port, user, pass, secure } = smtpConfig();
  if (!host || !user || !pass) {
    globalForMail.mailTransport = null;
    return null;
  }

  globalForMail.mailTransport = nodemailer.createTransport({
    host,
    port,
    // Port 465 is implicit TLS; 587/other use STARTTLS. Allow an override.
    secure,
    auth: { user, pass },
    pool: true,
    maxConnections: 2,
    // Without these a hung SMTP server would hold the function open until the
    // platform timeout, turning one bad send into a stuck request.
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 20_000,
  });
  return globalForMail.mailTransport;
}

function fromAddress(company: Company) {
  const { from, user } = smtpConfig();
  const email = from || user || company.email;
  // The display name lands inside a quoted string, so strip characters that
  // would terminate it or inject an extra header.
  const name = company.name.replace(/["\\\r\n]/g, " ").trim();
  return `"${name}" <${email}>`;
}

/* -------------------------------------------------------------------------- */
/*  HTML templates (inline styles — email clients ignore <style> + classes)    */
/* -------------------------------------------------------------------------- */

const esc = (s: string) =>
  s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\n/g, "<br/>");

function shell(title: string, inner: string, accentHex = "#6366f1") {
  return `<!doctype html><html><body style="margin:0;background:#f4f4f6;padding:24px;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#1f2430;">
  <div style="max-width:640px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e6e7eb;">
    <div style="height:6px;background:${accentHex};"></div>
    <div style="padding:32px;">
      ${inner}
    </div>
    <div style="padding:20px 32px;background:#fafafb;border-top:1px solid #eef0f3;font-size:12px;color:#8a90a0;">
      ${esc(title)}
    </div>
  </div>
</body></html>`;
}

function partyBlock(label: string, name: string, email: string, address: string) {
  return `<div style="font-size:13px;line-height:1.5;">
    <div style="text-transform:uppercase;letter-spacing:.06em;font-size:10px;color:#9aa0ad;margin-bottom:4px;">${label}</div>
    <div style="font-weight:600;">${esc(name || "—")}</div>
    ${email ? `<div style="color:#5b6270;">${esc(email)}</div>` : ""}
    ${address ? `<div style="color:#8a90a0;">${esc(address)}</div>` : ""}
  </div>`;
}

/**
 * "How to pay", as a table rather than flex/grid — Outlook ignores both.
 * Links are validated as http(s) on save, so they are safe to emit as hrefs.
 */
function paymentsHtml(company: Company, accentHex: string) {
  const methods = activePaymentDetails(company);
  if (methods.length === 0) return "";

  const blocks = methods
    .map((m) => {
      const meta = paymentKind(m.kind);
      return `<tr><td style="padding:12px 14px;background:#f7f8fa;border-radius:10px;">
        <div style="font-size:13px;font-weight:600;color:#1f2430;">${esc(m.label || meta.label)}</div>
        <div style="font-size:10px;text-transform:uppercase;letter-spacing:.06em;color:#9aa0ad;margin-top:2px;">${esc(meta.label)}</div>
        ${m.details ? `<div style="font-size:12.5px;line-height:1.6;color:#5b6270;margin-top:6px;">${esc(m.details)}</div>` : ""}
        ${
          m.url
            ? `<div style="margin-top:10px;"><a href="${esc(m.url)}" style="display:inline-block;background:${accentHex};color:#ffffff;text-decoration:none;font-size:12px;font-weight:600;padding:8px 14px;border-radius:8px;">${esc(meta.action)}</a></div>`
            : ""
        }
      </td></tr><tr><td style="height:8px;"></td></tr>`;
    })
    .join("");

  return `<div style="margin-top:24px;">
    <div style="text-transform:uppercase;letter-spacing:.06em;font-size:10px;color:#9aa0ad;margin-bottom:8px;">How to pay</div>
    <table style="width:100%;border-collapse:separate;border-spacing:0;">${blocks}</table>
  </div>`;
}

function invoiceHtml(inv: Invoice, company: Company, accentHex: string) {
  const t = totals(inv);
  const rows = inv.items
    .map(
      (it) => `<tr>
        <td style="padding:10px 0;border-bottom:1px solid #eef0f3;">${esc(it.description || "—")}</td>
        <td style="padding:10px 0;border-bottom:1px solid #eef0f3;text-align:right;color:#5b6270;">${it.quantity}</td>
        <td style="padding:10px 0;border-bottom:1px solid #eef0f3;text-align:right;color:#5b6270;">${money(it.rate, inv.currency)}</td>
        <td style="padding:10px 0;border-bottom:1px solid #eef0f3;text-align:right;font-weight:600;">${money(lineTotal(it), inv.currency)}</td>
      </tr>`,
    )
    .join("");

  const totalRow = (label: string, value: string, bold = false) =>
    `<tr>
      <td colspan="2"></td>
      <td style="padding:6px 0;text-align:right;color:#8a90a0;font-size:13px;">${label}</td>
      <td style="padding:6px 0;text-align:right;${bold ? "font-weight:700;font-size:16px;" : "color:#5b6270;"}">${value}</td>
    </tr>`;

  return shell(
    `${company.name} · Invoice ${inv.number}`,
    `
    <div style="display:flex;justify-content:space-between;align-items:flex-start;">
      <div>
        <div style="font-size:22px;font-weight:700;">${esc(company.name)}</div>
        <div style="font-size:13px;color:#8a90a0;">${esc(company.email)}</div>
      </div>
      <div style="text-align:right;">
        <div style="font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:#9aa0ad;">Invoice</div>
        <div style="font-size:18px;font-weight:700;color:${accentHex};">${esc(inv.number)}</div>
      </div>
    </div>
    <p style="font-size:14px;color:#4a5160;margin:24px 0 8px;">Hi ${esc(inv.to.name || "there")}, please find your invoice below.</p>
    <table style="width:100%;margin:16px 0;"><tr>
      <td style="vertical-align:top;width:50%;">${partyBlock("From", inv.from.name, inv.from.email, inv.from.address)}</td>
      <td style="vertical-align:top;width:50%;">${partyBlock("Bill to", inv.to.name, inv.to.email, inv.to.address)}</td>
    </tr></table>
    <table style="width:100%;margin:8px 0 4px;font-size:13px;color:#5b6270;">
      <tr><td>Issued ${formatDate(inv.issueDate)}</td><td style="text-align:right;">Due ${formatDate(inv.dueDate)}</td></tr>
    </table>
    <table style="width:100%;border-collapse:collapse;margin-top:16px;font-size:13px;">
      <thead><tr>
        <th style="text-align:left;padding-bottom:8px;color:#9aa0ad;font-weight:600;border-bottom:2px solid #eef0f3;">Description</th>
        <th style="text-align:right;padding-bottom:8px;color:#9aa0ad;font-weight:600;border-bottom:2px solid #eef0f3;">Qty</th>
        <th style="text-align:right;padding-bottom:8px;color:#9aa0ad;font-weight:600;border-bottom:2px solid #eef0f3;">Rate</th>
        <th style="text-align:right;padding-bottom:8px;color:#9aa0ad;font-weight:600;border-bottom:2px solid #eef0f3;">Amount</th>
      </tr></thead>
      <tbody>${rows}</tbody>
      <tfoot>
        ${totalRow("Subtotal", money(t.sub, inv.currency))}
        ${t.discount ? totalRow("Discount", `− ${money(t.discount, inv.currency)}`) : ""}
        ${t.tax ? totalRow(`Tax (${inv.taxRate}%)`, money(t.tax, inv.currency)) : ""}
        ${totalRow("Total due", money(t.total, inv.currency), true)}
      </tfoot>
    </table>
    ${inv.status === "paid" ? "" : paymentsHtml(company, accentHex)}
    ${inv.notes ? `<p style="margin-top:24px;font-size:13px;color:#5b6270;background:#f7f8fa;padding:14px;border-radius:10px;">${esc(inv.notes)}</p>` : ""}
    `,
    accentHex,
  );
}

function receiptHtml(rc: Receipt, company: Company, accentHex: string) {
  return shell(
    `${company.name} · Receipt ${rc.number}`,
    `
    <div style="display:flex;justify-content:space-between;align-items:flex-start;">
      <div>
        <div style="font-size:22px;font-weight:700;">${esc(company.name)}</div>
        <div style="font-size:13px;color:#8a90a0;">${esc(company.email)}</div>
      </div>
      <div style="text-align:right;">
        <div style="font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:#9aa0ad;">Receipt</div>
        <div style="font-size:18px;font-weight:700;color:${accentHex};">${esc(rc.number)}</div>
      </div>
    </div>
    <div style="margin:24px 0;padding:20px;border-radius:12px;background:${accentHex};color:#ffffff;text-align:center;">
      <div style="font-size:12px;letter-spacing:.08em;text-transform:uppercase;opacity:.85;">Amount paid</div>
      <div style="font-size:30px;font-weight:800;margin-top:4px;">${money(rc.amount, rc.currency)}</div>
    </div>
    <p style="font-size:14px;color:#4a5160;">Hi ${esc(rc.to.name || "there")}, thank you — your payment has been received.</p>
    <table style="width:100%;margin:16px 0;font-size:13px;">
      <tr><td style="padding:8px 0;color:#9aa0ad;">Receipt for invoice</td><td style="padding:8px 0;text-align:right;font-weight:600;">${esc(rc.invoiceNumber)}</td></tr>
      <tr><td style="padding:8px 0;color:#9aa0ad;">Payment method</td><td style="padding:8px 0;text-align:right;">${esc(rc.method)}</td></tr>
      ${rc.reference ? `<tr><td style="padding:8px 0;color:#9aa0ad;">Reference</td><td style="padding:8px 0;text-align:right;">${esc(rc.reference)}</td></tr>` : ""}
      <tr><td style="padding:8px 0;color:#9aa0ad;">Date paid</td><td style="padding:8px 0;text-align:right;">${formatDate(rc.paidAt)}</td></tr>
    </table>
    <table style="width:100%;margin-top:16px;"><tr>
      <td style="vertical-align:top;width:50%;">${partyBlock("From", rc.from.name, rc.from.email, rc.from.address)}</td>
      <td style="vertical-align:top;width:50%;">${partyBlock("Billed to", rc.to.name, rc.to.email, rc.to.address)}</td>
    </tr></table>
    `,
    accentHex,
  );
}

/* -------------------------------------------------------------------------- */
/*  Accent → hex (mirrors the app's accent palette, kept simple for email)     */
/* -------------------------------------------------------------------------- */

const ACCENT_HEX: Record<string, string> = {
  iris: "#6366f1",
  aqua: "#06b6d4",
  rose: "#f43f6e",
  amber: "#f59e0b",
  emerald: "#10b981",
  violet: "#8b5cf6",
};

/* -------------------------------------------------------------------------- */
/*  Public API                                                                 */
/* -------------------------------------------------------------------------- */

type SendArgs =
  | { kind: "invoice"; invoice: Invoice; company: Company }
  | { kind: "receipt"; receipt: Receipt; company: Company };

export type SendOutcome = { ok: true } | { ok: false; error: string };

export async function sendDocumentEmail(args: SendArgs): Promise<SendOutcome> {
  const transport = getTransport();
  if (!transport) {
    return {
      ok: false,
      error:
        "Email is not configured. Set SMTP_HOST, SMTP_USER and SMTP_PASS.",
    };
  }

  let to: string;
  let subject: string;
  let html: string;

  if (args.kind === "invoice") {
    const accent = ACCENT_HEX[args.invoice.accent] ?? ACCENT_HEX.iris;
    to = args.invoice.to.email;
    subject = `Invoice ${args.invoice.number} from ${args.company.name}`;
    html = invoiceHtml(args.invoice, args.company, accent);
  } else {
    const accent = ACCENT_HEX[args.company.accent] ?? ACCENT_HEX.iris;
    to = args.receipt.to.email;
    subject = `Receipt ${args.receipt.number} from ${args.company.name}`;
    html = receiptHtml(args.receipt, args.company, accent);
  }

  if (!isEmailAddress(to)) {
    return { ok: false, error: "The client email address is not valid." };
  }

  try {
    await transport.sendMail({
      from: fromAddress(args.company),
      to,
      subject,
      html,
      // A plain-text part keeps the message out of spam filters that penalise
      // HTML-only mail, and gives text-mode clients something to show.
      text: htmlToText(html),
    });
    return { ok: true };
  } catch (err) {
    console.error("[email] send failed", err);
    // SMTP errors can name the host and credentials, so keep them server-side.
    return { ok: false, error: "The email could not be sent. Check the SMTP settings." };
  }
}

/** A readable text/plain fallback derived from the HTML body. */
function htmlToText(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<\/(tr|div|p|table|h[1-6])>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
