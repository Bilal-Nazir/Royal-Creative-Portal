import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionFromCookies } from "@/server/auth/cookies";
import { payFinalInvoice } from "@/server/services/invoice-service";

const bodySchema = z.object({ outcome: z.enum(["success", "failure"]) });

/** Final balance checkout (deviation: no Figma screen — reuses the C08/C09/C10 deposit checkout pattern). */
export async function POST(request: Request, { params }: { params: Promise<{ projectId: string }> }) {
  const session = await getSessionFromCookies();
  if (!session) return NextResponse.json({ ok: false, error: "Not signed in." }, { status: 401 });

  const { projectId } = await params;
  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ ok: false, error: "Choose a demo outcome." }, { status: 400 });

  const result = await payFinalInvoice(session, projectId, parsed.data.outcome);
  if (!result.ok) return NextResponse.json({ ok: false, error: result.error }, { status: result.status });
  return NextResponse.json({ ok: true, ...result.data });
}
