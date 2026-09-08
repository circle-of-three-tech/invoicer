"use client";

import { useEffect } from "react";

/**
 * Catches render and data errors inside the app shell so a single bad page does
 * not blank the whole workspace.
 */
export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[app]", error);
  }, [error]);

  return (
    <div className="mx-auto max-w-lg py-24 text-center">
      <h1 className="font-display text-xl font-semibold text-fg">
        Something went wrong
      </h1>
      <p className="mt-2 text-sm text-fg-muted">
        The page could not be displayed. Your data has not been changed.
      </p>
      {error.digest && (
        <p className="mt-1 font-mono text-[11px] text-fg-dim">
          Reference {error.digest}
        </p>
      )}
      <button
        onClick={reset}
        className="mt-6 rounded-xl px-5 py-2.5 text-sm font-semibold text-white transition tri-bg hover:opacity-90"
      >
        Try again
      </button>
    </div>
  );
}
