/* Nov 13 Phase 1, group 4 (N10): set timestamps, the edited mark, and the
   self-calibrating clock end to end. */
const { test, expect } = require("@playwright/test");
const path = require("path");

const url = "file://" + path.resolve(__dirname, "..", "index.html");

function timedSession(startedAt, warmSec, residSec) {
  const t1 = startedAt + (270 + 50 + 15 + warmSec) * 1000;
  const gap = (50 + 180 + residSec) * 1000;
  return {
    id: "s" + startedAt, date: "2026-11-06", day: "fri", startedAt,
    endedAt: startedAt + 5400000, durationSec: 5400, status: "complete",
    lifts: { "fri:0": { done: 3, sets: [
      { load: 60, reps: 6, rir: 2, t: t1 },
      { load: 60, reps: 6, rir: 2, t: t1 + gap },
      { load: 60, reps: 6, rir: 2, t: t1 + gap * 2 }
    ] } }
  };
}

async function seed(page, { doneMap = {}, sessionLog = [], calib = null, timed = true } = {}) {
  const { day, date } = await page.evaluate(() => ({ day: Gym.todayDay(), date: Gym.dateKey() }));
  await page.evaluate(({ day, date, doneMap, sessionLog, timed }) => {
    const ex = Gym.DAYS[day].ex;
    const state = {};
    ex.forEach((e, i) => {
      const done = doneMap[i] || 0;
      const sets = [];
      for (let k = 0; k < done; k++) {
        const s = { load: e.load || 0, reps: e.r, rir: e.rir };
        if (timed) s.t = Date.now() - (done - k) * 240000;
        sets.push(s);
      }
      state[day + ":" + i] = { done, load: e.load || 0, reps: e.r, rir: e.rir, sets };
    });
    localStorage.setItem("gym-tool-v2", JSON.stringify({
      v: 4, cur: day, idx: 0, bodyweight: 75, state, liftHistory: {}, sessionLog,
      active: { id: "ses_p3", date, day, startedAt: Date.now() - 5400000, endedAt: null, accSec: 5400, runningSince: Date.now(), status: "active" }
    }));
  }, { day, date, doneMap, sessionLog, timed });
  if (calib) await page.evaluate((c) => localStorage.setItem("gym-calibration", JSON.stringify(c)), calib);
  await page.reload();
}

test("a logged set carries a timestamp", async ({ page }) => {
  await page.goto(url);
  await seed(page, {});
  await page.locator(".liftrow").first().click();
  await page.locator("#doneBtn").click();
  const t = await page.evaluate(() => {
    const p = JSON.parse(localStorage.getItem("gym-tool-v2"));
    const key = Object.keys(p.state).find((k) => (p.state[k].sets || []).length);
    return p.state[key].sets[0].t;
  });
  expect(typeof t).toBe("number");
  expect(Math.abs(Date.now() - t)).toBeLessThan(60000);
});

test("editing a set marks it edited and keeps its timestamp", async ({ page }) => {
  await page.goto(url);
  await seed(page, { doneMap: { 0: 1 } });
  const before = await page.evaluate(() => {
    const p = JSON.parse(localStorage.getItem("gym-tool-v2"));
    return p.state["fri:0"] ? p.state["fri:0"].sets[0].t : p.state[Object.keys(p.state)[0]].sets[0].t;
  });
  await page.locator(".liftrow").first().click();
  await page.locator("#setLog .setrow").first().click(); // enter edit on set 1
  await page.locator("#repUp").click();
  await page.locator("#doneBtn").click(); // Done editing
  const after = await page.evaluate(() => {
    const p = JSON.parse(localStorage.getItem("gym-tool-v2"));
    const key = Object.keys(p.state).find((k) => (p.state[k].sets || []).length);
    return p.state[key].sets[0];
  });
  expect(after.edited).toBe(true);
  expect(after.t).toBe(before);
});

test("finishing banks the learned calibration from timed sessions", async ({ page }) => {
  await page.goto(url);
  const base = 1700000000000;
  const all = {};
  for (let i = 0; i < 8; i++) all[i] = 3;
  // today's own sets carry no timestamps, so the learned values come from
  // exactly the three banked sessions (warm-ups 240/300/360, residuals 20)
  await seed(page, { doneMap: all, timed: false, sessionLog: [timedSession(base, 240, 20), timedSession(base + 86400000, 300, 20), timedSession(base + 2 * 86400000, 360, 20)] });
  await page.locator("#finishBtn").click();
  await expect(page.locator("#summary")).toBeVisible();
  const calib = await page.evaluate(() => JSON.parse(localStorage.getItem("gym-calibration") || "null"));
  expect(calib).not.toBeNull();
  expect(calib.sessions).toBeGreaterThanOrEqual(3);
  expect(calib.warmupSec).toBe(300);
  expect(calib.overheadSec).toBe(20);
});

test("the summary grades estimate vs actual once the clock has learned", async ({ page }) => {
  await page.goto(url);
  const all = {};
  for (let i = 0; i < 8; i++) all[i] = 3;
  await seed(page, { doneMap: all, calib: { warmupSec: 300, overheadSec: 20, sessions: 4, at: Date.now() } });
  await page.locator("#finishBtn").click();
  await expect(page.locator("#sumEst")).toBeVisible();
  await expect(page.locator("#sumEst")).toContainText("Estimated");
  await expect(page.locator("#sumEst")).toContainText("Actual");
});
