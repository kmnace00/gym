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

test("the plan line clears as soon as the first set is logged (B3-25)", async ({ page }) => {
  await seed(page, {
    v: 2, cur: "fri", idx: 0, state: {},
    liftHistory: {
      "fri:0": [{ date: "2026-11-01", load: 50, reps: 6, rir: 2, hitTop: true, setsDone: 3 }]
    }
  });
  await page.locator("#planBtn").click();
  await expect(page.locator("#daySummary")).toContainText("Planned");

  await page.locator(".liftrow").first().click();
  await page.locator("#doneBtn").click();
  await page.locator("#detailsBtn").click(); // rest screen → show the workout
  await page.locator("#backBtn").click();
  await expect(page.locator("#daySummary")).not.toContainText("Planned");
  await expect(page.locator("#daySummary")).toContainText("left");
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

test("restore uses the shared two-tap arm: arm, second tap opens the picker, timeout resets (B3-22)", async ({ page }) => {
  await page.goto(url);
  await page.locator("#menuBtn").click();
  await page.evaluate(() => {
    window.__pickerClicks = 0;
    document.getElementById("replaceFile").addEventListener("click", () => { window.__pickerClicks++; });
  });

  // first tap arms, second tap within the window opens the picker and resets the label
  await page.locator("#replaceBtn").click();
  await expect(page.locator("#replaceBtn")).toHaveText("Tap again to replace");
  await page.locator("#replaceBtn").click();
  expect(await page.evaluate(() => window.__pickerClicks)).toBe(1);
  await expect(page.locator("#replaceBtn")).toHaveText("Restore (replace)");

  // arming then waiting past the window restores the label without opening the picker
  await page.locator("#replaceBtn").click();
  await expect(page.locator("#replaceBtn")).toHaveText("Tap again to replace");
  await page.waitForTimeout(2700);
  await expect(page.locator("#replaceBtn")).toHaveText("Restore (replace)");
  expect(await page.evaluate(() => window.__pickerClicks)).toBe(1);
});

test("undo last reset restores the pre-reset payload", async ({ page }) => {
  const errors = [];
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });

  await page.goto(url);
  const { day, date } = await page.evaluate(() => ({ day: Gym.todayDay(), date: Gym.dateKey() }));
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

test("restarting a lift snapshots first, so the restore button brings it back", async ({ page }) => {
  await page.goto(url);
  const { day, date } = await page.evaluate(() => ({ day: Gym.todayDay(), date: Gym.dateKey() }));
  const plan = await page.evaluate((d) => ({
    s: Gym.DAYS[d].ex[0].s,
    id: Gym.DAYS[d].ex[0].id
  }), day);

  await page.evaluate(({ day, date, s, id }) => {
    const sets = Array.from({ length: s }, () => ({ load: 60, reps: 6, rir: 2 }));
    localStorage.setItem("gym-tool-v2", JSON.stringify({
      v: 4, cur: day, idx: 0, bodyweight: 165,
      state: { [day + ":0"]: { done: s, load: 60, reps: 6, rir: 2, sets } },
      liftHistory: {
        [day + ":0"]: [{ date, load: 60, reps: 6, rir: 2, hitTop: true, setsDone: s, sets, exId: id }]
      },
      sessionLog: [],
      active: { id: "ses_restart", date, day, startedAt: Date.now() - 1800000, endedAt: null, accSec: 1800, runningSince: null, status: "active" }
    }));
  }, { day, date, s: plan.s, id: plan.id });
  await page.reload();

  await page.locator(".liftrow").first().click();
  await page.locator("#resetLiftBtn").click();
  await expect(page.locator("#resetLiftBtn")).toHaveText("Tap again to restart");
  await page.locator("#resetLiftBtn").click();

  const cleared = await page.evaluate((d) => {
    const p = JSON.parse(localStorage.getItem("gym-tool-v2"));
    return { done: p.state[d + ":0"].done, entries: (p.liftHistory[d + ":0"] || []).length };
  }, day);
  expect(cleared).toEqual({ done: 0, entries: 0 });

  await page.locator("#menuBtn").click();
  await expect(page.locator("#restoreSnapshot")).toBeVisible();
  await page.locator("#restoreSnapshot").click();
  await expect(page.locator("#modalMsg")).toContainText("Snapshot restored");

  const back = await page.evaluate((d) => {
    const p = JSON.parse(localStorage.getItem("gym-tool-v2"));
    const arr = p.liftHistory[d + ":0"] || [];
    return { done: p.state[d + ":0"].done, sets: arr.length ? arr[arr.length - 1].sets.length : 0 };
  }, day);
  expect(back).toEqual({ done: plan.s, sets: plan.s });
});

test("a failed snapshot write is reported before a reset", async ({ page }) => {
  const errors = [];
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });

  await page.goto(url);
  const { day, date } = await page.evaluate(() => ({ day: Gym.todayDay(), date: Gym.dateKey() }));
  await page.evaluate(({ day, date }) => {
    localStorage.setItem("gym-tool-v2", JSON.stringify({
      v: 3, cur: day, idx: 0, bodyweight: 75, liftHistory: {}, sessionLog: [],
      state: {
        [day + ":0"]: {
          done: 3, load: 50, reps: 6, rir: 2,
          sets: [{ load: 50, reps: 6, rir: 2 }, { load: 50, reps: 6, rir: 2 }, { load: 50, reps: 6, rir: 2 }]
        }
      },
      active: { id: "ses_quota", date: date, day: day, startedAt: Date.now() - 600000, endedAt: null, accSec: 600, runningSince: null, status: "active" }
    }));
  }, { day, date });
  await page.reload();

  /* every snapshot write now throws, exactly like a full storage quota */
  await page.evaluate(() => {
    const orig = Storage.prototype.setItem;
    Storage.prototype.setItem = function (k, v) {
      if (String(k).indexOf("-snapshot") >= 0) throw new Error("QuotaExceededError");
      return orig.call(this, k, v);
    };
  });

  await page.locator("#menuBtn").click();
  await page.locator("#resetDay").click();
  await expect(page.locator("#resetDay")).toContainText("Tap again");
  await page.locator("#resetDay").click();
  await expect(page.locator("#modalMsg")).toContainText("no undo copy");

  const cleared = await page.evaluate((d) => JSON.parse(localStorage.getItem("gym-tool-v2")).state[d + ":0"].done, day);
  expect(cleared, "the reset still happens even without an undo copy").toBe(0);

  expect(errors.filter((e) => !/vibrate|AudioContext/i.test(e)), "no console errors").toEqual([]);
});

/* B4-02: a damaged payload keeps its recoverable history in memory, is only
   saved on "Keep recovered log", and never auto-overwrites the boot bytes. */
const salvageSizes = [{ width: 390, height: 667 }, { width: 390, height: 844 }];

for (const size of salvageSizes) {
  test.describe(`corrupt-payload salvage viewport 390x${size.height}`, () => {
    test.use({ viewport: size });

    test("recovered history is shown, kept only on demand, and renders", async ({ page }) => {
      const errors = [];
      page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
      page.on("pageerror", (e) => errors.push(String(e)));

      const noOverflow = async () => {
        const ok = await page.evaluate(() => document.documentElement.scrollHeight <= window.innerHeight + 1);
        expect(ok, "page must not scroll").toBe(true);
      };

      await page.goto(url);
      const seeded = await page.evaluate(() => {
        const day = Gym.todayDay(), date = Gym.dateKey();
        const good = {
          date, load: 77, reps: 6, rir: 2, hitTop: true, setsDone: 3,
          sets: [{ load: 77, reps: 6, rir: 2 }, { load: 77, reps: 6, rir: 2 }, { load: 77, reps: 6, rir: 2 }]
        };
        const raw = '{"v":4,"cur":"' + day + '","idx":0,"state":{},"sessionLog":[],"bodyweight":165,' +
          '"liftHistory":{"' + day + ':0":[' + JSON.stringify(good) + ',{"date":"2026-11-08","load":80';
        localStorage.setItem("gym-tool-v2", raw);
        return { raw, day, date };
      });
      await page.reload();

      await expect(page.locator("#saveBar")).toBeVisible();
      await expect(page.locator("#saveBarText")).toContainText("recovered");
      await expect(page.locator("#saveBarText")).toContainText("1 log entries recovered");
      await expect(page.locator("#saveBarDownload")).toBeVisible();
      await expect(page.locator("#saveBarAction")).toHaveText("Keep recovered log");
      await noOverflow();

      // the salvaged payload lives in memory: the boot bytes are untouched
      expect(await page.evaluate(() => localStorage.getItem("gym-tool-v2"))).toBe(seeded.raw);
      await page.waitForTimeout(400); // past the coalesced-save window
      expect(await page.evaluate(() => localStorage.getItem("gym-tool-v2"))).toBe(seeded.raw);

      await page.locator("#saveBarAction").click();
      await expect(page.locator("#saveBar")).toBeHidden();
      await expect(page.locator("#saveBarDownload")).toBeHidden();

      const saved = await page.evaluate((day) => {
        const p = JSON.parse(localStorage.getItem("gym-tool-v2"));
        return { v: p.v, entries: (p.liftHistory[day + ":0"] || []).map((e) => e.date) };
      }, seeded.day);
      expect(saved.v).toBe(5);
      expect(saved.entries).toEqual([seeded.date]);
      await noOverflow();

      // the recovered history feeds the day view: Plan today appears, and the
      // lift shows the recovered entry as its last session
      await expect(page.locator("#planBtn")).toBeVisible();
      await page.locator(".liftrow").first().click();
      await expect(page.locator("#suggestText")).toContainText("Last");
      await expect(page.locator("#prevLine")).toBeVisible();
      await noOverflow();

      expect(errors.filter((e) => !/vibrate|AudioContext/i.test(e))).toEqual([]);
    });

    test("a save failure after a salvaged boot surfaces the failure bar (B5-11)", async ({ page }) => {
      const errors = [];
      page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
      page.on("pageerror", (e) => errors.push(String(e)));

      await page.goto(url);
      await page.evaluate(() => {
        const day = Gym.todayDay(), date = Gym.dateKey();
        const good = { date, load: 77, reps: 6, rir: 2, hitTop: true, setsDone: 3,
          sets: [{ load: 77, reps: 6, rir: 2 }, { load: 77, reps: 6, rir: 2 }, { load: 77, reps: 6, rir: 2 }] };
        localStorage.setItem("gym-tool-v2", '{"v":4,"cur":"' + day + '","idx":0,"state":{},"sessionLog":[],"bodyweight":165,' +
          '"liftHistory":{"' + day + ':0":[' + JSON.stringify(good) + ',{"date":"2026-11-08","load":80');
      });
      await page.reload();

      await expect(page.locator("#saveBarText")).toContainText("1 log entries recovered");

      /* the write now fails, exactly like a full storage quota */
      await page.evaluate(() => {
        const orig = Storage.prototype.setItem;
        window.__origSet = orig;
        Storage.prototype.setItem = function (k, v) {
          if (String(k) === "gym-tool-v2") throw new Error("QuotaExceededError");
          return orig.call(this, k, v);
        };
      });

      await page.locator(".liftrow").first().click();
      await page.locator("#doneBtn").click();          // commit() → save fails
      await expect(page.locator("#saveBar"), "the failure bar must not be masked by the salvage notice").toBeVisible();
      await expect(page.locator("#saveBarText")).toContainText("Couldn't save");
      await expect(page.locator("#saveBarText")).toContainText("1 recovered entries are not saved yet");
      await expect(page.locator("#saveBarAction")).toHaveText("Export");
      await expect(page.locator("#saveBarDownload")).toBeVisible();
      const ok = await page.evaluate(() => document.documentElement.scrollHeight <= window.innerHeight + 1);
      expect(ok, "page must not scroll").toBe(true);

      /* the write recovers → the salvage bar (with its Keep action) comes back */
      await page.evaluate(() => { Storage.prototype.setItem = window.__origSet; });
      await page.locator("#skipRest").click();
      await page.locator("#doneBtn").click();
      await expect(page.locator("#saveBarAction")).toHaveText("Keep recovered log");
      await expect(page.locator("#saveBarText")).toContainText("keep the recovered log");
      await page.locator("#saveBarAction").click();
      await expect(page.locator("#saveBar")).toBeHidden();

      expect(errors.filter((e) => !/vibrate|AudioContext/i.test(e))).toEqual([]);
    });
  });
}
