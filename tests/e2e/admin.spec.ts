import { test, expect } from "@playwright/test";

test.describe("Admin login flow", () => {
  test("Admin login page renders", async ({ page }) => {
    await page.goto("/admin/login");
    await expect(page.getByRole("heading")).toBeVisible();
    await expect(page.getByPlaceholder("admin@awurudu.lk")).toBeVisible();
    await expect(page.getByPlaceholder("••••••••")).toBeVisible();
    await expect(page.getByRole("button", { name: /sign in|පිවිසෙන්න/i })).toBeVisible();
  });

  test("Shows error on invalid credentials", async ({ page }) => {
    await page.goto("/admin/login");
    await page.getByPlaceholder("admin@awurudu.lk").fill("wrong@test.com");
    await page.getByPlaceholder("••••••••").fill("wrongpass");
    await page.getByRole("button", { name: /sign in|පිවිසෙන්න/i }).click();
    // Should show error message
    await expect(page.getByText(/invalid|වලංගු නොවන/i)).toBeVisible({ timeout: 10000 });
  });
});

test.describe("Admin scoring page", () => {
  test("Scoring page shows game selector", async ({ page }) => {
    await page.goto("/admin/scoring");
    await expect(page.locator("h1")).toBeVisible();
    // Should show game buttons
    await expect(page.getByText("Banis Kama")).toBeVisible();
  });

  test("Scoring page shows position buttons", async ({ page }) => {
    await page.goto("/admin/scoring");
    // Wait for participants to load
    await page.waitForTimeout(2000);
    // Should show 1/2/3 position buttons
    const buttons = page.getByRole("button", { name: "1" });
    expect(await buttons.count()).toBeGreaterThan(0);
  });
});

test.describe("Admin voting control page", () => {
  test("Voting control page loads", async ({ page }) => {
    await page.goto("/admin/voting");
    await expect(page.locator("h1")).toBeVisible();
    // Should show open/close voting button
    await expect(
      page.getByRole("button", { name: /open voting|close voting|ඡන්දය විවෘත|ඡන්දය වසන්න/i })
    ).toBeVisible();
  });
});
