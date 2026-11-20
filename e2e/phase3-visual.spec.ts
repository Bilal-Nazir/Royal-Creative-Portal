import { test, expect, type Page } from "@playwright/test";

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

test.describe.configure({ mode: "serial" });

test.describe("Phase 3 screens", () => {
  for (const viewport of VIEWPORTS) {
    test.describe(`${viewport.name} @ ${viewport.width}px`, () => {
      test.use({ viewport: { width: viewport.width, height: viewport.height } });

      test("A00 agency dashboard (real data)", async ({ page }) => {
        await signIn(page, "jerry@royalcreative.co");
        await page.goto("/agency/dashboard");
        await expect(page.getByRole("heading", { name: "Agency dashboard" })).toBeVisible();
        await page.screenshot({ path: `e2e/screenshots/phase3-a00-dashboard-${viewport.name}.png`, fullPage: true });
      });

      test("A14 agency notifications", async ({ page }) => {
        await signIn(page, "jerry@royalcreative.co");
        await page.goto("/agency/notifications");
        await expect(page.getByRole("heading", { name: "Notifications", exact: true })).toBeVisible();
        await page.screenshot({ path: `e2e/screenshots/phase3-a14-notifications-${viewport.name}.png`, fullPage: true });
      });

      test("A29 agency messages inbox", async ({ page }) => {
        await signIn(page, "jerry@royalcreative.co");
        await page.goto("/agency/messages");
        await expect(page.getByRole("heading", { name: "Messages" })).toBeVisible();
        await page.screenshot({ path: `e2e/screenshots/phase3-a29-messages-${viewport.name}.png`, fullPage: true });
      });

      test("A17 contacts pipeline", async ({ page }) => {
        await signIn(page, "jerry@royalcreative.co");
        await page.goto("/agency/contacts");
        await expect(page.getByRole("heading", { name: "Contacts" })).toBeVisible();
        await page.screenshot({ path: `e2e/screenshots/phase3-a17-contacts-${viewport.name}.png`, fullPage: true });
      });

      test("A18 contact detail", async ({ page }) => {
        await signIn(page, "jerry@royalcreative.co");
        await page.goto("/agency/contacts/contact-clara");
        await expect(page.getByRole("heading", { name: "Clara Ashworth" })).toBeVisible();
        await page.screenshot({ path: `e2e/screenshots/phase3-a18-contact-detail-${viewport.name}.png`, fullPage: true });
      });

      test("A28 add contact", async ({ page }) => {
        await signIn(page, "jerry@royalcreative.co");
        await page.goto("/agency/contacts/new");
        await expect(page.getByRole("heading", { name: "Add a contact" })).toBeVisible();
        await page.screenshot({ path: `e2e/screenshots/phase3-a28-add-contact-${viewport.name}.png`, fullPage: true });
      });

      test("A30 contact settings", async ({ page }) => {
        await signIn(page, "jerry@royalcreative.co");
        await page.goto("/agency/contacts/settings");
        await expect(page.getByRole("heading", { name: "Contact settings" })).toBeVisible();
        await page.screenshot({ path: `e2e/screenshots/phase3-a30-contact-settings-${viewport.name}.png`, fullPage: true });
      });

      test("A20 agency settings", async ({ page }) => {
        await signIn(page, "jerry@royalcreative.co");
        await page.goto("/agency/settings");
        await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible();
        await page.screenshot({ path: `e2e/screenshots/phase3-a20-settings-${viewport.name}.png`, fullPage: true });
      });

      test("A27 stripe settings", async ({ page }) => {
        await signIn(page, "jerry@royalcreative.co");
        await page.goto("/agency/payments/stripe");
        await expect(page.getByRole("heading", { name: "Stripe settings" })).toBeVisible();
        await page.screenshot({ path: `e2e/screenshots/phase3-a27-stripe-settings-${viewport.name}.png`, fullPage: true });
      });

      test("Client messages (no Figma)", async ({ page }) => {
        await signIn(page, "alex@royaltrendsy.com");
        await page.goto("/messages");
        await expect(page.getByRole("heading", { name: "Messages" })).toBeVisible();
        await page.screenshot({ path: `e2e/screenshots/phase3-client-messages-${viewport.name}.png`, fullPage: true });
      });

      test("Client files (no Figma)", async ({ page }) => {
        await signIn(page, "alex@royaltrendsy.com");
        await page.goto("/files");
        await expect(page.getByRole("heading", { name: "Files" })).toBeVisible();
        await page.screenshot({ path: `e2e/screenshots/phase3-client-files-${viewport.name}.png`, fullPage: true });
      });

      test("Client payments (no Figma)", async ({ page }) => {
        await signIn(page, "alex@royaltrendsy.com");
        await page.goto("/payments");
        await expect(page.getByRole("heading", { name: "Payments" })).toBeVisible();
        await page.screenshot({ path: `e2e/screenshots/phase3-client-payments-${viewport.name}.png`, fullPage: true });
      });
    });
  }
});
