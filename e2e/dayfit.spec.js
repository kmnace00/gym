/* B7-02: the day view fits one screen — all 8 lift rows rendered at
   >=44px, the last row on-screen, the document never scrolls. The rows
   flex to fill .liftlist, so this guards the fit the design relies on. */
const { test, expect } = require("@playwright/test");
const path = require("path");

const url = "file://" + path.resolve(__dirname, "..", "index.html");

for (const size of [{ width: 390, height: 844 }, { width: 390, height: 667 }]) {
  test.describe(`day view fit 390x${size.height}`, () => {
    test.use({ viewport: size });

    test("all 8 lifts on one screen, no scroll", async ({ page }) => {
      const errors = [];
      page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
      page.on("pageerror", (e) => errors.push(String(e)));

      await page.goto(url);
      await page.evaluate(() => localStorage.clear());
      await page.reload();
      await expect(page.locator(".liftrow")).toHaveCount(8);

      const m = await page.evaluate(() => {
        const rows = [...document.querySelectorAll(".liftrow")];
        return {
          minH: Math.min(...rows.map((r) => r.getBoundingClientRect().height)),
          lastBottom: rows[rows.length - 1].getBoundingClientRect().bottom,
          scrollH: document.documentElement.scrollHeight,
          innerH: window.innerHeight
        };
      });

      expect(m.minH, "every lift row keeps the 44px tap target").toBeGreaterThanOrEqual(44);
      expect(m.lastBottom, "the last lift is on-screen").toBeLessThanOrEqual(m.innerH + 1);
      expect(m.scrollH, "one screen, no scroll").toBeLessThanOrEqual(m.innerH + 1);
      expect(errors).toEqual([]);
    });
  });
}
