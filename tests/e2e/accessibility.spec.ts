import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const pages = [
  { name: "Home", path: "/" },
  { name: "Schedule", path: "/schedule" },
  { name: "Games", path: "/games" },
  { name: "Participants", path: "/participants" },
  { name: "Gallery", path: "/gallery" },
  { name: "More", path: "/more" },
  { name: "QR", path: "/qr" },
  { name: "Admin Login", path: "/admin/login" },
];

for (const { name, path } of pages) {
  test(`${name} page has no critical a11y violations`, async ({ page }) => {
    await page.goto(path);
    await page.waitForLoadState("domcontentloaded");
    // Give client components time to mount
    await page.waitForTimeout(2000);

    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa"])
      .disableRules(["color-contrast"]) // Sinhala font rendering can cause false positives
      .analyze();

    const critical = results.violations.filter(
      (v) => v.impact === "critical" || v.impact === "serious"
    );

    expect(critical, `${name} has critical a11y issues: ${JSON.stringify(critical.map(v => v.id))}`).toHaveLength(0);
  });
}

test.describe("Touch target sizing", () => {
  test("Bottom tab bar links are at least 44px tall", async ({ page }) => {
    await page.goto("/");
    const navLinks = page.locator("nav a");
    const count = await navLinks.count();
    for (let i = 0; i < count; i++) {
      const box = await navLinks.nth(i).boundingBox();
      expect(box).not.toBeNull();
      if (box) {
        expect(box.height).toBeGreaterThanOrEqual(44);
      }
    }
  });
});
