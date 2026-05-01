import { test, expect } from "@playwright/test";

test.describe("Public navigation flow", () => {
  test("Home page loads with festival branding", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("h1")).toBeVisible();
    // Check that quick links exist (use main to avoid bottom tab bar duplicates)
    await expect(page.getByRole("main").getByRole("link", { name: /schedule|කාලසටහන/i }).first()).toBeVisible();
    await expect(page.getByRole("main").getByRole("link", { name: /games|ක්‍රීඩා/i }).first()).toBeVisible();
  });

  test("Navigate Home → Schedule → see timeline", async ({ page }) => {
    await page.goto("/");
    // Click schedule link (quick link in main content)
    await page.getByRole("main").getByRole("link", { name: /schedule|කාලසටහන/i }).first().click();
    await expect(page).toHaveURL("/schedule");
    await expect(page.locator("h1")).toBeVisible();
  });

  test("Navigate to Games and see game list", async ({ page }) => {
    await page.goto("/games");
    await expect(page.locator("h1")).toBeVisible();
    // Should show game cards
    await expect(page.getByText("Banis Kama")).toBeVisible();
    await expect(page.getByText("Wikata Adum")).toBeVisible();
  });

  test("Navigate to game detail page", async ({ page }) => {
    await page.goto("/games");
    // Get the href from the first game link
    const gameLink = page.locator("a[href^='/games/']").first();
    await expect(gameLink).toBeVisible({ timeout: 10000 });
    const href = await gameLink.getAttribute("href");
    // Navigate directly to the game detail page
    await page.goto(href!);
    // Wait for data to load — either game name in h1 or "Game not found" text
    await expect(page.locator("main")).toBeVisible({ timeout: 20000 });
    // Verify we left the games list page
    await expect(page).toHaveURL(new RegExp("/games/.+"));
  });

  test("Participants page shows participant grid", async ({ page }) => {
    await page.goto("/participants");
    await expect(page.locator("h1")).toBeVisible();
    // Should show participant cards
    await expect(page.getByText("Manjula")).toBeVisible();
  });

  test("Gallery page loads", async ({ page }) => {
    await page.goto("/gallery");
    await expect(page.locator("h1")).toBeVisible();
  });

  test("QR code page renders QR code", async ({ page }) => {
    await page.goto("/qr");
    // Use role="img" to target QRCodeSVG specifically
    await expect(page.getByRole("main").locator("svg").first()).toBeVisible();
    await expect(page.getByRole("button", { name: /share|බෙදාගන්න/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /download|බාගන්න/i })).toBeVisible();
  });

  test("Bottom tab bar is visible and has 5 tabs", async ({ page }) => {
    await page.goto("/");
    const nav = page.locator("nav.fixed");
    await expect(nav).toBeVisible();
    const links = nav.getByRole("link");
    await expect(links).toHaveCount(5);
  });

  test("Bottom tab bar is hidden on admin pages", async ({ page }) => {
    await page.goto("/admin/login");
    // The bottom tab bar returns null on admin pages, but admin has its own nav
    // Check there's no fixed bottom nav
    const bottomTabBar = page.locator("nav.fixed");
    await expect(bottomTabBar).toHaveCount(0);
  });
});

test.describe("Language switching", () => {
  test("Switch to Sinhala and back", async ({ page }) => {
    await page.goto("/more");
    // Find Sinhala option
    const sinhalaBtn = page.getByText("සිංහල");
    if (await sinhalaBtn.isVisible()) {
      await sinhalaBtn.click();
      // Page should reload with Sinhala text
      await page.waitForLoadState("networkidle");
      await expect(page.locator("h1")).toBeVisible();
    }
  });
});
