import { NextResponse } from "next/server";
import { getSessionFromCookies } from "@/server/auth/cookies";
import { removeTeamMember } from "@/server/services/settings-service";

export async function DELETE(_request: Request, { params }: { params: Promise<{ userId: string }> }) {
  const session = await getSessionFromCookies();
  if (!session) return NextResponse.json({ ok: false, error: "Not signed in." }, { status: 401 });

  const { userId } = await params;
  const result = await removeTeamMember(session, userId);
  if (!result.ok) return NextResponse.json({ ok: false, error: result.error }, { status: result.status });
  return NextResponse.json({ ok: true });
}
