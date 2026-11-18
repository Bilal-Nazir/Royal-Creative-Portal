import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getSessionFromCookies } from "@/server/auth/cookies";
import { projectRepository } from "@/server/repositories/container";
import { ClientShell } from "@/components/layout/ClientShell";

export default async function ProjectLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ projectId: string }>;
}) {
  const session = await getSessionFromCookies();
  if (!session || session.role !== "client") {
    redirect("/sign-in");
  }

  const { projectId } = await params;
  const project = await projectRepository.findById(projectId);
  if (!project || project.clientId !== session.clientId) {
    redirect("/dashboard");
  }

  return (
    <ClientShell journeyStage={project.stage} journeyProjectId={project.id}>
      {children}
    </ClientShell>
  );
}
