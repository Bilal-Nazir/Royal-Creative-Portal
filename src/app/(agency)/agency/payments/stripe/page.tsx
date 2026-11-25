import { redirect } from "next/navigation";
import { getSessionFromCookies } from "@/server/auth/cookies";
import { TopBar } from "@/components/layout/TopBar";
import { NotificationsBell } from "@/components/layout/NotificationsBell";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { NotImplementedButton } from "@/components/ui/NotImplementedButton";

/** A27 — UI only. There's no Stripe Connect flow in this phase; see MockPaymentProvider for the demo checkout that stands in for it. */
export default async function StripeSettingsPage() {
  const session = await getSessionFromCookies();
  if (!session || session.role !== "agency") {
    redirect("/sign-in");
  }

  return (
    <>
      <TopBar
        breadcrumb="Royal Creative / Payments"
        action={
          <div className="flex gap-3">
            <NotificationsBell iconOnly />
            <Button href="/agency/payments" variant="secondary" className="w-[180px]">
              Back to payments
            </Button>
          </div>
        }
      />
      <PageHeader title="Stripe settings" description="Connect your Stripe account to accept online payments." />
      <Card className="flex flex-col gap-4 p-6">
        <h2 className="font-heading text-xl font-semibold text-ink">Card payments: not set up yet</h2>
        <p className="text-sm text-ink-secondary">
          Clients currently pay by bank transfer (see Payments). Connect Stripe here once it&apos;s available to also accept card payments.
        </p>
        <NotImplementedButton label="Connect Stripe" message="Available after backend setup." className="items-start" />
      </Card>
    </>
  );
}
