"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { useStore } from "@/lib/store";
import { Field, inputCls } from "@/components/ui";
import { Reveal } from "@/components/motion";
import { CURRENCIES } from "@/lib/format";
import { ACCENTS } from "@/lib/accents";
import type { Company } from "@/lib/types";

export default function SettingsPage() {
  const { company, saveCompany, resetDemo, ready } = useStore();
  const [form, setForm] = useState<Company>(company);
  const [saved, setSaved] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (ready) setForm(company);
  }, [ready, company]);

  const set = (patch: Partial<Company>) => setForm((f) => ({ ...f, ...patch }));

  const onSave = () => {
    saveCompany(form);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const onLogo = (file?: File) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => set({ logoDataUrl: reader.result as string });
    reader.readAsDataURL(file);
  };

  return (
    <div className="mx-auto max-w-3xl">
      <Reveal>
        <h1 className="font-display text-2xl font-bold text-fg sm:text-3xl">Settings</h1>
        <p className="mt-1 text-sm text-fg-muted">
          Your business profile appears on every invoice and receipt.
        </p>
      </Reveal>

      <div className="mt-6 space-y-5">
        <div className="rounded-2xl border border-black/[0.07] p-6 glass">
          <h3 className="mb-4 font-display text-base font-semibold text-fg">Business identity</h3>
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
            <div className="flex flex-col items-center gap-3">
              <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-2xl border border-black/10 bg-black/[0.03]">
                {form.logoDataUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={form.logoDataUrl} alt="logo" className="h-full w-full object-cover" />
                ) : (
                  <span className="text-[11px] text-fg-dim">No logo</span>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => fileRef.current?.click()}
                  className="rounded-lg border border-black/10 bg-black/5 px-3 py-1.5 text-xs font-medium text-fg transition hover:bg-black/10"
                >
                  Upload
                </button>
                {form.logoDataUrl && (
                  <button
                    onClick={() => set({ logoDataUrl: undefined })}
                    className="rounded-lg border border-black/10 bg-black/5 px-3 py-1.5 text-xs text-fg-dim transition hover:text-[#f43f6e]"
                  >
                    Remove
                  </button>
                )}
              </div>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => onLogo(e.target.files?.[0])}
              />
            </div>
            <div className="grid flex-1 grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Field label="Business name">
                  <input className={inputCls} value={form.name} onChange={(e) => set({ name: e.target.value })} />
                </Field>
              </div>
              <Field label="Email">
                <input className={inputCls} value={form.email} onChange={(e) => set({ email: e.target.value })} />
              </Field>
              <Field label="Phone">
                <input className={inputCls} value={form.phone} onChange={(e) => set({ phone: e.target.value })} />
              </Field>
              <div className="sm:col-span-2">
                <Field label="Address">
                  <textarea rows={2} className={inputCls} value={form.address} onChange={(e) => set({ address: e.target.value })} />
                </Field>
              </div>
              <Field label="Tax ID / VAT">
                <input className={inputCls} value={form.taxId} onChange={(e) => set({ taxId: e.target.value })} />
              </Field>
              <Field label="Default currency">
                <select className={inputCls} value={form.currency} onChange={(e) => set({ currency: e.target.value })}>
                  {Object.entries(CURRENCIES).map(([code, c]) => (
                    <option key={code} value={code} className="bg-bg-soft">
                      {code} — {c.label}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-black/[0.07] p-6 glass">
          <h3 className="mb-1 font-display text-base font-semibold text-fg">Default accent</h3>
          <p className="mb-4 text-xs text-fg-dim">Used for new invoices and receipts.</p>
          <div className="flex flex-wrap gap-3">
            {ACCENTS.map((a) => (
              <button
                key={a.key}
                onClick={() => set({ accent: a.key })}
                className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-medium transition ${
                  form.accent === a.key
                    ? "border-black/30 bg-black/10 text-fg"
                    : "border-black/10 bg-black/[0.02] text-fg-muted hover:bg-black/5"
                }`}
              >
                <span className="h-4 w-4 rounded-full" style={{ background: a.solid }} />
                {a.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between gap-4">
          <button
            onClick={() => {
              if (confirm("Reset all data to the demo sample? This clears your invoices and receipts.")) {
                resetDemo();
              }
            }}
            className="text-xs text-fg-dim transition hover:text-[#f43f6e]"
          >
            Reset to demo data
          </button>
          <div className="flex items-center gap-3">
            {saved && (
              <motion.span
                initial={{ opacity: 0, x: 8 }}
                animate={{ opacity: 1, x: 0 }}
                className="text-xs font-medium text-[#0f9d63]"
              >
                Saved ✓
              </motion.span>
            )}
            <button
              onClick={onSave}
              className="rounded-xl px-5 py-2.5 text-sm font-semibold text-white transition tri-bg hover:opacity-90 glow"
            >
              Save changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
