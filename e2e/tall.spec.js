/* Tall Home-Screen canvas (standalone PWA, Pro/Pro-Max class phones): the app
   has real spare height, so the day rows and set-log rows must NOT stretch
   into tall, sparse cards. Instead they stay compact and the space reads as
   breathing room above a pinned "Today" band + finisher. These specs pin that
   contract at 430x932 and assert it does not overflow.                       */
const { test, expect } = require("@playwright/test");
const path = require("path");

const url = "file://" + path.resolve(__dirname, "..", "index.html");
const viewport = { width: 430, height: 932 };

async function seed(page, obj) {
  await page.goto(url);
  await page.evaluate((o) => localStorage.setItem("gym-tool-v2", JSON.stringify(o)), obj);
  await page.reload();
}

async function noOverflow(page) {
  const ok = await page.evaluate(() => document.documentElement.scrollHeight <= window.innerHeight + 1);
  expect(ok, "page must not scroll").toBe(true);
}

test.use({ viewport });

test.describe("tall Home-Screen canvas 430x932", () => {
  test("day view: compact rows + a visible Today band, no overflow", async ({ page }) => {
    await seed(page, { v: 2, cur: "fri", idx: 0, state: {}, liftHistory: {} });
    await noOverflow(page);

    // the designed bottom band is visible and populated with today's tally
    const band = page.locator("#dayBand");
    await expect(band).toBeVisible();
    const tally = await page.locator("#bandInfo").textContent();
    expect(tally).toMatch(/^0\/24 sets/);
    // the finisher card sits at the base, inside the viewport
    const finBottom = await page.locator("#dayFinisher").evaluate((el) => el.getBoundingClientRect().bottom);
    expect(finBottom).toBeLessThanOrEqual(932);

    // the 8 day rows stay compact (they must NOT stretch to fill the spare height)
    const heights = await page.locator(".liftrow").evaluateAll((rows) => rows.map((r) => r.getBoundingClientRect().height));
    expect(heights).toHaveLength(8);
    for (const h of heights) {
      expect(h, "day row must stay compact on the tall canvas").toBeGreaterThanOrEqual(52);
      expect(h, "day row must not stretch across the spare height").toBeLessThanOrEqual(68);
    }
  });

  test("lift view: compact set rows, Set Done on-screen, no overflow", async ({ page }) => {
    await seed(page, { v: 2, cur: "fri", idx: 0, state: {}, liftHistory: {} });
    await page.locator(".liftrow").first().click();
    await expect(page.locator("#doneBtn")).toBeVisible();
    await noOverflow(page);

    const doneBottom = await page.locator("#doneBtn").evaluate((el) => el.getBoundingClientRect().bottom);
    expect(doneBottom, "Set Done must stay on-screen").toBeLessThanOrEqual(932);
    const setRows = await page.locator(".setrow").evaluateAll((rows) => rows.map((r) => r.getBoundingClientRect().height));
    for (const h of setRows) {
      expect(h, "set row must stay compact on the tall canvas").toBeLessThanOrEqual(68);
    }
  });

  test("progress view: no overflow on the tall canvas", async ({ page }) => {
    await seed(page, { v: 2, cur: "fri", idx: 0, state: {}, liftHistory: {} });
    await page.locator("#progressBtn").click();
    await expect(page.locator("#progTitle")).toBeVisible();
    await noOverflow(page);
  });
});