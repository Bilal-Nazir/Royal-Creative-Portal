import { NextResponse } from "next/server";
import { z } from "zod";
import { signIn, roleHomePath } from "@/server/services/auth-service";
import { setSessionCookie } from "@/server/auth/cookies";

const bodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(request: Request) {
  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Enter a valid email and password." }, { status: 400 });
  }

  const result = await signIn(parsed.data.email, parsed.data.password);
  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error }, { status: 401 });
  }

  await setSessionCookie(result.token);
  return NextResponse.json({ ok: true, redirectTo: roleHomePath(result.session) });
}
