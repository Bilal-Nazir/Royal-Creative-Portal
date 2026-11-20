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

export default async function DesignReviewPage({ params }: { params: Promise<{ projectId: string }> }) {
  const session = await getSessionFromCookies();
  if (!session || session.role !== "client") redirect("/sign-in");

  const { projectId } = await params;
  const project = await projectRepository.findById(projectId);
  if (!project) redirect("/dashboard");

  const current = await getCurrentDesignVersion(projectId);
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
          title="Your design review will appear here."
          description="Once Royal Creative shares a design, you'll review it here."
        />
        <EmptyReviewCard title="No design shared yet" description="Check back once Royal Creative shares a design for review." />
      </>
    );
  }

  if (current.status === "approved") {
    const versions = await getDesignVersions(projectId);
    return (
      <>
        <TopBar breadcrumb={breadcrumb} action={notifications} />
        <PageHeader
          eyebrow={`${project.clientName.toUpperCase()} · WEBSITE PROJECT`}
          title="Design approved. Next: development."
          description={`You approved Homepage Version ${current.versionNumber}. The agreed design is now the build baseline.`}
        />
        <Badge>Design finalised</Badge>
        <Card className="flex flex-col gap-2 p-6">
          <h2 className="font-heading text-xl font-semibold text-ink">Approval history</h2>
          {versions.map((version) => (
            <ListRow
              key={version.id}
              title={`Homepage Version ${version.versionNumber}`}
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
          <h2 className="font-heading text-xl font-semibold text-ink">Development begins</h2>
          <p className="text-sm text-ink-secondary">
            Royal Creative will build the approved design and send a staging website for review. New features or changes to approved
            scope are reviewed separately.
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
  // Falls back to a static placeholder when the version has no real uploaded
  // screenshot yet — only possible via the dev demo-state switcher, which
  // synthesizes versions without going through the real upload flow.
  const screenshotUrl = current.screenshotFileIds[0] ? `/api/files/${current.screenshotFileIds[0]}` : "/placeholder-design-preview.svg";

  return (
    <>
      <TopBar breadcrumb={breadcrumb} action={notifications} />
      <PageHeader
        eyebrow={`${project.clientName.toUpperCase()} · WEBSITE PROJECT`}
        title={current.versionNumber > 1 ? "Your revised design is ready" : "Review your homepage design"}
        description={
          current.versionNumber > 1
            ? `Version ${current.versionNumber}${current.whatChanged ? ` · ${current.whatChanged}` : ""}`
            : `Homepage v${current.versionNumber} · Submitted by ${current.createdByName} · Collect feedback before submitting.`
        }
      />
      <Badge>{draftCount > 0 ? "Feedback draft" : "Ready for review"}</Badge>

      {!userCanAct ? (
        <ReadOnlyNotice action="adding feedback or approving" />
      ) : (
        <DesignReviewTabs
          projectId={projectId}
          versionId={current.id}
          versionLabel={`Homepage · Version ${current.versionNumber}`}
          screenshotUrl={screenshotUrl}
          figmaLink={current.figmaLink}
          pins={pins.map((p) => ({ id: p.id, number: p.number, xPercent: p.xPercent, yPercent: p.yPercent, title: p.title, body: p.body, isDraft: p.isDraft, status: p.status }))}
          draftCount={draftCount}
          initialMessages={messages}
          viewerUserId={session.userId}
        />
      )}
    </>
  );
}
