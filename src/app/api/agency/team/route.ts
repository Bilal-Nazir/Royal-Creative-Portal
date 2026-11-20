import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionFromCookies } from "@/server/auth/cookies";
import { inviteTeamMember } from "@/server/services/settings-service";

const bodySchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  agencyRole: z.enum(["owner", "admin", "member"]),
});

export async function POST(request: Request) {
  const session = await getSessionFromCookies();
  if (!session) return NextResponse.json({ ok: false, error: "Not signed in." }, { status: 401 });

  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ ok: false, error: "Fill in a name, email and role." }, { status: 400 });

  const result = await inviteTeamMember(session, parsed.data);
  if (!result.ok) return NextResponse.json({ ok: false, error: result.error }, { status: result.status });
  return NextResponse.json({ ok: true, user: { id: result.data.id, name: result.data.name, email: result.data.email, agencyRole: result.data.agencyRole } });
}
