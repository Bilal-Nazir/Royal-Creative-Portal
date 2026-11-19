import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionFromCookies } from "@/server/auth/cookies";
import { createPinComment } from "@/server/services/design-service";
import { PIN_TITLE_MAX_LENGTH } from "@/server/domain/design";

const bodySchema = z.object({
  xPercent: z.number().min(0).max(100),
  yPercent: z.number().min(0).max(100),
  title: z.string().max(PIN_TITLE_MAX_LENGTH).optional(),
  body: z.string().min(1),
});

export async function POST(request: Request, { params }: { params: Promise<{ projectId: string; versionId: string }> }) {
  const session = await getSessionFromCookies();
  if (!session) return NextResponse.json({ ok: false, error: "Not signed in." }, { status: 401 });

  const { projectId, versionId } = await params;
  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ ok: false, error: "Couldn't add that pin." }, { status: 400 });

  const result = await createPinComment(session, projectId, versionId, parsed.data);
  if (!result.ok) return NextResponse.json({ ok: false, error: result.error }, { status: result.status });
  return NextResponse.json({ ok: true, comment: result.data });
}
