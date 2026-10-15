import { test, expect } from "@playwright/test";

test.describe("Prospectus SaaS Architectural Smoke Tests", () => {
  test("renders Prospectus home dashboard with academic progression indicators", async ({
    page,
  }) => {
    await page.goto("/");

    // Verify main platform branding
    await expect(page.locator("h1")).toContainText("Prospectus");

    // Verify course progression tracking cards
    await expect(page.locator("text=Data Structures & Algorithms")).toBeVisible();
    await expect(page.locator("text=Buffer Ratio")).toBeVisible();
    await expect(page.locator("text=Coverage")).toBeVisible();
  });

  test("validates responsive mobile viewport for under 60-second logging access", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 }); // iPhone / Pixel viewport
    await page.goto("/");

    // Verify header and mobile navigation are accessible
    const header = page.locator("header");
    await expect(header).toBeVisible();

    // Verify rapid logging shortcut or view is visible on mobile
    const logButton = page.locator("button:has-text('Log Session'), a:has-text('Log Session')");
    await expect(logButton.first()).toBeVisible();
  });
});
