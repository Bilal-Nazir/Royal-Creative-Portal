import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionFromCookies } from "@/server/auth/cookies";
import { updateLaunchChecklistItem } from "@/server/services/launch-service";

const bodySchema = z.object({
  item: z.enum(["domainHosting", "qualityChecks"]),
  value: z.boolean(),
});

/** A13 — the two manually-ticked launch checks (client approval and final payment tick themselves). */
export async function POST(request: Request, { params }: { params: Promise<{ projectId: string }> }) {
  const session = await getSessionFromCookies();
  if (!session) return NextResponse.json({ ok: false, error: "Not signed in." }, { status: 401 });

  const { projectId } = await params;
  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ ok: false, error: "Invalid checklist update." }, { status: 400 });

  const result = await updateLaunchChecklistItem(session, projectId, parsed.data.item, parsed.data.value);
  if (!result.ok) return NextResponse.json({ ok: false, error: result.error }, { status: result.status });
  return NextResponse.json({ ok: true, project: result.data });
}
