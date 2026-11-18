import { test, expect, type Page, type APIRequestContext } from "@playwright/test";

const PROJECT_ID = "proj-royal-trendsy";
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
  });
}

test.describe.configure({ mode: "serial" });

test.describe("Phase 2a-design agency screens", () => {
  test.afterAll(async ({ request }) => {
    await restoreBaseline(request);
  });

  for (const viewport of VIEWPORTS) {
    test.describe(`${viewport.name} @ ${viewport.width}px`, () => {
      test.use({ viewport: { width: viewport.width, height: viewport.height } });

      test("A02 projects board", async ({ page }) => {
        await signIn(page, "jerry@royalcreative.co");
        await page.goto("/agency/projects");
        await expect(page.getByRole("heading", { name: "Projects" })).toBeVisible();
        await page.screenshot({ path: `e2e/screenshots/a02-projects-board-${viewport.name}.png`, fullPage: true });
      });

      test("A04 new project", async ({ page }) => {
        await signIn(page, "jerry@royalcreative.co");
        await page.goto("/agency/projects/new");
        await expect(page.getByRole("heading", { name: "Create a project" })).toBeVisible();
        await page.screenshot({ path: `e2e/screenshots/a04-new-project-${viewport.name}.png`, fullPage: true });
      });

      test("A16 project detail", async ({ page }) => {
        await signIn(page, "jerry@royalcreative.co");
        await page.goto(`/agency/projects/${PROJECT_ID}`);
        await expect(page.getByRole("heading", { name: "Royal Trendsy website" })).toBeVisible();
        await expect(page.getByText("Team comments")).toBeVisible();
        await page.screenshot({ path: `e2e/screenshots/a16-project-detail-${viewport.name}.png`, fullPage: true });
      });

      test("A05 brief editor", async ({ page }) => {
        await signIn(page, "jerry@royalcreative.co");
        await page.goto(`/agency/projects/${PROJECT_ID}/brief`);
        await expect(page.getByRole("heading", { name: "Prepare the website brief" })).toBeVisible();
        await page.screenshot({ path: `e2e/screenshots/a05-brief-editor-${viewport.name}.png`, fullPage: true });
      });

      test("A06 proposal editor", async ({ page }) => {
        await signIn(page, "jerry@royalcreative.co");
        await page.goto(`/agency/projects/${PROJECT_ID}/proposal`);
        await expect(page.getByRole("heading", { name: "Prepare your proposal" })).toBeVisible();
        await page.screenshot({ path: `e2e/screenshots/a06-proposal-editor-${viewport.name}.png`, fullPage: true });
      });

      test("A07 payments dashboard", async ({ page }) => {
        await signIn(page, "jerry@royalcreative.co");
        await page.goto("/agency/payments");
        await expect(page.getByRole("heading", { name: "Payments" })).toBeVisible();
        await page.screenshot({ path: `e2e/screenshots/a07-payments-dashboard-${viewport.name}.png`, fullPage: true });
      });

      test("A08 update payment status (mark as paid manually)", async ({ page, request }) => {
        await setDemoState(request, { invoiceStatus: "unpaid" });
        await signIn(page, "jerry@royalcreative.co");
        await page.goto(`/agency/projects/${PROJECT_ID}/deposit`);
        await expect(page.getByRole("heading", { name: "Mark as paid manually" })).toBeVisible();
        await page.screenshot({ path: `e2e/screenshots/a08-update-payment-status-${viewport.name}.png`, fullPage: true });
      });

      test("A08 update payment status (verify)", async ({ page, request }) => {
        await setDemoState(request, { invoiceStatus: "unverified" });
        await signIn(page, "jerry@royalcreative.co");
        await page.goto(`/agency/projects/${PROJECT_ID}/deposit`);
        await expect(page.getByRole("heading", { name: "Verify this payment" })).toBeVisible();
        await page.screenshot({ path: `e2e/screenshots/a08-verify-payment-${viewport.name}.png`, fullPage: true });
      });
    });
  }
});
