import { NextResponse } from "next/server";
import { getSessionFromCookies } from "@/server/auth/cookies";
import { markAllNotificationsRead } from "@/server/services/notification-service";

export async function POST() {
  const session = await getSessionFromCookies();
  if (!session) return NextResponse.json({ ok: false, error: "Not signed in." }, { status: 401 });

  const result = await markAllNotificationsRead(session);
  if (!result.ok) return NextResponse.json({ ok: false, error: result.error }, { status: result.status });
  return NextResponse.json({ ok: true, count: result.data });
}
