import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionFromCookies } from "@/server/auth/cookies";
import { logFollowUp } from "@/server/services/contact-service";

const bodySchema = z.object({ body: z.string().min(1) });

export async function POST(request: Request, { params }: { params: Promise<{ contactId: string }> }) {
  const session = await getSessionFromCookies();
  if (!session) return NextResponse.json({ ok: false, error: "Not signed in." }, { status: 401 });

  const { contactId } = await params;
  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ ok: false, error: "Write a note first." }, { status: 400 });

  const result = await logFollowUp(session, contactId, parsed.data.body);
  if (!result.ok) return NextResponse.json({ ok: false, error: result.error }, { status: result.status });
  return NextResponse.json({ ok: true, activity: result.data });
}
