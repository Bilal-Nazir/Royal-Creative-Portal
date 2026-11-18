import { redirect } from "next/navigation";
import { getSessionFromCookies } from "@/server/auth/cookies";
import { TopBar } from "@/components/layout/TopBar";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

export default async function AgencyPaymentsPage() {
  const session = await getSessionFromCookies();
  if (!session || session.role !== "agency") {
    redirect("/sign-in");
  }

  return (
    <>
      <TopBar
        breadcrumb="Royal Creative / Payments"
        action={
          <Button variant="secondary" className="w-[200px]">
            Notifications
          </Button>
        }
      />
      <PageHeader eyebrow="AGENCY WORKSPACE" title="Payments" description="Invoicing and collections are coming in a later phase." />
      <Card className="p-6">
        <p className="text-sm text-ink-secondary">
          This page is a placeholder — it uses the same agency shell as the rest of the workspace so navigation stays
          consistent while payments are built out.
        </p>
      </Card>
    </>
  );
}
