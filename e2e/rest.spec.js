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

test("rest prep targets the next lift between lifts (B5-02)", async ({ page }) => {
  const errors = [];
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
  page.on("pageerror", (e) => errors.push(String(e)));

  await page.clock.install({ time: new Date("2026-11-09T10:00:00") });
  await page.goto(url);
  const { day, date } = await page.evaluate(() => ({ day: Gym.todayDay(), date: Gym.dateKey() }));

  // the first lift has one set left; nothing else is logged
  await page.evaluate(({ day, date }) => {
    const ex = Gym.DAYS[day].ex;
    const state = {};
    state[day + ":0"] = { done: ex[0].s - 1, load: ex[0].load || 0, reps: ex[0].r, rir: ex[0].rir, sets: [] };
    localStorage.setItem("gym-tool-v2", JSON.stringify({
      v: 4, cur: day, idx: 0, bodyweight: 75, state, liftHistory: {}, sessionLog: [],
      active: { id: "ses_nextprep", date, day, startedAt: Date.now() - 1200000, endedAt: null, accSec: 1200, runningSince: null, status: "active" }
    }));
  }, { day, date });
  await page.reload();

  const next = await page.evaluate((d) => { const e = Gym.DAYS[d].ex[1]; return { n: e.n, s: e.s }; }, day);

  await page.locator(".liftrow").first().click();
  await page.locator("#doneBtn").click(); // last set of this lift -> inter-lift rest
  await expect(page.locator("#timerBar")).toHaveClass(/active/);

  // the prep cluster names the NEXT lift, not the one just finished
  await expect(page.locator("#restPrepName")).toHaveText("Next — " + next.n + ", Set 1 of " + next.s);

  // stepping load here edits the next lift's working record, and the
  // adjustment is there when the lift opens
  const before = await page.locator("#restPrepLoad").textContent();
  await page.locator("#restLoadUp").click();
  await page.locator("#restLoadUp").click();
  const after = await page.locator("#restPrepLoad").textContent();
  expect(after).not.toBe(before);

  await page.locator("#skipRest").click(); // advance to the next lift
  await expect(page.locator("#exName")).toHaveText(next.n);
  await expect(page.locator("#loadVal")).toHaveText(after.replace(" lb", ""));

  // mid-lift prep is unchanged: still this lift's next set, no "Next —"
  await page.locator("#doneBtn").click();
  await expect(page.locator("#timerBar")).toHaveClass(/active/);
  await expect(page.locator("#restPrepName")).toHaveText("Set 2 of " + next.s);

  // the longest prep label still fits the screen without scrolling
  const fits = await page.evaluate(() => document.documentElement.scrollHeight <= window.innerHeight + 1);
  expect(fits).toBe(true);

  expect(errors.filter((e) => !/vibrate|AudioContext/i.test(e))).toEqual([]);
});

test("finishing the workout from the day view idles a live rest (v196)", async ({ page }) => {
  const errors = [];
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
  page.on("pageerror", (e) => errors.push(String(e)));

  await page.clock.install({ time: new Date("2026-11-09T10:00:00") });
  await page.goto(url);
  const { day, date } = await page.evaluate(() => ({ day: Gym.todayDay(), date: Gym.dateKey() }));
  await page.evaluate(({ day, date }) => {
    const ex = Gym.DAYS[day].ex;
    const state = {};
    state[day + ":0"] = { done: 1, load: ex[0].load || 0, reps: ex[0].r, rir: ex[0].rir, sets: [{ load: ex[0].load || 0, reps: ex[0].r, rir: ex[0].rir }] };
    localStorage.setItem("gym-tool-v2", JSON.stringify({
      v: 5, cur: day, idx: 0, bodyweight: 165, state, liftHistory: {}, sessionLog: [],
      active: { id: "ses_fin", date, day, startedAt: Date.now() - 600000, endedAt: null, accSec: 600, runningSince: Date.now(), status: "active" }
    }));
  }, { day, date });
  await page.reload();

  await page.locator(".liftrow").first().click();
  await page.locator("#doneBtn").click(); // set 2 logged -> rest is live
  await expect(page.locator("#timerBar")).toHaveClass(/active/);

  await page.locator("#detailsBtn").click(); // peek: the views show under the rest bar
  await page.locator("#backBtn").click(); // to the day list, rest still live
  await page.locator("#finishBtn").click(); // finish from the day view
  await expect(page.locator("#summary")).toBeVisible();
  await page.locator("#sumDone").click();

  await page.clock.runFor(5000);
  await expect(page.locator("#timerBar"), "no countdown may outlive the finished workout").not.toHaveClass(/active|go/);

  expect(errors.filter((e) => !/vibrate|AudioContext/i.test(e))).toEqual([]);
});

test("navigating to the day view cancels the pending GO advance (v196)", async ({ page }) => {
  const errors = [];
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
  page.on("pageerror", (e) => errors.push(String(e)));

  await page.clock.install({ time: new Date("2026-11-09T10:00:00") });
  await page.goto(url);
  const { day, date } = await page.evaluate(() => ({ day: Gym.todayDay(), date: Gym.dateKey() }));
  await page.evaluate(({ day, date }) => {
    const ex = Gym.DAYS[day].ex;
    const state = {};
    state[day + ":0"] = { done: ex[0].s - 1, load: ex[0].load || 0, reps: ex[0].r, rir: ex[0].rir, sets: [] };
    localStorage.setItem("gym-tool-v2", JSON.stringify({
      v: 5, cur: day, idx: 0, bodyweight: 165, state, liftHistory: {}, sessionLog: [],
      active: { id: "ses_nav", date, day, startedAt: Date.now() - 600000, endedAt: null, accSec: 600, runningSince: Date.now(), status: "active" }
    }));
  }, { day, date });
  await page.reload();

  await page.locator(".liftrow").first().click();
  await page.locator("#doneBtn").click(); // final set -> rest with a pending advance
  await expect(page.locator("#timerBar")).toHaveClass(/active/);

  await page.locator("#detailsBtn").click(); // peek: the views show under the rest bar
  await page.locator("#backBtn").click(); // manual navigation clears pending
  await expect(page.locator("#dayView")).toBeVisible();
  await page.clock.runFor(180000); // the rest runs out on the day view -> GO
  await expect(page.locator("#timerBar")).toHaveClass(/go/);
  await page.clock.runFor(1000); // past the 400 ms same-tap guard at GO
  await page.locator("#restTime").click(); // GO tap (on a non-button child) must not jump lifts now

  const idx = await page.evaluate(() => JSON.parse(localStorage.getItem("gym-tool-v2")).idx);
  expect(idx, "the GO tap idles instead of advancing under the day list").toBe(0);
  await expect(page.locator("#dayView")).toBeVisible();

  expect(errors.filter((e) => !/vibrate|AudioContext/i.test(e))).toEqual([]);
});

test("rest Up next tracks the prep stepper's adjusted load (U123)", async ({ page }) => {
  await page.clock.install({ time: new Date("2026-11-09T10:00:00") });
  await page.goto(url);
  await page.locator(".liftrow").first().click();
  await page.locator("#doneBtn").click(); // set 1 -> active rest
  await expect(page.locator("#timerBar")).toHaveClass(/active/);
  expect(await page.locator("#restNext").textContent()).toContain("load ");

  await page.locator("#restLoadUp").click();
  await page.locator("#restLoadUp").click();
  const load = (await page.locator("#restPrepLoad").textContent()).replace(" lb", "");
  await expect(page.locator("#restNext")).toContainText("load " + load); // stale pre-fix

  await page.clock.fastForward(200000); // active -> GO
  await expect(page.locator("#restNext")).toContainText("Up now —");
  await expect(page.locator("#restNext")).toContainText("load " + load);
});

test("inter-lift Up next tracks the next lift's prep load (U123)", async ({ page }) => {
  await page.clock.install({ time: new Date("2026-11-09T10:00:00") });
  await page.goto(url);
  const { day, date } = await page.evaluate(() => ({ day: Gym.todayDay(), date: Gym.dateKey() }));
  await page.evaluate(({ day, date }) => {
    const ex = Gym.DAYS[day].ex;
    const state = {};
    state[day + ":0"] = { done: ex[0].s - 1, load: ex[0].load || 0, reps: ex[0].r, rir: ex[0].rir, sets: [] };
    localStorage.setItem("gym-tool-v2", JSON.stringify({
      v: 4, cur: day, idx: 0, bodyweight: 75, state, liftHistory: {}, sessionLog: [],
      active: { id: "s", date, day, startedAt: Date.now() - 1200000, endedAt: null, accSec: 1200, runningSince: null, status: "active" }
    }));
  }, { day, date });
  await page.reload();
  await page.locator(".liftrow").first().click();
  await page.locator("#doneBtn").click(); // completes lift 0 -> inter-lift rest
  await expect(page.locator("#timerBar")).toHaveClass(/active/);
  expect(await page.locator("#restNext").textContent()).toContain("Up next —");
  await page.locator("#restLoadUp").click();
  const load = (await page.locator("#restPrepLoad").textContent()).replace(" lb", "");
  await expect(page.locator("#restNext")).toContainText("Load " + load);
});

test("rest Up now tracks a direct-edited next-set reps (U126)", async ({ page }) => {
  await page.clock.install({ time: new Date("2026-11-09T10:00:00") });
  await page.goto(url);
  await page.locator(".liftrow").first().click();
  await page.locator("#doneBtn").click(); // set 1 -> active rest
  await expect(page.locator("#timerBar")).toHaveClass(/active/);
  expect(await page.locator("#restNext").textContent()).toContain("6 reps");

  await page.clock.fastForward(200000); // active -> GO
  await expect(page.locator("#timerBar")).toHaveClass(/go/);
  await page.locator("#detailsBtn").click(); // peek: adjust mids visible
  await expect(page.locator("#repVal")).toBeVisible();

  await page.locator("#repVal").click();
  await page.locator(".vin").fill("9");
  await page.locator(".vin").press("Enter");
  await expect(page.locator("#repVal")).toHaveText("9");

  await page.locator("#detailsBtn").click(); // close peek -> #restNext visible
  await expect(page.locator("#restNext")).toContainText("Up now —");
  await expect(page.locator("#restNext")).toContainText("9 reps"); // stale pre-fix
});

test("rest Up next tracks loads set by Plan from the day view (U145)", async ({ page }) => {
  await page.clock.install({ time: new Date("2026-11-06T10:00:00") });
  await page.goto(url);
  await page.evaluate(() => {
    const day = Gym.todayDay(), date = Gym.dateKey(), state = {};
    Gym.DAYS[day].ex.forEach((e, i) => { state[day + ":" + i] = { load: e.load || 0, reps: e.r, rir: e.rir, done: 0, sets: [] }; });
    state[day + ":0"].done = 2;
    state[day + ":0"].sets = [{ load: 60, reps: 6, rir: 2 }, { load: 60, reps: 6, rir: 2 }];
    const lh = {};
    lh[day + ":1"] = [
      { date: "2026-10-25", load: 50, reps: 8, rir: 2, hitTop: true, setsDone: 3 },
      { date: "2026-11-01", load: 50, reps: 8, rir: 2, hitTop: true, setsDone: 3 }
    ];
    localStorage.setItem("gym-tool-v2", JSON.stringify({
      v: 5, cur: day, idx: 0, bodyweight: 165, state, liftHistory: lh, sessionLog: [],
      active: { id: "s", date, day, startedAt: Date.now() - 600000, accSec: 600, runningSince: null, status: "active" }
    }));
  });
  await page.reload();
  await page.locator(".liftrow").first().click();
  await page.locator("#doneBtn").click(); // rest targets lift 2
  await expect(page.locator("#restNext")).toContainText("Load 50");
  await page.locator("#detailsBtn").click(); // peek reveals the header
  await page.locator("#backBtn").click(); // day view, rest strip still visible
  await expect(page.locator("#planBtn")).toBeVisible();
  await page.locator("#planBtn").click();
  await expect(page.locator(".liftrow").nth(1)).toContainText("Load 52.5");
  await expect(page.locator("#restNext")).toContainText("Load 52.5"); // stale pre-fix
});

test("rest Up now tracks an applied suggested load (U139)", async ({ page }) => {
  await page.clock.install({ time: new Date("2026-11-09T10:00:00") });
  await page.goto(url);
  await page.evaluate(() => {
    const day = Gym.todayDay(), date = Gym.dateKey(), e = Gym.DAYS[day].ex[0], state = {};
    Gym.DAYS[day].ex.forEach((x, i) => { state[day + ":" + i] = { done: 0, load: x.load || 0, reps: x.r, rir: x.rir, sets: [] }; });
    const good = (d) => ({ date: d, load: 60, reps: e.top + 2, rir: e.rir, hitTop: true, setsDone: 3,
      sets: [{ load: 60, reps: e.top + 2, rir: e.rir }, { load: 60, reps: e.top + 2, rir: e.rir }, { load: 60, reps: e.top + 2, rir: e.rir }] });
    localStorage.setItem("gym-tool-v2", JSON.stringify({
      v: 4, cur: day, idx: 0, bodyweight: 165, state,
      liftHistory: { [day + ":0"]: [good("2026-10-30"), good("2026-11-06")] }, sessionLog: [],
      active: { id: "s1", date, day, startedAt: Date.now(), endedAt: null, accSec: 0, runningSince: null, status: "active" }
    }));
  });
  await page.reload();
  await page.locator(".liftrow").first().click();
  await expect(page.locator("#applyLoad")).toBeVisible();
  await page.locator("#doneBtn").click();
  await page.clock.fastForward(200000);
  await expect(page.locator("#timerBar")).toHaveClass(/go/);
  await expect(page.locator("#restNext")).toContainText("load 60");
  await page.locator("#detailsBtn").click(); // peek reveals Apply at GO
  await page.locator("#applyLoad").click();
  await expect(page.locator("#loadVal")).toHaveText("62.5");
  await page.locator("#detailsBtn").click();
  await expect(page.locator("#restNext")).toContainText("load 62.5"); // stale pre-fix
});
