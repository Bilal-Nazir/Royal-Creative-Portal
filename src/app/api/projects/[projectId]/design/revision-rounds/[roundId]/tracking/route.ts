import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionFromCookies } from "@/server/auth/cookies";
import { updateRevisionRoundTracking } from "@/server/services/design-service";

const bodySchema = z.object({
  assigneeId: z.string().optional(),
  assigneeName: z.string().optional(),
  targetDate: z.string().optional(),
  workflowStatus: z.enum(["submitted", "in_progress", "completed"]).optional(),
});

export async function POST(request: Request, { params }: { params: Promise<{ projectId: string; roundId: string }> }) {
  const session = await getSessionFromCookies();
  if (!session) return NextResponse.json({ ok: false, error: "Not signed in." }, { status: 401 });

  const { projectId, roundId } = await params;
  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ ok: false, error: "Invalid update." }, { status: 400 });

  const result = await updateRevisionRoundTracking(session, projectId, roundId, parsed.data);
  if (!result.ok) return NextResponse.json({ ok: false, error: result.error }, { status: result.status });
  return NextResponse.json({ ok: true, round: result.data });
}
