import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionFromCookies } from "@/server/auth/cookies";
import { setPinCommentStatus } from "@/server/services/design-service";

const bodySchema = z.object({ status: z.enum(["open", "in_progress", "resolved"]) });

export async function POST(request: Request, { params }: { params: Promise<{ projectId: string; pinId: string }> }) {
  const session = await getSessionFromCookies();
  if (!session) return NextResponse.json({ ok: false, error: "Not signed in." }, { status: 401 });

  const { projectId, pinId } = await params;
  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ ok: false, error: "Unknown status." }, { status: 400 });

  const result = await setPinCommentStatus(session, projectId, pinId, parsed.data.status);
  if (!result.ok) return NextResponse.json({ ok: false, error: result.error }, { status: result.status });
  return NextResponse.json({ ok: true, comment: result.data });
}
