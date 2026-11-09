/* Integration journeys: time boundaries, off days, and the finish summary.
   These use Playwright's clock so the app's date logic is deterministic.     */
const { test, expect } = require("@playwright/test");
const path = require("path");

const url = "file://" + path.resolve(__dirname, "..", "index.html");

test("an off day names the next session", async ({ page }) => {
  await page.clock.install({ time: new Date("2026-11-04T10:00:00") }); // Wednesday
  await page.goto(url);
  await expect(page.locator("#daySummary")).toContainText("Off day");
  await expect(page.locator("#daySummary")).toContainText("next Fri");
});

test("a session that crosses midnight banks its sets on the start date", async ({ page }) => {
  await page.clock.install({ time: new Date("2026-11-06T23:58:00") }); // Friday
  await page.goto(url);
  await page.locator(".liftrow").first().click();
  await page.locator("#doneBtn").click();
  await page.locator("#skipRest").click();
  await page.locator("#doneBtn").click();
  await page.locator("#skipRest").click();

  await page.clock.setSystemTime(new Date("2026-11-07T00:04:00")); // past midnight
  await page.locator("#doneBtn").click(); // completes the lift and banks it

  const last = await page.evaluate(() => {
    const p = JSON.parse(localStorage.getItem("gym-tool-v2"));
    const arr = p.liftHistory["fri:0"] || [];
    const e = arr.length ? arr[arr.length - 1] : null;
    return { date: e && e.date, sets: e && e.sets ? e.sets.length : 0, sessionDate: p.active && p.active.date };
  });
  expect(last.sessionDate, "session keeps its start date").toBe("2026-11-06");
  expect(last.date, "history follows the session date, not the wall clock").toBe("2026-11-06");
  expect(last.sets).toBe(3);

  // B3-11: the finish summary must count PRs against the session date, not the
  // wall clock. Finish the rest of Friday after midnight and check the PRs.
  await page.locator("#skipRest").click(); // end the rest after lift 1 completes
  for (let lift = 1; lift < 8; lift++) {
    for (let set = 0; set < 3; set++) {
      await page.locator("#doneBtn").click();
      await page.locator("#skipRest").click();
    }
  }
  await page.locator("#skipRest").click(); // second tap of the finish arm
  await expect(page.locator("#summary")).toBeVisible();
  const seen = await page.evaluate(() => ({
    wallClock: Gym.dateKey(),
    sessionDate: Gym.sessionDate(JSON.parse(localStorage.getItem("gym-tool-v2")))
  }));
  expect(seen.wallClock, "the clock is already past midnight").toBe("2026-11-07");
  expect(seen.sessionDate, "the session still belongs to Friday").toBe("2026-11-06");
  // 8 Friday lifts were logged, all banked on 2026-11-06: every PR is still a
  // PR today, even though "today" is now Saturday on the wall clock.
  await expect(page.locator("#sumPrs")).toHaveText("8 new");
});

test("the summary reports the day's tonnage and PRs", async ({ page }) => {
  await page.goto(url);
  const { day, date } = await page.evaluate(() => ({ day: Gym.todayDay(), date: Gym.dateKey() }));
  await page.evaluate(({ day, date }) => {
    const state = {};
    Gym.DAYS[day].ex.forEach((e, i) => {
      state[day + ":" + i] = { done: e.s, load: e.load || 0, reps: e.r, rir: e.rir, sets: [] };
    });
    const sets = [0, 1, 2].map(() => ({ load: 100, reps: 6, rir: 2 }));
    localStorage.setItem("gym-tool-v2", JSON.stringify({
      v: 4, cur: day, idx: 0, bodyweight: 165, state, sessionLog: [],
      liftHistory: { [day + ":0"]: [{ date: date, load: 100, reps: 6, rir: 2, hitTop: true, setsDone: 3, sets: sets }] },
      active: { id: "ses_sum", date: date, day: day, startedAt: Date.now() - 1800000, endedAt: null, accSec: 1800, runningSince: null, status: "active" }
    }));
  }, { day, date });
  await page.reload();

  await page.locator("#finishBtn").click();
  await expect(page.locator("#summary")).toBeVisible();
  await expect(page.locator("#sumSets")).toHaveText("24");
  await expect(page.locator("#sumVol")).toHaveText("1.8k lb"); // 100 lb × 6 reps × 3 sets
  await expect(page.locator("#sumPrs")).toHaveText("1 new");
  await expect(page.locator("#sumNext")).toContainText("Next");
});
