/* Viewport smoke test: the "one screen, no scroll" invariant is the one that
   has regressed repeatedly, so assert it at the two real device sizes.       */
const { test, expect } = require("@playwright/test");
const path = require("path");

const url = "file://" + path.resolve(__dirname, "..", "index.html");
const sizes = [{ width: 390, height: 667 }, { width: 390, height: 844 }];

for (const size of sizes) {
  test.describe(`viewport 390x${size.height}`, () => {
    test.use({ viewport: size });

    test("no vertical overflow through day → lift → rest → peek", async ({ page }) => {
      const errors = [];
      page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
      page.on("pageerror", (e) => errors.push(String(e)));

      const noOverflow = async () => {
        const ok = await page.evaluate(() => document.documentElement.scrollHeight <= window.innerHeight + 1);
        expect(ok, "page must not scroll").toBe(true);
      };

      await page.goto(url);
      await noOverflow();

      await page.locator(".liftrow").first().click();
      await expect(page.locator("#exName")).toBeVisible();
      await noOverflow();

      await page.locator("#doneBtn").click();
      await expect(page.locator("#timerBar")).toHaveClass(/active/);
      await noOverflow();

      // peek: workout returns behind a short rest strip, Set Done must stay on-screen
      await page.locator("#detailsBtn").click();
      await noOverflow();
      await expect(page.locator("#exName")).toBeVisible();
      await expect(page.locator("#doneBtn")).toBeVisible();

      expect(errors.filter((e) => !/vibrate|AudioContext/i.test(e))).toEqual([]);
    });

    test("the set log stays compact: one-line rows, no stretched section", async ({ page }) => {
      await page.goto(url);
      await page.locator(".liftrow").first().click();
      await expect(page.locator("#setLog .setrow")).toHaveCount(3);
      const m = await page.evaluate(() => {
        const rows = [...document.querySelectorAll("#setLog .setrow")];
        const hs = rows.map((r) => Math.round(r.getBoundingClientRect().height));
        const log = document.getElementById("setLog").getBoundingClientRect().height;
        return { hs, log: Math.round(log) };
      });
      const tallest = Math.max(...m.hs);
      const shortest = Math.min(...m.hs);
      expect(shortest, "rows must keep the 44px tap target").toBeGreaterThanOrEqual(44);
      expect(tallest, "a set row is one compact line, not a stretched card").toBeLessThanOrEqual(46);
      expect(m.log, "the log hugs its rows").toBeLessThanOrEqual(3 * 46 + 2 * 8);
    });

    test("no overflow with suggestion + sparkline + RIR hint (worst case)", async ({ page }) => {
      await page.goto(url);
      await page.evaluate(() => {
        const hist = [50, 52.5, 55].map((l, i) => ({ date: "2026-10-0" + (i + 1), load: l, reps: 6, rir: 2, hitTop: true, setsDone: 3 }));
        localStorage.setItem("gym-tool-v2", JSON.stringify({
          v: 2, cur: "fri", idx: 0,
          state: { "fri:0": { done: 0, load: 55, reps: 6, rir: 2, topHits: 0, lastRir: null } },
          liftHistory: { "fri:0": hist }
        }));
      });
      await page.reload();
      await page.locator(".liftrow").first().click();
      await expect(page.locator("#suggestLine")).toBeVisible();
      await page.locator("#trendToggle").click();
      await expect(page.locator("#sparkWrap")).toBeVisible();
      await expect(page.locator("#rirHint")).toBeVisible();
      const fits = await page.evaluate(() => {
        const r = document.getElementById("doneBtn").getBoundingClientRect();
        return document.documentElement.scrollHeight <= window.innerHeight + 1 && r.bottom <= window.innerHeight + 1 && r.top >= 0;
      });
      expect(fits, "Set Done must stay fully on-screen").toBe(true);

      // reset button + persistent undo pill must not push Set Done off-screen
      await page.locator("#doneBtn").click();
      await page.locator("#skipRest").click();
      await expect(page.locator("#undoSetBtn")).toBeEnabled();
      const fits2 = await page.evaluate(() => {
        const r = document.getElementById("doneBtn").getBoundingClientRect();
        return document.documentElement.scrollHeight <= window.innerHeight + 1 && r.bottom <= window.innerHeight + 1;
      });
      expect(fits2, "Set Done stays on-screen after a set").toBe(true);
    });
  });
}
