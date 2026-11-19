import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionFromCookies } from "@/server/auth/cookies";
import { shareDesignVersion } from "@/server/services/design-service";

const bodySchema = z.object({
  figmaLink: z.string().min(1),
  screenshotFileIds: z.array(z.string()).min(1),
  message: z.string().optional(),
  whatChanged: z.string().optional(),
  respondsToRoundId: z.string().optional(),
});

/** Handles both A11 (build version 1 — "staging link") and R18's "Submit revised development" (version 2+). */
export async function POST(request: Request, { params }: { params: Promise<{ projectId: string }> }) {
  const session = await getSessionFromCookies();
  if (!session) return NextResponse.json({ ok: false, error: "Not signed in." }, { status: 401 });

  const { projectId } = await params;
  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ ok: false, error: "Add a staging link and at least one screenshot." }, { status: 400 });

  const result = await shareDesignVersion(session, projectId, { ...parsed.data, kind: "development" });
  if (!result.ok) return NextResponse.json({ ok: false, error: result.error }, { status: result.status });
  return NextResponse.json({ ok: true, version: result.data });
}
