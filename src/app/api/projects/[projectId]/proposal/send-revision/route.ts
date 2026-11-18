import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionFromCookies } from "@/server/auth/cookies";
import { sendRevisedProposal } from "@/server/services/proposal-service";

const bodySchema = z.object({
  scope: z.string().min(1),
  timeline: z.string().min(1),
  revisions: z.string().min(1),
  exclusions: z.string().min(1),
  fee: z.number().positive(),
  paymentSchedule: z.array(z.object({ label: z.string().min(1), amount: z.number().nonnegative() })).min(1),
});

export async function POST(request: Request, { params }: { params: Promise<{ projectId: string }> }) {
  const session = await getSessionFromCookies();
  if (!session) return NextResponse.json({ ok: false, error: "Not signed in." }, { status: 401 });

  const { projectId } = await params;
  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ ok: false, error: "Fill in every field with a valid fee." }, { status: 400 });

  const { scope, timeline, revisions, exclusions, fee, paymentSchedule } = parsed.data;
  const result = await sendRevisedProposal(session, projectId, { scope, timeline, revisions, exclusions }, fee, paymentSchedule);
  if (!result.ok) return NextResponse.json({ ok: false, error: result.error }, { status: result.status });
  return NextResponse.json({ ok: true, proposal: result.data });
}
