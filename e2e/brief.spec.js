/* v348: the session brief — the panel that fills the height the compact
   day rows (v347) free up on taller phones. It shows up next, last time
   this day, the warm-up rule and a done-by clock estimate. Below 720px
   viewport height there is no spare space, so it stays hidden and the
   one-screen layout is exactly as before.                            */
const { test, expect } = require("@playwright/test");
const path = require("path");

const url = "file://" + path.resolve(__dirname, "..", "index.html");

async function seed(page, extra) {
  await page.goto(url);
  await page.evaluate((o) => localStorage.setItem("gym-tool-v2", JSON.stringify(o)), Object.assign({
    v: 5, cur: "fri", idx: 0, state: {},
    liftHistory: {
      "fri:0": [
        { date: "2026-11-01", load: 60, reps: 6, rir: 2, hitTop: false, setsDone: 3, exId: "fri-smith-squat" }
      ]
    }
  }, extra || {}));
  await page.reload();
}

test.describe("session brief 390x844", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("brief fills the spare height with up-next, last-time and done-by", async ({ page }) => {
    const errors = [];
    page.on("pageerror", (e) => errors.push(String(e)));
    await seed(page);

    const brief = page.locator("#dayBrief");
    await expect(brief).toBeVisible();
    await expect(page.locator("#briefNext")).toContainText("Smith squat");
    await expect(page.locator("#briefLast")).toContainText("Nov 1");
    await expect(page.locator("#briefLast")).toContainText("3 sets logged");
    await expect(page.locator("#briefDoneBy")).toContainText("min total");

    /* the brief, not empty space, reaches down toward the bottom dock */
    const box = await brief.boundingBox();
    const finBottom = await page.locator("#dayFinisher").evaluate((el) => el.getBoundingClientRect().bottom);
    expect(box.height, "brief uses a real share of the freed height").toBeGreaterThan(100);
    expect(box.y + box.height, "brief ends above the dock").toBeLessThanOrEqual(finBottom);

    const ok = await page.evaluate(() => document.documentElement.scrollHeight <= window.innerHeight + 1);
    expect(ok, "page must not scroll").toBe(true);
    expect(errors).toEqual([]);
  });

  test("brief follows the split: 4-day Friday's up-next is the incline press", async ({ page }) => {
    await seed(page, { split: "4" });
    await expect(page.locator("#dayBrief")).toBeVisible();
    await expect(page.locator("#briefNext")).toContainText("Smith incline press");
  });
});

test.describe("session brief 390x667", () => {
  test.use({ viewport: { width: 390, height: 667 } });

  test("no spare height — brief stays hidden, layout unchanged", async ({ page }) => {
    await seed(page);
    await expect(page.locator("#dayBrief")).toBeHidden();
    await expect(page.locator(".liftrow")).toHaveCount(8);
    const ok = await page.evaluate(() => document.documentElement.scrollHeight <= window.innerHeight + 1);
    expect(ok, "page must not scroll").toBe(true);
  });
});
