import { redirect } from "next/navigation";
import { EMPTY_SNAPSHOT, loadSnapshot, type Snapshot } from "@/lib/data";
import { allowDemoData } from "@/lib/env";
import { hasSession } from "@/lib/session";
import { StoreProvider } from "@/lib/store";
import { Shell } from "@/components/Shell";

/**
 * The authenticated shell.
 *
 * Two things happen here that the rest of the app depends on:
 *
 * 1. The session is checked server-side. Proxy already redirects unauthenticated
 *    visitors, but that is an optimistic gate — this is the render-time check.
 * 2. Data is read during the server render and handed to the store as its
 *    initial state, so the browser receives a populated UI in the first HTML
 *    payload instead of hydrating empty and then issuing a fetch.
 *
 * Reading the session cookie also makes the segment dynamic, which is required:
 * the workspace is per-request data and must never be prerendered at build time.
 */
export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!(await hasSession())) redirect("/login");

  let snapshot: Snapshot;
  try {
    snapshot = await loadSnapshot();
  } catch (error) {
    // A database blip should degrade to an empty, usable shell rather than an
    // error page that hides the navigation.
    console.error("[layout] failed to load snapshot", error);
    snapshot = EMPTY_SNAPSHOT;
  }

  return (
    <StoreProvider initial={snapshot} demoEnabled={allowDemoData()}>
      <Shell>{children}</Shell>
    </StoreProvider>
  );
}
