import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionFromCookies } from "@/server/auth/cookies";
import { createScopeChange } from "@/server/services/scope-change-service";

const bodySchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  additionalFee: z.number().min(0),
  timelineImpact: z.string().min(1),
  flaggedFromRoundId: z.string().optional(),
});

/** Created from R04/R18's "Flag for scope decision" (flaggedFromRoundId set) or from project detail A16 (omitted). No Figma screen for this creation form. */
export async function POST(request: Request, { params }: { params: Promise<{ projectId: string }> }) {
  const session = await getSessionFromCookies();
  if (!session) return NextResponse.json({ ok: false, error: "Not signed in." }, { status: 401 });

  const { projectId } = await params;
  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ ok: false, error: "Add a title, description, fee and timeline impact." }, { status: 400 });

  const result = await createScopeChange(session, projectId, parsed.data);
  if (!result.ok) return NextResponse.json({ ok: false, error: result.error }, { status: result.status });
  return NextResponse.json({ ok: true, scopeChange: result.data });
}
