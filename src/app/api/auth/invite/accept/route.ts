import { NextResponse } from "next/server";
import { z } from "zod";
import { acceptInvite } from "@/server/services/invite-service";
import { checkRateLimit, getClientIp } from "@/server/auth/rate-limit";

const bodySchema = z.object({ token: z.string().min(1), password: z.string().min(8) });

export async function POST(request: Request) {
  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ ok: false, error: "Enter a password of at least 8 characters." }, { status: 400 });

  const { allowed } = await checkRateLimit("invite-accept", parsed.data.token, getClientIp(request));
  if (!allowed) return NextResponse.json({ ok: false, error: "Too many attempts. Try again in 15 minutes." }, { status: 429 });

  const result = await acceptInvite(parsed.data.token, parsed.data.password);
  if (!result.ok) return NextResponse.json({ ok: false, error: result.error }, { status: result.status });
  return NextResponse.json({ ok: true, email: result.data.email });
}
