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

test.describe("Phase 2a screens", () => {
  test.afterAll(async ({ request }) => {
    await restoreBaseline(request);
  });

  for (const viewport of VIEWPORTS) {
    test.describe(`${viewport.name} @ ${viewport.width}px`, () => {
      test.use({ viewport: { width: viewport.width, height: viewport.height } });

      test("C01 guest brief preview", async ({ page }) => {
        await signIn(page, "jerry@royalcreative.co");
        const linkResponse = await page.request.get(`/api/projects/${PROJECT_ID}/share-link`);
        const { path } = await linkResponse.json();
        await page.context().clearCookies();

        await page.goto(path);
        await expect(page.getByRole("heading", { name: "Royal Trendsy website" })).toBeVisible();
        await page.screenshot({ path: `e2e/screenshots/c01-guest-brief-${viewport.name}.png`, fullPage: true });
      });

      test("C16 brief sign-in", async ({ page }) => {
        await page.goto(`/sign-in?variant=brief&returnTo=${encodeURIComponent(`/projects/${PROJECT_ID}/brief`)}`);
        await expect(page.getByRole("heading", { name: "Sign in to continue" })).toBeVisible();
        await page.screenshot({ path: `e2e/screenshots/c16-brief-sign-in-${viewport.name}.png`, fullPage: true });
      });

      test("C03 brief review (sent)", async ({ page, request }) => {
        await setDemoState(request, { briefStatus: "sent" });
        await signIn(page, "alex@royaltrendsy.com");
        await page.goto(`/projects/${PROJECT_ID}/brief`);
        await expect(page.getByRole("heading", { name: "Let's make sure we've understood." })).toBeVisible();
        await page.screenshot({ path: `e2e/screenshots/c03-brief-review-${viewport.name}.png`, fullPage: true });
      });

      test("C04 brief revision request", async ({ page }) => {
        await signIn(page, "alex@royaltrendsy.com");
        await page.goto(`/projects/${PROJECT_ID}/brief/revise`);
        await expect(page.getByRole("heading", { name: "What should we adjust?" })).toBeVisible();
        await page.screenshot({ path: `e2e/screenshots/c04-brief-revise-${viewport.name}.png`, fullPage: true });
      });

      test("C05 brief approved", async ({ page, request }) => {
        await setDemoState(request, { briefStatus: "approved" });
        await signIn(page, "alex@royaltrendsy.com");
        await page.goto(`/projects/${PROJECT_ID}/brief`);
        await expect(page.getByRole("heading", { name: "Brief approved" })).toBeVisible();
        await page.screenshot({ path: `e2e/screenshots/c05-brief-approved-${viewport.name}.png`, fullPage: true });
      });

      test("C06 proposal review (sent)", async ({ page, request }) => {
        await setDemoState(request, { proposalStatus: "sent" });
        await signIn(page, "alex@royaltrendsy.com");
        await page.goto(`/projects/${PROJECT_ID}/proposal`);
        await expect(page.getByRole("heading", { name: "A plan for your new website." })).toBeVisible();
        await page.screenshot({ path: `e2e/screenshots/c06-proposal-review-${viewport.name}.png`, fullPage: true });
      });

      test("R14 proposal acceptance confirmation", async ({ page }) => {
        await signIn(page, "alex@royaltrendsy.com");
        await page.goto(`/projects/${PROJECT_ID}/proposal/accept`);
        await expect(page.getByRole("heading", { name: "Confirm your proposal acceptance" })).toBeVisible();
        await page.screenshot({ path: `e2e/screenshots/r14-accept-confirmation-${viewport.name}.png`, fullPage: true });
      });

      test("C07 proposal changes", async ({ page }) => {
        await signIn(page, "alex@royaltrendsy.com");
        await page.goto(`/projects/${PROJECT_ID}/proposal/changes`);
        await expect(page.getByRole("heading", { name: "Request proposal changes" })).toBeVisible();
        await page.screenshot({ path: `e2e/screenshots/c07-proposal-changes-${viewport.name}.png`, fullPage: true });
      });

      test("C08 deposit checkout (unpaid)", async ({ page, request }) => {
        await setDemoState(request, { proposalStatus: "accepted", invoiceStatus: "unpaid" });
        await signIn(page, "alex@royaltrendsy.com");
        await page.goto(`/projects/${PROJECT_ID}/deposit`);
        await expect(page.getByRole("heading", { name: "Pay your deposit" })).toBeVisible();
        await page.screenshot({ path: `e2e/screenshots/c08-deposit-checkout-${viewport.name}.png`, fullPage: true });
      });

      test("C10 deposit payment failed", async ({ page, request }) => {
        await setDemoState(request, { invoiceStatus: "unpaid" });
        await signIn(page, "alex@royaltrendsy.com");
        await page.goto(`/projects/${PROJECT_ID}/deposit`);
        await page.getByLabel("Simulate failure").check();
        await page.getByRole("button", { name: /Pay £/ }).click();
        await expect(page.getByRole("heading", { name: "Payment unsuccessful" })).toBeVisible();
        await page.screenshot({ path: `e2e/screenshots/c10-deposit-failed-${viewport.name}.png`, fullPage: true });
      });

      test("R11 choose payment date", async ({ page, request }) => {
        await setDemoState(request, { invoiceStatus: "unpaid" });
        await signIn(page, "alex@royaltrendsy.com");
        await page.goto(`/projects/${PROJECT_ID}/deposit/choose-date`);
        await expect(page.getByRole("heading", { name: "Choose a payment date" })).toBeVisible();
        await page.screenshot({ path: `e2e/screenshots/r11-choose-date-${viewport.name}.png`, fullPage: true });
      });

      test("C09 deposit paid", async ({ page, request }) => {
        await setDemoState(request, { invoiceStatus: "paid" });
        await signIn(page, "alex@royaltrendsy.com");
        await page.goto(`/projects/${PROJECT_ID}/deposit`);
        await expect(page.getByRole("heading", { name: "Deposit paid" })).toBeVisible();
        await page.screenshot({ path: `e2e/screenshots/c09-deposit-paid-${viewport.name}.png`, fullPage: true });
      });
    });
  }
});
