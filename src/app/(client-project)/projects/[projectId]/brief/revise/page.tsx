import { redirect } from "next/navigation";
import { getSessionFromCookies } from "@/server/auth/cookies";
import { projectRepository } from "@/server/repositories/container";
import { canAct } from "@/server/services/permissions";
import { TopBar } from "@/components/layout/TopBar";
import { NotificationsBell } from "@/components/layout/NotificationsBell";
import { PageHeader } from "@/components/ui/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { ReviseForm } from "./revise-form";

export default async function BriefRevisePage({ params }: { params: Promise<{ projectId: string }> }) {
  const session = await getSessionFromCookies();
  if (!session || session.role !== "client") redirect("/sign-in");

  const { projectId } = await params;
  const project = await projectRepository.findById(projectId);
  if (!project) redirect("/dashboard");
  if (!canAct(session)) redirect(`/projects/${projectId}/brief`);

  return (
    <>
      <TopBar
        breadcrumb={`My projects  /  ${project.clientName}`}
        action={
          <NotificationsBell iconOnly />
        }
      />
      <PageHeader
        title="What should we adjust?"
        description="Your feedback will return the brief to Royal Creative."
      />
      <Badge>Draft feedback</Badge>

      <Card className="flex flex-col gap-4 p-6">
        <h2 className="font-heading text-xl font-semibold text-ink">Request brief revisions</h2>
        <ReviseForm projectId={projectId} />
      </Card>
    </>
  );
}
