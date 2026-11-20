import { redirect } from "next/navigation";
import { getSessionFromCookies } from "@/server/auth/cookies";
import { getAgencySettings, listTeam } from "@/server/services/settings-service";
import { TopBar } from "@/components/layout/TopBar";
import { NotificationsBell } from "@/components/layout/NotificationsBell";
import { PageHeader } from "@/components/ui/PageHeader";
import { AgencySettingsForm } from "@/components/settings/AgencySettingsForm";
import { TeamManager } from "@/components/settings/TeamManager";

export default async function AgencySettingsPage() {
  const session = await getSessionFromCookies();
  if (!session || session.role !== "agency") {
    redirect("/sign-in");
  }
  if (session.agencyRole !== "owner" && session.agencyRole !== "admin") {
    redirect("/agency/dashboard");
  }

  const [settings, team] = await Promise.all([getAgencySettings(), listTeam()]);

  return (
    <>
      <TopBar breadcrumb="Royal Creative / Settings" action={<NotificationsBell className="w-[200px]" />} />
      <PageHeader
        eyebrow="AGENCY WORKSPACE"
        title="Settings"
        description="Agency details, owner contact, team access and alerts."
      />
      <AgencySettingsForm initialSettings={settings} />
      <TeamManager initialTeam={team} currentUserId={session.userId} isOwner={session.agencyRole === "owner"} />
    </>
  );
}
