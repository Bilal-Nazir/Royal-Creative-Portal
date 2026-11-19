import { NextResponse } from "next/server";
import { getSessionFromCookies } from "@/server/auth/cookies";
import { removeHandoverResource } from "@/server/services/handover-service";

export async function DELETE(_request: Request, { params }: { params: Promise<{ projectId: string; resourceId: string }> }) {
  const session = await getSessionFromCookies();
  if (!session) return NextResponse.json({ ok: false, error: "Not signed in." }, { status: 401 });

  const { projectId, resourceId } = await params;
  const result = await removeHandoverResource(session, projectId, resourceId);
  if (!result.ok) return NextResponse.json({ ok: false, error: result.error }, { status: result.status });
  return NextResponse.json({ ok: true });
}
