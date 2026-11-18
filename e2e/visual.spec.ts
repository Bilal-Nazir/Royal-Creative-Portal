import { test, expect, type Page } from "@playwright/test";

const VIEWPORTS = [
  { name: "desktop", width: 1440, height: 900 },
  { name: "mobile", width: 390, height: 844 },
];

async function signIn(page: Page, email: string, password: string) {
  await page.goto("/sign-in");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
}

for (const viewport of VIEWPORTS) {
  test.describe(`${viewport.name} @ ${viewport.width}px`, () => {
    test.use({ viewport: { width: viewport.width, height: viewport.height } });

    test("C17 sign-in screen", async ({ page }) => {
      await page.goto("/sign-in");
      await expect(page.getByRole("heading", { name: "Sign in to Royal Creative" })).toBeVisible();
      await page.screenshot({ path: `e2e/screenshots/sign-in-${viewport.name}.png`, fullPage: true });
    });

    test("C02 client dashboard", async ({ page }) => {
      await signIn(page, "alex@royaltrendsy.com", "password123");
      await expect(page).toHaveURL(/\/dashboard/);
      await expect(page.getByRole("heading", { name: "Welcome back, Alex." })).toBeVisible();
      await page.screenshot({ path: `e2e/screenshots/client-dashboard-${viewport.name}.png`, fullPage: true });
    });

    test("A00 agency dashboard", async ({ page }) => {
      await signIn(page, "jerry@royalcreative.co", "password123");
      await expect(page).toHaveURL(/\/agency\/dashboard/);
      await expect(page.getByRole("heading", { name: "Agency dashboard" })).toBeVisible();
      await page.screenshot({ path: `e2e/screenshots/agency-dashboard-${viewport.name}.png`, fullPage: true });
    });
  });
}
