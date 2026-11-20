import { redirect } from "next/navigation";
import { getSessionFromCookies } from "@/server/auth/cookies";
import { projectRepository } from "@/server/repositories/container";
import { getCurrentDesignVersion, getDesignVersions, getPinCommentsForVersion } from "@/server/services/design-service";
import { getProjectMessages } from "@/server/services/message-service";
import { canAct } from "@/server/services/permissions";
import { formatDate } from "@/lib/format";
import { TopBar } from "@/components/layout/TopBar";
import { NotificationsBell } from "@/components/layout/NotificationsBell";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { ListRow } from "@/components/ui/ListRow";
import { EmptyReviewCard } from "@/components/project/EmptyReviewCard";
import { ReadOnlyNotice } from "@/components/project/ReadOnlyNotice";
import { DesignReviewTabs } from "@/components/project/DesignReviewTabs";

const WHAT_TO_TEST = [
  { title: "Navigation and forms", description: "Check links, menus and form submissions." },
  { title: "Content and mobile", description: "Check copy, images and layouts on your phone." },
  { title: "Checkout", description: "Test the purchase flow using test details." },
];

/** C13 · Development submitted (staging preview + "What to test") and R08/R19's pin review — mirrors the client design review page. */
export default async function DevelopmentReviewPage({ params }: { params: Promise<{ projectId: string }> }) {
  const session = await getSessionFromCookies();
  if (!session || session.role !== "client") redirect("/sign-in");

  const { projectId } = await params;
  const project = await projectRepository.findById(projectId);
  if (!project) redirect("/dashboard");

  const current = await getCurrentDesignVersion(projectId, "development");
  const breadcrumb = `My projects  /  ${project.clientName}`;
  const notifications = (
    <NotificationsBell className="w-[180px]" />
  );
  const userCanAct = canAct(session);

  if (!current) {
    return (
      <>
        <TopBar breadcrumb={breadcrumb} action={notifications} />
        <PageHeader
          eyebrow={`${project.clientName.toUpperCase()} · WEBSITE PROJECT`}
          title="Your development review will appear here."
          description="Once Royal Creative shares the staging site, you'll review it here."
        />
        <EmptyReviewCard title="No build shared yet" description="Check back once Royal Creative shares the staging site for review." />
      </>
    );
  }

  if (current.status === "approved") {
    const versions = await getDesignVersions(projectId, "development");
    return (
      <>
        <TopBar breadcrumb={breadcrumb} action={notifications} />
        <PageHeader
          eyebrow={`${project.clientName.toUpperCase()} · WEBSITE PROJECT`}
          title="Build approved. Next: launch."
          description={`You approved Build Version ${current.versionNumber}. Royal Creative is preparing for launch.`}
        />
        <Badge>Development finalised</Badge>
        <Card className="flex flex-col gap-2 p-6">
          <h2 className="font-heading text-xl font-semibold text-ink">Approval history</h2>
          {versions.map((version) => (
            <ListRow
              key={version.id}
              title={`Build Version ${version.versionNumber}`}
              subtitle={
                version.status === "approved" && version.approvedByName && version.approvedAt
                  ? `Approved by ${version.approvedByName} · ${formatDate(version.approvedAt)}`
                  : `Shared by ${version.createdByName} on ${formatDate(version.createdAt)}`
              }
              trailing={<Badge tone={version.status === "approved" ? "success" : "neutral"}>{version.status}</Badge>}
            />
          ))}
        </Card>
        <Card className="flex flex-col gap-3 p-6">
          <h2 className="font-heading text-xl font-semibold text-ink">Launch is next</h2>
          <p className="text-sm text-ink-secondary">
            Royal Creative will confirm domain and hosting, take the final payment, and schedule your launch date.
          </p>
          <Button href="/dashboard" variant="primary" className="w-[196px]">
            View project overview
          </Button>
        </Card>
      </>
    );
  }

  const [pins, messages] = await Promise.all([getPinCommentsForVersion(current.id, session.userId), getProjectMessages(projectId)]);
  const draftCount = pins.filter((p) => p.isDraft).length;
  const screenshotUrl = current.screenshotFileIds[0] ? `/api/files/${current.screenshotFileIds[0]}` : "/placeholder-design-preview.svg";

  return (
    <>
      <TopBar breadcrumb={breadcrumb} action={notifications} />
      <PageHeader
        eyebrow={`${project.clientName.toUpperCase()} · WEBSITE PROJECT`}
        title={current.versionNumber > 1 ? "The updated website is ready" : "Review the developed website"}
        description={
          current.versionNumber > 1
            ? `Build Version ${current.versionNumber}${current.whatChanged ? ` · ${current.whatChanged}` : ""}`
            : `Website build v${current.versionNumber} · Feedback is tracked separately from design revisions.`
        }
      />
      <Badge>{draftCount > 0 ? "Development feedback draft" : "Ready for approval"}</Badge>

      {pins.length === 0 ? (
        <Card className="flex flex-col gap-3 p-6">
          <h2 className="font-heading text-xl font-semibold text-ink">What to test</h2>
          {WHAT_TO_TEST.map((item) => (
            <div key={item.title} className="flex flex-col gap-1 rounded-rc-control bg-surface-2 p-4">
              <p className="text-[13px] font-medium text-ink">{item.title}</p>
              <p className="text-xs text-ink-secondary">{item.description}</p>
            </div>
          ))}
        </Card>
      ) : null}

      {!userCanAct ? (
        <ReadOnlyNotice action="adding feedback or approving" />
      ) : (
        <DesignReviewTabs
          projectId={projectId}
          versionId={current.id}
          versionLabel={`Homepage · Build Version ${current.versionNumber}`}
          screenshotUrl={screenshotUrl}
          figmaLink={current.figmaLink}
          pins={pins.map((p) => ({ id: p.id, number: p.number, xPercent: p.xPercent, yPercent: p.yPercent, title: p.title, body: p.body, isDraft: p.isDraft, status: p.status }))}
          draftCount={draftCount}
          initialMessages={messages}
          viewerUserId={session.userId}
          apiBasePath={`/api/projects/${projectId}/development`}
          reviseHref={`/projects/${projectId}/development/revise`}
          approveLabel="Approve for launch"
        />
      )}
    </>
  );
}
