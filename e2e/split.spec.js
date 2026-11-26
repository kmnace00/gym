/* Nov 26, 2026: the split toggle — Menu switches between the 3-day Fri–Sun
   program and the new 4-day Upper/Lower ×2 program (Fri–Mon). The same lifts
   appear under new days with their banked history attached: records re-home
   by lift id, so a completed squat history shows on Saturday in 4-day mode
   and returns to Friday in 3-day mode. Nothing is reset by toggling.      */
const { test, expect } = require("@playwright/test");
const path = require("path");

const url = "file://" + path.resolve(__dirname, "..", "index.html");
const sizes = [{ width: 390, height: 667 }, { width: 390, height: 844 }];

async function seed(page) {
  await page.goto(url);
  await page.evaluate(() => localStorage.setItem("gym-tool-v2", JSON.stringify({
    v: 5, cur: "fri", idx: 0, state: {},
    liftHistory: {
      "fri:0": [
        { date: "2026-11-01", load: 60, reps: 6, rir: 2, hitTop: false, setsDone: 3, exId: "fri-smith-squat" }
      ]
    }
  })));
  await page.reload();
}

async function noOverflow(page) {
  const ok = await page.evaluate(() => document.documentElement.scrollHeight <= window.innerHeight + 1);
  expect(ok, "page must not scroll").toBe(true);
}

for (const size of sizes) {
  test.describe(`split toggle viewport 390x${size.height}`, () => {
    test.use({ viewport: size });

    test("3-day → 4-day: four tabs, Upper/Lower labels, history follows the lift; back → restored", async ({ page }) => {
      const errors = [];
      page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
      page.on("pageerror", (e) => errors.push(String(e)));

      await seed(page);
      /* default is the 3-day program: three day tabs, Friday is Push + Quads */
      await expect(page.locator(".daytab")).toHaveCount(3);
      await expect(page.locator("#dayTitle")).toContainText("Push + Quads");

      /* switch from the menu: a segmented control shows both splits, with
         the one in use highlighted (v347 — the old single "Split: …" button
         read as a status label, not an action) */
      await page.locator("#menuBtn").click();
      await expect(page.locator("#split3Btn")).toHaveClass(/on/);
      await expect(page.locator("#split3Btn")).toHaveAttribute("aria-pressed", "true");
      await expect(page.locator("#split4Btn")).not.toHaveClass(/on/);
      await expect(page.locator("#split4Btn")).toHaveAttribute("aria-pressed", "false");
      await page.locator("#split4Btn").click();
      await expect(page.locator("#split4Btn")).toHaveClass(/on/);
      await expect(page.locator("#split4Btn")).toHaveAttribute("aria-pressed", "true");
      await expect(page.locator("#split3Btn")).not.toHaveClass(/on/);
      await expect(page.locator("#modalMsg")).toContainText("4-day split on");
      /* tapping the split already in use changes nothing */
      await page.locator("#split4Btn").click();
      await expect(page.locator("#modalMsg")).toContainText("Already on the 4-day split");
      await page.locator("#modalClose").click();

      /* four tabs now; Friday is Upper A, and the week strip knows Monday */
      await expect(page.locator(".daytab")).toHaveCount(4);
      await expect(page.locator("#dayTitle")).toContainText("Upper A · Push");
      await expect(page.locator("#daySummary")).toContainText("6 lifts");
      await noOverflow(page);

      /* the squat's banked history moved with it to Saturday (Lower A) */
      await page.locator(".daytab[data-day='sat']").click();
      await expect(page.locator("#dayTitle")).toContainText("Lower A · Quads + Biceps");
      const satRow = page.locator(".liftrow").first();
      await expect(satRow).toContainText("Smith squat");
      await expect(satRow).toContainText("60"); // its last load came along
      await noOverflow(page);

      /* Monday exists as a real day: Lower B with the leg press first */
      await page.locator(".daytab[data-day='mon']").click();
      await expect(page.locator("#dayTitle")).toContainText("Lower B · Hinge + Glutes");
      await expect(page.locator(".liftrow").first()).toContainText("Leg press");
      await expect(page.locator(".liftrow")).toHaveCount(6);
      await noOverflow(page);

      /* switch back: the squat history is home on Friday again */
      await page.locator("#menuBtn").click();
      await page.locator("#split3Btn").click();
      await expect(page.locator("#split3Btn")).toHaveClass(/on/);
      await expect(page.locator("#modalMsg")).toContainText("3-day split on");
      await page.locator("#modalClose").click();
      await expect(page.locator(".daytab")).toHaveCount(3);
      await expect(page.locator("#dayTitle")).toContainText("Push + Quads");
      const friRow = page.locator(".liftrow").first();
      await expect(friRow).toContainText("Smith squat");
      await expect(friRow).toContainText("60");

      const saved = await page.evaluate(() => JSON.parse(localStorage.getItem("gym-tool-v2")));
      expect(saved.split).toBe("3");
      expect(saved.liftHistory["fri:0"]).toHaveLength(1);
      expect(errors).toEqual([]);
    });

    test("day rows stay compact — they never stretch to fill spare height (v347)", async ({ page }) => {
      await seed(page);
      const heights = await page.locator(".liftrow").evaluateAll((rows) => rows.map((r) => r.getBoundingClientRect().height));
      expect(heights.length).toBeGreaterThan(0);
      for (const h of heights) {
        expect(h, "lift row keeps the 44px tap target").toBeGreaterThanOrEqual(44);
        expect(h, "lift row must not stretch into a tall sparse card").toBeLessThanOrEqual(68);
      }
      await noOverflow(page);
    });

    test("a payload saved in 4-day mode reopens in 4-day mode", async ({ page }) => {
      const errors = [];
      page.on("pageerror", (e) => errors.push(String(e)));
      await page.goto(url);
      await page.evaluate(() => localStorage.setItem("gym-tool-v2", JSON.stringify({
        v: 5, cur: "mon", idx: 0, state: {}, liftHistory: {}, split: "4"
      })));
      await page.reload();
      await expect(page.locator(".daytab")).toHaveCount(4);
      await expect(page.locator("#dayTitle")).toContainText("Lower B · Hinge + Glutes");
      await noOverflow(page);
      expect(errors).toEqual([]);
    });
  });
}
