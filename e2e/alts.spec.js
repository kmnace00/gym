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

test("a swapped-in machine on an assisted lift is valued at its real weight", async ({ page }) => {
  /* Friday lift 7 is the Assisted dip (assist:true). Swapped to the plain
     "Close-grip bench press" alternate at 135 lb, its 3 done sets must sum as
     plain external weight (135×6×3 = 2430 → "2.4k lb"), NOT bodyweight-minus-help
     ((165−135)×6×3 = 540 → "540 lb") the ORIGINAL's assist rule would apply. */
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(url);
  await page.evaluate(() => {
    const day = Gym.todayDay();
    const state = {};
    state[day + ":7"] = { done: 3, load: 45, reps: 6, rir: 2,
      swapAlt: "Close-grip bench press", swapLoad: 135,
      sets: [{ load: 135, reps: 6, rir: 2 }, { load: 135, reps: 6, rir: 2 }, { load: 135, reps: 6, rir: 2 }] };
    localStorage.setItem("gym-tool-v2", JSON.stringify({
      v: 5, cur: day, idx: 0, bodyweight: 165, bodyweightSet: false, state,
      sessionLog: [], liftHistory: {},
      active: { id: "ses_swapval", date: "", day: day, startedAt: Date.now() - 600000, endedAt: null, accSec: 600, runningSince: null, status: "active" }
    }));
  });
  await page.reload();
  await page.locator("#finishBtn").click();
  await expect(page.locator("#summary")).toBeVisible();
  await expect(page.locator("#sumVol")).toHaveText("2.4k lb"); // 135×6×3, plain load
  expect(errors).toEqual([]);
});

test("the New PR hint values a swapped-in machine at its real load, not the original's assist rule", async ({ page }) => {
  /* Same slice as v148 but on the LIVE doneBtn PR path, which v148 missed:
     the hint's est. 1RM for a swapped assisted lift must value the alternate's
     135 lb as PLAIN load (135×1.2 = 162), not as bodyweight-minus-help
     ((165−135)×1.2 = 36). Friday dip's prior assisted session was 45 lb help
     → (165−45)×1.2 = 144, so 162 is a real gain that fires "New PR"; the assist
     mis-value 36 is BELOW 144 and would never fire. */
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  await page.setViewportSize({ width: 390, height: 667 });
  await page.clock.install({ time: new Date("2026-11-06T10:00:00") }); // a Friday
  await page.goto(url);
  await page.evaluate(() => {
    const state = {};
    state["fri:7"] = { done: 0, load: 45, reps: 6, rir: 2, swapAlt: "Close-grip bench press", swapLoad: 135 };
    localStorage.setItem("gym-tool-v2", JSON.stringify({
      v: 5, cur: "fri", idx: 0, bodyweight: 165, bodyweightSet: false, state,
      sessionLog: [],
      liftHistory: { "fri:7": [{ date: "2026-10-30", load: 45, reps: 6, rir: 2, setsDone: 3, assist: true }] },
      active: { id: "ses_prswap", date: "2026-11-06", day: "fri", startedAt: Date.now() - 600000, endedAt: null, accSec: 600, runningSince: null, status: "active" }
    }));
  });
  await page.reload();
  await page.locator(".liftrow").nth(7).click(); // open fri:7 (the assisted dip)
  await page.locator("#doneBtn").click();
  await page.locator("#skipRest").click(); // end rest, back to the lift
  const hint = await page.locator("#hint").textContent();
  expect(hint).toContain("New PR");
  expect(hint).toContain("135 × 6"); // plain load label, not "help 135"
  expect(hint).toContain("est. 1RM 162"); // 135×1.2, NOT (165−135)×1.2=36
  expect(errors).toEqual([]);
});

test("a completed SWAPPED session is not counted as 'this session' when building the next suggestion", async ({ page }) => {
  /* priorEntries() drops the newest history entry when the current lift is
     complete — but only when that entry IS today's session. A swap doesn't feed
     progression, so today's swapped entry is filtered out BEFORE the skip, and
     the old code still dropped the newest real prior session, making the
     suggestion read TWO sessions back. Seed two consecutive qualifying sessions
     (50×8@2) then a today swap-complete; the suggestion must use the newest real
     prior (50 → 52.5 "hit top twice"), NOT the two-back one. */
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.clock.install({ time: new Date("2026-11-06T10:00:00") }); // a Friday
  await page.goto(url);
  await page.evaluate(() => {
    const priors = (date) => ({
      date, load: 50, reps: 8, rir: 2, hitTop: true, setsDone: 3,
      sets: [{ load: 50, reps: 8, rir: 2 }, { load: 50, reps: 8, rir: 2 }, { load: 50, reps: 8, rir: 2 }]
    });
    localStorage.setItem("gym-tool-v2", JSON.stringify({
      v: 5, cur: "fri", idx: 0, bodyweight: 165, bodyweightSet: false,
      state: { "fri:0": { done: 3, load: 60, reps: 6, rir: 2,
        swapAlt: "Barbell back squat", swapLoad: 50,
        sets: [{ load: 50, reps: 6, rir: 2 }, { load: 50, reps: 6, rir: 2 }, { load: 50, reps: 6, rir: 2 }] } },
      liftHistory: {
        "fri:0": [
          priors("2026-10-23"),
          priors("2026-10-30"),
          { date: "2026-11-06", swap: "Barbell back squat", load: 50, reps: 6, rir: 2, setsDone: 3,
            sets: [{ load: 50, reps: 6, rir: 2 }, { load: 50, reps: 6, rir: 2 }, { load: 50, reps: 6, rir: 2 }] }
        ]
      },
      sessionLog: [],
      active: { id: "ses_perswap", date: "2026-11-06", day: "fri", startedAt: Date.now() - 600000, endedAt: null, accSec: 600, runningSince: null, status: "active" }
    }));
  });
  await page.reload();
  await page.locator(".liftrow").first().click(); // open fri:0, the swapped Smith squat
  await expect(page.locator("#exName")).toHaveText("Barbell back squat"); // swapped
  await expect(page.locator("#loadVal")).toHaveText("50");
  // the suggestion must treat the newest REAL prior (Oct 30) as "last", so two
  // qualifying sessions in a row fire the 2-for-2 → try 52.5. Pre-fix it read
  // two-back and offered "one more top session to go up".
  await expect(page.locator("#suggestText")).toContainText("hit top twice");
  await expect(page.locator("#suggestText")).toContainText("52.5");
  await expect(page.locator("#suggestText")).not.toContainText("one more top session to go up");
  expect(errors).toEqual([]);
});

test("a swapped descending session banks the HEAVIER set as the representative top", async ({ page }) => {
  /* bankLift picks the representative top set with the ORIGINAL lift's metric,
     but a swapped assisted lift's sets carry the ALTERNATE's plain load, so an
     assist metric (bodyweight−help) inverts the pick and crowns the LIGHTER of
     a descending run. Under the shared liftValuation rule (plain load while
     swapped), 135 must win over 125. Friday lift 7 is the Assisted dip. */
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.clock.install({ time: new Date("2026-11-06T10:00:00") }); // a Friday
  await page.goto(url);
  await page.evaluate(() => {
    const s2 = (ld) => ({ load: ld, reps: 6, rir: 2 });
    localStorage.setItem("gym-tool-v2", JSON.stringify({
      v: 5, cur: "fri", idx: 0, bodyweight: 165, bodyweightSet: false,
      state: { "fri:7": { done: 2, load: 45, reps: 6, rir: 2,
        swapAlt: "Close-grip bench press", swapLoad: 125,
        sets: [s2(135), s2(135)] } },
      liftHistory: {}, sessionLog: [],
      active: { id: "ses_topswap", date: "2026-11-06", day: "fri", startedAt: Date.now() - 600000, endedAt: null, accSec: 600, runningSince: null, status: "active" }
    }));
  });
  await page.reload();
  await page.locator(".liftrow").nth(7).click(); // open fri:7, the swapped dip
  await page.locator("#doneBtn").click(); // 3rd set at the working 125 → bank [135,135,125]
  await page.locator("#skipRest").click(); // end rest, back to the lift
  const entry = await page.evaluate(() => JSON.parse(localStorage.getItem("gym-tool-v2"))
    .liftHistory["fri:7"].slice(-1)[0]);
  expect(entry.load, "the heavier swapped set banks as the representative top").toBe(135);
  expect(entry.reps).toBe(6);
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
