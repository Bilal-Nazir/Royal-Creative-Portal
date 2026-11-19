import { Card } from "../ui/Card";

/** R15 adapted for a design/content review screen that has nothing to show yet (no version shared, no submission made). */
export function EmptyReviewCard({ title, description }: { title: string; description: string }) {
  return (
    <Card className="flex flex-col gap-2 p-6">
      <h2 className="font-heading text-xl font-semibold text-ink">{title}</h2>
      <p className="text-sm text-ink-secondary">{description}</p>
    </Card>
  );
}
