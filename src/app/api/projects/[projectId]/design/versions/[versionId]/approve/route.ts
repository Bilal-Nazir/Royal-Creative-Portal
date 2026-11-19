import { NextResponse } from "next/server";
import { getSessionFromCookies } from "@/server/auth/cookies";
import { approveDesignVersion } from "@/server/services/design-service";

export async function POST(_request: Request, { params }: { params: Promise<{ projectId: string; versionId: string }> }) {
  const session = await getSessionFromCookies();
  if (!session) return NextResponse.json({ ok: false, error: "Not signed in." }, { status: 401 });

  const { projectId, versionId } = await params;
  const result = await approveDesignVersion(session, projectId, versionId);
  if (!result.ok) return NextResponse.json({ ok: false, error: result.error }, { status: result.status });
  return NextResponse.json({ ok: true, version: result.data });
}
