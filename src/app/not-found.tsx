import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-5 text-center">
      <p className="font-mono text-xs uppercase tracking-widest text-fg-dim">404</p>
      <h1 className="font-display text-2xl font-bold text-fg">Page not found</h1>
      <p className="max-w-sm text-sm text-fg-muted">
        The page you are looking for has moved or never existed.
      </p>
      <Link
        href="/"
        className="mt-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white transition tri-bg hover:opacity-90"
      >
        Back to dashboard
      </Link>
    </div>
  );
}
