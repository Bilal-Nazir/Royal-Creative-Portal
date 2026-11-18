import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionFromCookies } from "@/server/auth/cookies";
import { setInvoiceStatus } from "@/server/services/invoice-service";

const bodySchema = z.object({ status: z.enum(["scheduled", "unpaid", "promised", "unverified", "partially_paid", "paid", "overdue"]) });

export async function POST(request: Request, { params }: { params: Promise<{ invoiceId: string }> }) {
  const session = await getSessionFromCookies();
  if (!session) return NextResponse.json({ ok: false, error: "Not signed in." }, { status: 401 });

  const { invoiceId } = await params;
  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ ok: false, error: "Unknown status." }, { status: 400 });

  const result = await setInvoiceStatus(session, invoiceId, parsed.data.status);
  if (!result.ok) return NextResponse.json({ ok: false, error: result.error }, { status: result.status });
  return NextResponse.json({ ok: true, invoice: result.data });
}
