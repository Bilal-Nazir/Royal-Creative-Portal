import { NextResponse } from "next/server";
import { getSessionFromCookies } from "@/server/auth/cookies";
import { deleteBoardColumn } from "@/server/services/project-board-service";

export async function DELETE(_request: Request, { params }: { params: Promise<{ columnId: string }> }) {
  const session = await getSessionFromCookies();
  if (!session) return NextResponse.json({ ok: false, error: "Not signed in." }, { status: 401 });

  const { columnId } = await params;
  const result = await deleteBoardColumn(session, columnId);
  if (!result.ok) return NextResponse.json({ ok: false, error: result.error }, { status: result.status });
  return NextResponse.json({ ok: true });
}
