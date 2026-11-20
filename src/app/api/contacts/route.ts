import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionFromCookies } from "@/server/auth/cookies";
import { createContact } from "@/server/services/contact-service";

const bodySchema = z.object({
  name: z.string().min(1),
  email: z.string().min(1),
  company: z.string().default(""),
  phone: z.string().optional(),
  stageId: z.string().min(1),
  ownerId: z.string().optional(),
  ownerName: z.string().optional(),
  nextFollowUpAt: z.string().optional(),
  notes: z.string().optional(),
});

export async function POST(request: Request) {
  const session = await getSessionFromCookies();
  if (!session) return NextResponse.json({ ok: false, error: "Not signed in." }, { status: 401 });

  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ ok: false, error: "Fill in the contact's name, email and pipeline stage." }, { status: 400 });

  const result = await createContact(session, parsed.data);
  if (!result.ok) return NextResponse.json({ ok: false, error: result.error }, { status: result.status });
  return NextResponse.json({ ok: true, contact: result.data });
}
