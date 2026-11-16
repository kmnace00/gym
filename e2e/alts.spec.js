/* N14: Swap opens a chooser of the lift's alternates; each alternate keeps
   its own load (today's memory, then its last banked session). */
const { test, expect } = require("@playwright/test");
const path = require("path");

const url = "file://" + path.resolve(__dirname, "..", "index.html");

/* N14 is Friday-anchored (alternate loads are seeded against today's day);
   pin a Friday clock so the spec is deterministic on any run day. */
test.beforeEach(async ({ page }) => {
  await page.clock.install({ time: new Date("2026-11-06T10:00:00") });
});

async function openFirstLift(page) {
  await page.goto(url);
  await page.locator(".liftrow").first().click();
  await expect(page.locator("#exName")).toHaveText("Smith squat");
}

test("the chooser lists the alternates; each keeps its own load", async ({ page }) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(url);
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await openFirstLift(page);

  // Swap opens the chooser instead of swapping outright
  await page.locator("#swapBtn").click();
  await expect(page.locator("#swapChoices")).toBeVisible();
  await expect(page.locator(".swapchoice")).toHaveCount(4); // 3 alternates + Cancel
  await expect(page.locator("#exName")).toHaveText("Smith squat"); // not swapped yet

  // Cancel backs out cleanly
  await page.locator(".swapchoice.cancel").click();
  await expect(page.locator("#swapChoices")).toBeHidden();

  // choose the barbell, step its load up to 10
  await page.locator("#swapBtn").click();
  await page.locator(".swapchoice", { hasText: "Barbell back squat" }).click();
  await expect(page.locator("#exName")).toHaveText("Barbell back squat");
  await expect(page.locator("#swapChoices")).toBeHidden();
  for (let i = 0; i < 4; i++) await page.locator("#loadUp").click();
  await expect(page.locator("#loadVal")).toHaveText("10");

  // a different alternate starts fresh — the barbell's 10 does not carry over
  await page.locator("#swapBtn").click(); // undo
  await page.locator("#swapBtn").click(); // chooser again
  await page.locator(".swapchoice", { hasText: "Leg press" }).click();
  await expect(page.locator("#exName")).toHaveText("Leg press");
  await expect(page.locator("#loadVal")).toHaveText("light");

  // the stepper fast path (updateLiftReadouts) shows the same word at 0
  await page.locator("#loadUp").click();
  await expect(page.locator("#loadVal")).toHaveText("2.5");
  await page.locator("#loadDown").click();
  await expect(page.locator("#loadVal")).toHaveText("light");

  // back to the barbell: its own 10 is remembered
  await page.locator("#swapBtn").click(); // undo
  await page.locator("#swapBtn").click(); // chooser again
  await page.locator(".swapchoice", { hasText: "Barbell back squat" }).click();
  await expect(page.locator("#loadVal")).toHaveText("10");

  expect(errors).toEqual([]);
});

test("navigating away mid-edit on a swapped lift never writes the alternate load into the original lift", async ({ page }) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(url);
  await page.evaluate(() => localStorage.setItem("gym-tool-v2", JSON.stringify({
    v: 5, cur: "fri", idx: 0, bodyweight: 165, bodyweightSet: false,
    state: { "fri:0": { done: 2, load: 60, reps: 6, rir: 2, swapAlt: "Barbell back squat", swapLoad: 10,
      sets: [{ load: 10, reps: 6, rir: 2 }, { load: 10, reps: 6, rir: 2 }] } },
    liftHistory: {}, sessionLog: []
  })));
  await page.reload();
  await page.locator(".liftrow").first().click();
  await expect(page.locator("#exName")).toHaveText("Barbell back squat");
  await expect(page.locator("#loadVal")).toHaveText("10");

  /* enter the inline edit on the first done set: startEdit snapshots the
     working load (swapLoad 10), then navigating back runs resetEdit() which
     must restore it into swapLoad, not the original lift's `load` field. */
  await page.locator("[data-set='0']").click();
  await page.locator("#backBtn").click();

  const st = await page.evaluate(() => JSON.parse(localStorage.getItem("gym-tool-v2")).state["fri:0"]);
  expect(st.load, "the original lift's load is untouched by the edit").toBe(60);
  expect(st.swapLoad, "the alternate's load survives the restore").toBe(10);

  expect(errors).toEqual([]);
});

test("the day overview shows a swapped lift's working load, not the original's", async ({ page }) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(url);
  await page.evaluate(() => localStorage.setItem("gym-tool-v2", JSON.stringify({
    v: 5, cur: "fri", idx: 0, bodyweight: 165, bodyweightSet: false,
    state: { "fri:0": { done: 2, load: 60, reps: 6, rir: 2, swapAlt: "Barbell back squat", swapLoad: 10,
      sets: [{ load: 10, reps: 6, rir: 2 }, { load: 10, reps: 6, rir: 2 }] } },
    liftHistory: {}, sessionLog: []
  })));
  await page.reload();
  // lift 0's day-overview row must report the ALTERNATE's 10, not "Load 60 lb".
  const meta = page.locator(".liftrow").first().locator(".liftmeta");
  await expect(meta).toContainText("Load 10 lb");
  await expect(meta).not.toContainText("Load 60 lb");
  expect(errors).toEqual([]);
});

test("an alternate with a banked session starts from that session's load", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(url);
  await page.evaluate(() => localStorage.setItem("gym-tool-v2", JSON.stringify({
    v: 5, cur: "fri", idx: 0, state: {},
    liftHistory: {
      "fri:0": [{
        date: "2026-11-06", load: 180, reps: 6, rir: 2, hitTop: false, setsDone: 3,
        swap: "Leg press",
        sets: [{ load: 180, reps: 6, rir: 2 }, { load: 180, reps: 6, rir: 2 }, { load: 180, reps: 5, rir: 1 }]
      }]
    }
  })));
  await page.reload();
  await openFirstLift(page);

  await page.locator("#swapBtn").click();
  await page.locator(".swapchoice", { hasText: "Leg press" }).click();
  await expect(page.locator("#exName")).toHaveText("Leg press");
  await expect(page.locator("#loadVal")).toHaveText("180");
});
