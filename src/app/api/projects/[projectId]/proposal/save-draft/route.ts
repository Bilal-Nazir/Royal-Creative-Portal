import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionFromCookies } from "@/server/auth/cookies";
import { saveProposalDraft } from "@/server/services/proposal-service";

const bodySchema = z.object({
  scope: z.string(),
  timeline: z.string(),
  revisions: z.string(),
  exclusions: z.string(),
  fee: z.number().min(0),
  paymentSchedule: z.array(z.object({ label: z.string(), amount: z.number().min(0) })),
});

export async function POST(request: Request, { params }: { params: Promise<{ projectId: string }> }) {
  const session = await getSessionFromCookies();
  if (!session) return NextResponse.json({ ok: false, error: "Not signed in." }, { status: 401 });

  const { projectId } = await params;
  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ ok: false, error: "Couldn't save the draft." }, { status: 400 });

  const { fee, paymentSchedule, ...fields } = parsed.data;
  const result = await saveProposalDraft(session, projectId, fields, fee, paymentSchedule);
  if (!result.ok) return NextResponse.json({ ok: false, error: result.error }, { status: result.status });
  return NextResponse.json({ ok: true, proposal: result.data });
}
