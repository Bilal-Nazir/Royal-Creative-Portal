import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionFromCookies } from "@/server/auth/cookies";
import { updateAgencySettings } from "@/server/services/settings-service";

const bodySchema = z.object({
  agencyName: z.string().min(1).optional(),
  defaultCurrency: z.string().min(1).optional(),
  paymentInstructions: z.string().optional(),
  ownerName: z.string().min(1).optional(),
  ownerPhone: z.string().optional(),
  ownerWhatsapp: z.string().optional(),
  notifications: z
    .object({
      emailAlerts: z.boolean(),
      inAppAlerts: z.boolean(),
      paymentDateReminders: z.boolean(),
    })
    .optional(),
});

export async function PATCH(request: Request) {
  const session = await getSessionFromCookies();
  if (!session) return NextResponse.json({ ok: false, error: "Not signed in." }, { status: 401 });

  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ ok: false, error: "Invalid settings." }, { status: 400 });

  const result = await updateAgencySettings(session, parsed.data);
  if (!result.ok) return NextResponse.json({ ok: false, error: result.error }, { status: result.status });
  return NextResponse.json({ ok: true, settings: result.data });
}
