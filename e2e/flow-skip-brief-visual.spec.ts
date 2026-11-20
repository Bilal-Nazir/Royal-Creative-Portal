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

test.describe("Flow: start projects at proposal (skip brief)", () => {
  test.afterAll(async ({ request }) => {
    await restoreBaseline(request);
  });

  for (const viewport of VIEWPORTS) {
    test.describe(`${viewport.name} @ ${viewport.width}px`, () => {
      test.use({ viewport: { width: viewport.width, height: viewport.height } });

      test("A04 new project — Start from field", async ({ page }) => {
        await signIn(page, "jerry@royalcreative.co");
        await page.goto("/agency/projects/new");
        await expect(page.getByLabel("Start from")).toBeVisible();
        await expect(page.getByLabel("Start from")).toHaveValue("brief");
        await page.screenshot({ path: `e2e/screenshots/a04-start-from-${viewport.name}.png`, fullPage: true });
      });

      test("A16 project detail — Skip brief action, then confirm", async ({ page, request }) => {
        await setDemoState(request, { stage: "brief", briefStatus: "draft" });
        await signIn(page, "jerry@royalcreative.co");
        await page.goto(`/agency/projects/${PROJECT_ID}`);
        await expect(page.getByRole("button", { name: "Skip brief" })).toBeVisible();
        await page.screenshot({ path: `e2e/screenshots/a16-skip-brief-action-${viewport.name}.png`, fullPage: true });

        page.once("dialog", (dialog) => dialog.accept());
        await page.getByRole("button", { name: "Skip brief" }).click();
        await expect(page.getByRole("button", { name: "Skip brief" })).toHaveCount(0);
        // The "PROJECT JOURNEY" sidebar is desktop-only (MobileNav has no equivalent) — see DESIGN_NOTES.
        if (viewport.name === "desktop") {
          await expect(page.getByText("– Brief · Skipped")).toBeVisible();
        }
        await page.screenshot({ path: `e2e/screenshots/a16-brief-skipped-${viewport.name}.png`, fullPage: true });
      });

      test("Client journey sidebar — Brief · Skipped", async ({ page }) => {
        await signIn(page, "alex@royaltrendsy.com");
        await page.goto(`/projects/${PROJECT_ID}/proposal`);
        if (viewport.name === "desktop") {
          await expect(page.getByText("– Brief · Skipped")).toBeVisible();
        }
        await page.screenshot({ path: `e2e/screenshots/client-journey-brief-skipped-${viewport.name}.png`, fullPage: true });
      });

      test("A06 proposal editor — no approved-brief baseline text when skipped", async ({ page }) => {
        await signIn(page, "jerry@royalcreative.co");
        await page.goto(`/agency/projects/${PROJECT_ID}/proposal`);
        await expect(page.getByRole("heading", { name: "Prepare your proposal" })).toBeVisible();
        await expect(page.getByText("Use the approved brief as the scope baseline.")).toHaveCount(0);
        await page.screenshot({ path: `e2e/screenshots/a06-proposal-editor-brief-skipped-${viewport.name}.png`, fullPage: true });
      });

      test("Guest proposal preview (brief skipped)", async ({ page }) => {
        await signIn(page, "jerry@royalcreative.co");
        const linkResponse = await page.request.get(`/api/projects/${PROJECT_ID}/share-link`);
        const { path } = await linkResponse.json();
        await page.context().clearCookies();

        await page.goto(path);
        await expect(page.getByRole("heading", { name: "Royal Trendsy website" })).toBeVisible();
        await expect(page.getByRole("link", { name: "Accept proposal" })).toBeVisible();
        await expect(page.getByRole("link", { name: "Request changes" })).toBeVisible();
        await page.screenshot({ path: `e2e/screenshots/guest-proposal-preview-${viewport.name}.png`, fullPage: true });
      });
    });
  }
});
