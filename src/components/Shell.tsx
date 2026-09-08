"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import { Wordmark } from "./Logo";
import { logout } from "@/lib/auth-actions";

const NAV = [
  { href: "/", label: "Dashboard", icon: GridIcon },
  { href: "/invoices", label: "Invoices", icon: DocIcon },
  { href: "/receipts", label: "Receipts", icon: CheckIcon },
  { href: "/settings", label: "Settings", icon: GearIcon },
];

export function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  const nav = (
    <nav className="flex flex-col gap-1">
      {NAV.map((item) => {
        const active = isActive(item.href);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setOpen(false)}
            className="group relative flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm transition"
          >
            {active && (
              <motion.span
                layoutId="nav-active"
                className="absolute inset-0 rounded-xl border border-black/10 bg-black/[0.06]"
                transition={{ type: "spring", stiffness: 400, damping: 32 }}
              />
            )}
            <span
              className={`relative z-10 transition ${
                active ? "text-fg" : "text-fg-dim group-hover:text-fg-muted"
              }`}
            >
              <Icon active={active} />
            </span>
            <span
              className={`relative z-10 font-medium transition ${
                active ? "text-fg" : "text-fg-muted group-hover:text-fg"
              }`}
            >
              {item.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-[1500px]">
      {/* Desktop sidebar */}
      <aside className="no-print sticky top-0 hidden h-screen w-[260px] shrink-0 flex-col justify-between border-r border-black/[0.06] px-5 py-6 lg:flex">
        <div>
          <Link href="/" className="mb-9 block px-1">
            <Wordmark />
          </Link>
          <Link
            href="/invoices/new"
            className="mb-6 flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition tri-bg hover:opacity-90 glow"
          >
            <PlusIcon /> New Invoice
          </Link>
          {nav}
        </div>
        <div className="rounded-2xl border border-black/[0.07] bg-black/[0.02] p-4">
          <div className="mb-1 text-xs font-semibold text-fg">Circle of Three</div>
          <p className="text-[11px] leading-relaxed text-fg-dim">
            Invoices & receipts, beautifully in sync. Saved to your database and emailed to clients.
          </p>
          <form action={logout} className="mt-3">
            <button
              type="submit"
              className="text-[11px] font-medium text-fg-dim transition hover:text-fg"
            >
              Sign out
            </button>
          </form>
        </div>
      </aside>

      {/* Mobile top bar */}
      <div className="no-print fixed inset-x-0 top-0 z-40 flex items-center justify-between border-b border-black/[0.06] bg-bg/70 px-4 py-3 backdrop-blur-xl lg:hidden">
        <Link href="/">
          <Wordmark size={30} />
        </Link>
        <button
          onClick={() => setOpen((v) => !v)}
          className="rounded-lg border border-black/10 bg-black/5 p-2 text-fg"
          aria-label="Menu"
        >
          <BurgerIcon open={open} />
        </button>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            className="no-print fixed inset-0 z-30 bg-bg/80 px-4 pt-20 backdrop-blur-xl lg:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <Link
              href="/invoices/new"
              onClick={() => setOpen(false)}
              className="mb-5 flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold text-white tri-bg"
            >
              <PlusIcon /> New Invoice
            </Link>
            {nav}
            <form action={logout} className="mt-5 px-3.5">
              <button
                type="submit"
                className="text-sm font-medium text-fg-dim transition hover:text-fg"
              >
                Sign out
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      <main className="min-w-0 flex-1 px-5 pb-20 pt-20 sm:px-8 lg:px-10 lg:pt-8">
        {children}
      </main>
    </div>
  );
}

/* ---- icons ---- */
function GridIcon({ active }: { active?: boolean }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.8}>
      <rect x="3" y="3" width="7" height="7" rx="1.6" />
      <rect x="14" y="3" width="7" height="7" rx="1.6" />
      <rect x="3" y="14" width="7" height="7" rx="1.6" />
      <rect x="14" y="14" width="7" height="7" rx="1.6" />
    </svg>
  );
}
function DocIcon({ active }: { active?: boolean }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
      <path d="M14 3v5h5M9 13h6M9 17h4" />
    </svg>
  );
}
function CheckIcon({ active }: { active?: boolean }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 12l2 2 4-4" />
      <circle cx="12" cy="12" r="9" />
    </svg>
  );
}
function GearIcon({ active }: { active?: boolean }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.8} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}
function PlusIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}
function BurgerIcon({ open }: { open: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      {open ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
    </svg>
  );
}
