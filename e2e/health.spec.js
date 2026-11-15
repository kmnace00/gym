/* v135 — Apple Health / Watch gateway ($0 iOS Shortcut path).
   The app never calls HealthKit; on iOS the "Send workout to Apple Health"
   button hands a structured one-liner to the user's one-time "Log Gym Workout"
   Shortcut (which calls Health's Log Workout → Watch sync). Here Web Share is
   stubbed so we can capture exactly the text the app would send, and we check
   the menu's one-time set-up note toggles open. Served over file:// like the
   rest of the Friday suite. Run on any day via the pinned Friday clock. */
const { test, expect } = require("@playwright/test");
const path = require("path");

const url = "file://" + path.resolve(__dirname, "..", "index.html");

async function armShare(page) {
  await page.addInitScript(() => {
    window.__shared = [];
    navigator.share = (o) => { window.__shared.push(o.text); return Promise.resolve(); };
  });
  await page.clock.install({ time: new Date("2026-11-06T10:00:00") });
  await page.goto(url);
}

test("the summary's Send to Apple Health shares the structured workout record", async ({ page }) => {
  await armShare(page);
  const DATE = "2026-11-06"; // Friday — the suite's clock pin
  const { day } = await page.evaluate(() => ({ day: Gym.todayDay() }));
  await page.evaluate(({ day, date }) => {
    const state = {};
    Gym.DAYS[day].ex.forEach((e, i) => {
      state[day + ":" + i] = { done: e.s, load: e.load || 0, reps: e.r, rir: e.rir, sets: [] };
    });
    localStorage.setItem("gym-tool-v2", JSON.stringify({
      v: 4, cur: day, idx: 0, bodyweight: 75, state, liftHistory: {}, sessionLog: [],
      active: { id: "ses_health", date, day, startedAt: Date.now() - 1800000, endedAt: null, accSec: 1800, runningSince: null, status: "active" }
    }));
  }, { day, date: DATE });
  await page.reload();

  await expect(page.locator("#finishBtn")).toBeVisible();
  await page.locator("#finishBtn").click();
  await expect(page.locator("#summary")).toBeVisible();
  await expect(page.locator("#sumHealth")).toBeVisible();

  await page.locator("#sumHealth").click();
  const sent = await page.evaluate(() => window.__shared);
  expect(sent.length).toBe(1);
  expect(sent[0].split("\n")[0]).toBe("GYMWORKOUT|strength|30|" + DATE);
});

test("the menu's Apple Health note toggles open with the one-time set-up", async ({ page }) => {
  await armShare(page);
  await page.locator("#menuBtn").click();
  const btn = page.locator("#healthBtn");
  await expect(btn).toBeVisible();
  await expect(page.locator("#healthInfo")).toBeHidden();
  await btn.click();
  await expect(page.locator("#healthInfo")).toBeVisible();
  await expect(btn).toHaveAttribute("aria-expanded", "true");
  await expect(page.locator("#healthInfo")).toContainText("GYMWORKOUT");
  await btn.click();
  await expect(page.locator("#healthInfo")).toBeHidden();
});