/* New-behaviour checks: backup nudge, tap-to-type, deload, PR, rest lock. */
const { test, expect } = require("@playwright/test");
const path = require("path");

const url = "file://" + path.resolve(__dirname, "..", "index.html");

async function seed(page, obj) {
  await page.goto(url);
  await page.evaluate((o) => localStorage.setItem("gym-tool-v2", JSON.stringify(o)), obj);
  await page.reload();
}

test("overdue backup shows a day-view banner that opens the menu", async ({ page }) => {
  await seed(page, {
    v: 2, cur: "fri", idx: 0, state: {},
    liftHistory: { "fri:0": [{ date: "2026-11-01", load: 50, reps: 6, rir: 2, hitTop: true, setsDone: 3 }] }
  });
  await expect(page.locator("#backupBar")).toBeVisible();
  await expect(page.locator("#backupBarText")).toContainText("Never backed up");
  const noScroll = await page.evaluate(() => document.documentElement.scrollHeight <= window.innerHeight + 1);
  expect(noScroll, "banner must not cause scrolling").toBe(true);

  await page.locator("#backupBarSave").click();
  await expect(page.locator("#modal")).toBeVisible();
  await page.locator("#modalClose").click();

  await page.locator("#backupBarDismiss").click();
  await expect(page.locator("#backupBar")).toBeHidden();
});

test("tap the load value to type a precise number (and it persists)", async ({ page }) => {
  await page.goto(url);
  await page.locator(".liftrow").first().click();
  await page.locator("#loadVal").click();
  const vin = page.locator(".vin");
  await expect(vin).toBeVisible();
  await vin.fill("67.5");
  await vin.press("Enter");
  await expect(page.locator("#loadVal")).toHaveText("67.5");

  await page.reload();
  await page.locator(".liftrow").first().click();
  await expect(page.locator("#loadVal")).toHaveText("67.5");
});

test("typed and held load/reps stop at sane caps (B3-18)", async ({ page }) => {
  await page.goto(url);
  await page.locator(".liftrow").first().click();

  // typing an absurd weight clamps to 2000 lb
  await page.locator("#loadVal").click();
  await page.locator(".vin").fill("99999");
  await page.locator(".vin").press("Enter");
  await expect(page.locator("#loadVal")).toHaveText("2000");

  // the stepper cannot walk past the cap either
  for (let i = 0; i < 30; i++) await page.locator("#loadUp").click();
  await expect(page.locator("#loadVal")).toHaveText("2000");

  // reps cap at 999
  await page.locator("#repVal").click();
  await page.locator(".vin").fill("9999");
  await page.locator(".vin").press("Enter");
  await expect(page.locator("#repVal")).toHaveText("999");
  for (let i = 0; i < 10; i++) await page.locator("#repUp").click();
  await expect(page.locator("#repVal")).toHaveText("999");

  // the clamped value is what persists
  await page.reload();
  await page.locator(".liftrow").first().click();
  await expect(page.locator("#loadVal")).toHaveText("2000");
  await expect(page.locator("#repVal")).toHaveText("999");
});

test("three stalled sessions surface a deload suggestion with Apply", async ({ page }) => {
  await seed(page, {
    v: 2, cur: "fri", idx: 0,
    state: { "fri:0": { done: 0, load: 60, reps: 6, rir: 2, topHits: 0, lastRir: null } },
    liftHistory: {
      "fri:0": [
        { date: "2026-10-18", load: 60, reps: 5, rir: 1, hitTop: false, setsDone: 3 },
        { date: "2026-10-25", load: 60, reps: 5, rir: 1, hitTop: false, setsDone: 3 },
        { date: "2026-11-01", load: 60, reps: 5, rir: 1, hitTop: false, setsDone: 3 }
      ]
    }
  });
  await page.locator(".liftrow").first().click();
  await expect(page.locator("#suggestText")).toContainText("deload");
  await expect(page.locator("#applyLoad")).toBeVisible();
  await page.locator("#applyLoad").click();
  await expect(page.locator("#loadVal")).toHaveText("55");
});

test("a set that beats history shows a New PR hint", async ({ page }) => {
  await seed(page, {
    v: 2, cur: "fri", idx: 0,
    state: { "fri:0": { done: 0, load: 60, reps: 6, rir: 2, topHits: 0, lastRir: null } },
    liftHistory: { "fri:0": [{ date: "2026-11-01", load: 50, reps: 6, rir: 2, hitTop: true, setsDone: 3 }] }
  });
  await page.locator(".liftrow").first().click();
  await page.locator("#doneBtn").click();
  await page.locator("#skipRest").click();
  await expect(page.locator("#hint")).toContainText("New PR");
});

test("full-screen rest hides the lift nav arrows", async ({ page }) => {
  await page.goto(url);
  await page.locator(".liftrow").first().click();
  await page.locator("#doneBtn").click();
  await expect(page.locator("#timerBar")).toHaveClass(/active/);
  await expect(page.locator("#rPrevBtn")).toBeHidden();
  await expect(page.locator("#rNextBtn")).toBeHidden();
});
