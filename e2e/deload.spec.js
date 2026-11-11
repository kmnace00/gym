/* B6-09: deload week — started from the menu, it cuts every lift to 60% of
   its sets, takes ~10% off the suggested load, banners the day view, stamps
   banked entries, and ends from the same menu. */
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
  test.describe(`deload week viewport 390x${size.height}`, () => {
    test.use({ viewport: size });

    test("start → banner, 2-set targets, reduced suggestion, deload bank; end → normal", async ({ page }) => {
      const errors = [];
      page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
      page.on("pageerror", (e) => errors.push(String(e)));

      await seed(page);
      await expect(page.locator("#deloadBar")).toBeHidden();

      /* start the week from the menu beside the bodyweight control */
      await page.locator("#menuBtn").click();
      await expect(page.locator("#deloadStart")).toBeVisible();
      await expect(page.locator("#deloadEnd")).toBeHidden();
      await page.locator("#deloadStart").click();
      await page.locator("#modalClose").click();

      await expect(page.locator("#deloadBar")).toBeVisible();
      await expect(page.locator("#deloadBar")).toContainText("Deload week — fewer sets, ~10% lighter, stop ~2 reps earlier.");
      await noOverflow(page);

      /* the 3-set lift now completes at 2 sets, and the suggestion is 10% lighter */
      await page.locator(".liftrow").first().click();
      await expect(page.locator("#setCount")).toHaveText("Set 1 of 2");
      await expect(page.locator("#suggestText")).toContainText("Deload week → ");
      await expect(page.locator("#suggestText")).toContainText("55"); // 60 × 0.9 = 54 → 55 at a 2.5 step
      await noOverflow(page);

      await page.locator("#doneBtn").click();
      await page.locator("#skipRest").click();
      await page.locator("#doneBtn").click();
      await page.locator("#skipRest").click();

      const banked = await page.evaluate(() => {
        const p = JSON.parse(localStorage.getItem("gym-tool-v2"));
        const arr = p.liftHistory["fri:0"] || [];
        return { deloadSince: p.deloadSince, entry: arr[arr.length - 1] };
      });
      expect(banked.deloadSince, "the start date is stored").toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(banked.entry.deload, "the banked entry is stamped as a deload").toBe(true);
      expect(banked.entry.setsDone).toBe(2);

      /* the day row shows the lift complete at the reduced target */
      await page.locator("#backBtn").click();
      await expect(page.locator("#liftList .liftrow").first()).toHaveClass(/done/);

      /* end the week → new targets and no banner */
      await page.locator("#menuBtn").click();
      await expect(page.locator("#deloadEnd")).toBeVisible();
      await expect(page.locator("#deloadStart")).toBeHidden();
      await page.locator("#deloadEnd").click();
      await page.locator("#modalClose").click();
      await expect(page.locator("#deloadBar")).toBeHidden();
      await noOverflow(page);

      await page.locator(".liftrow").first().click();
      await expect(page.locator("#setCount")).toHaveText("Set 3 of 3");
      await expect(page.locator("#suggestText")).not.toContainText("Deload week → ");

      expect(errors, "no console errors").toEqual([]);
    });
  });
}
