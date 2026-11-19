import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionFromCookies } from "@/server/auth/cookies";
import { setLaunchDetails } from "@/server/services/launch-service";

const bodySchema = z.object({
  launchDate: z.string().min(1),
  liveUrl: z.string().min(1),
});

/** A13 — "Agreed launch date" and "Live website URL", editable independent of checklist completion. */
export async function POST(request: Request, { params }: { params: Promise<{ projectId: string }> }) {
  const session = await getSessionFromCookies();
  if (!session) return NextResponse.json({ ok: false, error: "Not signed in." }, { status: 401 });

  const { projectId } = await params;
  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ ok: false, error: "Add a launch date and live URL." }, { status: 400 });

  const result = await setLaunchDetails(session, projectId, parsed.data);
  if (!result.ok) return NextResponse.json({ ok: false, error: result.error }, { status: result.status });
  return NextResponse.json({ ok: true, project: result.data });
}
