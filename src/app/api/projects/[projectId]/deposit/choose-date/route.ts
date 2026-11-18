import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionFromCookies } from "@/server/auth/cookies";
import { choosePaymentDate } from "@/server/services/invoice-service";

const bodySchema = z.object({ date: z.string().min(1) });

export async function POST(request: Request, { params }: { params: Promise<{ projectId: string }> }) {
  const session = await getSessionFromCookies();
  if (!session) return NextResponse.json({ ok: false, error: "Not signed in." }, { status: 401 });

  const { projectId } = await params;
  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ ok: false, error: "Choose a date." }, { status: 400 });

  const result = await choosePaymentDate(session, projectId, parsed.data.date);
  if (!result.ok) return NextResponse.json({ ok: false, error: result.error }, { status: result.status });
  return NextResponse.json({ ok: true, invoice: result.data });
}
