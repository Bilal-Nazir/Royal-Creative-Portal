"use client";

import { useEffect } from "react";
import { Logo } from "@/components/ui/Logo";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

/** Root error boundary (500) — catches anything an individual route's own error.tsx (e.g. design review's) doesn't. Never shows the error's own message to the user. */
export default function GlobalRouteError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // Server-side errors are already logged where they're thrown; this covers client-side render errors reaching the boundary.
    console.error("Unhandled route error", error.digest ? `(digest: ${error.digest})` : "", error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col bg-bg px-5 py-8 sm:px-8">
      <header className="flex items-center justify-between">
        <Logo width={180} />
      </header>

      <main className="flex flex-1 items-center justify-center py-10">
        <Card className="flex w-full max-w-[520px] flex-col gap-4 p-6">
          <p className="rc-brand-gradient-text text-xs font-normal uppercase tracking-wide">Something went wrong</p>
          <h1 className="font-heading text-[28px] font-semibold text-ink">Unexpected error</h1>
          <p className="text-sm text-ink-secondary">
            Something went wrong on our end. Try again, or head back to your dashboard if it keeps happening.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button type="button" variant="primary" onClick={reset} className="w-[160px]">
              Try again
            </Button>
            <Button href="/" variant="secondary" className="w-[160px]">
              Back home
            </Button>
          </div>
        </Card>
      </main>
    </div>
  );
}
