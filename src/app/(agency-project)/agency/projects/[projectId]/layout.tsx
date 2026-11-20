import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getSessionFromCookies } from "@/server/auth/cookies";
import { projectRepository } from "@/server/repositories/container";
import { filterProjectsForAgencyUser } from "@/server/services/permissions";
import { getBriefForProject } from "@/server/services/brief-service";
import { AgencyShell } from "@/components/layout/AgencyShell";

export default async function AgencyProjectLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ projectId: string }>;
}) {
  const session = await getSessionFromCookies();
  if (!session || session.role !== "agency") {
    redirect("/sign-in");
  }

  const { projectId } = await params;
  const project = await projectRepository.findById(projectId);
  const visible = project ? filterProjectsForAgencyUser(session, [project]) : [];
  if (!project || visible.length === 0) {
    redirect("/agency/projects");
  }

  const brief = await getBriefForProject(project.id);

  return (
    <AgencyShell journeyStage={project.stage} journeyProjectId={project.id} journeyBriefSkipped={brief?.status === "skipped"}>
      {children}
    </AgencyShell>
  );
}
