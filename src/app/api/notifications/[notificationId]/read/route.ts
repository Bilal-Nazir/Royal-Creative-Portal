import { NextResponse } from "next/server";
import { getSessionFromCookies } from "@/server/auth/cookies";
import { markNotificationRead } from "@/server/services/notification-service";

export async function POST(_request: Request, { params }: { params: Promise<{ notificationId: string }> }) {
  const session = await getSessionFromCookies();
  if (!session) return NextResponse.json({ ok: false, error: "Not signed in." }, { status: 401 });

  const { notificationId } = await params;
  const result = await markNotificationRead(session, notificationId);
  if (!result.ok) return NextResponse.json({ ok: false, error: result.error }, { status: result.status });
  return NextResponse.json({ ok: true, notification: result.data });
}
