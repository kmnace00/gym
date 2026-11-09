/* Rest honesty across a simulated phone sleep: the countdown must be
   re-derived from its end timestamp, never accumulated by the interval.     */
const { test, expect } = require("@playwright/test");
const path = require("path");

const url = "file://" + path.resolve(__dirname, "..", "index.html");

function toSecs(t) {
  const p = t.trim().split(":");
  return parseInt(p[0], 10) * 60 + parseInt(p[1], 10);
}
function fmt(s) {
  return Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0");
}

test("the expired finish window mid-rest thaws the clock on the last lift", async ({ page }) => {
  const errors = [];
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
  page.on("pageerror", (e) => errors.push(String(e)));

  await page.clock.install({ time: new Date("2026-11-09T10:00:00") });
  await page.goto(url);
  const { day, date } = await page.evaluate(() => ({ day: Gym.todayDay(), date: Gym.dateKey() }));

  // every lift but the last is complete, so "End rest" on the final lift arms
  // the two-tap finish mid-rest instead of advancing to another lift
  await page.evaluate(({ day, date }) => {
    const ex = Gym.DAYS[day].ex;
    const state = {};
    ex.forEach((e, i) => {
      state[day + ":" + i] = {
        done: i === ex.length - 1 ? e.s - 1 : e.s,
        load: e.load || 0, reps: e.r, rir: e.rir, sets: []
      };
    });
    localStorage.setItem("gym-tool-v2", JSON.stringify({
      v: 4, cur: day, idx: ex.length - 1, bodyweight: 75, state, liftHistory: {}, sessionLog: [],
      active: { id: "ses_last", date, day, startedAt: Date.now() - 1800000, endedAt: null, accSec: 1800, runningSince: null, status: "active" }
    }));
  }, { day, date });
  await page.reload();

  await page.locator(".liftrow").nth(7).click();
  await page.locator("#doneBtn").click(); // final set of the final lift -> rest
  await expect(page.locator("#timerBar")).toHaveClass(/active/);
  await expect(page.locator("#skipRest")).toHaveText("End rest");

  await page.locator("#skipRest").click(); // first tap arms and freezes the finish
  await expect(page.locator("#skipRest")).toHaveText("Tap again to finish");

  await page.clock.runFor(3000); // the 2,600 ms window expires mid-rest
  await expect(page.locator("#skipRest")).toHaveText("End rest");
  await expect(page.locator("#timerBar")).toHaveClass(/active/);

  const before = await page.locator("#restTime").textContent();
  await page.clock.runFor(1000);
  await expect(page.locator("#restTime")).not.toHaveText(before);

  expect(errors.filter((e) => !/vibrate|AudioContext/i.test(e))).toEqual([]);
});

test("rest is re-derived after a simulated sleep", async ({ page }) => {
  const errors = [];
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
  page.on("pageerror", (e) => errors.push(String(e)));

  await page.clock.install({ time: new Date("2026-11-09T10:00:00") });
  await page.goto(url);

  await page.locator(".liftrow").first().click();
  await expect(page.locator("#exName")).toBeVisible();
  await page.locator("#doneBtn").click();
  await expect(page.locator("#timerBar")).toHaveClass(/active/);

  const startSecs = toSecs(await page.locator("#restTime").textContent());

  // jump Date.now() forward 60 s WITHOUT firing the interval callbacks
  await page.clock.setSystemTime(new Date("2026-11-09T10:01:00"));
  await page.clock.runFor(300); // one 200 ms tick

  await expect(page.locator("#restTime")).toHaveText(fmt(startSecs - 60));
  expect(errors.filter((e) => !/vibrate|AudioContext/i.test(e))).toEqual([]);
});

test("the rest screen shows the session elapsed time advancing (B3-16)", async ({ page }) => {
  const errors = [];
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
  page.on("pageerror", (e) => errors.push(String(e)));

  await page.clock.install({ time: new Date("2026-11-09T10:00:00") });
  await page.goto(url);
  const { day, date } = await page.evaluate(() => ({ day: Gym.todayDay(), date: Gym.dateKey() }));

  // a session that has already been running for 42 minutes
  await page.evaluate(({ day, date }) => {
    localStorage.setItem("gym-tool-v2", JSON.stringify({
      v: 4, cur: day, idx: 0, bodyweight: 75, state: {}, liftHistory: {}, sessionLog: [],
      active: { id: "ses_elapsed", date, day, startedAt: Date.now() - 2520000, endedAt: null, accSec: 2520, runningSince: null, status: "active" }
    }));
  }, { day, date });
  await page.reload();

  await page.locator(".liftrow").first().click();
  await expect(page.locator("#restElapsed")).toBeHidden(); // idle: no elapsed line

  await page.locator("#doneBtn").click(); // log a set -> rest starts
  await expect(page.locator("#timerBar")).toHaveClass(/active/);
  await expect(page.locator("#restElapsed")).toBeVisible();
  await expect(page.locator("#restElapsed")).toContainText("Workout 42:00");

  await page.clock.runFor(3000); // the workout keeps running while resting
  await expect(page.locator("#restElapsed")).toContainText("Workout 42:03");

  expect(errors.filter((e) => !/vibrate|AudioContext/i.test(e))).toEqual([]);
});
