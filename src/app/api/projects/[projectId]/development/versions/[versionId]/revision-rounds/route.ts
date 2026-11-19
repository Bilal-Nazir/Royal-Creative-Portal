import { NextResponse } from "next/server";
import { getSessionFromCookies } from "@/server/auth/cookies";
import { submitRevisionRound } from "@/server/services/design-service";

/** R08's "Ask for changes" — submits every draft pin as the next Development revision round. */
export async function POST(_request: Request, { params }: { params: Promise<{ projectId: string; versionId: string }> }) {
  const session = await getSessionFromCookies();
  if (!session) return NextResponse.json({ ok: false, error: "Not signed in." }, { status: 401 });

  const { projectId, versionId } = await params;
  const result = await submitRevisionRound(session, projectId, versionId);
  if (!result.ok) return NextResponse.json({ ok: false, error: result.error }, { status: result.status });
  return NextResponse.json({ ok: true, round: result.data });
}
