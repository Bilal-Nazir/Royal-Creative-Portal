import { Card } from "../ui/Card";
import { Badge } from "../ui/Badge";

/** R17 — shown instead of action controls when a client viewer session hits a screen that would otherwise let them act. */
export function ReadOnlyNotice({ action = "approvals or changes" }: { action?: string }) {
  return (
    <>
      <Badge>Read-only access</Badge>
      <Card className="flex flex-col gap-3 p-6">
        <h2 className="font-heading text-xl font-semibold text-ink">Need to participate?</h2>
        <p className="text-sm text-ink-secondary">
          Your Viewer role does not allow {action}. Ask the project lead to review your project permissions.
        </p>
      </Card>
    </>
  );
}
