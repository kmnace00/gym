/* Nov 13 Phase 1 (N2/N4/N5 + N7-flow verification): per-side clarity, the
   next-lift line, and the completed-lift Next button. */
const { test, expect } = require("@playwright/test");
const path = require("path");

const url = "file://" + path.resolve(__dirname, "..", "index.html");

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

test("the last lift of the day says so instead of naming a next lift", async ({ page }) => {
  await page.goto(url);
  await seed(page, { 7: 2 }); // Assisted dip, one set left
  await page.locator(".liftrow").nth(7).click();
  await expect(page.locator("#nextLine")).toHaveText("Last lift of the day");
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
