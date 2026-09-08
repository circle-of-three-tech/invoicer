export default function Loading() {
  return (
    <div className="mx-auto max-w-6xl animate-pulse space-y-6 py-2">
      <div className="h-44 rounded-3xl border border-black/[0.07] bg-black/[0.03]" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <div
            key={i}
            className="h-28 rounded-2xl border border-black/[0.07] bg-black/[0.03]"
          />
        ))}
      </div>
      <div className="h-64 rounded-3xl border border-black/[0.07] bg-black/[0.03]" />
      <span className="sr-only">Loading…</span>
    </div>
  );
}
