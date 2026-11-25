/* Nov 13 Phase 1 (N2/N4/N5 + N7-flow verification): per-side clarity, the
   next-lift line, and the completed-lift Next button. */
const { test, expect } = require("@playwright/test");
const path = require("path");

const url = "file://" + path.resolve(__dirname, "..", "index.html");

/* The suite is Friday-anchored (todayDay()/dateKey() are checked against today's
   weekday-relative fixtures). Pin a Friday clock so the spec is deterministic
   on any run day. */
test.beforeEach(async ({ page }) => {
  await page.clock.install({ time: new Date("2026-11-06T10:00:00") });
});

async function seed(page, doneMap) {
  const { day, date } = await page.evaluate(() => ({ day: Gym.todayDay(), date: Gym.dateKey() }));
  await page.evaluate(({ day, date, doneMap }) => {
    const ex = Gym.DAYS[day].ex;
    const state = {};
    ex.forEach((e, i) => {
      const done = doneMap[i] || 0;
      const sets = [];
      for (let k = 0; k < done; k++) sets.push({ load: e.load || 0, reps: e.r, rir: e.rir });
      state[day + ":" + i] = { done, load: e.load || 0, reps: e.r, rir: e.rir, sets };
    });
    localStorage.setItem("gym-tool-v2", JSON.stringify({
      v: 4, cur: day, idx: 0, bodyweight: 75, state, liftHistory: {}, sessionLog: [],
      active: { id: "ses_p1", date, day, startedAt: Date.now() - 1800000, endedAt: null, accSec: 1800, runningSince: Date.now(), status: "active" }
    }));
  }, { day, date, doneMap });
  await page.reload();
}

test("per-side lifts say both sides = 1 set, then the full rest", async ({ page }) => {
  await page.goto(url);
  await seed(page, {});
  await page.locator(".liftrow").nth(2).click(); // Bulgarian split squat
  await expect(page.locator("#perLine")).toBeVisible();
  await expect(page.locator("#perLine")).toHaveText("Both sides = 1 set · then rest 2:30");
  await page.locator("#backBtn").click();
  await page.locator(".liftrow").nth(6).click(); // Cable lateral raise (90s + low-RIR 30s)
  await expect(page.locator("#perLine")).toHaveText("Both sides = 1 set · then rest 2:00");
  await page.locator("#backBtn").click();
  await page.locator(".liftrow").nth(0).click(); // Smith squat — not per-side
  await expect(page.locator("#perLine")).toBeHidden();
});

test("the lift view names the next lift from the last set onward", async ({ page }) => {
  await page.goto(url);
  await seed(page, { 3: 2 }); // Incline DB press, one set left
  await page.locator(".liftrow").nth(3).click();
  await expect(page.locator("#nextLine")).toBeVisible();
  await expect(page.locator("#nextLine")).toContainText("Next:");
  await expect(page.locator("#nextLine")).toContainText("Pec deck fly");
  await expect(page.locator("#nextLine")).toContainText("100");
});

test("the next line stays hidden before the last set", async ({ page }) => {
  await page.goto(url);
  await seed(page, { 3: 1 }); // two sets left
  await page.locator(".liftrow").nth(3).click();
  await expect(page.locator("#nextLine")).toBeHidden();
});

test("the last lift in list names the actual next open lift when earlier lifts remain", async ({ page }) => {
  await page.goto(url);
  await seed(page, { 7: 2 }); // Assisted dip, one set left; lifts 0-6 still open
  await page.locator(".liftrow").nth(7).click();
  await expect(page.locator("#nextLine")).toContainText("Next:");
  await expect(page.locator("#nextLine")).toContainText("Smith squat");
});

test("a finished lift's primary button goes to the next open lift", async ({ page }) => {
  await page.goto(url);
  await seed(page, { 0: 3, 1: 3, 2: 3 }); // Bulgarian done, Incline DB press next open
  await page.locator(".liftrow").nth(2).click();
  const go = page.locator("#goNextBtn");
  await expect(go).toBeVisible();
  await expect(go).toContainText("Incline DB press");
  await go.click();
  await expect(page.locator("#exName")).toHaveText("Incline DB press");
  await expect(go).toBeHidden();
});

test("a completed middle lift's Next button names the lift GO opens (U124)", async ({ page }) => {
  await page.goto(url);
  await seed(page, { 2: 3 }); // Bulgarian complete; lifts 0,1 and 3+ still open
  await page.locator(".liftrow").nth(2).click();
  await expect(page.locator("#nextLine")).toContainText("Incline DB press");
  const go = page.locator("#goNextBtn");
  await expect(go).toContainText("Incline DB press"); // pre-fix: "Smith squat"
  await go.click();
  await expect(page.locator("#exName")).toHaveText("Incline DB press");
});

test("set count acknowledges extra sets (U132)", async ({ page }) => {
  await page.goto(url);
  await seed(page, { 2: 4 }); // Bulgarian complete + 1 extra
  await page.locator(".liftrow").nth(2).click();
  await expect(page.locator("#setLog .setrow.done")).toHaveCount(4);
  await expect(page.locator("#setCount")).toContainText("All 3 sets done · 1 extra"); // stale pre-fix
});

test("a fully finished day routes the button to the finish", async ({ page }) => {
  await page.goto(url);
  const all = {};
  for (let i = 0; i < 8; i++) all[i] = 3;
  await seed(page, all);
  await page.locator(".liftrow").nth(0).click();
  const go = page.locator("#goNextBtn");
  await expect(go).toContainText("All lifts done");
  await go.click();
  await expect(page.locator("#liftView")).toBeHidden();
  await expect(page.locator("#dayView")).toBeVisible();
});

test("finished workout's all-done button no longer promises a Finish (U147)", async ({ page }) => {
  await page.goto(url);
  await seed(page, (() => { const all = {}; for (let i = 0; i < 8; i++) all[i] = 3; return all; })());
  await page.locator("#finishBtn").click();
  await page.locator("#sumDone").click();
  await page.locator(".liftrow").nth(0).click();
  const go = page.locator("#goNextBtn");
  await expect(go).toContainText("All lifts done ✓"); // stale pre-fix: "All lifts done — finish ✓"
  expect(await go.getAttribute("aria-label")).toBe("All lifts done — back to the day view");
  await go.click();
  await expect(page.locator("#finishBtn")).toBeHidden(); // nothing left to finish
  await expect(page.locator("#daySummary")).toContainText("Workout complete");
});

test("extra sets log like normal sets with the adjusted reps (existing flow)", async ({ page }) => {
  await page.goto(url);
  await seed(page, { 2: 3 }); // Bulgarian complete
  await page.locator(".liftrow").nth(2).click();
  await expect(page.locator("#doneBtn")).toHaveText("✓ Add extra set");
  await page.locator("#repUp").click(); // quick-adjust: 8 -> 9 reps
  await page.locator("#doneBtn").click();
  await page.locator("#skipRest").click(); // end the extra set's rest -> GO wraps to the earliest open lift
  await page.locator("#backBtn").click();
  await page.locator(".liftrow").nth(2).click(); // back to Bulgarian to inspect its log
  await expect(page.locator("#setLog .setrow")).toHaveCount(4);
  await expect(page.locator("#setLog .setrow").nth(3)).toContainText("× 9");
  // the lift stays complete and the way onward is still offered
  await expect(page.locator("#goNextBtn")).toBeVisible();
});
