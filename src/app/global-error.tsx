"use client";

import { useEffect } from "react";

/** Last-resort boundary: replaces the document when the root layout throws. */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[global]", error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          fontFamily:
            "-apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif",
          background: "#f7f7f9",
          color: "#1f2430",
        }}
      >
        <div style={{ textAlign: "center", padding: 24 }}>
          <h1 style={{ fontSize: 20, margin: "0 0 8px" }}>
            The app failed to load
          </h1>
          <p style={{ fontSize: 14, color: "#5b6270", margin: "0 0 20px" }}>
            Please refresh the page. If it keeps happening, check the server logs.
          </p>
          <button
            onClick={reset}
            style={{
              border: 0,
              borderRadius: 12,
              padding: "10px 20px",
              fontSize: 14,
              fontWeight: 600,
              color: "#fff",
              background: "#6d4bff",
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
