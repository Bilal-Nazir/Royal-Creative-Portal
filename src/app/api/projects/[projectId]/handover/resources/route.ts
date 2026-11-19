import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionFromCookies } from "@/server/auth/cookies";
import { addHandoverResource } from "@/server/services/handover-service";

const bodySchema = z.object({
  title: z.string().min(1),
  type: z.enum(["pdf", "video", "link"]),
  fileId: z.string().optional(),
  url: z.string().optional(),
});

/** A13's agency "Handover resources" section (no Figma screen — see DESIGN_NOTES) feeding C15's handover pack. */
export async function POST(request: Request, { params }: { params: Promise<{ projectId: string }> }) {
  const session = await getSessionFromCookies();
  if (!session) return NextResponse.json({ ok: false, error: "Not signed in." }, { status: 401 });

  const { projectId } = await params;
  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ ok: false, error: "Add a title and a file or URL." }, { status: 400 });

  const result = await addHandoverResource(session, projectId, parsed.data);
  if (!result.ok) return NextResponse.json({ ok: false, error: result.error }, { status: result.status });
  return NextResponse.json({ ok: true, resource: result.data });
}
