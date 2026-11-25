import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionFromCookies } from "@/server/auth/cookies";
import { updateProjectDetails } from "@/server/services/project-service";
import { PROJECT_TYPES } from "@/server/domain/project";

const bodySchema = z.object({
  clientId: z.string().optional(),
  projectType: z.enum(PROJECT_TYPES).optional(),
  dueDate: z.string().optional(),
  assigneeId: z.string().optional(),
});

export async function PATCH(request: Request, { params }: { params: Promise<{ projectId: string }> }) {
  const session = await getSessionFromCookies();
  if (!session) return NextResponse.json({ ok: false, error: "Not signed in." }, { status: 401 });

  const { projectId } = await params;
  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ ok: false, error: "Invalid update." }, { status: 400 });

  const result = await updateProjectDetails(session, projectId, parsed.data);
  if (!result.ok) return NextResponse.json({ ok: false, error: result.error }, { status: result.status });
  return NextResponse.json({ ok: true, project: result.data });
}
