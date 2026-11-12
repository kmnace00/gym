/* B9-01: in the swapped state the long "Using <alt> — undo" pill must
   not push the other actions off-screen: the sethead wraps and every
   action stays fully inside the viewport, at both phone heights. */
const { test, expect } = require("@playwright/test");
const path = require("path");

const url = "file://" + path.resolve(__dirname, "..", "index.html");

for (const size of [{ width: 390, height: 844 }, { width: 390, height: 667 }]) {
  test.describe(`swap fit 390x${size.height}`, () => {
    test.use({ viewport: size });

    test("all sethead actions stay on-screen while swapped", async ({ page }) => {
      const errors = [];
      page.on("pageerror", (e) => errors.push(String(e)));

      await page.goto(url);
      await page.evaluate(() => localStorage.clear());
      await page.reload();
      await page.locator(".liftrow").first().click();
      await expect(page.locator("#exName")).toBeVisible();

      await page.locator("#swapBtn").click();
      await expect(page.locator("#swapBtn")).toContainText("Using");

      const m = await page.evaluate(() => {
        const W = window.innerWidth;
        const boxes = [...document.querySelectorAll(".setacts .resetlift")].map((b) => {
          const r = b.getBoundingClientRect();
          return { left: r.left, right: r.right };
        });
        return {
          boxes,
          W,
          scrollW: document.documentElement.scrollWidth,
          scrollH: document.documentElement.scrollHeight,
          innerH: window.innerHeight
        };
      });

      for (const b of m.boxes) {
        expect(b.left, "action pill starts on-screen").toBeGreaterThanOrEqual(0);
        expect(b.right, "action pill ends on-screen").toBeLessThanOrEqual(m.W + 1);
      }
      expect(m.scrollW, "no horizontal overflow").toBeLessThanOrEqual(m.W + 1);
      expect(m.scrollH, "one screen, no scroll").toBeLessThanOrEqual(m.innerH + 1);
      expect(errors).toEqual([]);
    });
  });
}
