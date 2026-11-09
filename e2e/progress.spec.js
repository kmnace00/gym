/* Progress dashboard, merge-on-import, and the no-scroll invariant. */
const { test, expect } = require("@playwright/test");
const path = require("path");

const url = "file://" + path.resolve(__dirname, "..", "index.html");

async function seed(page, obj) {
  await page.goto(url);
  await page.evaluate((o) => localStorage.setItem("gym-tool-v2", JSON.stringify(o)), obj);
  await page.reload();
}

test("progress view opens, shows stats, and Back returns to the day", async ({ page }) => {
  await seed(page, {
    v: 2, cur: "fri", idx: 0,
    state: { "fri:0": { done: 3 } },
    liftHistory: {
      "fri:0": [
        { date: "2026-10-01", load: 50, reps: 6, rir: 2, hitTop: false, setsDone: 3 },
        { date: "2026-11-01", load: 55, reps: 6, rir: 2, hitTop: true, setsDone: 3 }
      ],
      "sat:0": [{ date: "2026-11-01", load: 90, reps: 7, rir: 2, hitTop: false, setsDone: 3 }]
    }
  });
  await page.locator("#progressBtn").click();
  await expect(page.locator("#progressView")).toBeVisible();
  await expect(page.locator("#pSessions")).toHaveText("2"); // two workout dates
  await expect(page.locator("#pSets")).toHaveText("9");
  await expect(page.locator("#pDays")).toHaveText(/\d\/3/);
  await expect(page.locator("#pMovers .pmover")).toHaveCount(1); // only fri:0 has two entries
  await page.locator("#backBtn").click();
  await expect(page.locator("#dayView")).toBeVisible();
});

test("progress view fits the screen with no vertical scroll", async ({ page }) => {
  await seed(page, { v: 2, cur: "fri", idx: 0, state: {}, liftHistory: {} });
  await page.locator("#progressBtn").click();
  await expect(page.locator("#progressView")).toBeVisible();
  const ok = await page.evaluate(() => document.documentElement.scrollHeight <= window.innerHeight + 1);
  expect(ok, "progress view must not scroll").toBe(true);
  await expect(page.locator("#pMovers")).toBeVisible();
});

test("import merges history instead of replacing it", async ({ page }) => {
  await seed(page, {
    v: 2, cur: "fri", idx: 0, state: {},
    liftHistory: { "fri:0": [{ date: "2026-10-01", load: 50, reps: 6, rir: 2, hitTop: false, setsDone: 3 }] }
  });
  const backup = JSON.stringify({
    v: 2, cur: "fri", idx: 0, state: {},
    liftHistory: { "fri:0": [{ date: "2026-11-01", load: 55, reps: 6, rir: 2, hitTop: true, setsDone: 3 }] }
  });
  await page.locator("#menuBtn").click();
  await page.setInputFiles("#importFile", { name: "b.json", mimeType: "application/json", buffer: Buffer.from(backup) });
  await expect(page.locator("#modalMsg")).toContainText("merged");
  await page.locator("#modalClose").click();
  await page.locator("#progressBtn").click();
  await expect(page.locator("#pSessions")).toHaveText("2"); // both sessions kept
});

test("a payload with absurd counts renders bounded sets, not a hang", async ({ page }) => {
  const errors = [];
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
  page.on("pageerror", (e) => errors.push(String(e)));

  await seed(page, {
    v: 3, cur: "fri", idx: 0,
    state: {
      "fri:0": {
        done: 1e9, topHits: 1e9, load: 50, reps: 6, rir: 2,
        sets: new Array(4000).fill({ load: 50, reps: 6, rir: 2 })
      }
    },
    liftHistory: { "fri:0": [{ date: "2026-10-01", load: 50, reps: 6, rir: 2, setsDone: 1e9 }] },
    sessionLog: [{ id: "ses_x", date: "2026-11-01", day: "fri", status: "complete",
      accSec: 1e9, durationSec: 1e9, lifts: { "fri:0": { done: 1e9, sets: [] } } }],
    bodyweight: 1e9
  });

  await page.locator(".liftrow").first().click();
  await expect(page.locator("#setCount")).toContainText("All 3 sets done");
  const rows = await page.locator("#setLog .setrow").count();
  expect(rows, "the set log is bounded by DONE_MAX, not the imported count").toBeLessThanOrEqual(12);
  const ok = await page.evaluate(() => document.documentElement.scrollHeight <= window.innerHeight + 1);
  expect(ok, "a hostile payload must not break the no-scroll invariant").toBe(true);

  await page.locator("#backBtn").click();
  await page.locator("#progressBtn").click();
  const stats = await page.evaluate(() => Array.from(document.querySelectorAll(".pv")).map((e) => e.textContent));
  expect(stats.some((v) => /Infinity|NaN/.test(v)), "no Infinity/NaN in the progress stats").toBe(false);

  expect(errors.filter((e) => !/vibrate|AudioContext/i.test(e)), "no console errors").toEqual([]);
});

test("the This-week counter uses the Fri–Sun block, not a rolling 7 days", async ({ page }) => {
  const errors = [];
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
  page.on("pageerror", (e) => errors.push(String(e)));

  await page.clock.install({ time: new Date("2026-11-06T10:00:00") }); // a Friday
  await seed(page, {
    v: 3, cur: "fri", idx: 0, state: {}, bodyweight: 75, sessionLog: [],
    liftHistory: {
      "fri:0": [
        { date: "2026-10-31", load: 50, reps: 6, rir: 2, setsDone: 3 },
        { date: "2026-11-06", load: 50, reps: 6, rir: 2, setsDone: 3 }
      ],
      "sat:0": [{ date: "2026-11-01", load: 60, reps: 6, rir: 2, setsDone: 3 }],
      "sun:0": [{ date: "2026-10-31", load: 40, reps: 8, rir: 2, setsDone: 3 }]
    }
  });

  await page.locator("#progressBtn").click();
  await expect(page.locator("#pDays")).toHaveText("1/3");
  await expect(page.locator("#pSub")).toContainText("1/3 this week");
  await expect(page.locator("#pHeatCount")).toHaveText(/\/24$/);

  await page.locator("#backBtn").click();
  await expect(page.locator("#daySummary")).toContainText("8 lifts · ");

  expect(errors.filter((e) => !/vibrate|AudioContext/i.test(e)), "no console errors").toEqual([]);
});

test("trend sparkline is opt-in via the Trend pill", async ({ page }) => {
  await seed(page, {
    v: 2, cur: "fri", idx: 0,
    state: { "fri:0": { done: 0, load: 55, reps: 6, rir: 2, topHits: 0, lastRir: null } },
    liftHistory: {
      "fri:0": [
        { date: "2026-10-01", load: 50, reps: 6, rir: 2, hitTop: false, setsDone: 3 },
        { date: "2026-11-01", load: 55, reps: 6, rir: 2, hitTop: true, setsDone: 3 }
      ]
    }
  });
  await page.locator(".liftrow").first().click();
  await expect(page.locator("#sparkWrap")).toBeHidden();
  await page.locator("#trendToggle").click();
  await expect(page.locator("#sparkWrap")).toBeVisible();
});
