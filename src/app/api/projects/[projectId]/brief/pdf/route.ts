import { NextResponse } from "next/server";
import { getSessionFromCookies } from "@/server/auth/cookies";
import { projectRepository } from "@/server/repositories/container";
import { getBriefForProject } from "@/server/services/brief-service";
import { renderBriefPdf } from "@/server/pdf/brief-pdf";

/** "Download PDF brief" — same access rule as the brief review page itself: the client who owns the project, or an agency owner/admin/assignee. */
export async function GET(_request: Request, { params }: { params: Promise<{ projectId: string }> }) {
  const session = await getSessionFromCookies();
  if (!session) return NextResponse.json({ ok: false, error: "Not signed in." }, { status: 401 });

  const { projectId } = await params;
  const project = await projectRepository.findById(projectId);
  if (!project) return NextResponse.json({ ok: false, error: "Project not found." }, { status: 404 });

  const isClientOnProject = session.role === "client" && project.clientId === session.clientId;
  const isAgencyOnProject =
    session.role === "agency" && (session.agencyRole === "owner" || session.agencyRole === "admin" || project.assigneeId === session.userId);
  if (!isClientOnProject && !isAgencyOnProject) {
    return NextResponse.json({ ok: false, error: "You don't have access to this brief." }, { status: 403 });
  }

  const brief = await getBriefForProject(projectId);
  if (!brief) return NextResponse.json({ ok: false, error: "Brief not found." }, { status: 404 });

  const pdf = await renderBriefPdf(project.name, brief);
  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="brief-v${brief.versionNumber}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
