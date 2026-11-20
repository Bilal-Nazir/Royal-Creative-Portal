import { NextResponse } from "next/server";
import { z } from "zod";
import { requestPasswordReset } from "@/server/services/password-reset-service";
import { checkRateLimit, getClientIp } from "@/server/auth/rate-limit";

const bodySchema = z.object({ email: z.string().email() });

export async function POST(request: Request) {
  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ ok: false, error: "Enter a valid email." }, { status: 400 });

  const { allowed } = await checkRateLimit("forgot-password", parsed.data.email, getClientIp(request));
  if (!allowed) return NextResponse.json({ ok: false, error: "Too many attempts. Try again in 15 minutes." }, { status: 429 });

  await requestPasswordReset(parsed.data.email);
  // Always the same response, whether or not the email exists.
  return NextResponse.json({ ok: true });
}
