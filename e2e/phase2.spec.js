/* Nov 13 Phase 1, group 2 (N6/N7/N8): the honest clock, the ramp guide,
   and the one starting guess. */
const { test, expect } = require("@playwright/test");
const path = require("path");

const url = "file://" + path.resolve(__dirname, "..", "index.html");

async function seedDay(page, dayKey, doneMap) {
  const date = await page.evaluate(() => Gym.dateKey());
  await page.evaluate(({ dayKey, date, doneMap }) => {
    const ex = Gym.DAYS[dayKey].ex;
    const state = {};
    ex.forEach((e, i) => {
      const done = doneMap[i] || 0;
      const sets = [];
      for (let k = 0; k < done; k++) sets.push({ load: e.load || 0, reps: e.r, rir: e.rir });
      state[dayKey + ":" + i] = { done, load: e.load || 0, reps: e.r, rir: e.rir, sets };
    });
    localStorage.setItem("gym-tool-v2", JSON.stringify({
      v: 4, cur: dayKey, idx: 0, bodyweight: 75, state, liftHistory: {}, sessionLog: [],
      active: { id: "ses_p2", date, day: dayKey, startedAt: Date.now() - 600000, endedAt: null, accSec: 600, runningSince: Date.now(), status: "active" }
    }));
  }, { dayKey, date, doneMap });
  await page.reload();
}

test("the day summary quotes the honest total (stretch + setup + ramps)", async ({ page }) => {
  await page.goto(url);
  const day = await page.evaluate(() => Gym.todayDay());
  await seedDay(page, day, {});
  await expect(page.locator("#daySummary")).toContainText("~92 min"); // Fri: 75 base + 17 honest
});

test("the first lift shows its full ramp before set 1, then never again", async ({ page }) => {
  await page.goto(url);
  const day = await page.evaluate(() => Gym.todayDay());
  await seedDay(page, day, {});
  await page.locator(".liftrow").nth(0).click(); // Smith squat, load 60
  await expect(page.locator("#rampLine")).toBeVisible();
  await expect(page.locator("#rampLine")).toHaveText("Ramp: 30×5 · 42.5×3 · 50×1");
  await page.locator("#doneBtn").click();
  await page.locator("#skipRest").click();
  await expect(page.locator("#rampLine")).toBeHidden();
});

test("the rest before a heavy lift's first set shows its feeler", async ({ page }) => {
  await page.goto(url);
  const day = await page.evaluate(() => Gym.todayDay());
  await seedDay(page, day, { 0: 3, 1: 2 }); // Smith incline, one set left; Bulgarian next
  await page.locator(".liftrow").nth(1).click();
  await page.locator("#doneBtn").click(); // -> rest, up-next is Bulgarian
  await expect(page.locator("#restPrepName")).toContainText("Bulgarian split squat");
  await expect(page.locator("#restPrepRamp")).toBeVisible();
  await expect(page.locator("#restPrepRamp")).toHaveText("Feeler: 15×4");
});

test("isolations get no ramp line in the lift view", async ({ page }) => {
  await page.goto(url);
  const day = await page.evaluate(() => Gym.todayDay());
  await seedDay(page, day, {});
  await page.locator(".liftrow").nth(4).click(); // Pec deck fly, rest 90
  await expect(page.locator("#rampLine")).toBeHidden();
});

test("the Sunday cable fly starts from the marked pec-deck guess", async ({ page }) => {
  await page.goto(url);
  await seedDay(page, "sun", {}); // N12: the day tabs are gone; the seed opens Sunday
  await page.locator(".liftrow").nth(3).click(); // Cable fly
  await expect(page.locator("#exPres")).toContainText("starting guess");
  await expect(page.locator("#loadVal")).toHaveText("70"); // pec deck 100 x 0.7
  await page.locator("#backBtn").click();
  await expect(page.locator(".liftrow").nth(3).locator(".liftmeta")).toContainText("(guess)");
  // and a null-load lift with no anchor still starts light
  await page.locator("#dayNext").click(); // sun → fri (the chevron cycles the three days)
  await expect(page.locator("#dayTitle")).toHaveText("Friday — Push + Quads");
  await page.locator(".liftrow").nth(5).click(); // Fri leg extension, load null, no guess
  await expect(page.locator("#exPres")).toContainText("start light");
});
