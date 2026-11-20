import { NextResponse } from "next/server";
import { getSessionFromCookies } from "@/server/auth/cookies";
import { skipBrief } from "@/server/services/brief-service";

export async function POST(_request: Request, { params }: { params: Promise<{ projectId: string }> }) {
  const session = await getSessionFromCookies();
  if (!session) return NextResponse.json({ ok: false, error: "Not signed in." }, { status: 401 });

  const { projectId } = await params;
  const result = await skipBrief(session, projectId);
  if (!result.ok) return NextResponse.json({ ok: false, error: result.error }, { status: result.status });
  return NextResponse.json({ ok: true, brief: result.data });
}
