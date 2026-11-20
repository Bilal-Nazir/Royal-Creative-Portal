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
  contentScenario: z.enum(["baseline", "images_submitted", "images_changes_requested"]).optional(),
  designScenario: z.enum(["none", "v1_shared", "v1_feedback_draft", "round1_submitted", "v2_ready", "approved"]).optional(),
  developmentScenario: z.enum(["none", "v1_shared", "v1_feedback_draft", "round1_submitted", "v2_ready", "approved"]).optional(),
  launchScenario: z.enum(["not_started", "checklist_in_progress", "checklist_complete"]).optional(),
  finalInvoiceStatus: z.enum(["scheduled", "unpaid", "promised", "unverified", "partially_paid", "paid", "overdue"]).optional(),
  handoverScenario: z.enum(["none", "resources_added"]).optional(),
  scopeChangeScenario: z.enum(["none", "pending", "accepted", "declined"]).optional(),
});

// No session check here — the gate below is the only one. This is a
// dev/test-only fixture control, not a user-facing action, and requiring
// auth would make it awkward to call from tooling (e.g. Playwright setup/
// teardown hooks) that has no browser session.
//
// Gate: NODE_ENV === "development" (local `next dev`), OR ALLOW_DEMO_STATE
// explicitly set to "true" (set by playwright.config.ts's webServer so e2e
// can run against a real production build via `next start` — closer to
// production behaviour, fewer dev-mode-only timing flakes — while a real
// production deployment without that env var stays 404'd).
export async function POST(request: Request) {
  if (process.env.NODE_ENV !== "development" && process.env.ALLOW_DEMO_STATE !== "true") {
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
