/* B3-32: first-run guidance — one line under the day summary until the first
   set is ever logged, then gone for good (no new storage key: the payload's
   own history answers "has anything been logged?").                        */
const { test, expect } = require("@playwright/test");
const path = require("path");

const url = "file://" + path.resolve(__dirname, "..", "index.html");
const HINT = "Tap a lift, do the set, tap Set Done — rest starts itself";

test("a fresh profile shows the first-run line, and it disappears after the first set", async ({ page }) => {
  await page.goto(url);
  await expect(page.locator("#firstRunHint")).toBeVisible();
  await expect(page.locator("#firstRunHint")).toHaveText(HINT);

  const fits = await page.evaluate(() => document.documentElement.scrollHeight <= window.innerHeight + 1);
  expect(fits, "the hint must not push the day view past the viewport").toBe(true);

  await page.locator(".liftrow").first().click();
  await page.locator("#doneBtn").click();
  await expect(page.locator("#firstRunHint")).toBeHidden();

  await page.reload();
  await expect(page.locator("#firstRunHint")).toBeHidden();
});

test("a seeded payload with history shows no first-run line", async ({ page }) => {
  await page.goto(url);
  await page.evaluate(() => localStorage.setItem("gym-tool-v2", JSON.stringify({
    v: 4, cur: "fri", idx: 0, state: {},
    liftHistory: { "fri:0": [{ date: "2026-11-01", load: 50, reps: 6, rir: 2, setsDone: 3 }] }
  })));
  await page.reload();
  await expect(page.locator("#firstRunHint")).toBeHidden();
});

test("an empty-but-started session still shows the line", async ({ page }) => {
  await page.goto(url);
  await page.evaluate(() => localStorage.setItem("gym-tool-v2", JSON.stringify({
    v: 4, cur: "fri", idx: 0, state: {}, liftHistory: {},
    active: { id: "ses_1", date: "2026-11-06", day: "fri", startedAt: 1, endedAt: 2, accSec: 60, runningSince: null, status: "active" },
    sessionLog: []
  })));
  await expect(page.locator("#firstRunHint")).toBeVisible();
});
