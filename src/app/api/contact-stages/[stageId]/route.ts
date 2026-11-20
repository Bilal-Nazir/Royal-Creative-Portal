import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionFromCookies } from "@/server/auth/cookies";
import { renameStage, deleteStage } from "@/server/services/contact-service";

const bodySchema = z.object({ name: z.string().min(1) });

export async function PATCH(request: Request, { params }: { params: Promise<{ stageId: string }> }) {
  const session = await getSessionFromCookies();
  if (!session) return NextResponse.json({ ok: false, error: "Not signed in." }, { status: 401 });

  const { stageId } = await params;
  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ ok: false, error: "Give the stage a name." }, { status: 400 });

  const result = await renameStage(session, stageId, parsed.data.name);
  if (!result.ok) return NextResponse.json({ ok: false, error: result.error }, { status: result.status });
  return NextResponse.json({ ok: true, stage: result.data });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ stageId: string }> }) {
  const session = await getSessionFromCookies();
  if (!session) return NextResponse.json({ ok: false, error: "Not signed in." }, { status: 401 });

  const { stageId } = await params;
  const result = await deleteStage(session, stageId);
  if (!result.ok) return NextResponse.json({ ok: false, error: result.error }, { status: result.status });
  return NextResponse.json({ ok: true });
}
