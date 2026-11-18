import { NextResponse } from "next/server";
import { getSessionFromCookies } from "@/server/auth/cookies";
import { getShareLinkForProject } from "@/server/services/share-service";

export async function GET(_request: Request, { params }: { params: Promise<{ projectId: string }> }) {
  const session = await getSessionFromCookies();
  if (!session) return NextResponse.json({ ok: false, error: "Not signed in." }, { status: 401 });

  const { projectId } = await params;
  const result = await getShareLinkForProject(session, projectId);
  if (!result.ok) return NextResponse.json({ ok: false, error: result.error }, { status: result.status });
  return NextResponse.json({ ok: true, token: result.data.token, path: `/b/${result.data.token}` });
}
