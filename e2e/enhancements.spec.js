/* New-behaviour checks: backup nudge, tap-to-type, deload, PR, rest lock. */
const { test, expect } = require("@playwright/test");
const path = require("path");

const url = "file://" + path.resolve(__dirname, "..", "index.html");

async function seed(page, obj) {
  await page.goto(url);
  await page.evaluate((o) => localStorage.setItem("gym-tool-v2", JSON.stringify(o)), obj);
  await page.reload();
}

test("overdue backup banner backs up on tap and dismisses on ✕ (B5-04)", async ({ page }) => {
  const seedOverdue = () => seed(page, {
    v: 2, cur: "fri", idx: 0, state: {},
    liftHistory: { "fri:0": [{ date: "2026-11-01", load: 50, reps: 6, rir: 2, hitTop: true, setsDone: 3 }] }
  });

  await seedOverdue();
  await expect(page.locator("#backupBar")).toBeVisible();
  await expect(page.locator("#backupBarText")).toContainText("Never backed up");
  const noScroll = await page.evaluate(() => document.documentElement.scrollHeight <= window.innerHeight + 1);
  expect(noScroll, "banner must not cause scrolling").toBe(true);

  // "Backup" downloads the file now — no two-trip detour through the modal (B5-04)
  const dlPromise = page.waitForEvent("download");
  await page.locator("#backupBarSave").click();
  const dl = await dlPromise;
  expect(dl.suggestedFilename()).toMatch(/^gym-backup-\d{4}-\d{2}-\d{2}\.json$/);
  await expect(page.locator("#modal"), "the modal never opens").toBeHidden();
  await expect(page.locator("#backupBar")).toBeHidden();

  // the ✕ still dismisses without a download
  await seedOverdue();
  await expect(page.locator("#backupBar")).toBeVisible();
  await page.locator("#backupBarDismiss").click();
  await expect(page.locator("#backupBar")).toBeHidden();
});

test("switching day tabs mid-edit keeps the edit in its own day (B5-05)", async ({ page }) => {
  const errors = [];
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
  page.on("pageerror", (e) => errors.push(String(e)));

  await seed(page, {
    v: 2, cur: "fri", idx: 0, bodyweight: 75,
    state: {
      "fri:0": { done: 1, load: 60, reps: 6, rir: 2, topHits: 0, lastRir: 2, sets: [{ load: 60, reps: 6, rir: 2 }] },
      "sat:0": { done: 1, load: 90, reps: 5, rir: 2, topHits: 0, lastRir: 2, sets: [{ load: 90, reps: 5, rir: 2 }] }
    },
    liftHistory: {}
  });

  // edit a logged Friday set: the working load moves 60 -> 62.5 mid-edit
  await page.locator(".liftrow").first().click();
  await page.locator("[data-set='0']").click();
  await page.locator("#loadUp").click();
  await expect(page.locator("#loadVal")).toHaveText("62.5");

  // Tap the Sat tab mid-edit. The tabs are hidden in lift view, so fire the
  // handler the way a mid-edit tap would hit it: while the edit is live.
  await page.evaluate(() => document.querySelector('.day[data-day="sat"]').click());
  await page.locator(".liftrow").first().click();
  await expect(page.locator("#loadVal"), "Saturday's lift must not inherit Friday's edit").toHaveText("90");

  // Friday's own working record equals the pre-edit values, not the half-made edit
  const state = await page.evaluate(() => JSON.parse(localStorage.getItem("gym-tool-v2")).state);
  expect(state["fri:0"].load, "Friday must keep its pre-edit load").toBe(60);
  expect(state["sat:0"].load, "Saturday's load must be untouched").toBe(90);

  expect(errors.filter((e) => !/vibrate|AudioContext/i.test(e))).toEqual([]);
});

test("restore and merge salvage a damaged backup instead of rejecting it (B5-06)", async ({ page }) => {
  const errors = [];
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
  page.on("pageerror", (e) => errors.push(String(e)));

  // Batch-4-style truncated JSON: one complete entry, a cut-off tail
  const truncated = '{"v":4,"cur":"fri","idx":0,"state":{},"liftHistory":{"fri:0":[' +
    '{"date":"2026-11-01","load":50,"reps":6,"rir":2,"setsDone":3},' +
    '{"date":"2026-11-08","load":55';

  await seed(page, { v: 2, cur: "fri", idx: 0, state: {}, liftHistory: {} });
  await page.locator("#menuBtn").click();

  // Restore (replace): the quarantined "dead end" bytes now salvage instead of failing
  await page.setInputFiles("#replaceFile", { name: "damaged.json", mimeType: "application/json", buffer: Buffer.from(truncated) });
  await expect(page.locator("#modalMsg"), "a damaged backup must salvage, not fail").toContainText("Recovered 1 entries from a damaged backup");
  await expect(page.locator("#modalMsg")).not.toContainText("Restore failed");

  // Merge: the recovered entries fold into the current payload
  await page.setInputFiles("#importFile", { name: "damaged.json", mimeType: "application/json", buffer: Buffer.from(truncated) });
  await expect(page.locator("#modalMsg")).toContainText("Recovered 1 entries from a damaged backup — Merged:");

  // Bytes with nothing to recover are still rejected
  await page.setInputFiles("#replaceFile", { name: "junk.json", mimeType: "application/json", buffer: Buffer.from("garbage") });
  await expect(page.locator("#modalMsg")).toContainText("Restore failed — not a Gym backup");

  expect(errors.filter((e) => !/vibrate|AudioContext/i.test(e))).toEqual([]);
});

test("restoring a newer-version backup says so (B5-07)", async ({ page }) => {
  await seed(page, { v: 2, cur: "fri", idx: 0, state: {}, liftHistory: {} });
  const v99 = JSON.stringify({ v: 99, cur: "fri", idx: 0, state: {}, liftHistory: {}, sessionLog: [] });
  await page.locator("#menuBtn").click();
  await page.setInputFiles("#replaceFile", { name: "future.json", mimeType: "application/json", buffer: Buffer.from(v99) });
  await expect(page.locator("#modalMsg"), "a future-version backup must name itself, not read as garbage").toContainText("newer version of the app — reload the app, then try again");
  await page.setInputFiles("#importFile", { name: "future.json", mimeType: "application/json", buffer: Buffer.from(v99) });
  await expect(page.locator("#modalMsg")).toContainText("newer version of the app");
});

test("tap the load value to type a precise number (and it persists)", async ({ page }) => {
  await page.goto(url);
  await page.locator(".liftrow").first().click();
  await page.locator("#loadVal").click();
  const vin = page.locator(".vin");
  await expect(vin).toBeVisible();
  await vin.fill("67.5");
  await vin.press("Enter");
  await expect(page.locator("#loadVal")).toHaveText("67.5");

  await page.reload();
  await page.locator(".liftrow").first().click();
  await expect(page.locator("#loadVal")).toHaveText("67.5");
});

test("typed and held load/reps stop at sane caps (B3-18)", async ({ page }) => {
  await page.goto(url);
  await page.locator(".liftrow").first().click();

  // typing an absurd weight clamps to 2000 lb
  await page.locator("#loadVal").click();
  await page.locator(".vin").fill("99999");
  await page.locator(".vin").press("Enter");
  await expect(page.locator("#loadVal")).toHaveText("2000");

  // the stepper cannot walk past the cap either
  for (let i = 0; i < 30; i++) await page.locator("#loadUp").click();
  await expect(page.locator("#loadVal")).toHaveText("2000");

  // reps cap at 999
  await page.locator("#repVal").click();
  await page.locator(".vin").fill("9999");
  await page.locator(".vin").press("Enter");
  await expect(page.locator("#repVal")).toHaveText("999");
  for (let i = 0; i < 10; i++) await page.locator("#repUp").click();
  await expect(page.locator("#repVal")).toHaveText("999");

  // the clamped value is what persists
  await page.reload();
  await page.locator(".liftrow").first().click();
  await expect(page.locator("#loadVal")).toHaveText("2000");
  await expect(page.locator("#repVal")).toHaveText("999");
});

test("three stalled sessions surface a deload suggestion with Apply", async ({ page }) => {
  await seed(page, {
    v: 2, cur: "fri", idx: 0,
    state: { "fri:0": { done: 0, load: 60, reps: 6, rir: 2, topHits: 0, lastRir: null } },
    liftHistory: {
      "fri:0": [
        { date: "2026-10-18", load: 60, reps: 5, rir: 1, hitTop: false, setsDone: 3 },
        { date: "2026-10-25", load: 60, reps: 5, rir: 1, hitTop: false, setsDone: 3 },
        { date: "2026-11-01", load: 60, reps: 5, rir: 1, hitTop: false, setsDone: 3 }
      ]
    }
  });
  await page.locator(".liftrow").first().click();
  await expect(page.locator("#suggestText")).toContainText("deload");
  await expect(page.locator("#applyLoad")).toBeVisible();
  await page.locator("#applyLoad").click();
  await expect(page.locator("#loadVal")).toHaveText("55");
});

test("a set that beats history shows a New PR hint", async ({ page }) => {
  await seed(page, {
    v: 2, cur: "fri", idx: 0,
    state: { "fri:0": { done: 0, load: 60, reps: 6, rir: 2, topHits: 0, lastRir: null } },
    liftHistory: { "fri:0": [{ date: "2026-11-01", load: 50, reps: 6, rir: 2, hitTop: true, setsDone: 3 }] }
  });
  await page.locator(".liftrow").first().click();
  await page.locator("#doneBtn").click();
  await page.locator("#skipRest").click();
  await expect(page.locator("#hint")).toContainText("New PR");
});

test("full-screen rest hides the lift nav arrows", async ({ page }) => {
  await page.goto(url);
  await page.locator(".liftrow").first().click();
  await page.locator("#doneBtn").click();
  await expect(page.locator("#timerBar")).toHaveClass(/active/);
  await expect(page.locator("#rPrevBtn")).toBeHidden();
  await expect(page.locator("#rNextBtn")).toBeHidden();
});

/* B3-26 — the tempo cue used to disappear after lift 1; it now follows the
   lifter into the deep part of the session, and the short-phone layout must
   still fit on one screen. */
test("every lift shows the tempo cue and lift 5 still fits 390x667 (B3-26)", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 667 });
  await seed(page, {
    v: 2, cur: "fri", idx: 4,
    state: {
      "fri:0": { done: 3, load: 55, reps: 6, rir: 2, topHits: 0, lastRir: 2 },
      "fri:1": { done: 3, load: 45, reps: 8, rir: 2, topHits: 0, lastRir: 2 },
      "fri:2": { done: 3, load: 40, reps: 8, rir: 1, topHits: 0, lastRir: 1 },
      "fri:3": { done: 3, load: 35, reps: 10, rir: 1, topHits: 0, lastRir: 1 },
      "fri:4": { done: 0, load: 30, reps: 10, rir: 2, topHits: 0, lastRir: null }
    },
    liftHistory: { "fri:4": [{ date: "2026-11-01", load: 28, reps: 10, rir: 2, hitTop: false, setsDone: 3 }] }
  });

  await page.locator(".liftrow").nth(4).click();
  await expect(page.locator("#exName")).toBeVisible();
  await expect(page.locator("#tempoLine"), "the cue must be on lift 5 too").toBeVisible();
  await expect(page.locator("#tempoLine")).toContainText("explode up");
  // the rest of the worst case is on screen too: prior line, suggestion, RIR hint
  await expect(page.locator("#prevLine")).toBeVisible();
  await expect(page.locator("#suggestText")).toBeVisible();
  await expect(page.locator("#rirHint")).toBeVisible();
  const ok = await page.evaluate(() => document.documentElement.scrollHeight <= window.innerHeight + 1);
  expect(ok, "lift 5 at 390x667 must not scroll").toBe(true);
});

test("the RIR explainer retires on the first logged set (B5-03)", async ({ page }) => {
  const errors = [];
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
  page.on("pageerror", (e) => errors.push(String(e)));

  await page.goto(url); // fresh profile: the one-time explainer shows
  await page.locator(".liftrow").first().click();
  await expect(page.locator("#rirHint")).toBeVisible();

  // log sets without ever tapping an RIR button (the programmed RIR is kept)
  await page.locator("#doneBtn").click();
  await page.locator("#skipRest").click();
  await page.locator("#doneBtn").click();
  await page.locator("#skipRest").click();
  await page.locator("#doneBtn").click();
  await page.locator("#skipRest").click(); // lift complete -> advance to lift 2

  await expect(page.locator("#exName")).toBeVisible();
  await expect(page.locator("#rirHint"), "the hint is gone on the next lift").toBeHidden();

  await page.reload();
  await expect(page.locator("#rirHint"), "the hint stays gone after reload").toBeHidden();

  expect(errors.filter((e) => !/vibrate|AudioContext/i.test(e))).toEqual([]);
});
