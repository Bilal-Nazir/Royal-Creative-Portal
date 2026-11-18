import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionFromCookies } from "@/server/auth/cookies";
import { requestProposalChanges } from "@/server/services/proposal-service";

const bodySchema = z.object({
  text: z.string().min(1),
  attachmentUrl: z.string().optional(),
});

export async function POST(request: Request, { params }: { params: Promise<{ projectId: string }> }) {
  const session = await getSessionFromCookies();
  if (!session) return NextResponse.json({ ok: false, error: "Not signed in." }, { status: 401 });

  const { projectId } = await params;
  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ ok: false, error: "Describe what you'd like to change." }, { status: 400 });

  const result = await requestProposalChanges(session, projectId, parsed.data.text, parsed.data.attachmentUrl);
  if (!result.ok) return NextResponse.json({ ok: false, error: result.error }, { status: result.status });
  return NextResponse.json({ ok: true, proposal: result.data });
}
