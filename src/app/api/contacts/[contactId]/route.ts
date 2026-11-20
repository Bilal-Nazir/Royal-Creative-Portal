import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionFromCookies } from "@/server/auth/cookies";
import { updateContact } from "@/server/services/contact-service";

const bodySchema = z.object({
  stageId: z.string().optional(),
  ownerId: z.string().optional(),
  ownerName: z.string().optional(),
  nextFollowUpAt: z.string().optional(),
  notes: z.string().optional(),
  proposalProjectId: z.string().optional(),
});

export async function PATCH(request: Request, { params }: { params: Promise<{ contactId: string }> }) {
  const session = await getSessionFromCookies();
  if (!session) return NextResponse.json({ ok: false, error: "Not signed in." }, { status: 401 });

  const { contactId } = await params;
  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ ok: false, error: "Invalid update." }, { status: 400 });

  const result = await updateContact(session, contactId, parsed.data);
  if (!result.ok) return NextResponse.json({ ok: false, error: result.error }, { status: result.status });
  return NextResponse.json({ ok: true, contact: result.data });
}
