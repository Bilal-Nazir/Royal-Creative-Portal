import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";

/** R20 — Next.js route-level loading state while the design review Server Component fetches the version/pins/messages. */
export default function DesignReviewLoading() {
  return (
    <>
      <PageHeader title="Loading your latest review…" description="We're retrieving the submitted version and saved feedback." />
      <Badge>Loading</Badge>
      <Card className="flex flex-col gap-2 p-6">
        <h2 className="font-heading text-xl font-semibold text-ink">Review workspace</h2>
        <p className="text-sm text-ink-secondary">Loading preview…</p>
        <p className="text-sm text-ink-secondary">Loading comments…</p>
      </Card>
    </>
  );
}
