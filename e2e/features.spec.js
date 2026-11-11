/* Functional checks for the new phases: persistence, auto-progression,
   backup import, and undo surviving navigation.                              */
const { test, expect } = require("@playwright/test");
const path = require("path");

const url = "file://" + path.resolve(__dirname, "..", "index.html");

async function seed(page, obj) {
  await page.goto(url);
  await page.evaluate((o) => localStorage.setItem("gym-tool-v2", JSON.stringify(o)), obj);
  await page.reload();
}

test("Set Done persists across reload", async ({ page }) => {
  await page.goto(url);
  await page.locator(".liftrow").first().click();
  await page.locator("#doneBtn").click();
  await expect(page.locator("#timerBar")).toHaveClass(/active/);
  await page.reload();
  await page.locator(".liftrow").first().click();
  await expect(page.locator("#setCount")).toContainText("Set 2 of 3");
});

test("pausing the rest freezes the clock and shows a consistent paused state", async ({ page }) => {
  await page.goto(url);
  await page.locator(".liftrow").first().click();
  await page.locator("#doneBtn").click();
  const before = await page.locator("#restTime").textContent();
  await page.locator("#pauseRest").click();
  await expect(page.locator("#pauseRest")).toHaveText("Resume");
  await expect(page.locator("#timerBar")).toHaveClass(/paused/);
  await expect(page.locator("#restMsg")).toContainText("Paused");
  await page.waitForTimeout(1200);
  expect(await page.locator("#restTime").textContent()).toBe(before);
  await page.locator("#pauseRest").click();
  await expect(page.locator("#pauseRest")).toHaveText("Pause");
  await expect(page.locator("#timerBar")).not.toHaveClass(/paused/);
  await expect(page.locator("#restMsg")).toContainText("Stretch");
});

test("rest footer links sit on one even row", async ({ page }) => {
  await page.goto(url);
  await page.locator(".liftrow").first().click();
  await page.locator("#doneBtn").click();
  const d = await page.locator("#detailsBtn").boundingBox();
  const u = await page.locator("#undoBtn").boundingBox();
  expect(Math.abs(d.y - u.y)).toBeLessThan(2);
  expect(u.x).toBeGreaterThan(d.x);
});

test("a New PR hint survives on the rest screen", async ({ page }) => {
  await seed(page, {
    v: 4, cur: "fri", idx: 0, bodyweight: 165, sessionLog: [],
    state: { "fri:0": { done: 0, load: 60, reps: 6, rir: 2, sets: [] } },
    liftHistory: {
      "fri:0": [{ date: "2026-10-01", load: 50, reps: 6, rir: 2, hitTop: false, setsDone: 3 }]
    }
  });

  await page.locator(".liftrow").first().click();
  await page.locator("#doneBtn").click();
  await expect(page.locator("#timerBar")).toHaveClass(/active/);
  await expect(page.locator("#restMsg")).toContainText("New PR");
  await expect(page.locator("#restMsg")).not.toContainText("Stretch");

  const fits = await page.evaluate(() => document.documentElement.scrollHeight <= window.innerHeight + 1);
  expect(fits, "the hint must not overflow the rest screen").toBe(true);
});

test("set log shows a row per set and records the values", async ({ page }) => {
  await page.goto(url);
  await page.locator(".liftrow").first().click();
  await expect(page.locator("#setLog .setrow")).toHaveCount(3);
  await page.locator("#loadUp").click();
  const load = await page.locator("#loadVal").textContent();
  await page.locator("#doneBtn").click();
  await page.locator("#skipRest").click();
  await expect(page.locator("#setLog .setrow").nth(0)).toHaveClass(/done/);
  await expect(page.locator("#setLog .setrow").nth(0)).toContainText(load);
  await expect(page.locator("#setLog .setrow").nth(1)).toHaveClass(/now/);
  await expect(page.locator("#setCount")).toContainText("Set 2 of 3");
});

test("auto-progression: two qualifying sessions suggest +step and Apply sets it", async ({ page }) => {
  await seed(page, {
    v: 2, cur: "fri", idx: 0,
    state: { "fri:0": { done: 0, load: 50, reps: 6, rir: 2, topHits: 0, lastRir: null } },
    liftHistory: { "fri:0": [
      { date: "2026-10-25", load: 50, reps: 8, rir: 2, hitTop: true, setsDone: 3 },
      { date: "2026-11-01", load: 50, reps: 8, rir: 2, hitTop: true, setsDone: 3 }
    ] }
  });
  await page.locator(".liftrow").first().click();
  await expect(page.locator("#suggestText")).toContainText("hit top twice");
  await expect(page.locator("#suggestText")).toContainText("try");
  await expect(page.locator("#applyLoad")).toBeVisible();
  await page.locator("#applyLoad").click();
  await expect(page.locator("#loadVal")).toHaveText("52.5");
});

test("auto-progression: one qualifying session says one more, with no Apply", async ({ page }) => {
  await seed(page, {
    v: 2, cur: "fri", idx: 0,
    state: { "fri:0": { done: 0, load: 50, reps: 6, rir: 2, topHits: 0, lastRir: null } },
    liftHistory: { "fri:0": [
      { date: "2026-10-25", load: 50, reps: 6, rir: 2, hitTop: true, setsDone: 3 },
      { date: "2026-11-01", load: 50, reps: 8, rir: 2, hitTop: true, setsDone: 3 }
    ] }
  });
  await page.locator(".liftrow").first().click();
  await expect(page.locator("#suggestText")).toContainText("one more top session to go up");
  await expect(page.locator("#suggestText")).toContainText("keep 50");
  await expect(page.locator("#applyLoad")).toBeHidden();
});

test("import restores a backup", async ({ page }) => {
  await page.goto(url);
  const backup = JSON.stringify({
    v: 2, cur: "fri", idx: 0,
    state: { "fri:0": { done: 0, load: 77, reps: 6, rir: 2, topHits: 0, lastRir: null } },
    liftHistory: {}
  });
  await page.locator("#menuBtn").click();
  await page.setInputFiles("#importFile", { name: "b.json", mimeType: "application/json", buffer: Buffer.from(backup) });
  await expect(page.locator("#modalMsg")).toContainText("Merged:");
  await page.locator("#modalClose").click();
  await page.locator(".liftrow").first().click();
  await expect(page.locator("#loadVal")).toHaveText("77");
});

test("back button reads Back and lift context shows the day", async ({ page }) => {
  await page.goto(url);
  await page.locator(".liftrow").first().click();
  await expect(page.locator("#backBtn")).toHaveText(/Back/);
  await expect(page.locator("#liftMeta")).toContainText("Lift 1 of 8");
  await expect(page.locator("#liftMeta")).toHaveText(/(Fri|Sat|Sun)/);
});

test("restart lift clears sets but keeps load", async ({ page }) => {
  await page.goto(url);
  await page.locator(".liftrow").first().click();
  await page.locator("#doneBtn").click();
  await page.locator("#skipRest").click(); // end rest, back to the lift
  await expect(page.locator("#setCount")).toContainText("Set 2 of 3");
  const loadBefore = await page.locator("#loadVal").textContent();
  await page.locator("#resetLiftBtn").click();
  await page.locator("#resetLiftBtn").click(); // two-tap guard
  await expect(page.locator("#setCount")).toContainText("Set 1 of 3");
  await expect(page.locator("#loadVal")).toHaveText(loadBefore);
});

test("reset day clears all lifts via the menu (two taps)", async ({ page }) => {
  await page.goto(url);
  await page.locator(".liftrow").first().click();
  await page.locator("#doneBtn").click();
  await page.locator("#skipRest").click();
  await page.locator("#backBtn").click();
  await page.locator(".liftrow").nth(1).click();
  await page.locator("#doneBtn").click();
  await page.locator("#skipRest").click();
  await page.locator("#backBtn").click();
  await page.locator("#menuBtn").click();
  await page.locator("#resetDay").click();
  await page.locator("#resetDay").click();
  await page.locator("#modalClose").click();
  await page.locator(".liftrow").first().click();
  await expect(page.locator("#setCount")).toContainText("Set 1 of 3");
});

test("clear all data wipes history", async ({ page }) => {
  await page.goto(url);
  await page.locator("#menuBtn").click();
  await expect(page.locator("#modalFoot")).toContainText("0 workouts");
  await page.locator("#clearAll").click();
  await page.locator("#clearAll").click();
  await expect(page.locator("#modalMsg")).toContainText("cleared");
});

test("undo on the lift steps back one set (visible)", async ({ page }) => {
  await page.goto(url);
  await page.locator(".liftrow").first().click();
  await expect(page.locator("#undoSetBtn")).toBeDisabled();
  await page.locator("#doneBtn").click();
  await page.locator("#skipRest").click();
  await expect(page.locator("#setCount")).toContainText("Set 2 of 3");
  await page.locator("#undoSetBtn").click();
  await expect(page.locator("#setCount")).toContainText("Set 1 of 3");
  await expect(page.locator("#undoSetBtn")).toBeDisabled();
});

test("undo on the rest screen after the final set restores it", async ({ page }) => {
  await page.goto(url);
  await page.locator(".liftrow").first().click();
  await page.locator("#doneBtn").click(); await page.locator("#skipRest").click();
  await page.locator("#doneBtn").click(); await page.locator("#skipRest").click();
  await page.locator("#doneBtn").click(); // completes all sets, resting
  await expect(page.locator("#undoBtn")).toBeVisible();
  await page.locator("#undoBtn").click();
  await expect(page.locator("#setCount")).toContainText("Set 3 of 3");
});

/* L2 audit — the lengthened-partials cue is a last-set, RIR ≤1 signal on
   flagged lifts only. Leg extension is Fri index 5 (partial: 1); Smith squat
   is Fri index 0 (not flagged). Seeded so the day does not depend on the date. */
const PARTIALS = "bottom-half partials to failure";

test("partials cue appears only after the final set of a flagged lift", async ({ page }) => {
  await seed(page, { v: 2, cur: "fri", idx: 5, state: {}, liftHistory: {} });
  await page.locator(".liftrow").nth(5).click();
  for (var i = 0; i < 2; i++) {
    await page.locator("#doneBtn").click();
    await expect(page.locator("#restMsg")).not.toContainText(PARTIALS);
    await page.locator("#skipRest").click();
  }
  await page.locator("#doneBtn").click(); // set 3 of 3, RIR 1
  await expect(page.locator("#restMsg")).toContainText("Add bottom-half partials to failure — then rest.");
  await expect(page.locator("#restMsg")).toContainText("+30s for 0–1 RIR");
});

test("no partials cue when the last set is RIR 2", async ({ page }) => {
  await seed(page, { v: 2, cur: "fri", idx: 5, state: {}, liftHistory: {} });
  await page.locator(".liftrow").nth(5).click();
  await page.locator('.rir[data-rir="2"]').click();
  for (var i = 0; i < 2; i++) {
    await page.locator("#doneBtn").click();
    await expect(page.locator("#restMsg")).not.toContainText(PARTIALS);
    await page.locator("#skipRest").click();
  }
  await page.locator("#doneBtn").click(); // set 3 of 3, RIR 2 → no cue, no +30s
  await expect(page.locator("#restMsg")).toContainText("Stretch — set up the next set.");
  await expect(page.locator("#restMsg")).not.toContainText("+30s");
  await page.locator("#skipRest").click();
});

test("a lift without the partial flag never shows the partials cue", async ({ page }) => {
  await seed(page, { v: 2, cur: "fri", idx: 0, state: {}, liftHistory: {} });
  await page.locator(".liftrow").nth(0).click();
  for (var i = 0; i < 3; i++) {
    await page.locator("#doneBtn").click();
    await expect(page.locator("#restMsg")).not.toContainText(PARTIALS);
    await page.locator("#skipRest").click();
  }
});

test("bodyweight history is frozen at the weight in force", async ({ page }) => {
  const errors = [];
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });

  await page.goto(url);
  // deterministic day: the bodyweight lift is on Friday (not necessarily today)
  await page.locator('.day[data-day="fri"]').click();
  const idx = await page.evaluate(() => Gym.DAYS.fri.ex.findIndex((e) => e.bw));
  if (idx === -1) {
    console.log("no bodyweight lift in Friday's program — test skipped");
    return;
  }

  await page.locator(".liftrow").nth(idx).click();
  for (var i = 0; i < 3; i++) {
    await page.locator("#doneBtn").click();
    await page.locator("#skipRest").click();
  }
  // the dip is the last lift of the day: with B3-34 GO wraps to the first open
  // lift instead of resting, so back out of lift view to reach the menu.
  await page.locator("#backBtn").click();

  await page.locator("#menuBtn").click();
  await page.locator("#bwInput").fill("220");
  await page.locator("#bwInput").press("Tab");
  await page.locator("#modalClose").click();

  // backBtn above already left lift view, so the progress button is reachable
  await page.locator("#progressBtn").click();
  // the sets were banked at 165 lb, so editing the scalar to 220 does not
  // rewrite the tonnage that was logged ("4.0k lb" under the old behaviour)
  await expect(page.locator("#pSub")).toContainText("3.0k lb");

  expect(errors.filter((e) => !/vibrate|AudioContext/i.test(e)), "no console errors").toEqual([]);
});

test("weights name pounds on the lift and rest screens", async ({ page }) => {
  await page.goto(url);
  await page.locator(".liftrow").first().click();
  await expect(page.locator("#exPres")).toContainText("lb");
  await expect(page.locator(".ctl .k").first()).toHaveText("Load (lb)");
  await page.locator("#doneBtn").click();
  await expect(page.locator("#restPrepLoad")).toContainText("lb");
  await page.locator("#skipRest").click();
});

/* B5-19 — the Export CSV journey: button → download event → filename → contents */
test("Export CSV downloads gym-<date>.csv containing the logged sets", async ({ page }) => {
  const history = {
    "fri:0": [{
      date: "2026-11-06", load: 70, reps: 6, rir: 2,
      sets: [{ load: 70, reps: 6, rir: 2 }, { load: 72.5, reps: 6, rir: 1 }]
    }]
  };
  await seed(page, { v: 4, cur: "fri", idx: 0, state: {}, liftHistory: history });

  await page.locator("#menuBtn").click();
  const downloadPromise = page.waitForEvent("download");
  await page.locator("#exportCsv").click();
  const download = await downloadPromise;

  const key = await page.evaluate(() => Gym.dateKey());
  expect(download.suggestedFilename(), "the CSV is named after today").toBe("gym-" + key + ".csv");

  const fs = require("fs");
  const text = fs.readFileSync(await download.path(), "utf8");
  expect(text.split("\n")[0], "the CSV has a header row").toBe("date,day,lift,set,load,reps,rir");
  expect(text, "each logged set is a row").toContain("2026-11-06,fri,Smith squat,1,70,6,2");
  expect(text, "multi-set entries expand per set").toContain("2026-11-06,fri,Smith squat,2,72.5,6,1");
});

test("a swapped session never feeds the original lift's progression (B6-06)", async ({ page }) => {
  await seed(page, {
    v: 5, cur: "fri", idx: 0, bodyweight: 165, bodyweightSet: false,
    state: { "fri:0": { done: 0, load: 50, reps: 6, rir: 2 } },
    liftHistory: { "fri:0": [
      { date: "2026-10-25", load: 50, reps: 8, rir: 2, hitTop: true, setsDone: 3 },
      { date: "2026-11-01", load: 60, reps: 8, rir: 2, hitTop: true, setsDone: 3, swap: "DB reverse lunge" }
    ] }
  });
  await page.locator(".liftrow").first().click();
  /* the 60 lb swap is invisible: the suggestion reads the 50 lb session only */
  await expect(page.locator("#suggestText")).toContainText("keep 50");
  await expect(page.locator("#applyLoad")).toBeHidden();
});

test("banking a lift swapped to an alternate stamps the entry (B6-06)", async ({ page }) => {
  await seed(page, {
    v: 5, cur: "fri", idx: 0, bodyweight: 165, bodyweightSet: false,
    state: { "fri:0": { done: 2, load: 60, reps: 6, rir: 2, swapAlt: "DB reverse lunge",
      sets: [{ load: 60, reps: 6, rir: 2 }, { load: 60, reps: 6, rir: 2 }] } },
    liftHistory: {}, sessionLog: []
  });
  await page.locator(".liftrow").first().click();
  await page.locator("#doneBtn").click(); // third set → bankLift
  const arr = await page.evaluate(() => JSON.parse(localStorage.getItem("gym-tool-v2")).liftHistory["fri:0"]);
  expect(arr.length).toBe(1);
  expect(arr[0].swap).toBe("DB reverse lunge");
  expect(arr[0].load).toBe(60); // the alternate's actual top set
});

test("the swap UI swaps, logs under the alternate, and locks (B6-07)", async ({ page }) => {
  await seed(page, {
    v: 5, cur: "fri", idx: 0, bodyweight: 165, bodyweightSet: false,
    state: {}, liftHistory: {}, sessionLog: []
  });
  await page.locator(".liftrow").first().click();

  const swap = page.locator("#swapBtn");
  await expect(swap).toBeVisible();
  const box = await swap.boundingBox();
  expect(box.height, "the swap control meets the 44px floor").toBeGreaterThanOrEqual(44);

  await swap.click();
  await expect(page.locator("#exName")).toHaveText("Barbell back squat"); // Smith squat's alt
  await expect(page.locator("#swapSub")).toHaveText("Swapped for Smith squat");
  await expect(swap).toHaveText("Using Barbell back squat — undo");
  await expect(page.locator("#exCue")).toBeHidden(); // the cue describes the original movement
  await expect(page.locator("#tempoLine")).toBeVisible();

  /* the steppers now write the alternate's working load */
  await page.locator("#loadUp").click();
  await expect(page.locator("#loadVal")).toHaveText("2.5");
  await page.locator("#loadUp").click();
  await page.locator("#loadUp").click();
  await page.locator("#loadUp").click();
  await expect(page.locator("#loadVal")).toHaveText("10");

  /* un-swap is still allowed before the first set */
  await swap.click();
  await expect(page.locator("#exName")).toHaveText("Smith squat");
  await expect(page.locator("#loadVal")).toHaveText("60"); // the original's working load came back
  await swap.click(); // swap again for the logged sets

  for (let i = 0; i < 3; i++) {
    await page.locator("#doneBtn").click();
    await page.locator("#skipRest").click();
  }
  await page.reload(); // re-open the lift fresh, as a returning user would
  await page.locator(".liftrow").first().click();
  await expect(swap).toBeDisabled();
  await expect(page.locator("#swapSub")).toHaveText("Swap locked — sets logged");

  const arr = await page.evaluate(() => JSON.parse(localStorage.getItem("gym-tool-v2")).liftHistory["fri:0"]);
  expect(arr[0].swap).toBe("Barbell back squat");
  expect(arr[0].load).toBe(10); // the alternate's actual top set
  /* the original's record never moved */
  const st = await page.evaluate(() => JSON.parse(localStorage.getItem("gym-tool-v2")).state["fri:0"]);
  expect(st.load).toBe(60);
  expect(st.swapLoad).toBe(10);
});

test("a swap day's Prev line reads the swap entry; the suggestion ignores it (B6-07)", async ({ page }) => {
  await seed(page, {
    v: 5, cur: "fri", idx: 0, bodyweight: 165, bodyweightSet: false,
    state: { "fri:0": { done: 0, load: 60, reps: 6, rir: 2, swapAlt: "Barbell back squat", swapLoad: 70 } },
    liftHistory: { "fri:0": [
      { date: "2026-10-25", load: 60, reps: 6, rir: 2, hitTop: false, setsDone: 3 },
      { date: "2026-11-01", load: 70, reps: 8, rir: 2, hitTop: true, setsDone: 3, swap: "Barbell back squat" }
    ] }
  });
  await page.locator(".liftrow").first().click();
  await expect(page.locator("#prevLine")).toHaveText("Prev (swap): Barbell back squat 70×8");
  /* the suggestion reads the last non-swap entry (60 lb, Oct 25) */
  await expect(page.locator("#suggestText")).toContainText("keep 60");
  await expect(page.locator("#applyLoad")).toBeHidden();
});

test("the Bulgarian split squat rests 2:30 after a set (B6-08)", async ({ page }) => {
  await seed(page, {
    v: 5, cur: "fri", idx: 2, bodyweight: 165, bodyweightSet: false,
    state: { "fri:2": { done: 0, load: 25, reps: 8, rir: 2 } },
    liftHistory: {}, sessionLog: []
  });
  await page.locator(".liftrow").nth(2).click();
  await expect(page.locator("#exName")).toHaveText("Bulgarian split squat");
  await expect(page.locator("#exPres")).toContainText("Rest 2:30");

  await page.locator("#doneBtn").click();
  const secs = await page.evaluate(() => {
    const t = document.getElementById("restTime").textContent.trim().split(":");
    return parseInt(t[0], 10) * 60 + parseInt(t[1], 10);
  });
  expect(secs, "the countdown starts at 150 s").toBeGreaterThanOrEqual(149);
  expect(secs).toBeLessThanOrEqual(150);
});
