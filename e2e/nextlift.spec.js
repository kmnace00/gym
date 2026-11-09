/* B3-34: GO wraps. Completing lifts out of order must not hand GO a finished
   lift — it goes to the earliest still-open lift, and only a fully done day
   reaches the two-tap Finish.                                              */
const { test, expect } = require("@playwright/test");
const path = require("path");

const url = "file://" + path.resolve(__dirname, "..", "index.html");

test("GO after the last lift wraps back to the earliest open lift, then Finish when the day is done", async ({ page }) => {
  const errors = [];
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
  page.on("pageerror", (e) => errors.push(String(e)));

  await page.clock.install({ time: new Date("2026-11-09T10:00:00") });
  await page.goto(url);
  const { day, date } = await page.evaluate(() => ({ day: Gym.todayDay(), date: Gym.dateKey() }));

  // lifts 1–3 and 5–7 are done; lift 4 (index 3) and lift 8 (index 7) are one
  // set short. The journey finishes lift 8 last — out of order.
  await page.evaluate(({ day, date }) => {
    const ex = Gym.DAYS[day].ex;
    const state = {};
    ex.forEach((e, i) => {
      state[day + ":" + i] = {
        done: (i === 3 || i === ex.length - 1) ? e.s - 1 : e.s,
        load: e.load || 0, reps: e.r, rir: e.rir, sets: []
      };
    });
    localStorage.setItem("gym-tool-v2", JSON.stringify({
      v: 4, cur: day, idx: ex.length - 1, bodyweight: 75, state, liftHistory: {}, sessionLog: [],
      active: { id: "ses_wrap", date, day, startedAt: Date.now() - 600000, endedAt: null, accSec: 600, runningSince: null, status: "active" }
    }));
  }, { day, date });
  await page.reload();

  const lift4 = await page.evaluate((d) => Gym.DAYS[d].ex[3].n, day);

  await page.locator(".liftrow").nth(7).click();
  await page.locator("#doneBtn").click();
  await expect(page.locator("#timerBar")).toHaveClass(/active/);
  await page.locator("#skipRest").click(); // end rest → GO advance

  await expect(page.locator("#exName"), "GO went to the only open lift, not the finished one after it").toHaveText(lift4);

  // finish that lift: the day is now complete, so the next tap arms Finish
  await page.locator("#doneBtn").click();
  await page.locator("#skipRest").click();
  await expect(page.locator("#skipRest")).toHaveText("Tap again to finish");
  await page.locator("#skipRest").click(); // second tap actually ends the session
  await expect(page.locator("#summary")).toBeVisible();
  await expect(page.locator("#sumTitle")).toContainText("workout complete");

  expect(errors.filter((e) => !/vibrate|AudioContext/i.test(e))).toEqual([]);
});
