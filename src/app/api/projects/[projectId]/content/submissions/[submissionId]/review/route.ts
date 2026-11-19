import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionFromCookies } from "@/server/auth/cookies";
import { reviewContentSubmission } from "@/server/services/content-service";

const bodySchema = z.object({
  action: z.enum(["accept", "request_changes"]),
  note: z.string().optional(),
});

export async function POST(request: Request, { params }: { params: Promise<{ projectId: string; submissionId: string }> }) {
  const session = await getSessionFromCookies();
  if (!session) return NextResponse.json({ ok: false, error: "Not signed in." }, { status: 401 });

  const { projectId, submissionId } = await params;
  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ ok: false, error: "Invalid review." }, { status: 400 });

  const result = await reviewContentSubmission(session, projectId, submissionId, parsed.data.action, parsed.data.note);
  if (!result.ok) return NextResponse.json({ ok: false, error: result.error }, { status: result.status });
  return NextResponse.json({ ok: true, submission: result.data });
}
