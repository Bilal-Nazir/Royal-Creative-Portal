"use client";

import { useEffect } from "react";

/**
 * Only fires when the root layout itself throws (vanishingly rare — the
 * root layout is just html/body/fonts). Replaces the entire document, so it
 * can't use shared layout/components (they may be what failed) and must
 * render its own <html>/<body>. Kept deliberately plain — no custom fonts,
 * no design-system components — so it still renders if those are the
 * problem.
 */
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("Unhandled root layout error", error.digest ? `(digest: ${error.digest})` : "", error);
  }, [error]);

  return (
    <html lang="en">
      <body style={{ margin: 0, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f5f5f7", fontFamily: "Helvetica, Arial, sans-serif" }}>
        <div style={{ maxWidth: 440, padding: 32, textAlign: "center" }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "#14141a", margin: "0 0 12px" }}>Something went wrong</h1>
          <p style={{ fontSize: 14, color: "#5b5b63", margin: "0 0 20px" }}>
            Royal Creative hit an unexpected error. Try again, or come back in a moment.
          </p>
          <button
            type="button"
            onClick={reset}
            style={{
              padding: "10px 24px",
              borderRadius: 8,
              border: "none",
              background: "linear-gradient(90deg,#f2b84b,#eb878f)",
              color: "#14141a",
              fontWeight: 600,
              fontSize: 14,
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
