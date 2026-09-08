import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { hasSession } from "@/lib/session";
import { Wordmark } from "@/components/Logo";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = {
  title: "Sign in — Circle of Three",
  robots: { index: false, follow: false },
};

export default async function LoginPage() {
  if (await hasSession()) redirect("/");

  return (
    <div className="flex min-h-screen items-center justify-center px-5 py-16">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex justify-center">
          <Wordmark />
        </div>
        <div className="rounded-3xl border border-black/[0.07] p-7 glass">
          <h1 className="font-display text-xl font-semibold text-fg">Sign in</h1>
          <p className="mt-1 mb-6 text-sm text-fg-muted">
            Enter your workspace password to continue.
          </p>
          <LoginForm />
        </div>
        <p className="mt-6 text-center text-[11px] text-fg-dim">
          Circle of Three Technologies · Invoicing &amp; receipts
        </p>
      </div>
    </div>
  );
}
