import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionFromCookies } from "@/server/auth/cookies";
import { getProjectMessages, postProjectMessage } from "@/server/services/message-service";
import { projectRepository } from "@/server/repositories/container";

/** Polled by the chat panel client component — see components/project/ChatPanel.tsx. */
export async function GET(_request: Request, { params }: { params: Promise<{ projectId: string }> }) {
  const session = await getSessionFromCookies();
  if (!session) return NextResponse.json({ ok: false, error: "Not signed in." }, { status: 401 });

  const { projectId } = await params;
  const project = await projectRepository.findById(projectId);
  if (!project) return NextResponse.json({ ok: false, error: "Project not found." }, { status: 404 });

  const isClientOnProject = session.role === "client" && project.clientId === session.clientId;
  const isAgencyOnProject =
    session.role === "agency" && (session.agencyRole === "owner" || session.agencyRole === "admin" || project.assigneeId === session.userId);
  if (!isClientOnProject && !isAgencyOnProject) return NextResponse.json({ ok: false, error: "Forbidden." }, { status: 403 });

  const messages = await getProjectMessages(projectId);
  return NextResponse.json({ ok: true, messages });
}

const bodySchema = z.object({ body: z.string().min(1) });

export async function POST(request: Request, { params }: { params: Promise<{ projectId: string }> }) {
  const session = await getSessionFromCookies();
  if (!session) return NextResponse.json({ ok: false, error: "Not signed in." }, { status: 401 });

  const { projectId } = await params;
  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ ok: false, error: "Write a message first." }, { status: 400 });

  const result = await postProjectMessage(session, projectId, parsed.data.body);
  if (!result.ok) return NextResponse.json({ ok: false, error: result.error }, { status: result.status });
  return NextResponse.json({ ok: true, message: result.data });
}
