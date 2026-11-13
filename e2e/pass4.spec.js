/* Pass 4: session boundary, set truth, corruption quarantine, finish summary. */
const { test, expect } = require("@playwright/test");
const path = require("path");
const fs = require("fs");

const url = "file://" + path.resolve(__dirname, "..", "index.html");

async function today(page) {
  return page.evaluate(() => ({ day: Gym.todayDay(), date: Gym.dateKey() }));
}

test("a session from an earlier date rolls over and clears sets on boot", async ({ page }) => {
  await page.goto(url);
  const { day } = await today(page);
  const old = await page.evaluate(() => {
    const d = new Date(); d.setDate(d.getDate() - 2); return Gym.dateKey(d);
  });
  await page.evaluate(({ old }) => {
    const sets = [{ load: 60, reps: 6, rir: 2 }];
    localStorage.setItem("gym-tool-v2", JSON.stringify({
      v: 3, cur: "fri", idx: 0, bodyweight: 75, sessionLog: [],
      active: { id: "ses_old", date: old, day: "fri", startedAt: Date.now() - 3600000, endedAt: null, accSec: 600, runningSince: null, status: "active" },
      state: { "fri:0": { done: 3, load: 60, reps: 6, rir: 2, sets: sets } },
      liftHistory: { "fri:0": [{ date: old, load: 60, reps: 6, rir: 2, hitTop: true, setsDone: 3, sets: sets }] }
    }));
  }, { old });
  await page.reload();

  const label = await page.evaluate((d) => Gym.DAYS[d].label, day);
  await expect(page.locator("#dayTitle")).toContainText(label.split(" — ")[0]);
  await expect(page.locator(".liftrow").first()).not.toHaveClass(/done/);
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem("gym-tool-v2")));
  expect(saved.sessionLog.length).toBe(1);
  expect(saved.active.day).toBe(day);
});

test("a corrupt payload is quarantined, never silently overwritten", async ({ page }) => {
  await page.goto(url);
  await page.evaluate(() => localStorage.setItem("gym-tool-v2", "{broken"));
  await page.reload();
  await expect(page.locator("#saveBar")).toBeVisible();
  // B3-21: the bar names the empty log and tells the lifter to download first
  await expect(page.locator("#saveBarText")).toContainText("couldn't be read");
  await expect(page.locator("#saveBarText")).toContainText("empty log");
  await expect(page.locator("#saveBarText")).toContainText("download it before doing anything else");
  await expect(page.locator("#saveBarAction")).toHaveText("Download copy");
  const raw = await page.evaluate(() => localStorage.getItem("gym-tool-v2-corrupt"));
  expect(raw).toBe("{broken");
});

test("a newer-version payload is preserved, reported, and downloadable at boot", async ({ page }) => {
  await page.goto(url);
  const raw = JSON.stringify({ v: 99, sentinel: "keep-me" });
  await page.evaluate((raw) => localStorage.setItem("gym-tool-v2", raw), raw);
  await page.reload();

  await expect(page.locator("#saveBar")).toBeVisible();
  await expect(page.locator("#saveBarText")).toContainText("newer version");
  await expect(page.locator("#saveBarText")).toContainText("empty log");
  await expect(page.locator("#saveBarAction")).toHaveText("Download copy");

  // boot says so and keeps both copies: the store and the -future copy
  expect(await page.evaluate(() => localStorage.getItem("gym-tool-v2"))).toBe(raw);
  expect(await page.evaluate(() => localStorage.getItem("gym-tool-v2-future"))).toBe(raw);
  expect(await page.evaluate(() => Gym.futureRaw())).toBe(raw);

  const dlPromise = page.waitForEvent("download");
  await page.locator("#saveBarAction").click();
  const dl = await dlPromise;
  expect(dl.suggestedFilename()).toContain("gym-future-");
  expect(fs.readFileSync(await dl.path(), "utf8")).toBe(raw);
});

test("all lifts done shows Finish workout and a summary sheet", async ({ page }) => {
  await page.goto(url);
  const { day, date } = await today(page);
  await page.evaluate(({ day, date }) => {
    const state = {};
    Gym.DAYS[day].ex.forEach((e, i) => {
      state[day + ":" + i] = { done: e.s, load: e.load || 0, reps: e.r, rir: e.rir, sets: [] };
    });
    localStorage.setItem("gym-tool-v2", JSON.stringify({
      v: 3, cur: day, idx: 0, bodyweight: 75, state, liftHistory: {}, sessionLog: [],
      active: { id: "ses_fin", date: date, day: day, startedAt: Date.now() - 1800000, endedAt: null, accSec: 1800, runningSince: null, status: "active" }
    }));
  }, { day, date });
  await page.reload();

  await expect(page.locator("#finishBtn")).toBeVisible();
  await page.locator("#finishBtn").click();
  await expect(page.locator("#summary")).toBeVisible();
  await expect(page.locator("#sumSets")).toHaveText("24");
  await expect(page.locator("#sumDuration")).toHaveText("30:00");
  await page.locator("#sumDone").click();
  await expect(page.locator("#summary")).toBeHidden();
});

test("an extra set is banked into history", async ({ page }) => {
  await page.goto(url);
  const { day } = await today(page);
  const plan = await page.evaluate((d) => ({ s: Gym.DAYS[d].ex[0].s }), day);
  await page.reload();

  await page.locator(".liftrow").first().click();
  for (let i = 0; i < plan.s; i++) {
    await page.locator("#doneBtn").click();
    await page.locator("#skipRest").click();
  }
  // the last rest auto-advances; go back to the completed lift to add a set
  await page.locator("#backBtn").click();
  await page.locator(".liftrow").first().click();
  await page.locator("#doneBtn").click(); // extra set
  await page.locator("#skipRest").click();

  const sets = await page.evaluate((d) => {
    const p = JSON.parse(localStorage.getItem("gym-tool-v2"));
    const arr = p.liftHistory[d + ":0"];
    return arr[arr.length - 1].sets.length;
  }, day);
  expect(sets).toBe(plan.s + 1);

  // undoing that extra set re-banks the shorter array (it used to leave 4 sets)
  await page.locator("#backBtn").click();
  await page.locator(".liftrow").first().click();
  await page.locator("#undoSetBtn").click();
  const afterUndo = await page.evaluate((d) => {
    const p = JSON.parse(localStorage.getItem("gym-tool-v2"));
    const arr = p.liftHistory[d + ":0"];
    return arr[arr.length - 1].sets.length;
  }, day);
  expect(afterUndo).toBe(plan.s);
});

test("tapping a logged set edits it in place", async ({ page }) => {
  await page.goto(url);
  await page.locator(".liftrow").first().click();
  await page.locator("#doneBtn").click();
  await page.locator("#skipRest").click();

  const row = page.locator("#setLog .setrow").nth(0);
  const before = await row.textContent();
  await row.click();
  await expect(page.locator("#setCount")).toContainText("Editing set 1");
  await page.locator("#repUp").click();
  await expect(page.locator("#doneBtn")).toHaveText("Done editing");
  await page.locator("#doneBtn").click();
  await expect(page.locator("#setLog .setrow").nth(0)).not.toHaveText(before);
});

test("navigating away from a set edit restores the working load", async ({ page }) => {
  const errors = [];
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });

  await page.goto(url);
  const { day } = await today(page);

  await page.locator(".liftrow").first().click();
  const base = await page.locator("#loadVal").textContent();

  await page.locator("#doneBtn").click();  // logs set 1 at `base`
  await page.locator("#skipRest").click();

  await page.locator("#loadUp").click();   // working load bumped by the lift step
  const bumped = await page.locator("#loadVal").textContent();
  expect(bumped).not.toBe(base);

  await page.locator("#setLog .setrow").nth(0).click();
  await expect(page.locator("#loadVal")).toHaveText(base);
  await expect(page.locator("#setCount")).toContainText("Editing set 1");

  await page.locator("#backBtn").click();
  await page.locator(".liftrow").first().click();

  await expect(page.locator("#loadVal")).toHaveText(bumped);
  await expect(page.locator("#setCount")).not.toContainText("Editing");

  const saved = await page.evaluate((d) => {
    const p = JSON.parse(localStorage.getItem("gym-tool-v2"));
    return p.state[d + ":0"].load;
  }, day);
  expect(saved).toBe(parseFloat(bumped));

  expect(errors.filter((e) => !/vibrate|AudioContext/i.test(e)), "no console errors").toEqual([]);
});

test("the week strip and the day tabs are gone; chevrons switch days (N12)", async ({ page }) => {
  await page.goto(url);
  await expect(page.locator("#weekStrip")).toHaveCount(0);
  await expect(page.locator(".day")).toHaveCount(0);
  await expect(page.locator("#dayPrev")).toBeVisible();
  await expect(page.locator("#dayNext")).toBeVisible();
  const before = await page.locator("#dayTitle").textContent();
  await page.locator("#dayNext").click();
  await expect(page.locator("#dayTitle")).not.toHaveText(before);
  await page.locator("#dayPrev").click();
  await expect(page.locator("#dayTitle")).toHaveText(before);
});

test("undoing the edited set restores the working load", async ({ page }) => {
  const errors = [];
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });

  await page.goto(url);
  const { day } = await today(page);

  await page.locator(".liftrow").first().click();
  const base = parseFloat(await page.locator("#loadVal").textContent());

  await page.locator("#loadUp").click();
  const set1 = parseFloat(await page.locator("#loadVal").textContent());
  await page.locator("#doneBtn").click();
  await page.locator("#skipRest").click();

  await page.locator("#loadUp").click();
  const set2 = parseFloat(await page.locator("#loadVal").textContent());
  await page.locator("#doneBtn").click();
  await page.locator("#skipRest").click();

  await page.locator("#loadUp").click();
  const work = parseFloat(await page.locator("#loadVal").textContent());
  expect(work).not.toBe(set2);

  await page.locator("#setLog .setrow").nth(1).click();
  await expect(page.locator("#loadVal")).toHaveText(String(set2));
  await expect(page.locator("#setCount")).toContainText("Editing set 2");

  await page.locator("#undoSetBtn").click();
  await expect(page.locator("#setLog .setrow.done")).toHaveCount(1);

  await page.locator("#repUp").click();
  await expect(page.locator("#loadVal")).toHaveText(String(work));

  await page.locator("#backBtn").click();
  await page.locator(".liftrow").first().click();
  await expect(page.locator("#loadVal")).toHaveText(String(work));

  const saved = await page.evaluate((d) => {
    const p = JSON.parse(localStorage.getItem("gym-tool-v2"));
    return p.state[d + ":0"].load;
  }, day);
  expect(saved).toBe(work);

  expect(errors.filter((e) => !/vibrate|AudioContext/i.test(e)), "no console errors").toEqual([]);
});

test("finishing from the rest screen finalizes the session and shows the summary", async ({ page }) => {
  const errors = [];
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });

  await page.goto(url);
  const { day, date } = await today(page);
  await page.evaluate(({ day, date }) => {
    const state = {};
    const ex = Gym.DAYS[day].ex;
    ex.forEach((e, i) => {
      if (i === ex.length - 1) {
        state[day + ":" + i] = {
          done: e.s - 1,
          load: e.load || 0,
          reps: e.r,
          rir: e.rir,
          sets: Array.from({ length: e.s - 1 }, () => ({ load: e.load || 0, reps: e.r, rir: e.rir }))
        };
      } else {
        state[day + ":" + i] = { done: e.s, load: e.load || 0, reps: e.r, rir: e.rir, sets: [] };
      }
    });
    localStorage.setItem("gym-tool-v2", JSON.stringify({
      v: 3, cur: day, idx: 0, bodyweight: 75, state, liftHistory: {}, sessionLog: [],
      active: { id: "ses_fin2", date: date, day: day, startedAt: Date.now() - 1800000, endedAt: null, accSec: 1800, runningSince: null, status: "active" }
    }));
  }, { day, date });
  await page.reload();

  const rows = page.locator(".liftrow");
  await rows.nth(await rows.count() - 1).click();

  await page.locator("#doneBtn").click();   // last set logged -> rest starts
  await page.locator("#skipRest").click();  // arms "Tap again to finish"
  await page.locator("#skipRest").click();  // finishes

  await expect(page.locator("#summary")).toBeVisible();
  await expect(page.locator("#sumSets")).toHaveText("24");
  await expect(page.locator("#sumDuration")).toHaveText("30:00");

  const saved = await page.evaluate(() => {
    const p = JSON.parse(localStorage.getItem("gym-tool-v2"));
    return { status: p.active.status, log: p.sessionLog.length };
  });
  expect(saved, "session finalized in storage").toEqual({ status: "complete", log: 1 });

  expect(errors.filter((e) => !/vibrate|AudioContext/i.test(e)), "no console errors").toEqual([]);
});

test("extra sets stop at the store limit", async ({ page }) => {
  const errors = [];
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });

  await page.goto(url);
  const { day, date } = await today(page);
  await page.evaluate(({ day, date }) => {
    localStorage.setItem("gym-tool-v2", JSON.stringify({
      v: 3, cur: day, idx: 0, bodyweight: 75, liftHistory: {}, sessionLog: [],
      state: {
        [day + ":0"]: {
          done: 12, load: 50, reps: 6, rir: 2,
          sets: Array.from({ length: 12 }, () => ({ load: 50, reps: 6, rir: 2 }))
        }
      },
      active: { id: "ses_cap", date: date, day: day, startedAt: Date.now() - 600000, endedAt: null, accSec: 600, runningSince: null, status: "active" }
    }));
  }, { day, date });
  await page.reload();

  await page.locator(".liftrow").first().click();
  await expect(page.locator("#doneBtn")).toHaveText("✓ Add extra set");
  await page.locator("#doneBtn").click();

  const saved = await page.evaluate((d) => {
    const p = JSON.parse(localStorage.getItem("gym-tool-v2"));
    return { done: p.state[d + ":0"].done, sets: p.state[d + ":0"].sets.length };
  }, day);
  expect(saved.done, "done stays capped at SETS_MAX").toBe(12);
  expect(saved.sets, "sets array stays capped at SETS_MAX").toBe(12);
  await expect(page.locator("#setLog .setrow")).toHaveCount(12);
  await expect(page.locator("#hint")).toContainText("Set limit");

  expect(errors.filter((e) => !/vibrate|AudioContext/i.test(e)), "no console errors").toEqual([]);
});
