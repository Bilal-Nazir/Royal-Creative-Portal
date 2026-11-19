import { test, expect, type Page, type APIRequestContext } from "@playwright/test";

const PROJECT_ID = "proj-royal-trendsy";
const ROUND_1_ID = `revision-round-${PROJECT_ID}-1`;
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
  });
}

test.describe.configure({ mode: "serial" });

test.describe("Phase 2b: content, design revision loop, chat", () => {
  test.afterAll(async ({ request }) => {
    await restoreBaseline(request);
  });

  for (const viewport of VIEWPORTS) {
    test.describe(`${viewport.name} @ ${viewport.width}px`, () => {
      test.use({ viewport: { width: viewport.width, height: viewport.height } });

      test("C11 content and assets", async ({ page, request }) => {
        await setDemoState(request, { stage: "content", contentScenario: "baseline" });
        await signIn(page, "alex@royaltrendsy.com");
        await page.goto(`/projects/${PROJECT_ID}/content`);
        await expect(page.getByRole("heading", { name: "Share your website content" })).toBeVisible();
        await page.screenshot({ path: `e2e/screenshots/c11-content-${viewport.name}.png`, fullPage: true });
      });

      test("A09 content review", async ({ page, request }) => {
        await setDemoState(request, { contentScenario: "images_submitted" });
        await signIn(page, "jerry@royalcreative.co");
        await page.goto(`/agency/projects/${PROJECT_ID}/content`);
        await expect(page.getByRole("heading", { name: "Client content" })).toBeVisible();
        await expect(page.getByRole("button", { name: "Accept" })).toBeVisible();
        await page.screenshot({ path: `e2e/screenshots/a09-content-review-${viewport.name}.png`, fullPage: true });
      });

      test("A10 submit design", async ({ page, request }) => {
        await setDemoState(request, { stage: "design", designScenario: "none" });
        await signIn(page, "jerry@royalcreative.co");
        await page.goto(`/agency/projects/${PROJECT_ID}/design/submit`);
        await expect(page.getByRole("heading", { name: "Share a design" })).toBeVisible();
        await page.screenshot({ path: `e2e/screenshots/a10-submit-design-${viewport.name}.png`, fullPage: true });
      });

      test("C12/R01 design review with a draft pin, then drop a new pin", async ({ page, request }) => {
        await setDemoState(request, { designScenario: "v1_feedback_draft" });
        await signIn(page, "alex@royaltrendsy.com");
        await page.goto(`/projects/${PROJECT_ID}/design`);
        await expect(page.getByRole("heading", { name: "Review your homepage design" })).toBeVisible();
        await expect(page.getByRole("button", { name: "Comment 1" })).toBeVisible();
        await page.screenshot({ path: `e2e/screenshots/c12-design-review-${viewport.name}.png`, fullPage: true });

        // Drop a new pin by clicking the screenshot, then add its comment.
        const screenshot = page.getByAltText(/screenshot/i);
        const box = await screenshot.boundingBox();
        if (box) {
          await page.mouse.click(box.x + box.width * 0.5, box.y + box.height * 0.8);
        }
        await expect(page.getByRole("button", { name: "Comment 3" })).toBeVisible();
        await page.getByPlaceholder("Describe what should change…").fill("Add a footer link to the FAQ page.");
        await page.getByRole("button", { name: "Add comment" }).click();
        await expect(page.getByText("3 draft comments")).toBeVisible();
        await page.screenshot({ path: `e2e/screenshots/c12-design-review-pin-dropped-${viewport.name}.png`, fullPage: true });
      });

      test("R02 submit revision round, then R13 feedback submitted", async ({ page, request }) => {
        await setDemoState(request, { designScenario: "v1_feedback_draft" });
        await signIn(page, "alex@royaltrendsy.com");
        await page.goto(`/projects/${PROJECT_ID}/design/revise`);
        await expect(page.getByRole("heading", { name: "Send your feedback to the team" })).toBeVisible();
        await page.screenshot({ path: `e2e/screenshots/r02-submit-revision-round-${viewport.name}.png`, fullPage: true });

        await page.getByRole("button", { name: "Submit revision round" }).click();
        await expect(page.getByRole("heading", { name: "Revision round 1" })).toBeVisible();
        await page.screenshot({ path: `e2e/screenshots/r13-feedback-submitted-${viewport.name}.png`, fullPage: true });
      });

      test("R04 admin revision detail", async ({ page, request }) => {
        await setDemoState(request, { designScenario: "round1_submitted" });
        await signIn(page, "jerry@royalcreative.co");
        await page.goto(`/agency/projects/${PROJECT_ID}/design/rounds/${ROUND_1_ID}`);
        await expect(page.getByRole("heading", { name: "Design revision · Round 1" })).toBeVisible();
        await page.screenshot({ path: `e2e/screenshots/r04-admin-revision-detail-${viewport.name}.png`, fullPage: true });
      });

      test("R05 submit revised work", async ({ page, request }) => {
        await setDemoState(request, { designScenario: "round1_submitted" });
        await signIn(page, "jerry@royalcreative.co");
        await page.goto(`/agency/projects/${PROJECT_ID}/design/submit`);
        await expect(page.getByRole("heading", { name: "Share the revised design" })).toBeVisible();
        await page.screenshot({ path: `e2e/screenshots/r05-submit-revised-work-${viewport.name}.png`, fullPage: true });
      });

      test("R06 revised design review", async ({ page, request }) => {
        await setDemoState(request, { designScenario: "v2_ready" });
        await signIn(page, "alex@royaltrendsy.com");
        await page.goto(`/projects/${PROJECT_ID}/design`);
        await expect(page.getByRole("heading", { name: "Your revised design is ready" })).toBeVisible();
        await page.screenshot({ path: `e2e/screenshots/r06-revised-design-review-${viewport.name}.png`, fullPage: true });
      });

      test("R07 design approval", async ({ page, request }) => {
        await setDemoState(request, { designScenario: "approved" });
        await signIn(page, "alex@royaltrendsy.com");
        await page.goto(`/projects/${PROJECT_ID}/design`);
        await expect(page.getByRole("heading", { name: "Design approved. Next: development." })).toBeVisible();
        await page.screenshot({ path: `e2e/screenshots/r07-design-approved-${viewport.name}.png`, fullPage: true });
      });

      test("R10 project conversation", async ({ page, request }) => {
        await setDemoState(request, { designScenario: "none" });
        await signIn(page, "alex@royaltrendsy.com");
        await page.goto(`/projects/${PROJECT_ID}/conversation`);
        await expect(page.getByRole("heading", { name: "Keep the conversation with the work" })).toBeVisible();
        // Unique per run so repeated test executions (chat messages persist in the dev store, unlike other demo state) never collide on a stale match.
        const messageText = `Thanks, I'll review the mobile homepage as well. (${Date.now()})`;
        await page.getByPlaceholder("Write a message…").fill(messageText);
        await page.getByRole("button", { name: "Send message" }).click();
        await expect(page.getByText(messageText)).toBeVisible();
        await page.screenshot({ path: `e2e/screenshots/r10-conversation-${viewport.name}.png`, fullPage: true });
      });

      test("R12 review with chat drawer", async ({ page, request }) => {
        await setDemoState(request, { designScenario: "v1_feedback_draft" });
        await signIn(page, "alex@royaltrendsy.com");
        await page.goto(`/projects/${PROJECT_ID}/design`);
        await page.getByRole("button", { name: "Conversation" }).click();
        await expect(page.getByRole("heading", { name: "Project conversation" })).toBeVisible();
        await page.screenshot({ path: `e2e/screenshots/r12-review-chat-drawer-${viewport.name}.png`, fullPage: true });
      });

      test("R15 empty design review state", async ({ page, request }) => {
        await setDemoState(request, { designScenario: "none" });
        await signIn(page, "alex@royaltrendsy.com");
        await page.goto(`/projects/${PROJECT_ID}/design`);
        await expect(page.getByRole("heading", { name: "Your design review will appear here." })).toBeVisible();
        await page.screenshot({ path: `e2e/screenshots/r15-empty-design-${viewport.name}.png`, fullPage: true });
      });

      test("R17 viewer read-only on design review and content", async ({ page, request }) => {
        await setDemoState(request, { designScenario: "v1_feedback_draft" });
        await signIn(page, "priya@royaltrendsy.com");
        await page.goto(`/projects/${PROJECT_ID}/design`);
        await expect(page.getByText("Read-only access")).toBeVisible();
        await page.screenshot({ path: `e2e/screenshots/r17-viewer-readonly-${viewport.name}.png`, fullPage: true });
      });
    });
  }
});
