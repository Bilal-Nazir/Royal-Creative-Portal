"use client";

import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";

/** R16 — Next.js route-level error boundary for the design review page. Must be a Client Component. */
export default function DesignReviewError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <>
      <PageHeader title="We couldn't load this review." description="Your saved feedback is safe. Try again or contact your project lead." />
      <Badge>Connection problem</Badge>
      <Card className="flex flex-col gap-4 p-6">
        <h2 className="font-heading text-xl font-semibold text-ink">Something interrupted the connection</h2>
        <p className="text-sm text-ink-secondary">
          Please check your connection and retry. No approval or revision request has been submitted.
        </p>
        <div className="flex gap-3">
          <Button type="button" variant="primary" onClick={reset} className="w-[196px]">
            Try again
          </Button>
          <Button href="/messages" variant="secondary" className="w-[196px]">
            Contact project lead
          </Button>
        </div>
      </Card>
    </>
  );
}
