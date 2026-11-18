import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionFromCookies } from "@/server/auth/cookies";
import { sendBriefForReview } from "@/server/services/brief-service";

const bodySchema = z.object({
  objective: z.string().min(1),
  audience: z.string().min(1),
  pages: z.string().min(1),
  features: z.string().min(1),
  deliverables: z.string().min(1),
});

export async function POST(request: Request, { params }: { params: Promise<{ projectId: string }> }) {
  const session = await getSessionFromCookies();
  if (!session) return NextResponse.json({ ok: false, error: "Not signed in." }, { status: 401 });

  const { projectId } = await params;
  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ ok: false, error: "Fill in every field before sending." }, { status: 400 });

  const result = await sendBriefForReview(session, projectId, parsed.data);
  if (!result.ok) return NextResponse.json({ ok: false, error: result.error }, { status: result.status });
  return NextResponse.json({ ok: true, brief: result.data });
}
