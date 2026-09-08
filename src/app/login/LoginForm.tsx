"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { login, type LoginState } from "@/lib/auth-actions";
import { Field, inputCls } from "@/components/ui";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-xl px-5 py-2.5 text-sm font-semibold text-white transition tri-bg hover:opacity-90 disabled:opacity-60 glow"
    >
      {pending ? "Signing in…" : "Continue →"}
    </button>
  );
}

export function LoginForm() {
  const [state, formAction] = useActionState<LoginState, FormData>(login, {});

  return (
    <form action={formAction} className="space-y-4">
      <Field label="Password">
        <input
          name="password"
          type="password"
          autoComplete="current-password"
          autoFocus
          required
          className={inputCls}
          placeholder="••••••••"
        />
      </Field>
      {state.error && (
        <p
          role="alert"
          className="rounded-xl border border-[#f43f6e]/30 bg-[#f43f6e]/10 px-3.5 py-2 text-xs text-[#f43f6e]"
        >
          {state.error}
        </p>
      )}
      <SubmitButton />
    </form>
  );
}
