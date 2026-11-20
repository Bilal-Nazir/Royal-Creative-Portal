import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionFromCookies } from "@/server/auth/cookies";
import { changeTeamMemberRole } from "@/server/services/settings-service";

const bodySchema = z.object({ agencyRole: z.enum(["owner", "admin", "member"]) });

export async function PATCH(request: Request, { params }: { params: Promise<{ userId: string }> }) {
  const session = await getSessionFromCookies();
  if (!session) return NextResponse.json({ ok: false, error: "Not signed in." }, { status: 401 });

  const { userId } = await params;
  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ ok: false, error: "Invalid role." }, { status: 400 });

  const result = await changeTeamMemberRole(session, userId, parsed.data.agencyRole);
  if (!result.ok) return NextResponse.json({ ok: false, error: result.error }, { status: result.status });
  return NextResponse.json({ ok: true, user: { id: result.data.id, agencyRole: result.data.agencyRole } });
}
