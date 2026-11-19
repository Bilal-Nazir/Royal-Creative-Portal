import { test, expect, type Page, type APIRequestContext } from "@playwright/test";

const PROJECT_ID = "proj-royal-trendsy";
const DEV_ROUND_1_ID = `revision-round-development-${PROJECT_ID}-1`;
const VIEWPORTS = [
  { name: "desktop", width: 1440, height: 900 },
  { name: "mobile", width: 390, height: 844 },
];

async function signIn(page: Page, email: string, password = "password123") {
  await page.goto("/sign-in");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await Promise.all([page.waitForURL(/\/(dashboard|agency\/dashboard)/), page.getByRole("button", { name: "Sign in" }).click()]);
}

async function setDemoState(request: APIRequestContext, patch: Record<string, string>) {
  const response = await request.post("/api/dev/demo-state", { data: { projectId: PROJECT_ID, ...patch } });
  expect(response.ok()).toBeTruthy();
}

// Restore the Phase 1 baseline snapshot so other spec files aren't affected by this file's state mutations.
async function restoreBaseline(request: APIRequestContext) {
  await setDemoState(request, {
    stage: "design",
    briefStatus: "approved",
    proposalStatus: "accepted",
    invoiceStatus: "paid",
    contentScenario: "baseline",
    designScenario: "none",
    developmentScenario: "none",
    launchScenario: "not_started",
    handoverScenario: "none",
    scopeChangeScenario: "none",
  });
}

test.describe.configure({ mode: "serial" });

test.describe("Phase 2c: development, launch, handover, scope change", () => {
  test.afterAll(async ({ request }) => {
    await restoreBaseline(request);
  });

  for (const viewport of VIEWPORTS) {
    test.describe(`${viewport.name} @ ${viewport.width}px`, () => {
      test.use({ viewport: { width: viewport.width, height: viewport.height } });

      test("A11 submit development", async ({ page, request }) => {
        await setDemoState(request, { stage: "development", developmentScenario: "none" });
        await signIn(page, "jerry@royalcreative.co");
        await page.goto(`/agency/projects/${PROJECT_ID}/development/submit`);
        await expect(page.getByRole("heading", { name: "Share the staging site" })).toBeVisible();
        await page.screenshot({ path: `e2e/screenshots/a11-submit-development-${viewport.name}.png`, fullPage: true });
      });

      test("C13 development submitted, what to test", async ({ page, request }) => {
        await setDemoState(request, { developmentScenario: "v1_shared" });
        await signIn(page, "alex@royaltrendsy.com");
        await page.goto(`/projects/${PROJECT_ID}/development`);
        await expect(page.getByRole("heading", { name: "Review the developed website" })).toBeVisible();
        await expect(page.getByRole("heading", { name: "What to test" })).toBeVisible();
        await page.screenshot({ path: `e2e/screenshots/c13-development-submitted-${viewport.name}.png`, fullPage: true });
      });

      test("R08 development annotation review, then ask for changes", async ({ page, request }) => {
        await setDemoState(request, { developmentScenario: "v1_feedback_draft" });
        await signIn(page, "alex@royaltrendsy.com");
        await page.goto(`/projects/${PROJECT_ID}/development`);
        await expect(page.getByRole("button", { name: "Comment 1" })).toBeVisible();
        await page.screenshot({ path: `e2e/screenshots/r08-development-review-${viewport.name}.png`, fullPage: true });

        await page.goto(`/projects/${PROJECT_ID}/development/revise`);
        await expect(page.getByRole("heading", { name: "Send your feedback to the team" })).toBeVisible();
        await page.screenshot({ path: `e2e/screenshots/r08-ask-for-changes-${viewport.name}.png`, fullPage: true });
      });

      test("R18 agency development revision work", async ({ page, request }) => {
        await setDemoState(request, { developmentScenario: "round1_submitted" });
        await signIn(page, "jerry@royalcreative.co");
        await page.goto(`/agency/projects/${PROJECT_ID}/development/rounds/${DEV_ROUND_1_ID}`);
        await expect(page.getByRole("heading", { name: "Development revision · Round 1" })).toBeVisible();
        await expect(page.getByRole("button", { name: "Flag for scope decision" })).toBeVisible();
        await page.screenshot({ path: `e2e/screenshots/r18-development-revision-work-${viewport.name}.png`, fullPage: true });
      });

      test("R19 revised development review and approval", async ({ page, request }) => {
        await setDemoState(request, { developmentScenario: "v2_ready" });
        await signIn(page, "alex@royaltrendsy.com");
        await page.goto(`/projects/${PROJECT_ID}/development`);
        await expect(page.getByRole("heading", { name: "The updated website is ready" })).toBeVisible();
        await page.screenshot({ path: `e2e/screenshots/r19-revised-development-review-${viewport.name}.png`, fullPage: true });

        await page.getByRole("button", { name: "Approve for launch" }).click();
        await expect(page.getByRole("heading", { name: "Build approved. Next: launch." })).toBeVisible();
        await page.screenshot({ path: `e2e/screenshots/r19-build-approved-${viewport.name}.png`, fullPage: true });
      });

      test("A13 launch checklist", async ({ page, request }) => {
        await setDemoState(request, { stage: "launch", launchScenario: "checklist_in_progress" });
        await signIn(page, "jerry@royalcreative.co");
        await page.goto(`/agency/projects/${PROJECT_ID}/launch`);
        await expect(page.getByRole("heading", { name: "Launch website" })).toBeVisible();
        await expect(page.getByRole("heading", { name: "Handover resources" })).toBeVisible();
        await page.screenshot({ path: `e2e/screenshots/a13-launch-checklist-${viewport.name}.png`, fullPage: true });
      });

      test("C14 launch scheduled", async ({ page, request }) => {
        await setDemoState(request, { launchScenario: "checklist_in_progress" });
        await signIn(page, "alex@royaltrendsy.com");
        await page.goto(`/projects/${PROJECT_ID}/launch`);
        await expect(page.getByRole("heading", { name: "Launch scheduled for 12 November" })).toBeVisible();
        await expect(page.getByText("Launch readiness · 3 of 4 complete")).toBeVisible();
        await page.screenshot({ path: `e2e/screenshots/c14-launch-scheduled-${viewport.name}.png`, fullPage: true });
      });

      test("Final balance checkout (deviation, no Figma screen)", async ({ page, request }) => {
        await setDemoState(request, { launchScenario: "checklist_in_progress", finalInvoiceStatus: "unpaid" });
        await signIn(page, "alex@royaltrendsy.com");
        await page.goto(`/projects/${PROJECT_ID}/final-payment`);
        await expect(page.getByRole("heading", { name: "Pay your final balance" })).toBeVisible();
        await page.screenshot({ path: `e2e/screenshots/final-payment-${viewport.name}.png`, fullPage: true });
      });

      test("C15 handover", async ({ page, request }) => {
        await setDemoState(request, { stage: "handover", handoverScenario: "resources_added" });
        await signIn(page, "alex@royaltrendsy.com");
        await page.goto(`/projects/${PROJECT_ID}/handover`);
        await expect(page.getByRole("heading", { name: "Your website is live." })).toBeVisible();
        await expect(page.getByRole("link", { name: /Website guide/ })).toBeVisible();
        await page.screenshot({ path: `e2e/screenshots/c15-handover-${viewport.name}.png`, fullPage: true });
      });

      test("R09 scope change review, accept", async ({ page, request }) => {
        await setDemoState(request, { scopeChangeScenario: "pending" });
        await signIn(page, "alex@royaltrendsy.com");
        await page.goto(`/projects/${PROJECT_ID}/scope-changes`);
        await expect(page.getByRole("heading", { name: "A request beyond the agreed scope" })).toBeVisible();
        await expect(page.getByRole("button", { name: "Approve scope change" })).toBeVisible();
        await page.screenshot({ path: `e2e/screenshots/r09-scope-change-review-${viewport.name}.png`, fullPage: true });

        await page.getByRole("button", { name: "Approve scope change" }).click();
        await expect(page.getByText("accepted")).toBeVisible();
        await page.screenshot({ path: `e2e/screenshots/r09-scope-change-accepted-${viewport.name}.png`, fullPage: true });
      });
    });
  }
});
