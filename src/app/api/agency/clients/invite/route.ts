import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionFromCookies } from "@/server/auth/cookies";
import { inviteClient } from "@/server/services/invite-service";

const bodySchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  clientId: z.string().min(1),
  clientRole: z.enum(["participant", "viewer"]).optional(),
});

export async function POST(request: Request) {
  const session = await getSessionFromCookies();
  if (!session) return NextResponse.json({ ok: false, error: "Not signed in." }, { status: 401 });

  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ ok: false, error: "Fill in a name, email and client." }, { status: 400 });

  const result = await inviteClient(session, parsed.data);
  if (!result.ok) return NextResponse.json({ ok: false, error: result.error }, { status: result.status });
  return NextResponse.json({ ok: true, invite: { email: result.data.email, expiresAt: result.data.expiresAt } });
}
