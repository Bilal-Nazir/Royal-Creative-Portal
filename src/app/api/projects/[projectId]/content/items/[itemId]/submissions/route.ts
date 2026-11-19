import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionFromCookies } from "@/server/auth/cookies";
import { submitContentForItem } from "@/server/services/content-service";

const bodySchema = z.object({
  fileIds: z.array(z.string()).default([]),
  sharedLink: z.string().optional(),
  notes: z.string().optional(),
});

export async function POST(request: Request, { params }: { params: Promise<{ projectId: string; itemId: string }> }) {
  const session = await getSessionFromCookies();
  if (!session) return NextResponse.json({ ok: false, error: "Not signed in." }, { status: 401 });

  const { projectId, itemId } = await params;
  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ ok: false, error: "Invalid submission." }, { status: 400 });

  const result = await submitContentForItem(session, projectId, itemId, parsed.data);
  if (!result.ok) return NextResponse.json({ ok: false, error: result.error }, { status: result.status });
  return NextResponse.json({ ok: true, submission: result.data });
}
