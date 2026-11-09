/* Pass 3 checks: Plan today, per-set history, heatmap, restore-replace. */
const { test, expect } = require("@playwright/test");
const path = require("path");

const url = "file://" + path.resolve(__dirname, "..", "index.html");

async function seed(page, obj) {
  await page.goto(url);
  await page.evaluate((o) => localStorage.setItem("gym-tool-v2", JSON.stringify(o)), obj);
  await page.reload();
}

test("Plan today pre-fills every lift from history in one tap", async ({ page }) => {
  await seed(page, {
    v: 2, cur: "fri", idx: 0, state: {},
    liftHistory: {
      "fri:0": [{ date: "2026-11-01", load: 50, reps: 6, rir: 2, hitTop: true, setsDone: 3 }]
    }
  });
  await expect(page.locator("#planBtn")).toBeVisible();
  await page.locator("#planBtn").click();
  await expect(page.locator("#daySummary")).toContainText("Planned");
  await page.locator(".liftrow").first().click();
  await expect(page.locator("#loadVal")).toHaveText("52.5");
});

test("lift view shows the previous session's per-set values and its date", async ({ page }) => {
  await seed(page, {
    v: 2, cur: "fri", idx: 0,
    state: { "fri:0": { done: 0, load: 55, reps: 6, rir: 2, topHits: 0, lastRir: null } },
    liftHistory: {
      "fri:0": [{
        date: "2026-11-01", load: 55, reps: 6, rir: 2, hitTop: true, setsDone: 3,
        sets: [{ load: 50, reps: 6, rir: 2 }, { load: 52.5, reps: 6, rir: 2 }, { load: 55, reps: 5, rir: 1 }]
      }]
    }
  });
  await page.locator(".liftrow").first().click();
  await expect(page.locator("#prevLine")).toBeVisible();
  await expect(page.locator("#prevLine")).toContainText("50×6");
  await expect(page.locator("#suggestText")).toContainText("Nov 1");
});

test("progress view renders the 8-week training heatmap without scrolling", async ({ page }) => {
  await page.goto(url);
  await page.evaluate(() => {
    const key = (dt) => dt.getFullYear() + "-" + String(dt.getMonth() + 1).padStart(2, "0") + "-" + String(dt.getDate()).padStart(2, "0");
    localStorage.setItem("gym-tool-v2", JSON.stringify({
      v: 2, cur: "fri", idx: 0, state: {},
      liftHistory: { "fri:0": [{ date: key(new Date()), load: 50, reps: 6, setsDone: 3 }] }
    }));
  });
  await page.reload();
  await page.locator("#progressBtn").click();
  await expect(page.locator("#heatmap .hweek")).toHaveCount(8);
  await expect(page.locator("#pHeatCount")).toContainText("/24");
  const ok = await page.evaluate(() => document.documentElement.scrollHeight <= window.innerHeight + 1);
  expect(ok, "progress view with heatmap must not scroll").toBe(true);
});

test("Restore (replace) swaps the whole payload after a two-tap arm", async ({ page }) => {
  await page.goto(url);
  const backup = JSON.stringify({
    v: 2, cur: "fri", idx: 0,
    state: { "fri:0": { done: 0, load: 88, reps: 6, rir: 2, topHits: 0, lastRir: null } },
    liftHistory: {}
  });
  await page.locator("#menuBtn").click();
  await page.locator("#replaceBtn").click();
  await expect(page.locator("#replaceBtn")).toContainText("Tap again");
  await page.setInputFiles("#replaceFile", { name: "b.json", mimeType: "application/json", buffer: Buffer.from(backup) });
  await expect(page.locator("#modalMsg")).toContainText("restored");
  await page.locator("#modalClose").click();
  await page.locator(".liftrow").first().click();
  await expect(page.locator("#loadVal")).toHaveText("88");
});

test("undo last reset restores the pre-reset payload", async ({ page }) => {
  const errors = [];
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });

  await page.goto(url);
  const { day, date } = await today(page);
  await page.evaluate(({ day, date }) => {
    localStorage.setItem("gym-tool-v2", JSON.stringify({
      v: 3, cur: day, idx: 0, bodyweight: 75, liftHistory: {}, sessionLog: [],
      state: {
        [day + ":0"]: {
          done: 3, load: 88, reps: 6, rir: 2,
          sets: [{ load: 88, reps: 6, rir: 2 }, { load: 88, reps: 6, rir: 2 }, { load: 88, reps: 6, rir: 2 }]
        }
      },
      active: { id: "ses_snap", date: date, day: day, startedAt: Date.now() - 600000, endedAt: null, accSec: 600, runningSince: null, status: "active" }
    }));
  }, { day, date });
  await page.reload();

  await page.locator("#menuBtn").click();
  await page.locator("#resetDay").click();
  await expect(page.locator("#resetDay")).toContainText("Tap again");
  await page.locator("#resetDay").click();
  await expect(page.locator("#modalMsg")).toContainText("Day reset");

  const cleared = await page.evaluate((d) => JSON.parse(localStorage.getItem("gym-tool-v2")).state[d + ":0"].done, day);
  expect(cleared, "reset clears the sets").toBe(0);

  await expect(page.locator("#restoreSnapshot")).toBeVisible();
  await page.locator("#restoreSnapshot").click();
  await expect(page.locator("#modalMsg")).toContainText("Snapshot restored");

  await page.locator("#modalClose").click();
  await page.locator(".liftrow").first().click();
  await expect(page.locator("#loadVal")).toHaveText("88");
  await expect(page.locator("#setCount")).toContainText("All 3 sets done");

  const restored = await page.evaluate((d) => JSON.parse(localStorage.getItem("gym-tool-v2")).state[d + ":0"].done, day);
  expect(restored, "restored payload has the pre-reset sets").toBe(3);

  expect(errors.filter((e) => !/vibrate|AudioContext/i.test(e)), "no console errors").toEqual([]);
});
