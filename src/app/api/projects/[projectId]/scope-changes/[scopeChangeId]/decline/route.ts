import { NextResponse } from "next/server";
import { getSessionFromCookies } from "@/server/auth/cookies";
import { declineScopeChange } from "@/server/services/scope-change-service";

/** R09's "Discuss request" — declines the optional addition; the current stage is unaffected. */
export async function POST(_request: Request, { params }: { params: Promise<{ projectId: string; scopeChangeId: string }> }) {
  const session = await getSessionFromCookies();
  if (!session) return NextResponse.json({ ok: false, error: "Not signed in." }, { status: 401 });

  const { projectId, scopeChangeId } = await params;
  const result = await declineScopeChange(session, projectId, scopeChangeId);
  if (!result.ok) return NextResponse.json({ ok: false, error: result.error }, { status: result.status });
  return NextResponse.json({ ok: true, scopeChange: result.data });
}
