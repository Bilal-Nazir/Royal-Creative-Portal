import { NextResponse } from "next/server";
import { z } from "zod";
import { setDemoState } from "@/server/services/demo-service";
import { STAGE_ORDER } from "@/server/domain/stage";

const bodySchema = z.object({
  projectId: z.string(),
  stage: z.enum(STAGE_ORDER).optional(),
  briefStatus: z.enum(["draft", "sent", "changes_requested", "approved"]).optional(),
  proposalStatus: z.enum(["draft", "sent", "changes_requested", "accepted"]).optional(),
  invoiceStatus: z.enum(["scheduled", "unpaid", "promised", "unverified", "partially_paid", "paid", "overdue"]).optional(),
});

// No session check here — NODE_ENV === "development" below is the only gate.
// This is a dev-only test/demo fixture control, not a user-facing action, and
// requiring auth would make it awkward to call from tooling (e.g. Playwright
// setup/teardown hooks) that has no browser session.
export async function POST(request: Request) {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ ok: false, error: "Not found." }, { status: 404 });
  }

  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ ok: false, error: "Invalid demo state." }, { status: 400 });

  try {
    await setDemoState(parsed.data);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Failed." }, { status: 400 });
  }
}
