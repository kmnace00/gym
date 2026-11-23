/* Functional checks for the new phases: persistence, auto-progression,
   backup import, and undo surviving navigation.                              */
const { test, expect } = require("@playwright/test");
const path = require("path");

const url = "file://" + path.resolve(__dirname, "..", "index.html");

/* Several checks seed a Friday state and assert Friday lifts/layout; pin a
   Friday clock so the spec is deterministic on any run day. */
test.beforeEach(async ({ page }) => {
  await page.clock.install({ time: new Date("2026-11-06T10:00:00") });
});

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

test("import and restore do not claim success when the write fails (U11)", async ({ page }) => {
  const backup = JSON.stringify({
    v: 2, cur: "fri", idx: 0, bodyweight: 165,
    state: { "fri:0": { done: 0, load: 77, reps: 6, rir: 2 } },
    liftHistory: {}, sessionLog: [{ date: "2026-11-01", status: "complete", durationSec: 1800 }]
  });
  const failMainWrite = () => page.evaluate(() => {
    const orig = Storage.prototype.setItem;
    Storage.prototype.setItem = function (k, v) {
      if (String(k) === "gym-tool-v2") throw new Error("QuotaExceededError");
      return orig.call(this, k, v);
    };
  });

  await page.goto(url);
  await failMainWrite();
  await page.locator("#menuBtn").click();
  await page.setInputFiles("#importFile", { name: "b.json", mimeType: "application/json", buffer: Buffer.from(backup) });
  await expect(page.locator("#modalMsg")).toContainText("Merged:");
  await expect(page.locator("#modalMsg")).not.toContainText("✓");
  await expect(page.locator("#modalMsg")).toContainText("storage full");

  await page.reload();
  await failMainWrite();
  await page.locator("#menuBtn").click();
  await page.setInputFiles("#replaceFile", { name: "b.json", mimeType: "application/json", buffer: Buffer.from(backup) });
  await expect(page.locator("#modalMsg")).toContainText("Backup restored");
  await expect(page.locator("#modalMsg")).not.toContainText("✓");
  await expect(page.locator("#modalMsg")).toContainText("storage full");
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

test("resetting the day stops a running rest (U13)", async ({ page }) => {
  await page.goto(url);
  await page.locator(".liftrow").first().click();
  await page.locator("#doneBtn").click();
  await expect(page.locator("#timerBar")).toHaveClass(/active/);
  await page.locator("#detailsBtn").click();
  await page.locator("#menuBtn").click();
  await page.locator("#resetDay").click();
  await page.locator("#resetDay").click();
  await page.locator("#modalClose").click();
  await expect(page.locator("#timerBar"), "a reset day must not leave a rest counting down").not.toHaveClass(/active/);
  await expect(page.locator("#restLabel")).not.toContainText("set 1 done");
});

test("summary close restores focus to a sensible control (U24)", async ({ page }) => {
  await seed(page, {
    v: 5, cur: "fri", idx: 0, bodyweight: 165, bodyweightSet: false,
    state: {
      "fri:0": { load: 60, reps: 6, rir: 2, done: 3, topHits: 0, lastRir: 2, exId: "fri-smith-squat", sets: [{ load: 60, reps: 6, rir: 2 }, { load: 60, reps: 6, rir: 2 }, { load: 60, reps: 6, rir: 2 }] },
      "fri:1": { load: 50, reps: 6, rir: 2, done: 3, topHits: 0, lastRir: 2, exId: "fri-smith-incline", sets: [{ load: 50, reps: 6, rir: 2 }, { load: 50, reps: 6, rir: 2 }, { load: 50, reps: 6, rir: 2 }] },
      "fri:2": { load: 25, reps: 8, rir: 2, done: 3, topHits: 0, lastRir: 2, exId: "fri-bulgarian", sets: [{ load: 25, reps: 8, rir: 2 }, { load: 25, reps: 8, rir: 2 }, { load: 25, reps: 8, rir: 2 }] },
      "fri:3": { load: 35, reps: 10, rir: 2, done: 3, topHits: 0, lastRir: 2, exId: "fri-incline-db", sets: [{ load: 35, reps: 10, rir: 2 }, { load: 35, reps: 10, rir: 2 }, { load: 35, reps: 10, rir: 2 }] },
      "fri:4": { load: 45, reps: 8, rir: 2, done: 3, topHits: 0, lastRir: 2, exId: "fri-pec-deck", sets: [{ load: 45, reps: 8, rir: 2 }, { load: 45, reps: 8, rir: 2 }, { load: 45, reps: 8, rir: 2 }] },
      "fri:5": { load: 40, reps: 10, rir: 1, done: 3, topHits: 0, lastRir: 1, exId: "fri-leg-ext", sets: [{ load: 40, reps: 10, rir: 1 }, { load: 40, reps: 10, rir: 1 }, { load: 40, reps: 10, rir: 1 }] },
      "fri:6": { load: 10, reps: 10, rir: 1, done: 3, topHits: 0, lastRir: 1, exId: "fri-cable-lat", sets: [{ load: 10, reps: 10, rir: 1 }, { load: 10, reps: 10, rir: 1 }, { load: 10, reps: 10, rir: 1 }] },
      "fri:7": { load: 15, reps: 12, rir: 2, done: 3, topHits: 0, lastRir: 2, exId: "fri-weighted-dip", sets: [{ load: 15, reps: 12, rir: 2 }, { load: 15, reps: 12, rir: 2 }, { load: 15, reps: 12, rir: 2 }] }
    },
    active: { date: "2026-11-20", status: "active", startedAt: 1763654400000, elapsedSec: 0, runningSince: 1763654400000 },
    liftHistory: {}, sessionLog: []
  });
  await page.evaluate(() => { const b = document.getElementById("finishBtn"); b.hidden = false; b.focus(); b.click(); });
  await expect(page.locator("#summary")).toBeVisible();
  await page.locator("#sumDone").click();
  await expect(page.locator("#summary")).toBeHidden();
  await expect(page.locator("#menuBtn")).toBeFocused();
});

test("backup bar save shows visible confirmation (U26)", async ({ page }) => {
  await page.clock.install({ time: new Date("2026-11-22T10:00:00Z") });
  await seed(page, {
    v: 5, cur: "fri", idx: 0, bodyweight: 165, bodyweightSet: false,
    state: { "fri:0": { load: 60, reps: 6, rir: 2, done: 1, topHits: 0, lastRir: 2, exId: "fri-smith-squat", sets: [{ load: 60, reps: 6, rir: 2 }] } },
    liftHistory: {}, sessionLog: [], lastBackup: "2026-11-01"
  });
  await expect(page.locator("#backupBar")).toBeVisible();
  await page.locator("#backupBarSave").click();
  await expect(page.locator("#backupBar")).toBeVisible();
  await expect(page.locator("#backupBarText")).toContainText("Backup downloaded ✓");
});

test("menu close falls back when opener is no longer focusable (U25)", async ({ page }) => {
  await page.goto(url);
  await page.locator("#menuBtn").click();
  await expect(page.locator("#modal")).toBeVisible();
  await page.evaluate(() => { document.getElementById("menuBtn").style.display = "none"; });
  await page.keyboard.press("Escape");
  await expect(page.locator("#modal")).toBeHidden();
  const inModal = await page.evaluate(() => { var ae = document.activeElement; return !!(ae && document.getElementById("modal").contains(ae)); });
  expect(inModal).toBe(false);
});

test("Plan today reports no changes on a no-op re-tap (U23)", async ({ page }) => {
  const mk = (load, reps, rir) => ({ date: "2026-11-01", load, reps, rir, sets: [{ load, reps, rir }, { load, reps, rir }, { load, reps, rir }] });
  await seed(page, {
    v: 5, cur: "fri", idx: 0, bodyweight: 165, bodyweightSet: false, state: {},
    liftHistory: {
      "fri:0": [mk(50, 8, 2), mk(50, 8, 2)], "fri:1": [mk(40, 8, 2), mk(40, 8, 2)],
      "fri:2": [mk(30, 8, 2), mk(30, 8, 2)], "fri:3": [mk(30, 10, 2), mk(30, 10, 2)],
      "fri:4": [mk(35, 8, 2), mk(35, 8, 2)], "fri:5": [mk(40, 12, 2), mk(40, 12, 2)],
      "fri:6": [mk(10, 10, 2), mk(10, 10, 2)], "fri:7": [mk(15, 12, 2), mk(15, 12, 2)]
    },
    sessionLog: []
  });
  await page.locator("#planBtn").click();
  await expect(page.locator("#daySummary")).toContainText("Planned · all keep");
  await page.locator("#planBtn").click();
  await expect(page.locator("#daySummary")).toContainText("Planned · no changes");
  await expect(page.locator("#daySummary")).not.toContainText("kept your loads");
});

test("merge-import parse failure preserves live edit state (U22)", async ({ page }) => {
  await seed(page, {
    v: 5, cur: "fri", idx: 0, bodyweight: 165, bodyweightSet: false,
    state: { "fri:0": { load: 60, reps: 6, rir: 2, done: 1, topHits: 0, lastRir: 2, exId: "fri-smith-squat",
      sets: [{ load: 77, reps: 8, rir: 1 }] } },
    liftHistory: {}, sessionLog: []
  });
  await page.locator(".liftrow").first().click();
  await page.locator('.setrow[data-set="0"]').click();
  await expect(page.locator("#doneBtn")).toHaveText("Done editing");
  await page.locator("#menuBtn").click();
  await page.locator("#importFile").setInputFiles({ name: "bad.json", mimeType: "application/json", buffer: Buffer.from("not json") });
  await expect(page.locator("#modalMsg")).toContainText("Import failed");
  await page.locator("#modalClose").click();
  await expect(page.locator("#doneBtn")).toHaveText("Done editing");
  await expect(page.locator("#setCount")).toContainText("Editing set");
});

test("swap chooser closes on Escape (U21)", async ({ page }) => {
  await page.goto(url);
  await page.locator(".liftrow").first().click();
  await page.locator("#swapBtn").click();
  await expect(page.locator("#swapChoices")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.locator("#swapChoices")).toBeHidden();
  await expect(page.locator("#swapBtn")).toHaveAttribute("aria-expanded", "false");
});

test("finishing the workout abandons a set edit (U20)", async ({ page }) => {
  await seed(page, {
    v: 5, cur: "fri", idx: 0, bodyweight: 165, bodyweightSet: false,
    state: {
      "fri:0": { load: 60, reps: 6, rir: 2, done: 3, topHits: 0, lastRir: 2, exId: "fri-smith-squat",
        sets: [{ load: 60, reps: 6, rir: 2 }, { load: 60, reps: 6, rir: 2 }, { load: 60, reps: 6, rir: 2 }] },
      "fri:1": { load: 50, reps: 6, rir: 2, done: 3, topHits: 0, lastRir: 2, exId: "fri-smith-incline",
        sets: [{ load: 50, reps: 6, rir: 2 }, { load: 50, reps: 6, rir: 2 }, { load: 50, reps: 6, rir: 2 }] },
      "fri:2": { load: 25, reps: 8, rir: 2, done: 3, topHits: 0, lastRir: 2, exId: "fri-bulgarian",
        sets: [{ load: 25, reps: 8, rir: 2 }, { load: 25, reps: 8, rir: 2 }, { load: 25, reps: 8, rir: 2 }] },
      "fri:3": { load: 35, reps: 10, rir: 2, done: 3, topHits: 0, lastRir: 2, exId: "fri-incline-db",
        sets: [{ load: 35, reps: 10, rir: 2 }, { load: 35, reps: 10, rir: 2 }, { load: 35, reps: 10, rir: 2 }] },
      "fri:4": { load: 45, reps: 8, rir: 2, done: 3, topHits: 0, lastRir: 2, exId: "fri-pec-deck",
        sets: [{ load: 45, reps: 8, rir: 2 }, { load: 45, reps: 8, rir: 2 }, { load: 45, reps: 8, rir: 2 }] },
      "fri:5": { load: 40, reps: 10, rir: 1, done: 3, topHits: 0, lastRir: 1, exId: "fri-leg-ext",
        sets: [{ load: 40, reps: 10, rir: 1 }, { load: 40, reps: 10, rir: 1 }, { load: 40, reps: 10, rir: 1 }] },
      "fri:6": { load: 10, reps: 10, rir: 1, done: 3, topHits: 0, lastRir: 1, exId: "fri-cable-lat",
        sets: [{ load: 10, reps: 10, rir: 1 }, { load: 10, reps: 10, rir: 1 }, { load: 10, reps: 10, rir: 1 }] },
      "fri:7": { load: 15, reps: 12, rir: 2, done: 2, topHits: 0, lastRir: 2, exId: "fri-weighted-dip",
        sets: [{ load: 15, reps: 12, rir: 2 }, { load: 15, reps: 12, rir: 2 }] }
    },
    liftHistory: {}, sessionLog: []
  });
  await page.locator(".liftrow").nth(7).click();
  await page.locator("#doneBtn").click(); // final set -> rest / last lift done
  await page.locator("#detailsBtn").click();
  await page.locator('.setrow[data-set="0"]').click();
  await expect(page.locator("#doneBtn")).toHaveText("Done editing");
  await page.locator("#skipRest").click();
  await page.locator("#skipRest").click(); // two-tap finish
  await expect(page.locator("#summary")).toBeVisible();
  await page.locator("#sumDone").click();
  await expect(page.locator("#setCount")).not.toContainText("Editing set");
  await expect(page.locator("#doneBtn")).not.toHaveText("Done editing");
});

test("merging a backup abandons a set edit before applying (U17)", async ({ page }) => {
  await seed(page, {
    v: 5, cur: "fri", idx: 0, bodyweight: 165, bodyweightSet: false,
    state: { "fri:0": { load: 60, reps: 6, rir: 2, done: 1, topHits: 0, lastRir: 2, exId: "fri-smith-squat",
      sets: [{ load: 77, reps: 8, rir: 1 }] } },
    liftHistory: {}, sessionLog: []
  });
  await page.locator(".liftrow").first().click();
  await page.locator('.setrow[data-set="0"]').click();
  await expect(page.locator("#doneBtn")).toHaveText("Done editing");
  const backup = JSON.stringify({
    v: 5, cur: "fri", idx: 0, bodyweight: 170, bodyweightSet: false,
    state: { "fri:0": { load: 30, reps: 4, rir: 3, done: 0, topHits: 0, lastRir: null, exId: "fri-smith-squat" } },
    liftHistory: {}, sessionLog: []
  });
  await page.locator("#menuBtn").click();
  await page.setInputFiles("#importFile", { name: "b.json", mimeType: "application/json", buffer: Buffer.from(backup) });
  await expect(page.locator("#modalMsg")).toContainText("Merged:");
  await page.locator("#modalClose").click();
  await page.locator(".liftrow").first().click();
  await expect(page.locator("#doneBtn")).not.toHaveText("Done editing");
});

test("menu hides out-of-contract calibration values (U19)", async ({ page }) => {
  await seed(page, {
    v: 5, cur: "fri", idx: 0, bodyweight: 165, bodyweightSet: false,
    state: {}, liftHistory: {}, sessionLog: []
  });
  await page.evaluate(() => localStorage.setItem("gym-calibration", JSON.stringify({ warmupSec: 100000, overheadSec: 500, sessions: 3, at: 1 })));
  await page.reload();
  await page.locator("#menuBtn").click();
  await expect(page.locator("#calibInfo")).not.toContainText("1667");
  await expect(page.locator("#calibInfo")).not.toContainText("500s");
  await expect(page.locator("#calibInfo")).toContainText("starter values");
});

test("backup export includes the fresh lastBackup it reports (U18)", async ({ page }) => {
  await page.clock.install({ time: new Date("2026-11-20T10:00:00") });
  await seed(page, {
    v: 5, cur: "fri", idx: 0, bodyweight: 165, bodyweightSet: false,
    lastBackup: "2026-11-01", state: {}, liftHistory: {}, sessionLog: []
  });
  await page.evaluate(() => {
    window.__copied = "";
    navigator.clipboard.writeText = async (t) => { window.__copied = t; };
  });
  await page.locator("#menuBtn").click();
  await page.locator("#exportCopy").click();
  await expect(page.locator("#modalMsg")).toContainText("Backup copied");
  await expect(page.locator("#modalFoot")).toContainText("backed up today");
  const exported = await page.evaluate(() => JSON.parse(window.__copied));
  expect(exported.lastBackup, "the exported file must match the backup status it reports").toBe("2026-11-20");
});

test("replacing the log abandons a set edit before loading the backup (U16)", async ({ page }) => {
  await seed(page, {
    v: 5, cur: "fri", idx: 0, bodyweight: 165, bodyweightSet: false,
    state: { "fri:0": { load: 60, reps: 6, rir: 2, done: 1, topHits: 0, lastRir: 2, exId: "fri-smith-squat",
      sets: [{ load: 77, reps: 8, rir: 1 }] } },
    liftHistory: {}, sessionLog: []
  });
  await page.locator(".liftrow").first().click();
  await page.locator('.setrow[data-set="0"]').click();
  await expect(page.locator("#doneBtn")).toHaveText("Done editing");
  const backup = JSON.stringify({
    v: 5, cur: "fri", idx: 0, bodyweight: 170, bodyweightSet: false,
    state: { "fri:0": { load: 30, reps: 4, rir: 3, done: 0, topHits: 0, lastRir: null, exId: "fri-smith-squat" } },
    liftHistory: {}, sessionLog: []
  });
  await page.locator("#menuBtn").click();
  await page.setInputFiles("#replaceFile", { name: "b.json", mimeType: "application/json", buffer: Buffer.from(backup) });
  await expect(page.locator("#modalMsg")).toContainText("Backup restored");
  await page.locator("#modalClose").click();
  await page.locator(".liftrow").first().click();

  const rec = await page.evaluate(() => JSON.parse(localStorage.getItem("gym-tool-v2")).state["fri:0"]);
  expect(rec.load, "the imported working load must survive opening the lift").toBe(30);
  expect(rec.reps).toBe(4);
  expect(rec.rir).toBe(3);
  await expect(page.locator("#doneBtn")).not.toHaveText("Done editing");
});

test("advancing to the next lift abandons a set edit (U15)", async ({ page }) => {
  await seed(page, {
    v: 5, cur: "fri", idx: 0, bodyweight: 165, bodyweightSet: false,
    state: {
      "fri:0": { load: 60, reps: 6, rir: 2, done: 2, topHits: 0, lastRir: 2, exId: "fri-smith-squat",
        sets: [{ load: 77, reps: 8, rir: 1 }, { load: 77, reps: 8, rir: 1 }] },
      "fri:1": { load: 50, reps: 6, rir: 2, done: 0, topHits: 0, lastRir: null, exId: "fri-smith-incline" }
    },
    liftHistory: {}, sessionLog: []
  });
  await page.locator(".liftrow").first().click();
  await page.locator("#doneBtn").click();
  await page.locator("#detailsBtn").click();
  await page.locator('.setrow[data-set="0"]').click();
  await expect(page.locator("#doneBtn")).toHaveText("Done editing");
  await page.locator("#skipRest").click();

  await expect(page.locator("#doneBtn"), "a new lift must not inherit the previous lift's edit").not.toHaveText("Done editing");
  await expect(page.locator("#setCount")).not.toContainText("Editing set");
  await page.locator("#doneBtn").click();
  const rec = await page.evaluate(() => JSON.parse(localStorage.getItem("gym-tool-v2")).state["fri:1"]);
  expect(rec.load, "the next lift keeps its own working load").toBe(50);
  expect(rec.reps).toBe(6);
});

test("undo abandons a set edit so Done editing stops lying (U14)", async ({ page }) => {
  await seed(page, {
    v: 5, cur: "fri", idx: 0, bodyweight: 165, bodyweightSet: false,
    state: { "fri:0": { load: 57.5, reps: 6, rir: 2, done: 3, topHits: 0, lastRir: 2, exId: "fri-smith-squat",
      sets: [{ load: 57.5, reps: 6, rir: 2 }, { load: 57.5, reps: 6, rir: 2 }, { load: 57.5, reps: 6, rir: 2 }] } },
    liftHistory: {}, sessionLog: []
  });
  await page.locator(".liftrow").first().click();
  await page.locator('.setrow[data-set="2"]').click();
  await expect(page.locator("#doneBtn")).toHaveText("Done editing");
  await page.locator("#undoSetBtn").click();
  await expect(page.locator("#doneBtn"), "undo removes the edited set, so edit mode must end").not.toHaveText("Done editing");
  await expect(page.locator("#setCount")).not.toContainText("Editing set");
});

test("clear all data does not resurrect an in-progress set edit (U12)", async ({ page }) => {
  await seed(page, {
    v: 5, cur: "fri", idx: 0, bodyweight: 165, bodyweightSet: false,
    state: { "fri:0": { load: 57.5, reps: 9, rir: 3, done: 3, topHits: 0, lastRir: 2, exId: "fri-smith-squat",
      sets: [{ load: 57.5, reps: 6, rir: 2 }, { load: 57.5, reps: 6, rir: 2 }, { load: 57.5, reps: 6, rir: 2 }] } },
    liftHistory: {}, sessionLog: []
  });
  await page.locator(".liftrow").first().click();
  await page.locator('.setrow[data-set="0"]').click();
  await expect(page.locator(".setrow.editing")).toBeVisible();
  await page.locator("#menuBtn").click();
  await page.locator("#clearAll").click();
  await page.locator("#clearAll").click();
  await page.locator("#modalClose").click();

  const rec = await page.evaluate(() => (JSON.parse(localStorage.getItem("gym-tool-v2")).state || {})["fri:0"]);
  expect(!rec || rec.load !== 57.5, "cleared log must not inherit the edited set's load").toBe(true);
  expect(!rec || rec.reps !== 9, "cleared log must not inherit the edited set's reps").toBe(true);
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
  await page.evaluate(() => {
    for (let i = 0; i < 3 && !document.getElementById("dayTitle").textContent.includes("Friday"); i++)
      document.getElementById("dayNext").click();
  });
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
  await page.locator(".swapchoice", { hasText: "Barbell back squat" }).click(); // N14: chooser
  await expect(page.locator("#exName")).toHaveText("Barbell back squat"); // Smith squat's first alternate
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
  await page.locator(".swapchoice", { hasText: "Barbell back squat" }).click();

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
  /* the suggestion is the ORIGINAL lift's next load — while swapped the alternate
     carries its own, so the nudge and its Apply button are hidden (B6-07). */
  await expect(page.locator("#suggestLine")).toBeHidden();
  await expect(page.locator("#applyLoad")).toBeHidden();
});

test("failed merge import preserves live rest and edit state (U28)", async ({ page }) => {
  await seed(page, {
    v: 5, cur: "fri", idx: 0, bodyweight: 165, bodyweightSet: false,
    state: { "fri:0": { load: 60, reps: 6, rir: 2, done: 1, topHits: 0, lastRir: 2, exId: "fri-smith-squat", sets: [{ load: 60, reps: 6, rir: 2 }] } },
    liftHistory: {}, sessionLog: []
  });
  await page.locator('[data-i="0"]').click();
  await page.locator("#doneBtn").click();
  await expect(page.locator("#app")).toHaveClass(/resting/);
  await page.locator("#detailsBtn").click();
  await page.locator(".setrow.done").first().click();
  await expect(page.locator("#doneBtn")).toHaveText("Done editing");
  await page.locator("#menuBtn").click();
  await page.setInputFiles("#importFile", { name: "bad.json", mimeType: "application/json", buffer: Buffer.from("{") });
  await expect(page.locator("#modalMsg")).toContainText("Import failed");
  await expect(page.locator("#app")).toHaveClass(/resting/);
  await page.locator("#modalClose").click();
  await expect(page.locator("#doneBtn")).toHaveText("Done editing");
  const done = await page.evaluate(() => JSON.parse(localStorage.getItem("gym-tool-v2")).state["fri:0"].done);
  expect(done).toBe(2);
});

test("rest prep hidden when browsing another day during active rest (U29)", async ({ page }) => {
  const now = Date.now();
  const date = await page.evaluate(() => { const d=new Date(); return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0"); });
  await seed(page, {
    v: 5, cur: "fri", idx: 0, bodyweight: 165, bodyweightSet: false,
    state: {
      "fri:0": { load: 100, reps: 6, rir: 2, done: 1, topHits: 0, lastRir: 2, exId: "fri-smith-squat", sets: [{ load: 100, reps: 6, rir: 2 }] }
    },
    liftHistory: {}, sessionLog: [],
    active: { id: "s1", date, day: "fri", startedAt: now - 600000, accSec: 600, runningSince: null, status: "active" }
  });
  await page.locator('[data-i="0"]').click();
  await page.locator("#doneBtn").click();
  await expect(page.locator("#app")).toHaveClass(/resting/);
  await page.locator("#detailsBtn").click();
  await page.locator("#backBtn").click();
  await page.locator('[data-day="sat"]').click();
  await page.locator("#detailsBtn").click();
  await expect(page.locator("#restPrep")).toBeHidden();
  const p = await page.evaluate(() => JSON.parse(localStorage.getItem("gym-tool-v2")));
  expect(p.state["fri:0"].load).toBe(100);
  expect(p.state["sat:0"]?.load ?? 90).toBe(90);
});

test("skip rest from day view keeps visible focus (U30)", async ({ page }) => {
  const now = Date.now();
  const date = await page.evaluate(() => { const d=new Date(); return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0"); });
  await seed(page, {
    v: 5, cur: "fri", idx: 0, bodyweight: 165, bodyweightSet: false,
    state: {
      "fri:0": { load: 100, reps: 6, rir: 2, done: 1, topHits: 0, lastRir: 2, exId: "fri-smith-squat", sets: [{ load: 100, reps: 6, rir: 2 }] }
    },
    liftHistory: {}, sessionLog: [],
    active: { id: "s1", date, day: "fri", startedAt: now - 600000, accSec: 600, runningSince: null, status: "active" }
  });
  await page.locator('[data-i="0"]').click();
  await page.locator("#doneBtn").click();
  await expect(page.locator("#app")).toHaveClass(/resting/);
  await page.locator("#detailsBtn").click();
  await page.locator("#backBtn").click();
  await page.locator('[data-day="sat"]').click();
  await page.locator("#skipRest").click();
  await expect(page.locator("#app")).not.toHaveClass(/resting/);
  const focus = await page.evaluate(() => {
    const el = document.activeElement;
    return { tag: el?.tagName, cls: el?.className || "", visible: !!(el && el.getClientRects().length) };
  });
  expect(focus.tag).toBe("LI");
  expect(focus.visible).toBe(true);
});

test("load/reps value can be keyboard-edited and focus restores (U31)", async ({ page }) => {
  const date = await page.evaluate(() => { const d=new Date(); return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0"); });
  await seed(page, { v:5, cur:"fri", idx:0, bodyweight:165, bodyweightSet:false,
    state:{ "fri:0":{ load:60, reps:8, rir:2, done:1, topHits:0, lastRir:2, exId:"fri-smith-squat", sets:[{load:60,reps:8,rir:2}] } },
    liftHistory:{}, sessionLog:[], active:{ id:"s1", date, day:"fri", startedAt:Date.now()-600000, accSec:600, runningSince:null, status:"active" } });
  await page.locator('[data-i="0"]').click();
  const mid = page.locator("#loadVal").locator("..");
  await expect(mid).toHaveAttribute("role","button");
  await mid.focus();
  await page.keyboard.press("Enter");
  const vin = page.locator(".vin");
  await expect(vin).toBeVisible();
  await vin.fill("65");
  await page.keyboard.press("Enter");
  await expect(page.locator("#loadVal")).toHaveText("65");
  await expect(mid).toBeFocused();
  const load = await page.evaluate(()=>JSON.parse(localStorage.getItem("gym-tool-v2")).state["fri:0"].load);
  expect(load).toBe(65);
});

test("notify toggle clears stale denied permission on init (U32)", async ({ page }) => {
  await page.addInitScript(() => {
    const Orig = window.Notification;
    function N(){};
    N.permission = "denied";
    N.requestPermission = () => Promise.resolve("denied");
    window.Notification = N;
    try { localStorage.setItem("gym-notify", "1"); } catch(e) {}
  });
  await page.goto(url);
  await page.locator("#menuBtn").click();
  await expect(page.locator("#notifyToggle")).toHaveText("Rest notifications: Off");
  const stored = await page.evaluate(()=>localStorage.getItem("gym-notify"));
  expect(stored).toBe("0");
});

test("finish arm clears on navigation and does not skip-finish (U33)", async ({ page }) => {
  const date = await page.evaluate(() => { const d=new Date(); return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0"); });
  const state = {};
  for (let i=0;i<8;i++) state["fri:"+i] = { load:60,reps:6,rir:2,done:i<7?3:2,topHits:0,lastRir:2,exId:["fri-smith-squat","fri-smith-incline","fri-bulgarian","fri-incline-db","fri-pec-deck","fri-leg-ext","fri-cable-lat","fri-weighted-dip"][i],sets:Array(i<7?3:2).fill({load:60,reps:6,rir:2}) };
  await seed(page, { v:5, cur:"fri", idx:7, bodyweight:165, bodyweightSet:false, state, liftHistory:{}, sessionLog:[],
    active:{ id:"s1", date, day:"fri", startedAt:Date.now()-600000, accSec:600, runningSince:null, status:"active" } });
  await page.locator('[data-i="7"]').click();
  await page.locator("#doneBtn").click();
  await expect(page.locator("#app")).toHaveClass(/resting/);
  await page.locator("#skipRest").click();
  await expect(page.locator("#skipRest")).toHaveText("Tap again to finish");
  await page.locator("#detailsBtn").click();
  await page.locator("#backBtn").click();
  await expect(page.locator("#skipRest")).toHaveText("End rest");
  await page.locator("#skipRest").click();
  await expect(page.locator("#summary")).toBeHidden();
  await expect(page.locator("#restMsg")).toContainText(/Skipped|Next set/);
  await expect(page.locator("#app")).not.toHaveClass(/resting/);
});

test("entering set edit moves focus to Done editing (U34)", async ({ page }) => {
  const date = await page.evaluate(() => { const d=new Date(); return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0"); });
  await seed(page, { v:5, cur:"fri", idx:0, bodyweight:165, bodyweightSet:false,
    state:{ "fri:0":{ load:60, reps:8, rir:2, done:2, topHits:0, lastRir:2, exId:"fri-smith-squat", sets:[{load:60,reps:8,rir:2},{load:60,reps:8,rir:2}] } },
    liftHistory:{}, sessionLog:[], active:{ id:"s1", date, day:"fri", startedAt:Date.now()-600000, accSec:600, runningSince:null, status:"active" } });
  await page.locator('[data-i="0"]').click();
  await page.locator('.setrow[data-set="0"]').focus();
  await page.keyboard.press("Enter");
  await expect(page.locator("#doneBtn")).toHaveText("Done editing");
  await expect(page.locator("#doneBtn")).toBeFocused();
});

test("finishEdit in rest peek restores focus to set row (U35)", async ({ page }) => {
  await page.goto(url);
  await page.locator('[data-i="0"]').click();
  await page.locator('#doneBtn').click();
  await expect(page.locator('#app')).toHaveClass(/resting/);
  await page.locator('#detailsBtn').click();
  await page.locator('.setrow[data-set="0"]').click();
  await expect(page.locator('#doneBtn')).toHaveText('Done editing');
  await page.locator('#doneBtn').click();
  await expect(page.locator('.setrow[data-set="0"]')).toBeFocused();
  await expect(page.locator('#app')).toHaveClass(/rest-quiet/);
});

test("undoSet restores focus to Done when undo control loses focus (U36)", async ({ page }) => {
  await page.goto(url);
  await page.locator('[data-i="0"]').click();
  await page.locator('#doneBtn').click();
  await page.locator('#skipRest').click();
  await page.locator('#undoSetBtn').focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('#doneBtn')).toBeFocused();
  await expect(page.locator('#undoSetBtn')).toBeDisabled();
});

test("Escape closes progress view and returns to day (U37)", async ({ page }) => {
  await page.goto(url);
  await page.locator("#progressBtn").click();
  await expect(page.locator("#progTitle")).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(page.locator("#app")).not.toHaveClass(/progress-mode/);
  await expect(page.locator("#dayView")).toBeVisible();
});

test("Escape closes progress even when swap chooser state is stale (U38)", async ({ page }) => {
  await page.goto(url);
  await page.locator(".liftrow").first().click();
  await page.locator("#swapBtn").click();
  await expect(page.locator("#swapChoices")).toBeVisible();
  await page.evaluate(() => document.getElementById("progressBtn").click());
  await expect(page.locator("#progTitle")).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(page.locator("#app")).not.toHaveClass(/progress-mode/);
  await expect(page.locator("#dayView")).toBeVisible();
});

test("stale swap state does not steal Escape/focus after progress closes (U39)", async ({ page }) => {
  await page.goto(url);
  await page.locator(".liftrow").first().click();
  await page.locator("#swapBtn").click();
  await expect(page.locator("#swapChoices")).toBeVisible();
  await page.evaluate(() => document.getElementById("progressBtn").click());
  await expect(page.locator("#progTitle")).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(page.locator("#dayView")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.locator("#dayView")).toBeVisible();
  await expect(page.locator("#app")).not.toHaveClass(/progress-mode/);
  const active = await page.evaluate(() => document.activeElement?.id || document.activeElement?.tagName || "");
  expect(active).not.toBe("BODY");
});

test("pause rest button exposes matching state without stale aria-label (U40)", async ({ page }) => {
  await page.goto(url);
  await page.locator('[data-i="0"]').click();
  await page.locator('#doneBtn').click();
  await expect(page.locator('#app')).toHaveClass(/resting/);
  await expect(page.locator('#pauseRest')).toHaveText('Pause');
  await expect(page.locator('#pauseRest')).not.toHaveAttribute('aria-label', /.+/);
  await page.locator('#pauseRest').click();
  await expect(page.locator('#pauseRest')).toHaveText('Resume');
  await expect(page.locator('#pauseRest')).not.toHaveAttribute('aria-label', /.+/);
  await page.locator('#pauseRest').click();
  await expect(page.locator('#pauseRest')).toHaveText('Pause');
});

test("Escape on day view ignores stale swap state (U41)", async ({ page }) => {
  await page.goto(url);
  await page.locator('.liftrow').first().click();
  await page.locator('#swapBtn').click();
  await expect(page.locator('#swapChoices')).toBeVisible();
  await page.locator('#backBtn').click();
  await expect(page.locator('#dayView')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('#dayView')).toBeVisible();
  const active = await page.evaluate(() => document.activeElement?.id || document.activeElement?.tagName || "");
  expect(active).not.toBe('BODY');
});

test("hiding rest peek while editing finishes edit and keeps focus on details (U42)", async ({ page }) => {
  await page.goto(url);
  await page.locator('[data-i="0"]').click();
  await page.locator('#doneBtn').click();
  await expect(page.locator('#app')).toHaveClass(/resting/);
  await page.locator('#detailsBtn').click();
  await page.locator('.setrow[data-set="0"]').click();
  await expect(page.locator('#doneBtn')).toHaveText('Done editing');
  await page.locator('#detailsBtn').click();
  await expect(page.locator('#detailsBtn')).toBeFocused();
  await expect(page.locator('#app')).not.toHaveClass(/show-details/);
  await expect(page.locator('#doneBtn')).toHaveText(/Set Done|GO/);
});

test("Escape closes rest workout peek (U43)", async ({ page }) => {
  await page.goto(url);
  await page.locator('[data-i="0"]').click();
  await page.locator('#doneBtn').click();
  await expect(page.locator('#app')).toHaveClass(/resting/);
  await page.locator('#detailsBtn').click();
  await expect(page.locator('#app')).toHaveClass(/show-details/);
  await expect(page.locator('#detailsBtn')).toHaveAttribute('aria-expanded', 'true');
  await page.keyboard.press('Escape');
  await expect(page.locator('#app')).not.toHaveClass(/show-details/);
  await expect(page.locator('#detailsBtn')).toBeFocused();
  await expect(page.locator('#detailsBtn')).toHaveAttribute('aria-expanded', 'false');
});

test("notify init tolerates undefined Notification object (U44)", async ({ page }) => {
  await page.addInitScript(() => { try { localStorage.setItem("gym-notify","1"); Object.defineProperty(window,"Notification",{value:undefined,configurable:true,writable:true}); } catch (e) {} });
  const errs=[]; page.on("pageerror",e=>errs.push(String(e)));
  await page.goto(url);
  await page.locator("#menuBtn").click();
  await expect(page.locator("#notifyToggle")).toHaveText(/Rest notifications: (On|Off)/);
  expect(errs.join("\n")).not.toContain("permission");
});

test("load/reps direct-edit mid has 44px tap height (U45)", async ({ page }) => {
  await page.goto(url);
  await page.locator('.liftrow[data-i="0"]').click();
  const box = await page.locator('#loadVal').locator('..').boundingBox();
  expect(box.height).toBeGreaterThanOrEqual(44);
});

test("ending rest while editing in peek keeps focus on edit (U46)", async ({ page }) => {
  const date = await page.evaluate(() => { const d=new Date(); return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0"); });
  await seed(page, { v:5, cur:"fri", idx:0, bodyweight:165, bodyweightSet:false,
    state:{ "fri:0":{ load:100, reps:6, rir:2, done:1, topHits:0, lastRir:2, exId:"fri-smith-squat", sets:[{load:100,reps:6,rir:2,t:Date.now()}] } },
    liftHistory:{}, sessionLog:[], active:{ id:"s1", date, day:"fri", startedAt:Date.now()-600000, accSec:600, runningSince:null, status:"active" } });
  await page.locator('[data-i="0"]').click();
  await page.locator('#doneBtn').click();
  await expect(page.locator('#app')).toHaveClass(/resting/);
  await page.locator('#detailsBtn').click();
  await page.locator('.setrow[data-set="0"]').click();
  await expect(page.locator('#doneBtn')).toHaveText('Done editing');
  await page.locator('#skipRest').click();
  await expect(page.locator('#app')).not.toHaveClass(/resting/);
  await expect(page.locator('#doneBtn')).toBeFocused();
  await expect(page.locator('#doneBtn')).toHaveText('Done editing');
});

test("unsupported Notification clears stale opt-in (U47)", async ({ page }) => {
  await page.addInitScript(() => { try { localStorage.setItem("gym-notify","1"); delete window.Notification; } catch (e) {} });
  await page.goto(url);
  await page.locator("#menuBtn").click();
  await expect(page.locator("#notifyToggle")).toHaveText("Rest notifications: Off");
  const stored = await page.evaluate(() => localStorage.getItem("gym-notify"));
  expect(stored).toBe("0");
});

test("salvaged keep reports save failure and preserves download (U48)", async ({ page }) => {
  await page.goto(url);
  await page.evaluate(()=>{localStorage.clear(); localStorage.setItem('gym-tool-v2','{"v":5,"liftHistory":{"sun:0":[{"date":"2026-11-20","sets":[{"load":100,"reps":8,"rir":2}],"load":100,"reps":8,"setsDone":1}], "BAD" ');});
  await page.reload();
  await expect(page.locator('#saveBar')).toBeVisible();
  await page.evaluate(()=>{ Gym.save=()=>false; });
  await page.locator('#saveBarAction').click();
  await expect(page.locator('#modalMsg')).toHaveText(/Couldn't save/);
  await expect(page.locator('#saveBarAction')).toHaveText('Export');
  await expect(page.locator('#saveBarDownload')).toBeVisible();
});

test("salvage copy never claims nothing is saved after implicit persist (U50)", async ({ page }) => {
  await page.goto(url);
  await page.evaluate(() => {
    const day = Gym.todayDay(), date = Gym.dateKey();
    const good = { date, load: 77, reps: 6, rir: 2, hitTop: true, setsDone: 3,
      sets: [{ load: 77, reps: 6, rir: 2 }, { load: 77, reps: 6, rir: 2 }, { load: 77, reps: 6, rir: 2 }] };
    localStorage.setItem("gym-tool-v2", '{"v":4,"cur":"' + day + '","idx":0,"state":{},"sessionLog":[],"bodyweight":165,' +
      '"liftHistory":{"' + day + ':0":[' + JSON.stringify(good) + ',{"date":"2026-11-08","load":80');
  });
  await page.reload();
  await expect(page.locator("#saveBarText")).toContainText("1 log entry recovered");
  await expect(page.locator("#saveBarText")).not.toContainText("Nothing is saved yet");
  await page.locator(".liftrow").first().click(); // implicit commit persists the recovered log
  await expect(page.locator("#saveBarText")).not.toContainText("Nothing is saved yet");
});

test("menu action feedback is visible on screen (U51)", async ({ page }) => {
  await page.goto(url);
  await page.locator("#menuBtn").click();
  await page.locator("#exportCsv").click();
  await expect(page.locator("#modalMsg")).toHaveText(/CSV exported/);
  const visible = await page.evaluate(() => {
    const m = document.getElementById("modalMsg").getBoundingClientRect();
    const c = document.querySelector(".modal-card").getBoundingClientRect();
    return m.top >= c.top && m.bottom <= c.bottom;
  });
  expect(visible).toBe(true);
});

test("destructive menu actions report save failure truthfully (U52)", async ({ page }) => {
  await page.goto(url);
  await page.evaluate(() => {
    const d = new Date();
    const day = d.getDay() === 6 ? "sat" : (d.getDay() === 0 ? "sun" : "fri");
    const date = d.getFullYear() + "-" + String(d.getMonth()+1).padStart(2,"0") + "-" + String(d.getDate()).padStart(2,"0");
    const p = { v:5, cur:day, idx:0, bodyweight:165, bodyweightSet:false,
      state:{ [day+":0"]:{ load:100, reps:6, rir:2, done:1, topHits:0, lastRir:2, sets:[{load:100,reps:6,rir:2,t:Date.now()}] } },
      liftHistory:{}, sessionLog:[], active:{ id:"s1", date, day, startedAt:null, accSec:0, runningSince:null, status:"active" } };
    localStorage.setItem("gym-tool-v2", JSON.stringify(p));
    const snap = JSON.parse(JSON.stringify(p));
    snap.state[day+":0"].load = 99;
    localStorage.setItem("gym-tool-v2-snapshot", JSON.stringify({ at:Date.now(), label:"test", payload:snap }));
  });
  await page.addInitScript(() => {
    const orig = Storage.prototype.setItem;
    Storage.prototype.setItem = function (k, v) { if (String(k) === "gym-tool-v2") throw new Error("QuotaExceededError"); return orig.call(this, k, v); };
  });
  await page.reload();

  await page.locator("#menuBtn").click();
  await page.locator("#resetDay").click();
  await page.locator("#resetDay").click();
  await expect(page.locator("#modalMsg")).toContainText("NOT saved");

  await page.locator("#clearAll").click();
  await page.locator("#clearAll").click();
  await expect(page.locator("#modalMsg")).toContainText("NOT saved");

  await page.locator("#restoreSnapshot").click();
  await expect(page.locator("#modalMsg")).toContainText("NOT saved");
});

test("keeping recovered log confirms visibly and keeps focus (U53)", async ({ page }) => {
  await page.goto(url);
  await page.evaluate(() => {
    const day = Gym.todayDay(), date = Gym.dateKey();
    const good = { date, load: 77, reps: 6, rir: 2, hitTop: true, setsDone: 3,
      sets: [{ load: 77, reps: 6, rir: 2 }, { load: 77, reps: 6, rir: 2 }, { load: 77, reps: 6, rir: 2 }] };
    localStorage.setItem("gym-tool-v2", '{"v":4,"cur":"' + day + '","idx":0,"state":{},"sessionLog":[],"bodyweight":165,' +
      '"liftHistory":{"' + day + ':0":[' + JSON.stringify(good) + ',{"date":"2026-11-08","load":80');
  });
  await page.reload();
  await page.locator("#saveBarAction").focus();
  await page.keyboard.press("Enter");
  await expect(page.locator("#saveBar")).toBeVisible();
  await expect(page.locator("#saveBarText")).toHaveText("Recovered log kept ✓");
  const active = await page.evaluate(() => document.activeElement && document.activeElement.id);
  expect(active).toBe("menuBtn");
});

test("salvage keep confirms visibly during rest and keeps focus (U56)", async ({ page }) => {
  await page.goto(url);
  await page.evaluate(() => {
    const day = Gym.todayDay(), date = Gym.dateKey();
    const good = { date, load: 77, reps: 6, rir: 2, hitTop: true, setsDone: 3,
      sets: [{ load: 77, reps: 6, rir: 2 }, { load: 77, reps: 6, rir: 2 }, { load: 77, reps: 6, rir: 2 }] };
    localStorage.setItem("gym-tool-v2", '{"v":4,"cur":"' + day + '","idx":0,"state":{},"sessionLog":[],"bodyweight":165,' +
      '"liftHistory":{"' + day + ':0":[' + JSON.stringify(good) + ',{"date":"2026-11-08","load":80');
  });
  await page.reload();
  await page.locator('[data-i="0"]').click();
  await page.locator('#doneBtn').click();
  await expect(page.locator('#app')).toHaveClass(/resting/);
  await page.locator('#saveBarAction').click();
  await expect(page.locator("#saveBarText")).toHaveText("Recovered log kept ✓");
  const active = await page.evaluate(() => document.activeElement && document.activeElement.id);
  expect(active).toBe("skipRest");
});

test("restart confirm disarms on lift navigation (U54)", async ({ page }) => {
  const date = await page.evaluate(() => { const d=new Date(); return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0"); });
  const set = () => ({ load:100, reps:6, rir:2, t:Date.now() });
  await seed(page, { v:5, cur:"fri", idx:0, bodyweight:165, bodyweightSet:false,
    state:{ "fri:0":{ load:100, reps:6, rir:2, done:1, topHits:0, lastRir:2, exId:"fri-smith-squat", sets:[set()] },
            "fri:1":{ load:100, reps:6, rir:2, done:1, topHits:0, lastRir:2, exId:"fri-smith-incline", sets:[set()] } },
    liftHistory:{}, sessionLog:[], active:{ id:"s1", date, day:"fri", startedAt:null, accSec:0, runningSince:null, status:"active" } });
  await page.locator('[data-i="0"]').click();
  await page.locator('#resetLiftBtn').click();
  await expect(page.locator('#resetLiftBtn')).toHaveText('Tap again to restart');
  await page.locator('#nextLift').click();
  expect(await page.locator('#resetLiftBtn').textContent()).toBe('↺ Restart');
  await page.locator('#resetLiftBtn').click();
  const done = await page.evaluate(() => JSON.parse(localStorage.getItem("gym-tool-v2")).state["fri:1"].done);
  expect(done).toBe(1);
});

test("menu two-tap confirm disarms on modal close (U55)", async ({ page }) => {
  await page.goto(url);
  await page.locator('#menuBtn').click();
  await page.locator('#resetDay').click();
  await expect(page.locator('#resetDay')).toHaveText('Tap again to reset day');
  await page.locator('#modalClose').click();
  await page.locator('#menuBtn').click();
  expect(await page.locator('#resetDay').textContent()).toBe('Reset day');
});

test("rest GO moves focus from hidden prep to skipRest (U57)", async ({ page }) => {
  await page.goto(url);
  const { day, date } = await page.evaluate(() => ({ day: Gym.todayDay(), date: Gym.dateKey() }));
  const ex = await page.evaluate((d) => Gym.DAYS[d].ex[0], day);
  await page.evaluate(({ day, date, ex }) => {
    localStorage.clear();
    localStorage.setItem("gym-tool-v2", JSON.stringify({
      v:5, cur:day, idx:0, bodyweight:165,
      state:{ [day+":0"]:{ done:ex.s-1, load:ex.load||0, reps:ex.r, rir:ex.rir, sets:[] } },
      liftHistory:{}, sessionLog:[],
      active:{ id:"ses_nav", date, day, startedAt:Date.now()-600000, endedAt:null, accSec:600, runningSince:Date.now(), status:"active" }
    }));
  }, { day, date, ex });
  await page.reload();
  await page.locator('[data-i="0"]').click();
  await page.locator('#doneBtn').click();
  await expect(page.locator('#app')).toHaveClass(/resting/);
  await page.locator('#restLoadUp').focus();
  await expect(page.locator('#restLoadUp')).toBeFocused();
  await page.clock.runFor(180000);
  await expect(page.locator('#timerBar')).toHaveClass(/go/);
  await expect(page.locator('#restPrep')).toBeHidden();
  const active = await page.evaluate(() => document.activeElement && document.activeElement.id);
  expect(active).toBe("skipRest");
});

test("deload toggle keeps focus on the visible control (U58)", async ({ page }) => {
  await page.goto(url);
  await page.locator('#menuBtn').click();
  await page.locator('#deloadStart').focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('#deloadEnd')).toBeVisible();
  const afterStart = await page.evaluate(() => document.activeElement && document.activeElement.id);
  expect(afterStart).toBe('deloadEnd');
  await page.locator('#deloadEnd').focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('#deloadStart')).toBeVisible();
  const afterEnd = await page.evaluate(() => document.activeElement && document.activeElement.id);
  expect(afterEnd).toBe('deloadStart');
});

test("inline value editor Tab advances focus (U59)", async ({ page }) => {
  await page.goto(url);
  await page.locator('[data-i="0"]').click();
  await page.locator('#loadVal').locator('..').focus();
  await page.keyboard.press('Enter');
  await page.locator('.vin').fill('95');
  await page.keyboard.press('Tab');
  const active = await page.evaluate(() => document.activeElement && document.activeElement.id);
  expect(active).toBe('loadUp');
  const load = await page.evaluate(() => JSON.parse(localStorage.getItem("gym-tool-v2")).state["fri:0"].load);
  expect(load).toBe(95);
});

test("GO moves focus off the rest clock to the action (U60)", async ({ page }) => {
  await page.goto(url);
  const { day, date } = await page.evaluate(() => ({ day: Gym.todayDay(), date: Gym.dateKey() }));
  const ex = await page.evaluate((d) => Gym.DAYS[d].ex[0], day);
  await page.evaluate(({ day, date, ex }) => {
    localStorage.clear();
    localStorage.setItem("gym-tool-v2", JSON.stringify({
      v:5, cur:day, idx:0, bodyweight:165,
      state:{ [day+":0"]:{ done:ex.s-1, load:ex.load||0, reps:ex.r, rir:ex.rir, sets:[] } },
      liftHistory:{}, sessionLog:[],
      active:{ id:"ses_nav", date, day, startedAt:Date.now()-600000, endedAt:null, accSec:600, runningSince:Date.now(), status:"active" }
    }));
  }, { day, date, ex });
  await page.reload();
  await page.locator('[data-i="0"]').click();
  await page.locator('#doneBtn').click();
  await expect(page.locator('#app')).toHaveClass(/resting/);
  await expect(page.locator('#restTime')).toBeFocused();
  await page.clock.runFor(185000);
  await expect(page.locator('#timerBar')).toHaveClass(/go/);
  const active = await page.evaluate(() => document.activeElement && document.activeElement.id);
  expect(active).toBe("skipRest");
});

test("backup dismiss moves focus to a visible control (U61)", async ({ page }) => {
  await seed(page, { v:2, cur:"fri", idx:0, state:{},
    liftHistory:{ "fri:0":[{ date:"2026-11-01", load:50, reps:6, rir:2, hitTop:true, setsDone:3 }] } });
  await expect(page.locator('#backupBar')).toBeVisible();
  await page.locator('#backupBarDismiss').focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('#backupBar')).toBeHidden();
  const active = await page.evaluate(() => document.activeElement && document.activeElement.id);
  expect(active).toBe('menuBtn');
});

test("GO moves focus off the hidden Pause button (U62)", async ({ page }) => {
  await page.goto(url);
  const { day, date } = await page.evaluate(() => ({ day: Gym.todayDay(), date: Gym.dateKey() }));
  const ex = await page.evaluate((d) => Gym.DAYS[d].ex[0], day);
  await page.evaluate(({ day, date, ex }) => {
    localStorage.clear();
    localStorage.setItem("gym-tool-v2", JSON.stringify({
      v:5, cur:day, idx:0, bodyweight:165,
      state:{ [day+":0"]:{ done:ex.s-1, load:ex.load||0, reps:ex.r, rir:ex.rir, sets:[] } },
      liftHistory:{}, sessionLog:[],
      active:{ id:"ses_nav", date, day, startedAt:Date.now()-600000, endedAt:null, accSec:600, runningSince:Date.now(), status:"active" }
    }));
  }, { day, date, ex });
  await page.reload();
  await page.locator('[data-i="0"]').click();
  await page.locator('#doneBtn').click();
  await expect(page.locator('#app')).toHaveClass(/resting/);
  await page.locator('#pauseRest').focus();
  await page.clock.runFor(185000);
  await expect(page.locator('#timerBar')).toHaveClass(/go/);
  const active = await page.evaluate(() => document.activeElement && document.activeElement.id);
  expect(active).toBe("skipRest");
});

test("notify toggle clears stale opt-in when permission resets to default (U63)", async ({ page }) => {
  await page.addInitScript(() => {
    try {
      localStorage.setItem("gym-notify", "1");
      Object.defineProperty(window, "Notification", { value: { permission: "default", requestPermission: function () { return Promise.resolve("default"); } }, configurable: true, writable: true });
    } catch (e) {}
  });
  await page.goto(url);
  await page.locator("#menuBtn").click();
  await expect(page.locator("#notifyToggle")).toHaveText("Rest notifications: Off");
  expect(await page.evaluate(() => localStorage.getItem("gym-notify"))).toBe("0");
});

test("two-tap re-arm gets a fresh confirm window (U64)", async ({ page }) => {
  await page.goto(url);
  await page.locator("#menuBtn").click();
  await page.locator("#resetDay").click();
  await page.clock.runFor(1000);
  await page.locator("#clearAll").click();
  await page.clock.runFor(100);
  await page.locator("#resetDay").click();
  await expect(page.locator("#resetDay")).toHaveText("Tap again to reset day");
  await page.clock.runFor(1700); // past the FIRST arm's timer, inside the re-arm window
  await expect(page.locator("#resetDay")).toHaveText("Tap again to reset day");
});

test("finished workout pill starts a fresh session, not a resumed one (U65)", async ({ page }) => {
  await page.goto(url);
  const { day, date } = await page.evaluate(() => ({ day: Gym.todayDay(), date: Gym.dateKey() }));
  await page.evaluate(({ day, date }) => {
    const state = {};
    Gym.DAYS[day].ex.forEach((e, i) => {
      state[day + ":" + i] = { done: e.s, load: e.load || 0, reps: e.r, rir: e.rir, sets: [0, 1, 2].map(() => ({ load: 100, reps: 6, rir: 2 })) };
    });
    localStorage.setItem("gym-tool-v2", JSON.stringify({
      v: 5, cur: day, idx: 0, bodyweight: 165, state, sessionLog: [], liftHistory: {},
      active: { id: "ses_sum", date, day, startedAt: Date.now() - 600000, endedAt: null, accSec: 600, runningSince: null, status: "active" }
    }));
  }, { day, date });
  await page.reload();
  await page.locator('#sessBtn').click();
  await page.locator('#finishBtn').click();
  await expect(page.locator('#summary')).toBeVisible();
  await page.locator('#sumDone').click();
  await expect(page.locator('#sessBtn')).toHaveAttribute('aria-label', 'Start workout timer');
  await page.locator('#sessBtn').click();
  const st = await page.evaluate(() => {
    const p = JSON.parse(localStorage.getItem("gym-tool-v2"));
    return { accSec: p.active.accSec, status: p.active.status, logged: p.sessionLog.length };
  });
  expect(st.accSec).toBeLessThan(10);
  expect(st.logged).toBe(1);
});

test("notify default permission does not claim denied (U66)", async ({ page }) => {
  await page.addInitScript(() => {
    try {
      Object.defineProperty(window, "Notification", { value: { permission: "default", requestPermission: function () { return Promise.resolve("default"); } }, configurable: true, writable: true });
    } catch (e) {}
  });
  await page.goto(url);
  await page.locator("#menuBtn").click();
  await page.locator("#notifyToggle").click();
  await expect(page.locator("#modalMsg")).toHaveText("Not enabled — change in Settings");
});

test("trend toggle exposes pressed state (U67)", async ({ page }) => {
  await page.goto(url);
  const date = await page.evaluate(() => Gym.dateKey());
  await page.evaluate((date) => {
    const day = Gym.todayDay();
    const hist = ["2026-10-01", "2026-11-01"].map((d, i) => ({ date: d, load: 100 + i * 5, reps: 6, rir: 2, hitTop: true, setsDone: 3, sets: [{ load: 100 + i * 5, reps: 6, rir: 2 }] }));
    localStorage.setItem("gym-tool-v2", JSON.stringify({ v:5, cur:day, idx:0, bodyweight:165, state:{}, liftHistory:{ [day+":0"]:hist }, sessionLog:[], active:{ id:"s", date, day, startedAt:null, endedAt:null, accSec:0, runningSince:null, status:"active" } }));
  }, date);
  await page.reload();
  await page.locator('[data-i="0"]').click();
  await expect(page.locator("#trendToggle")).toBeVisible();
  await expect(page.locator("#trendToggle")).toHaveAttribute('aria-pressed', 'false');
  await page.locator("#trendToggle").click();
  await expect(page.locator("#trendToggle")).toHaveAttribute('aria-pressed', 'true');
  await page.locator("#trendToggle").click();
  await expect(page.locator("#trendToggle")).toHaveAttribute('aria-pressed', 'false');
  expect(await page.locator("#trendToggle").getAttribute('aria-label')).toBeNull();
});

test("share cancel clears stale export feedback (U68)", async ({ page }) => {
  await page.goto(url);
  await page.evaluate(() => {
    Object.defineProperty(navigator, "share", { value: function () { return Promise.reject(new Error("cancel")); }, configurable: true });
  });
  await page.locator("#menuBtn").click();
  await page.locator("#exportCsv").click();
  await expect(page.locator("#modalMsg")).toHaveText(/CSV exported/);
  await page.locator("#shareSummary").click();
  await expect(page.locator("#modalMsg")).toHaveText(/cancel/i);
});

test("failed import keeps the pre-merge undo snapshot (U69)", async ({ page }) => {
  await page.goto(url);
  await page.evaluate(() => {
    localStorage.clear();
    localStorage.setItem("gym-tool-v2", JSON.stringify({ v:5, cur:"fri", idx:0, bodyweight:165,
      state:{ "fri:0":{ load:111, reps:6, rir:2, done:0, topHits:0, lastRir:null } }, liftHistory:{}, sessionLog:[] }));
  });
  await page.reload();
  const backup = JSON.stringify({ v:5, cur:"fri", idx:0, bodyweight:165,
    state:{ "fri:0":{ load:222, reps:6, rir:2, done:0, topHits:0, lastRir:null } },
    liftHistory:{ "fri:0":[{ date:"2026-11-01", load:222, reps:6, rir:2, hitTop:true, setsDone:3 }] }, sessionLog:[] });
  await page.locator("#menuBtn").click();
  await page.setInputFiles("#importFile", { name:"good.json", mimeType:"application/json", buffer:Buffer.from(backup) });
  await expect(page.locator("#modalMsg")).toContainText("Merged:");
  const before = await page.evaluate(() => JSON.parse(localStorage.getItem("gym-tool-v2-snapshot")).payload.state["fri:0"].load);
  expect(before).toBe(111);
  await page.setInputFiles("#importFile", { name:"bad.json", mimeType:"application/json", buffer:Buffer.from("not json") });
  await expect(page.locator("#modalMsg")).toContainText("Import failed");
  const after = await page.evaluate(() => JSON.parse(localStorage.getItem("gym-tool-v2-snapshot")).payload.state["fri:0"].load);
  expect(after).toBe(111);
  await page.setInputFiles("#replaceFile", { name:"bad.json", mimeType:"application/json", buffer:Buffer.from("not json") });
  await expect(page.locator("#modalMsg")).toContainText("Restore failed");
  const afterRestore = await page.evaluate(() => JSON.parse(localStorage.getItem("gym-tool-v2-snapshot")).payload.state["fri:0"].load);
  expect(afterRestore).toBe(111);
});

test("destructive undo snapshot ignores abandoned set edit (U70)", async ({ page }) => {
  const date = await page.evaluate(() => { const d=new Date(); return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0"); });
  await page.goto(url);
  await page.evaluate((date) => {
    localStorage.clear();
    localStorage.setItem("gym-tool-v2", JSON.stringify({ v:5, cur:"fri", idx:0, bodyweight:165,
      state:{ "fri:0":{ load:100, reps:6, rir:2, done:1, topHits:0, lastRir:2, exId:"fri-smith-squat", sets:[{load:100,reps:6,rir:2,t:Date.now()}] } },
      liftHistory:{}, sessionLog:[], active:{ id:"s", date, day:"fri", startedAt:null, endedAt:null, accSec:0, runningSince:null, status:"active" } }));
  }, date);
  await page.reload();
  await page.locator('[data-i="0"]').click();
  await page.locator('#loadVal').locator('..').click();
  await page.locator('.vin').fill('120');
  await page.keyboard.press('Enter');
  await expect(page.locator('#loadVal')).toHaveText('120');
  await page.locator('.setrow[data-set="0"]').click();
  await page.locator('#menuBtn').click();
  await page.locator('#resetDay').click();
  await page.locator('#resetDay').click();
  const snapLoad = await page.evaluate(() => JSON.parse(localStorage.getItem("gym-tool-v2-snapshot")).payload.state["fri:0"].load);
  expect(snapLoad).toBe(120);
});

test("notify toggle refreshes when returning to the tab (U71)", async ({ page }) => {
  await page.addInitScript(() => {
    try {
      localStorage.setItem("gym-notify", "1");
      Object.defineProperty(window, "Notification", { value: { permission: "granted", requestPermission: function () { return Promise.resolve("granted"); } }, configurable: true, writable: true });
    } catch (e) {}
  });
  await page.goto(url);
  await page.locator("#menuBtn").click();
  await expect(page.locator("#notifyToggle")).toHaveText("Rest notifications: On");
  await page.evaluate(() => {
    window.Notification.permission = "denied";
    Object.defineProperty(document, "visibilityState", { value: "visible", configurable: true });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await expect(page.locator("#notifyToggle")).toHaveText("Rest notifications: Off");
  expect(await page.evaluate(() => localStorage.getItem("gym-notify"))).toBe("0");
});

test("rest undo stays available from the day view (U72)", async ({ page }) => {
  const date = await page.evaluate(() => { const d=new Date(); return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0"); });
  await page.goto(url);
  await page.evaluate((date) => {
    localStorage.clear();
    localStorage.setItem("gym-tool-v2", JSON.stringify({ v:5, cur:"fri", idx:0, bodyweight:165,
      state:{ "fri:0":{ load:100, reps:6, rir:2, done:1, topHits:0, lastRir:2, exId:"fri-smith-squat", sets:[{load:100,reps:6,rir:2,t:Date.now()}] } },
      liftHistory:{}, sessionLog:[], active:{ id:"s", date, day:"fri", startedAt:Date.now()-600000, accSec:600, runningSince:Date.now(), status:"active" } }));
  }, date);
  await page.reload();
  await page.locator('[data-i="0"]').click();
  await page.locator('#doneBtn').click();
  await expect(page.locator('#app')).toHaveClass(/resting/);
  await page.locator('#detailsBtn').click();
  await page.locator('#backBtn').click();
  await page.keyboard.press('Escape');
  await expect(page.locator('#app')).not.toHaveClass(/show-details/);
  await expect(page.locator('#undoBtn')).toBeVisible();
  const before = await page.evaluate(() => JSON.parse(localStorage.getItem("gym-tool-v2")).state["fri:0"].done);
  await page.locator('#undoBtn').focus();
  await page.keyboard.press('Enter');
  const done = await page.evaluate(() => JSON.parse(localStorage.getItem("gym-tool-v2")).state["fri:0"].done);
  expect(done).toBe(before - 1);
  const active = await page.evaluate(() => document.activeElement && (document.activeElement.id || document.activeElement.tagName));
  expect(active).not.toBe("BODY");
});

test("merge message pluralizes a single new session (U73)", async ({ page }) => {
  await page.goto(url);
  const backup = JSON.stringify({
    v: 5, cur: "fri", idx: 0, bodyweight: 165,
    state: { "fri:0": { done: 0, load: 77, reps: 6, rir: 2 } },
    liftHistory: { "fri:0": [{ date: "2026-11-01", load: 77, reps: 6, rir: 2, hitTop: true, setsDone: 3 }] }
  });
  await page.locator("#menuBtn").click();
  await page.setInputFiles("#importFile", { name: "b.json", mimeType: "application/json", buffer: Buffer.from(backup) });
  await expect(page.locator("#modalMsg")).toContainText("+1 new session,");
  await expect(page.locator("#modalMsg")).not.toContainText("+1 new sessions");
});

test("salvage count singularizes one entry (U74)", async ({ page }) => {
  await page.goto(url);
  const day = await page.evaluate(() => Gym.todayDay());
  const good = { date: "2026-11-20", load: 77, reps: 6, rir: 2, setsDone: 3,
    sets: [{ load: 77, reps: 6, rir: 2 }, { load: 77, reps: 6, rir: 2 }, { load: 77, reps: 6, rir: 2 }] };
  await page.evaluate(({ day, good }) => {
    localStorage.setItem("gym-tool-v2", '{"v":4,"cur":"' + day + '","idx":0,"state":{},"sessionLog":[],"bodyweight":165,' +
      '"liftHistory":{"' + day + ':0":[' + JSON.stringify(good) + ',{"date":"2026-11-08","load":80');
  }, { day, good });
  await page.reload();
  await expect(page.locator("#saveBarText")).toContainText("1 log entry recovered");
  await expect(page.locator("#saveBarText")).not.toContainText("1 log entries");
});

test("workout and set counts singularize in footer and share (U75)", async ({ page }) => {
  await page.goto(url);
  const { day, date } = await page.evaluate(() => ({ day: Gym.todayDay(), date: Gym.dateKey() }));
  await page.evaluate(({ day, date }) => {
    localStorage.clear();
    localStorage.setItem("gym-tool-v2", JSON.stringify({ v:5, cur:day, idx:0, bodyweight:165,
      state:{ [day+":0"]:{ load:100, reps:6, rir:2, done:1, topHits:0, lastRir:2, sets:[{load:100,reps:6,rir:2,t:Date.now()}] } },
      liftHistory:{ [day+":0"]:[{ date, load:100, reps:6, rir:2, setsDone:1, sets:[{load:100,reps:6,rir:2}] }] },
      sessionLog:[{ date, day, status:"complete", durationSec:600, sets:1, volume:600 }],
      active:{ id:"s", date, day, startedAt:null, endedAt:null, accSec:0, runningSince:null, status:"active" } }));
  }, { day, date });
  await page.reload();
  await page.locator("#menuBtn").click();
  await expect(page.locator("#modalFoot")).toContainText("1 workout ·");
  await expect(page.locator("#modalFoot")).not.toContainText("1 workouts");
  await page.evaluate(() => {
    Object.defineProperty(navigator, "share", { value: undefined, configurable: true });
    window.__shared = "";
    Object.defineProperty(navigator, "clipboard", { value: { writeText: function (x) { window.__shared = x; return Promise.resolve(); } }, configurable: true });
  });
  await page.locator("#shareSummary").click();
  await expect.poll(() => page.evaluate(() => window.__shared)).toContain("1 workout · 1 set ·");
});

test("Apply updates the edited set row as well as the working load (U76)", async ({ page }) => {
  await page.goto(url);
  const date = await page.evaluate(() => Gym.dateKey());
  await seed(page, {
    v: 5, cur: "fri", idx: 0,
    state: { "fri:0": { done: 1, load: 50, reps: 6, rir: 2, topHits: 0, lastRir: 2, exId: "fri-smith-squat",
      sets: [0, 1, 2].map(function () { return { load: 50, reps: 6, rir: 2, t: Date.now() }; }) } },
    liftHistory: { "fri:0": [
      { date: "2026-10-25", load: 50, reps: 8, rir: 2, hitTop: true, setsDone: 3 },
      { date: "2026-11-01", load: 50, reps: 8, rir: 2, hitTop: true, setsDone: 3 }
    ] },
    sessionLog: [],
    active: { id: "s", date, day: "fri", startedAt: null, endedAt: null, accSec: 0, runningSince: null, status: "active" }
  });
  await page.locator(".liftrow").first().click();
  await page.locator('.setrow[data-set="0"]').click();
  await expect(page.locator("#applyLoad")).toBeVisible();
  await page.locator("#applyLoad").click();
  await expect(page.locator("#loadVal")).toHaveText("52.5");
  const logged = await page.evaluate(() => JSON.parse(localStorage.getItem("gym-tool-v2")).state["fri:0"].sets[0].load);
  expect(logged).toBe(52.5);
});

test("abandoning a set edit re-banks the original set (U77)", async ({ page }) => {
  await page.goto(url);
  const date = await page.evaluate(() => Gym.dateKey());
  await page.evaluate((date) => {
    localStorage.clear();
    const sets = [0, 1, 2].map(() => ({ load: 60, reps: 6, rir: 2, t: Date.now() }));
    localStorage.setItem("gym-tool-v2", JSON.stringify({ v:5, cur:"fri", idx:0, bodyweight:165,
      state:{ "fri:0":{ load:60, reps:6, rir:2, done:3, topHits:3, lastRir:2, exId:"fri-smith-squat", sets } },
      liftHistory:{ "fri:0":[{ date, load:60, reps:6, rir:2, hitTop:true, setsDone:3, sets }] }, sessionLog:[],
      active:{ id:"s", date, day:"fri", startedAt:null, endedAt:null, accSec:0, runningSince:null, status:"active" } }));
  }, date);
  await page.reload();
  await page.locator('[data-i="0"]').click();
  await page.locator('.setrow[data-set="0"]').click();
  await page.locator('#loadUp').click();
  await page.locator('#loadUp').click();
  await page.locator('#backBtn').click();
  const vals = await page.evaluate(() => {
    const p = JSON.parse(localStorage.getItem("gym-tool-v2"));
    return { state: p.state["fri:0"].sets[0].load, hist: p.liftHistory["fri:0"][0].sets[0].load };
  });
  expect(vals.state).toBe(60);
  expect(vals.hist).toBe(60);
});

test("undo on a past day also drops its history entry (U78)", async ({ page }) => {
  await page.goto(url);
  const date = await page.evaluate(() => Gym.dateKey());
  await page.evaluate((date) => {
    localStorage.clear();
    const sets = [0, 1, 2].map(() => ({ load: 60, reps: 6, rir: 2, t: Date.now() }));
    localStorage.setItem("gym-tool-v2", JSON.stringify({ v:5, cur:"fri", idx:0, bodyweight:165,
      state:{ "fri:0":{ load:60, reps:6, rir:2, done:0, topHits:0, lastRir:null },
              "sat:0":{ load:60, reps:6, rir:2, done:3, topHits:3, lastRir:2, exId:"sat-front-pulldown", sets } },
      liftHistory:{ "sat:0":[{ date:"2026-11-01", load:60, reps:6, rir:2, hitTop:true, setsDone:3, sets }] }, sessionLog:[],
      active:{ id:"s", date, day:"fri", startedAt:null, endedAt:null, accSec:0, runningSince:null, status:"active" } }));
  }, date);
  await page.reload();
  await page.locator('#dayNext').click();
  await expect(page.locator('#dayTitle')).toContainText("Sat");
  await page.locator('[data-i="0"]').click();
  await page.locator('#undoSetBtn').click();
  const counts = await page.evaluate(() => {
    const p = JSON.parse(localStorage.getItem("gym-tool-v2"));
    var h = p.liftHistory["sat:0"] || [];
    return { state: p.state["sat:0"].sets.length, histEntries: h.length };
  });
  expect(counts.state).toBe(2);
  expect(counts.histEntries).toBe(0);
});

test("restart lift on a past day clears its history entry (U79)", async ({ page }) => {
  await page.goto(url);
  const date = await page.evaluate(() => Gym.dateKey());
  await page.evaluate((date) => {
    localStorage.clear();
    const sets = [0, 1, 2].map(() => ({ load: 60, reps: 6, rir: 2, t: Date.now() }));
    localStorage.setItem("gym-tool-v2", JSON.stringify({ v:5, cur:"fri", idx:0, bodyweight:165,
      state:{ "fri:0":{ load:60, reps:6, rir:2, done:0, topHits:0, lastRir:null },
              "sat:0":{ load:60, reps:6, rir:2, done:3, topHits:3, lastRir:2, exId:"sat-front-pulldown", sets } },
      liftHistory:{ "sat:0":[{ date:"2026-11-01", load:60, reps:6, rir:2, hitTop:true, setsDone:3, sets }] }, sessionLog:[],
      active:{ id:"s", date, day:"fri", startedAt:null, endedAt:null, accSec:0, runningSince:null, status:"active" } }));
  }, date);
  await page.reload();
  await page.locator('#dayNext').click();
  await page.locator('[data-i="0"]').click();
  await page.locator('#resetLiftBtn').click();
  await page.locator('#resetLiftBtn').click();
  const hist = await page.evaluate(() => (JSON.parse(localStorage.getItem("gym-tool-v2")).liftHistory["sat:0"] || []).length);
  expect(hist).toBe(0);
});

test("reset day on a past day keeps older lifts' history (U80)", async ({ page }) => {
  await page.goto(url);
  const date = await page.evaluate(() => Gym.dateKey());
  await page.evaluate((date) => {
    localStorage.clear();
    const sets = [0, 1, 2].map(() => ({ load: 60, reps: 6, rir: 2, t: Date.now() }));
    localStorage.setItem("gym-tool-v2", JSON.stringify({ v:5, cur:"fri", idx:0, bodyweight:165,
      state:{ "fri:0":{ load:60, reps:6, rir:2, done:0, topHits:0, lastRir:null },
              "sat:0":{ load:60, reps:6, rir:2, done:3, topHits:3, lastRir:2, exId:"sat-front-pulldown", sets },
              "sat:1":{ load:50, reps:8, rir:2, done:0, topHits:0, lastRir:null, exId:"sat-leg-curl" } },
      liftHistory:{ "sat:0":[{ date:"2026-11-01", load:60, reps:6, rir:2, hitTop:true, setsDone:3, sets }],
                    "sat:1":[{ date:"2026-10-25", load:50, reps:8, rir:2, hitTop:true, setsDone:3, sets }] }, sessionLog:[],
      active:{ id:"s", date, day:"fri", startedAt:null, endedAt:null, accSec:0, runningSince:null, status:"active" } }));
  }, date);
  await page.reload();
  await page.locator('#dayNext').click();
  await page.locator('#menuBtn').click();
  await page.locator('#resetDay').click();
  await page.locator('#resetDay').click();
  const hist = await page.evaluate(() => {
    const p = JSON.parse(localStorage.getItem("gym-tool-v2"));
    return { sat0: (p.liftHistory["sat:0"] || []).length, sat1: (p.liftHistory["sat:1"] || []).length };
  });
  expect(hist.sat0).toBe(0);
  expect(hist.sat1).toBe(1);
});

test("restart after partial progress keeps earlier session history (U82)", async ({ page }) => {
  await page.goto(url);
  const date = await page.evaluate(() => Gym.dateKey());
  await page.evaluate((date) => {
    localStorage.clear();
    const sets = [0, 1, 2].map(() => ({ load: 60, reps: 6, rir: 2, t: Date.now() }));
    localStorage.setItem("gym-tool-v2", JSON.stringify({ v:5, cur:"fri", idx:0, bodyweight:165,
      state:{ "fri:0":{ load:60, reps:6, rir:2, done:0, topHits:0, lastRir:null, exId:"fri-smith-squat", sets:[] } },
      liftHistory:{ "fri:0":[{ date:"2026-11-15", load:60, reps:6, rir:2, hitTop:true, setsDone:3, sets }] }, sessionLog:[],
      active:{ id:"s", date, day:"fri", startedAt:null, endedAt:null, accSec:0, runningSince:null, status:"active" } }));
  }, date);
  await page.reload();
  await page.locator('[data-i="0"]').click();
  await page.locator('#doneBtn').click();
  await expect(page.locator('#app')).toHaveClass(/resting/);
  await page.locator('#skipRest').click();
  await page.locator('#resetLiftBtn').click();
  await page.locator('#resetLiftBtn').click();
  const hist = await page.evaluate(() => (JSON.parse(localStorage.getItem("gym-tool-v2")).liftHistory["fri:0"] || []).map(e => e.date));
  expect(hist).toEqual(["2026-11-15"]);
});

test("restart after finishing keeps the completed session (U83)", async ({ page }) => {
  await page.goto(url);
  const { day, date } = await page.evaluate(() => ({ day: Gym.todayDay(), date: Gym.dateKey() }));
  await page.evaluate(({ day, date }) => {
    const sets = [0, 1, 2].map(() => ({ load: 60, reps: 6, rir: 2, t: Date.now() }));
    const state = {}, hist = {};
    Gym.DAYS[day].ex.forEach(function (e, i) {
      state[day + ":" + i] = { load: e.load || 0, reps: e.r, rir: e.rir, done: e.s, topHits: e.s, lastRir: e.rir, sets: sets.slice(0, e.s) };
      hist[day + ":" + i] = [{ date, load: e.load || 0, reps: e.r, rir: e.rir, hitTop: true, setsDone: e.s, sets: sets.slice(0, e.s) }];
    });
    const sat = "sat";
    Gym.DAYS[sat].ex.forEach(function (e, i) {
      state[sat + ":" + i] = { load: e.load || 0, reps: e.r, rir: e.rir, done: e.s, topHits: e.s, lastRir: e.rir, sets: sets.slice(0, e.s) };
      hist[sat + ":" + i] = [{ date, load: e.load || 0, reps: e.r, rir: e.rir, hitTop: true, setsDone: e.s, sets: sets.slice(0, e.s) }];
    });
    localStorage.clear();
    localStorage.setItem("gym-tool-v2", JSON.stringify({ v:5, cur:day, idx:0, bodyweight:165,
      state, liftHistory:hist, sessionLog:[],
      active:{ id:"s", date, day, startedAt:null, endedAt:null, accSec:1800, runningSince:null, status:"active" } }));
  }, { day, date });
  await page.reload();
  await page.locator('#finishBtn').click();
  await expect(page.locator('#summary')).toBeVisible();
  await page.locator('#sumDone').click();
  await page.locator('#dayNext').click();
  await page.locator('[data-i="0"]').click();
  await page.locator('#resetLiftBtn').click();
  await page.locator('#resetLiftBtn').click();
  const st = await page.evaluate(() => {
    const p = JSON.parse(localStorage.getItem("gym-tool-v2"));
    return { status: p.active.status, logged: p.sessionLog.length };
  });
  expect(st.status).toBe("complete");
  expect(st.logged).toBe(1);
  await expect(page.locator('#sessBtn')).toHaveAttribute('aria-label', 'Start workout timer');
});

test("first set after finishing starts a fresh session (U84)", async ({ page }) => {
  await page.goto(url);
  const { day, date } = await page.evaluate(() => ({ day: Gym.todayDay(), date: Gym.dateKey() }));
  await page.evaluate(({ day, date }) => {
    const sets = [0, 1, 2].map(() => ({ load: 60, reps: 6, rir: 2, t: Date.now() }));
    const state = {};
    Gym.DAYS[day].ex.forEach(function (e, i) {
      state[day + ":" + i] = { load: e.load || 0, reps: e.r, rir: e.rir, done: i < 3 ? 3 : 0, topHits: i < 3 ? 3 : 0, lastRir: e.rir, sets: i < 3 ? sets : [] };
    });
    localStorage.clear();
    localStorage.setItem("gym-tool-v2", JSON.stringify({ v:5, cur:day, idx:0, bodyweight:165, state, liftHistory:{}, sessionLog:[],
      active:{ id:"ses_test", date, day, startedAt:Date.now()-60000, endedAt:null, accSec:60, runningSince:null, status:"active" } }));
  }, { day, date });
  await page.reload();
  await page.locator('#finishBtn').click();
  await expect(page.locator('#summary')).toBeVisible();
  await page.locator('#sumDone').click();
  await expect(page.locator('#sessBtn')).toHaveAttribute('aria-label', 'Start workout timer');
  await page.locator('#continueBtn').click();
  await page.locator('#doneBtn').click();
  const st = await page.evaluate(() => {
    const p = JSON.parse(localStorage.getItem("gym-tool-v2"));
    return { status: p.active.status, accSec: p.active.accSec, id: p.active.id, logged: p.sessionLog.length };
  });
  expect(st.status).toBe("active");
  expect(st.accSec).toBeLessThan(10);
  expect(st.id).not.toBe("ses_test");
  expect(st.logged).toBe(1);
});

test("workout clock survives a peek toggle at GO (U85)", async ({ page }) => {
  await page.goto(url);
  const { day, date } = await page.evaluate(() => ({ day: Gym.todayDay(), date: Gym.dateKey() }));
  await page.evaluate(({ day, date }) => {
    localStorage.clear();
    localStorage.setItem("gym-tool-v2", JSON.stringify({ v:5, cur:day, idx:0, bodyweight:165,
      state:{ [day+":0"]:{ load:60, reps:6, rir:2, done:0, topHits:0, lastRir:null, exId:day+"-x", sets:[] } },
      liftHistory:{}, sessionLog:[],
      active:{ id:"s", date, day, startedAt:Date.now()-600000, accSec:600, runningSince:Date.now(), status:"active" } }));
  }, { day, date });
  await page.reload();
  await page.locator('[data-i="0"]').click();
  await page.locator('#doneBtn').click();
  await expect(page.locator('#app')).toHaveClass(/resting/);
  await page.clock.runFor(185000);
  await expect(page.locator('#timerBar')).toHaveClass(/go/);
  await expect(page.locator('#restElapsed')).toBeVisible();
  await page.locator('#detailsBtn').click();
  await expect(page.locator('#restElapsed')).toBeHidden();
  await page.locator('#detailsBtn').click();
  await expect(page.locator('#restElapsed')).toBeVisible();
});

test("failed Copy backup keeps the overdue reminder (U86)", async ({ page }) => {
  await page.goto(url);
  await page.evaluate(() => {
    localStorage.clear();
    localStorage.setItem("gym-tool-v2", JSON.stringify({ v:5, cur:"fri", idx:0, bodyweight:165,
      state:{ "fri:0":{ load:60, reps:6, rir:2, done:1, topHits:0, lastRir:2, sets:[{load:60,reps:6,rir:2,t:Date.now()}] } },
      liftHistory:{}, sessionLog:[], lastBackup:"2026-10-01",
      active:{ id:"s", date:"2026-11-06", day:"fri", startedAt:null, endedAt:null, accSec:0, runningSince:null, status:"active" } }));
  });
  await page.reload();
  await expect(page.locator('#backupBar')).toBeVisible();
  await page.evaluate(() => {
    Object.defineProperty(navigator, "clipboard", { value: { writeText: function () { return Promise.reject(new Error("blocked")); } }, configurable: true });
  });
  await page.locator('#menuBtn').click();
  await page.locator('#exportCopy').click();
  await expect(page.locator('#modalMsg')).toHaveText("Copy blocked — use Download JSON");
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("gym-tool-v2")).lastBackup)).toBe("2026-10-01");
  await expect(page.locator('#menuBtn')).toHaveClass(/needs-backup/);
  await page.locator('#modalClose').click();
  await expect(page.locator('#backupBar')).toBeVisible();
});

test("armed Restart announces the confirm label (U87)", async ({ page }) => {
  await page.goto(url);
  const date = await page.evaluate(() => Gym.dateKey());
  await page.evaluate((date) => {
    localStorage.clear();
    localStorage.setItem("gym-tool-v2", JSON.stringify({ v:5, cur:"fri", idx:0, bodyweight:165,
      state:{ "fri:0":{ load:60, reps:6, rir:2, done:1, topHits:0, lastRir:2, exId:"fri-smith-squat", sets:[{load:60,reps:6,rir:2,t:Date.now()}] } },
      liftHistory:{}, sessionLog:[], active:{ id:"s", date, day:"fri", startedAt:null, endedAt:null, accSec:0, runningSince:null, status:"active" } }));
  }, date);
  await page.reload();
  await page.locator('[data-i="0"]').click();
  await expect(page.locator('#resetLiftBtn')).toHaveText('↺ Restart');
  await page.locator('#resetLiftBtn').click();
  await expect(page.locator('#resetLiftBtn')).toHaveText('Tap again to restart');
  await expect(page.locator('#resetLiftBtn')).toHaveAccessibleName('Tap again to restart');
});

test("Reset day confirm label is accurate on a past day (U88)", async ({ page }) => {
  await page.goto(url);
  await page.locator('#dayNext').click();
  await expect(page.locator('#dayTitle')).toContainText("Sat");
  await page.locator('#menuBtn').click();
  await page.locator('#resetDay').click();
  await expect(page.locator('#resetDay')).toHaveText('Tap again to reset day');
});

test("starting the clock from another day lands on the session day (U89)", async ({ page }) => {
  await page.goto(url);
  const { day, date } = await page.evaluate(() => ({ day: Gym.todayDay(), date: Gym.dateKey() }));
  await page.evaluate(({ day, date }) => {
    localStorage.clear();
    localStorage.setItem("gym-tool-v2", JSON.stringify({ v:5, cur:day, idx:0, bodyweight:165,
      state:{}, liftHistory:{}, sessionLog:[],
      active:{ id:"s", date, day, startedAt:null, endedAt:null, accSec:0, runningSince:null, status:"active" } }));
  }, { day, date });
  await page.reload();
  await page.locator('#dayNext').click();
  await expect(page.locator('#dayTitle')).toContainText("Sat");
  await page.locator('#sessBtn').click();
  await expect(page.locator('#dayTitle')).toContainText("Fri");
  await expect(page.locator('#sessBtn')).toHaveAttribute('aria-label', 'Pause workout timer');
});

test("finish from another day summarizes the session day (U90)", async ({ page }) => {
  await page.goto(url);
  const { day, date } = await page.evaluate(() => ({ day: Gym.todayDay(), date: Gym.dateKey() }));
  const other = day === "fri" ? "sat" : day === "sat" ? "sun" : "fri";
  const label = { fri:"Fri", sat:"Sat", sun:"Sun" };
  await page.evaluate(({ day, other, date }) => {
    localStorage.clear();
    const mk = (load, n) => [0, 1, 2].map(() => ({ load, reps: n, rir: 2, t: Date.now() }));
    localStorage.setItem("gym-tool-v2", JSON.stringify({ v:5, cur:day, idx:0, bodyweight:165,
      state:{ [day+":0"]:{ load:100, reps:6, rir:2, done:3, topHits:3, lastRir:2, sets:mk(100,6) },
              [other+":0"]:{ load:50, reps:8, rir:2, done:3, topHits:3, lastRir:2, sets:mk(50,8) } },
      liftHistory:{}, sessionLog:[],
      active:{ id:"s", date, day, startedAt:null, endedAt:null, accSec:500, runningSince:null, status:"active" } }));
  }, { day, other, date });
  await page.reload();
  await page.locator('#dayNext').click();
  await expect(page.locator('#dayTitle')).toContainText(label[other]);
  await page.locator('#finishBtn').click();
  await expect(page.locator('#sumTitle')).toContainText(label[day]);
  await expect(page.locator('#sumVol')).toHaveText("1.8k lb");
  await expect(page.locator('#sumDuration')).toHaveText("8:20");
});

test("Continue from another day lands on the session day (U91)", async ({ page }) => {
  await page.goto(url);
  const { day, date } = await page.evaluate(() => ({ day: Gym.todayDay(), date: Gym.dateKey() }));
  const other = day === "fri" ? "sat" : day === "sat" ? "sun" : "fri";
  const label = { fri:"Fri", sat:"Sat", sun:"Sun" };
  await page.evaluate(({ day, other, date }) => {
    localStorage.clear();
    localStorage.setItem("gym-tool-v2", JSON.stringify({ v:5, cur:day, idx:0, bodyweight:165,
      state:{ [day+":0"]:{ load:60, reps:6, rir:2, done:1, topHits:0, lastRir:2, sets:[{load:60,reps:6,rir:2,t:Date.now()}] },
              [other+":0"]:{ load:50, reps:8, rir:2, done:1, topHits:0, lastRir:2, sets:[{load:50,reps:8,rir:2,t:Date.now()}] } },
      liftHistory:{}, sessionLog:[],
      active:{ id:"s", date, day, startedAt:null, endedAt:null, accSec:0, runningSince:null, status:"active" } }));
  }, { day, other, date });
  await page.reload();
  await page.locator('#dayNext').click();
  await expect(page.locator('#dayTitle')).toContainText(label[other]);
  await page.locator('#continueBtn').click();
  await expect(page.locator('#dayTitle')).toContainText(label[day]);
  await page.locator('#doneBtn').click();
  await expect(page.locator('#app')).toHaveClass(/resting/);
});

test("day view labels stay truthful when browsing another day (U92)", async ({ page }) => {
  await page.goto(url);
  const day = await page.evaluate(() => Gym.todayDay());
  const other = day === "fri" ? "sat" : day === "sat" ? "sun" : "fri";
  const label = { fri:"Fri", sat:"Sat", sun:"Sun" };
  await page.evaluate(({ day, other }) => {
    const hist = {};
    [day, other].forEach(function (d) { hist[d + ":0"] = [{ date: "2026-11-01", load: 60, reps: 6, rir: 2, setsDone: 3 }]; });
    localStorage.clear();
    localStorage.setItem("gym-tool-v2", JSON.stringify({ v:5, cur:day, idx:0, bodyweight:165, state:{}, liftHistory:hist, sessionLog:[] }));
  }, { day, other });
  await page.reload();
  await page.locator('#dayNext').click();
  await expect(page.locator('#dayTitle')).toContainText(label[other]);
  expect(await page.locator('#planBtn').textContent()).toBe("Plan lifts");
  expect(await page.locator('#dayView').getAttribute('aria-label')).toBe("Workout lifts");
  expect(await page.locator('#dayBand').textContent()).toContain("Day");
  expect(await page.locator('#dayBand').textContent()).not.toContain("Today");
});

test("Continue label names the lift it actually opens (U93)", async ({ page }) => {
  await page.goto(url);
  const { day, date } = await page.evaluate(() => ({ day: Gym.todayDay(), date: Gym.dateKey() }));
  const other = day === "fri" ? "sat" : day === "sat" ? "sun" : "fri";
  const label = { fri:"Fri", sat:"Sat", sun:"Sun" };
  await page.evaluate(({ day, other, date }) => {
    localStorage.clear();
    const full = [0, 1, 2].map(() => ({ load: 60, reps: 6, rir: 2, t: Date.now() }));
    localStorage.setItem("gym-tool-v2", JSON.stringify({ v:5, cur:day, idx:0, bodyweight:165,
      state:{ [day+":0"]:{ load:60, reps:6, rir:2, done:3, topHits:3, lastRir:2, sets:full },
              [other+":0"]:{ load:50, reps:8, rir:2, done:1, topHits:0, lastRir:2, sets:[{load:50,reps:8,rir:2,t:Date.now()}] } },
      liftHistory:{}, sessionLog:[],
      active:{ id:"s", date, day, startedAt:null, endedAt:null, accSec:0, runningSince:null, status:"active" } }));
  }, { day, other, date });
  await page.reload();
  await page.locator('#dayNext').click();
  await expect(page.locator('#dayTitle')).toContainText(label[other]);
  await expect(page.locator('#continueBtn')).toHaveText('Continue · Lift 2');
  await page.locator('#continueBtn').click();
  await expect(page.locator('#liftMeta')).toContainText('Lift 2 of');
});

test("session actions stay visible when browsing a fresh day (U94)", async ({ page }) => {
  await page.goto(url);
  const { day, date } = await page.evaluate(() => ({ day: Gym.todayDay(), date: Gym.dateKey() }));
  const other = day === "fri" ? "sat" : day === "sat" ? "sun" : "fri";
  const label = { fri:"Fri", sat:"Sat", sun:"Sun" };
  await page.evaluate(({ day, date }) => {
    localStorage.clear();
    localStorage.setItem("gym-tool-v2", JSON.stringify({ v:5, cur:day, idx:0, bodyweight:165,
      state:{ [day+":0"]:{ load:60, reps:6, rir:2, done:1, topHits:0, lastRir:2, sets:[{load:60,reps:6,rir:2,t:Date.now()}] } },
      liftHistory:{}, sessionLog:[],
      active:{ id:"s", date, day, startedAt:null, endedAt:null, accSec:0, runningSince:null, status:"active" } }));
  }, { day, date });
  await page.reload();
  await expect(page.locator('#continueBtn')).toBeVisible();
  await expect(page.locator('#finishBtn')).toBeVisible();
  await page.locator('#dayNext').click();
  await expect(page.locator('#dayTitle')).toContainText(label[other]);
  await expect(page.locator('#continueBtn')).toBeVisible();
  await expect(page.locator('#finishBtn')).toBeVisible();
  await page.locator('#continueBtn').click();
  await expect(page.locator('#dayTitle')).toContainText(label[day]);
});

test("Finish label reflects the session day when browsing another day (U95)", async ({ page }) => {
  await page.goto(url);
  const { day, date } = await page.evaluate(() => ({ day: Gym.todayDay(), date: Gym.dateKey() }));
  await page.evaluate(({ day, date }) => {
    localStorage.clear();
    const state = {};
    Gym.DAYS[day].ex.forEach(function (e, i) {
      state[day + ":" + i] = { load: e.load || 0, reps: e.r, rir: e.rir, done: e.s, topHits: e.s, lastRir: e.rir, sets: [0, 1, 2].map(function () { return { load: e.load || 0, reps: e.r, rir: e.rir, t: Date.now() }; }) };
    });
    localStorage.setItem("gym-tool-v2", JSON.stringify({ v:5, cur:day, idx:0, bodyweight:165, state, liftHistory:{}, sessionLog:[],
      active:{ id:"s", date, day, startedAt:null, endedAt:null, accSec:0, runningSince:null, status:"active" } }));
  }, { day, date });
  await page.reload();
  await expect(page.locator('#finishBtn')).toHaveText('Finish workout');
  await page.locator('#dayNext').click();
  await expect(page.locator('#finishBtn')).toHaveText('Finish workout');
});

test("deload actions report save failure truthfully (U96)", async ({ page }) => {
  await page.goto(url);
  await page.evaluate(() => {
    const orig = Storage.prototype.setItem;
    Storage.prototype.setItem = function (k, v) {
      if (String(k) === "gym-tool-v2") throw new Error("QuotaExceededError");
      return orig.call(this, k, v);
    };
  });
  await page.locator('#menuBtn').click();
  await page.locator('#deloadStart').click();
  await expect(page.locator('#modalMsg')).toContainText('NOT saved');
  await page.locator('#deloadEnd').click();
  await expect(page.locator('#modalMsg')).toContainText('NOT saved');
});

test("bodyweight edit reports save failure truthfully (U97)", async ({ page }) => {
  await page.goto(url);
  await page.evaluate(() => {
    const orig = Storage.prototype.setItem;
    Storage.prototype.setItem = function (k, v) {
      if (String(k) === "gym-tool-v2") throw new Error("QuotaExceededError");
      return orig.call(this, k, v);
    };
  });
  await page.locator('#menuBtn').click();
  await page.locator('#bwInput').fill('170');
  await expect(page.locator('#modalMsg')).toContainText('NOT saved');
  await expect(page.locator('#modalMsg')).not.toContainText(' ✓');
});

test("Escape from peek restores focus to Show workout (U98)", async ({ page }) => {
  await page.goto(url);
  const date = await page.evaluate(() => Gym.dateKey());
  await page.evaluate((date) => {
    localStorage.clear();
    localStorage.setItem("gym-tool-v2", JSON.stringify({ v:5, cur:"fri", idx:0, bodyweight:165,
      state:{ "fri:0":{ load:60, reps:6, rir:2, done:0, topHits:0, lastRir:null, exId:"fri-smith-squat", sets:[] } },
      liftHistory:{}, sessionLog:[], active:{ id:"s", date, day:"fri", startedAt:null, endedAt:null, accSec:0, runningSince:null, status:"active" } }));
  }, date);
  await page.reload();
  await page.locator('[data-i="0"]').click();
  await page.locator('#doneBtn').click();
  await expect(page.locator('#app')).toHaveClass(/resting/);
  await page.locator('#detailsBtn').click();
  await page.locator('#menuBtn').focus();
  await page.keyboard.press('Escape');
  await expect(page.locator('#app')).not.toHaveClass(/show-details/);
  await expect(page.locator('#detailsBtn')).toBeFocused();
});

test("summary PR label agrees with a single new PR (U99)", async ({ page }) => {
  await page.goto(url);
  const { day, date } = await page.evaluate(() => ({ day: Gym.todayDay(), date: Gym.dateKey() }));
  await page.evaluate(({ day, date }) => {
    const state = {}, sets = [0, 1, 2].map(() => ({ load: 100, reps: 6, rir: 2 }));
    Gym.DAYS[day].ex.forEach(function (e, i) {
      state[day + ":" + i] = { done: e.s, load: 100, reps: 6, rir: 2, sets: sets };
    });
    localStorage.clear();
    localStorage.setItem("gym-tool-v2", JSON.stringify({ v:5, cur:day, idx:0, bodyweight:165, state,
      liftHistory:{ [day+":0"]:[{ date, load:100, reps:6, rir:2, hitTop:true, setsDone:3, sets }] }, sessionLog:[],
      active:{ id:"s", date, day, startedAt:null, endedAt:null, accSec:0, runningSince:null, status:"active" } }));
  }, { day, date });
  await page.reload();
  await page.locator('#finishBtn').click();
  await expect(page.locator('#sumPrs')).toHaveText('1 new');
  await expect(page.locator('#sumPrs + .sumk')).toHaveText('PR');
});

test("plan message omits a zero increment for all resets (U100)", async ({ page }) => {
  await page.goto(url);
  const day = await page.evaluate(() => Gym.todayDay());
  await page.evaluate((day) => {
    localStorage.clear();
    const hist = {};
    Gym.DAYS[day].ex.forEach(function (e, i) {
      hist[day + ":" + i] = [0, 1, 2].map(function (n) { return { date: "2026-11-0" + (n + 1), load: 100, reps: 6, rir: 2, hitTop: false, setsDone: 3 }; });
    });
    localStorage.setItem("gym-tool-v2", JSON.stringify({ v:5, cur:day, idx:0, bodyweight:165, state:{}, liftHistory:hist, sessionLog:[] }));
  }, day);
  await page.reload();
  await page.locator('#planBtn').click();
  await expect(page.locator('#daySummary')).not.toContainText('+0');
  await expect(page.locator('#daySummary')).toContainText('Planned · reset');
});

test("destructive wipes clear a stale plan note (U101)", async ({ page }) => {
  await page.goto(url);
  const day = await page.evaluate(() => Gym.todayDay());
  await page.evaluate((day) => {
    localStorage.clear();
    const hist = {};
    Gym.DAYS[day].ex.forEach(function (e, i) {
      hist[day + ":" + i] = [0, 1, 2].map(function (n) { return { date: "2026-11-0" + (n + 1), load: 100, reps: 6, rir: 2, hitTop: false, setsDone: 3 }; });
    });
    localStorage.setItem("gym-tool-v2", JSON.stringify({ v:5, cur:day, idx:0, bodyweight:165, state:{}, liftHistory:hist, sessionLog:[] }));
  }, day);
  await page.reload();
  await page.locator('#planBtn').click();
  await expect(page.locator('#daySummary')).toContainText('Planned');
  await page.locator('#menuBtn').click();
  await page.locator('#resetDay').click();
  await page.locator('#resetDay').click();
  await page.locator('#modalClose').click();
  await expect(page.locator('#daySummary')).not.toContainText('Planned');
});

test("reset day clears a stale one-shot hint (U102)", async ({ page }) => {
  await page.goto(url);
  const date = await page.evaluate(() => Gym.dateKey());
  await page.evaluate((date) => {
    localStorage.clear();
    localStorage.setItem("gym-tool-v2", JSON.stringify({ v:5, cur:"fri", idx:0, bodyweight:165,
      state:{ "fri:0":{ load:60, reps:6, rir:2, done:0, topHits:0, lastRir:null, exId:"fri-smith-squat", sets:[] } },
      liftHistory:{ "fri:0":[{ date:"2026-11-01", load:50, reps:6, rir:2, hitTop:false, setsDone:3 }] }, sessionLog:[],
      active:{ id:"s", date, day:"fri", startedAt:null, endedAt:null, accSec:0, runningSince:null, status:"active" } }));
  }, date);
  await page.reload();
  await page.locator('[data-i="0"]').click();
  await page.locator('#doneBtn').click();
  await expect(page.locator('#hint')).toContainText('New PR');
  await page.locator('#skipRest').click();
  await page.locator('#menuBtn').click();
  await page.locator('#resetDay').click();
  await page.locator('#resetDay').click();
  await page.locator('#modalClose').click();
  await expect(page.locator('#hint')).toHaveText('');
});

test("restore and clear-all clear live rest and reconcile session clock (U27)", async ({ page }) => {
  const date = await page.evaluate(() => { const d=new Date(); return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0"); });
  await seed(page, {
    v: 5, cur: "fri", idx: 0, bodyweight: 165, bodyweightSet: false,
    state: { "fri:0": { load: 60, reps: 6, rir: 2, done: 0, topHits: 0, lastRir: 2, exId: "fri-smith-squat", sets: [] } },
    liftHistory: {}, sessionLog: [],
    active: { date, status: "active", startedAt: Date.now() - 60000, elapsedSec: 0, runningSince: Date.now() - 60000 }
  });
  await page.locator('[data-i="0"]').click();
  await page.locator("#doneBtn").click();
  await expect(page.locator("#app")).toHaveClass(/resting/);
  const backup = JSON.stringify({ v: 5, cur: "fri", idx: 0, bodyweight: 165, bodyweightSet: false, state: {}, liftHistory: {}, sessionLog: [], active: { date, status: "active", startedAt: Date.now() - 120000, accSec: 90, runningSince: null } });
  await page.locator("#detailsBtn").click();
  await page.locator("#menuBtn").click();
  await page.setInputFiles("#replaceFile", { name: "b.json", mimeType: "application/json", buffer: Buffer.from(backup) });
  await expect(page.locator("#app")).not.toHaveClass(/resting/);
  await expect(page.locator("#restLabel")).toHaveText("");
  await expect(page.locator("#sessBtn")).toContainText("Resume");
  await page.locator("#modalClose").click();

  await page.locator('[data-i="0"]').click();
  await page.locator("#doneBtn").click();
  await expect(page.locator("#app")).toHaveClass(/resting/);
  await page.locator("#detailsBtn").click();
  await page.locator("#menuBtn").click();
  await page.locator("#clearAll").click();
  await page.locator("#clearAll").click();
  await expect(page.locator("#app")).not.toHaveClass(/resting/);
  await expect(page.locator("#sessBtn")).toContainText("Start");
  await expect(page.locator("#sessBtn")).toContainText("0:00");
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
