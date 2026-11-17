/* Day-switch guard: the app keeps ONE active session (a single day + date),
   and bankLift keys history by `cur` but dates by active.date. Logging a set
   after switching to a non-active day would bank that day's lift under the
   ACTIVE session's date (e.g. a Saturday lift dated Friday) — mis-attributed
   in weekStatus and mis-dated in PR/CSV. So the chevrons stay a review/completion
   tool for the active day: set-logging on a switched-to day is blocked with a
   hint, while the active day logs normally. */
const { test, expect } = require("@playwright/test");
const path = require("path");

const url = "file://" + path.resolve(__dirname, "..", "index.html");

test.beforeEach(async ({ page }) => {
  await page.clock.install({ time: new Date("2026-11-06T10:00:00") }); // a Friday
});

async function seedFridaySession(page) {
  await page.goto(url);
  await page.evaluate(() => localStorage.setItem("gym-tool-v2", JSON.stringify({
    v: 5, cur: "fri", idx: 0, bodyweight: 165, bodyweightSet: false, state: {},
    sessionLog: [], liftHistory: {},
    active: { id: "ses_switch", date: "2026-11-06", day: "fri",
      startedAt: Date.now() - 600000, endedAt: null, accSec: 600, runningSince: null, status: "active" }
  })));
  await page.reload();
}

test("the active day logs a set normally; a switched-to day is blocked from logging", async ({ page }) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  await page.setViewportSize({ width: 390, height: 844 });
  await seedFridaySession(page);

  /* actives day (Fri): doneBtn logs a set as usual */
  await page.locator(".liftrow").first().click();
  await expect(page.locator("#exName")).toHaveText("Smith squat");
  await page.locator("#doneBtn").click();
  await expect(page.locator("#hint")).not.toContainText("switch back");
  let st = await page.evaluate(() => JSON.parse(localStorage.getItem("gym-tool-v2")).state["fri:0"]);
  expect(st.done).toBe(1);
  expect(st.sets.length).toBe(1);

  // reload lands on the day view (state persists), then switch to Saturday
  await page.reload();
  await page.locator("#dayNext").click();
  await expect(page.locator("#dayTitle")).toHaveText(/Sat/);

  // open Saturday's first lift and try to log — must be blocked with a hint
  await page.locator(".liftrow").first().click();
  await expect(page.locator("#exName")).toHaveText("MTS front pulldown");
  await page.locator("#doneBtn").click();
  await expect(page.locator("#hint")).toContainText("switch back");

  /* no set must have been logged under Saturday (the mis-dated bank was the bug) */
  const satState = await page.evaluate(() => {
    const p = JSON.parse(localStorage.getItem("gym-tool-v2"));
    const rec = p.state["sat:0"];
    return { done: (rec && rec.done) || 0, sets: (rec && rec.sets ? rec.sets.length : 0) };
  });
  expect(satState.done).toBe(0);
  expect(satState.sets).toBe(0);

  expect(errors).toEqual([]);
});

test("switching back to the active day restores set-logging", async ({ page }) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  await page.setViewportSize({ width: 390, height: 844 });
  await seedFridaySession(page);

  await page.locator("#dayNext").click();           // fri → sat (blocked)
  await page.locator(".liftrow").first().click();
  await page.locator("#doneBtn").click();
  await expect(page.locator("#hint")).toContainText("switch back");

  await page.locator("#backBtn").click();
  await page.locator("#dayPrev").click();           // sat → fri (active)
  await page.locator(".liftrow").first().click();
  await expect(page.locator("#exName")).toHaveText("Smith squat");
  await page.locator("#doneBtn").click();
  await expect(page.locator("#hint")).not.toContainText("switch back");

  const fri = await page.evaluate(() => JSON.parse(localStorage.getItem("gym-tool-v2")).state["fri:0"]);
  expect(fri.done).toBe(1);
  expect(errors).toEqual([]);
});