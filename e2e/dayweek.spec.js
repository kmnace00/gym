/* N24: Fri/Sat/Sun now live in the top header as real buttons — each carries
   a status dot from Stats.weekStatus, the viewed day reads selected, today
   gets its own distinct mark. Buttons switch through the same path as the
   chevrons (incl. the mid-edit reset), are ≥44px, and the screen-reader week
   sentence still exists. The old read-only under-title row is gone. */
const { test, expect } = require("@playwright/test");
const path = require("path");

const url = "file://" + path.resolve(__dirname, "..", "index.html");
const NAMES = ["Fri", "Sat", "Sun"];

/* Deterministic on any run day: todayDay()/dateKey() and the seed below are
   Friday-anchored, so pin a Friday clock. */
test.beforeEach(async ({ page }) => {
  await page.clock.install({ time: new Date("2026-11-06T10:00:00") });
});

async function weekStates(page) {
  return page.evaluate(() => {
    const p = Gym.load() || Gym.emptyPayload();
    const lens = { fri: Gym.DAYS.fri.ex.length, sat: Gym.DAYS.sat.ex.length, sun: Gym.DAYS.sun.ex.length };
    return {
      states: Gym.weekStatus(p, Gym.dateKey(), lens).map((w) => w.state),
      cur: p.cur
    };
  });
}

test("undoing every set after Finish clears the partial day dot (U133)", async ({ page }) => {
  await page.goto(url);
  await page.evaluate(() => localStorage.setItem("gym-tool-v2", JSON.stringify({
    v: 5, cur: "fri", idx: 0, bodyweight: 165, bodyweightSet: false, state: {}, liftHistory: {}, sessionLog: []
  })));
  await page.reload();
  await page.locator(".liftrow").first().click();
  for (let i = 0; i < 3; i++) { await page.locator("#doneBtn").click(); await page.locator("#skipRest").click(); }
  await page.locator("#backBtn").click();
  await page.locator("#finishBtn").click();
  await page.locator("#sumDone").click();
  await page.locator(".liftrow").first().click();
  for (let i = 0; i < 3; i++) await page.locator("#undoSetBtn").click();
  await page.locator("#backBtn").click();
  await expect(page.locator(".daytab").first()).toHaveClass(/today/); // stale partial pre-fix
  await expect(page.locator(".daytab").first()).toHaveAttribute("aria-label", /today/);
  await expect(page.locator("#dayWeekSummary")).toContainText("Fri today");
});

test("three header day buttons, states match Stats.weekStatus, ≥44px", async ({ page }) => {
  await page.goto(url);
  await page.evaluate(() => localStorage.clear());
  await page.reload();

  const cluster = page.locator("#dayCluster");
  await expect(cluster).toBeVisible();
  const tabs = cluster.locator(".daytab");
  await expect(tabs).toHaveCount(3);
  await expect(tabs).toHaveText(NAMES);
  await expect(cluster.locator(".dwdot")).toHaveCount(3);
  await expect(cluster.locator("button")).toHaveCount(3);

  const boxes = await page.evaluate(() =>
    [...document.querySelectorAll("#dayCluster .daytab")].map((e) => {
      const r = e.getBoundingClientRect();
      return { w: r.width, h: r.height };
    })
  );
  boxes.forEach((b, i) => {
    expect(b.h, NAMES[i] + " tab height ≥44px").toBeGreaterThanOrEqual(44);
    expect(b.w, NAMES[i] + " tab width ≥44px").toBeGreaterThanOrEqual(44);
  });

  const model = await weekStates(page);
  const classes = await page.evaluate(() =>
    [...document.querySelectorAll("#dayCluster .daytab")].map((e) => e.className)
  );
  model.states.forEach((state, i) => expect(classes[i], "dot state for " + NAMES[i]).toContain(state));

  const on = cluster.locator(".daytab.on");
  await expect(on).toHaveCount(1);
  const viewed = model.cur === "sat" ? "Sat" : model.cur === "sun" ? "Sun" : "Fri";
  await expect(on).toHaveText(viewed);
  await expect(on).toHaveAttribute("aria-pressed", "true");
  for (const tab of await cluster.locator(".daytab:not(.on)").all()) {
    await expect(tab).toHaveAttribute("aria-pressed", "false");
  }

  const sr = await page.locator("#dayWeekSummary").textContent();
  expect(sr).toContain("This week:");
  expect(sr).toContain("Viewing " + viewed);
  expect(sr).toContain("minutes");
});

test("the spoken week line reports time left once a set is logged (v172)", async ({ page }) => {
  /* N41: the SR sentence must tell the same story as the on-screen summary —
     full-day plan before any set, remaining-time once the day has started. */
  await page.goto(url);
  await page.evaluate(() => {
    localStorage.clear();
    const day = Gym.todayDay();
    const state = {};
    state[day + ":0"] = { done: 1, load: 60, reps: 6, rir: 2, sets: [] };
    localStorage.setItem("gym-tool-v2", JSON.stringify({
      v: 5, cur: day, idx: 1, bodyweight: 165, bodyweightSet: false, state,
      sessionLog: [], liftHistory: {}
    }));
  });
  await page.reload();

  const sr = await page.locator("#dayWeekSummary").textContent();
  expect(sr).toContain("left");
  expect(sr).toBeTruthy();
});

test("the selected marker follows the chevrons; a header tab switches the same way", async ({ page }) => {
  await page.goto(url);
  await page.evaluate(() => localStorage.clear());
  await page.reload();

  const start = (await page.locator("#dayCluster .daytab.on").textContent()).trim();
  const next = NAMES[(NAMES.indexOf(start) + 1) % 3];
  await page.locator("#dayNext").click();
  await expect(page.locator("#dayCluster .daytab.on")).toHaveText(next);
  await expect(page.locator("#dayCluster .daytab.on")).toHaveCount(1);
  await expect(page.locator("#dayWeekSummary")).toContainText("Viewing " + next);

  // a header tab back to Fri mirrors the chevron — same switch path
  const back = NAMES[0];
  await page.locator("#dayCluster .daytab", { hasText: back }).click();
  await expect(page.locator("#dayTitle")).toContainText(back);
  await expect(page.locator("#dayCluster .daytab.on")).toHaveText(back);
  await expect(page.locator("#dayWeekSummary")).toContainText("Viewing " + back);
});

test("a header day tap respects the mid-edit reset, matching the chevrons (B5-05)", async ({ page }) => {
  await page.goto(url);
  // seed one logged set on Friday's first lift and another on Saturday
  const date = await page.evaluate(() => Gym.dateKey());
  await page.evaluate((date) => {
    localStorage.setItem("gym-tool-v2", JSON.stringify({
      v: 2, cur: "fri", idx: 0, bodyweight: 75,
      state: {
        "fri:0": { done: 1, load: 60, reps: 6, rir: 2, topHits: 0, lastRir: 2, sets: [{ load: 60, reps: 6, rir: 2 }] },
        "sat:0": { done: 1, load: 90, reps: 5, rir: 2, topHits: 0, lastRir: 2, sets: [{ load: 90, reps: 5, rir: 2 }] }
      },
      liftHistory: {}, active: { id: "ses_edit", date, day: "fri", startedAt: Date.now() - 600000, endedAt: null, accSec: 600, runningSince: Date.now(), status: "active" }
    }));
  }, date);
  await page.reload();

  // edit a logged Friday set: the working load moves 60 -> 62.5 mid-edit
  await page.locator(".liftrow").first().click();
  await page.locator("[data-set='0']").click();
  await page.locator("#loadUp").click();
  await expect(page.locator("#loadVal")).toHaveText("62.5");

  // switch to Saturday via the header tab while the edit is still live
  await page.locator("#backBtn").click();
  await page.locator("#dayCluster .daytab[data-day='sat']").click();

  await page.locator(".liftrow").first().click();
  await expect(page.locator("#loadVal"), "the other day's lift must not inherit the stale edit").toHaveText("90");

  // Friday's own working record still equals the pre-edit values, not the half-made edit
  const state = await page.evaluate(() => JSON.parse(localStorage.getItem("gym-tool-v2")).state);
  expect(state["fri:0"].load, "Friday must keep its pre-edit load").toBe(60);
});

test("button labels carry the state word for assistive-tech; the row is not aria-hidden", async ({ page }) => {
  await page.goto(url);
  await page.evaluate(() => localStorage.clear());
  await page.reload();

  const model = await weekStates(page);
  const stateWord = { done: "done", today: "today", partial: "partly logged", missed: "missed", upcoming: "upcoming" };
  const tabs = page.locator("#dayCluster .daytab");
  await expect(tabs).toHaveCount(3);
  await expect(page.locator("#dayCluster")).not.toHaveAttribute("aria-hidden", "true");
  // each button's accessible name mentions its day's state
  for (let i = 0; i < 3; i++) {
    await expect(tabs.nth(i)).toHaveAttribute("aria-label", new RegExp(stateWord[model.states[i]]));
  }
  await expect(page.locator("#dayWeekSummary")).toHaveClass(/sr-only/);
  await expect(page.locator("#dayWeekSummary")).not.toBeEmpty();
});

for (const size of [{ width: 390, height: 667 }, { width: 390, height: 844 }]) {
  test.describe(`header day cluster fits 390x${size.height}`, () => {
    test.use({ viewport: size });

    test("the cluster keeps every lift row on one screen", async ({ page }) => {
      const errors = [];
      page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
      page.on("pageerror", (e) => errors.push(String(e)));

      await page.goto(url);
      await page.evaluate(() => localStorage.clear());
      await page.reload();
      await expect(page.locator("#dayCluster .daytab")).toHaveCount(3);

      const m = await page.evaluate(() => {
        const rows = [...document.querySelectorAll(".liftrow")];
        return {
          rowMin: Math.min(...rows.map((r) => r.getBoundingClientRect().height)),
          scrollH: document.documentElement.scrollHeight,
          innerH: window.innerHeight
        };
      });
      expect(m.rowMin, "lift rows keep the 44px tap target").toBeGreaterThanOrEqual(44);
      expect(m.scrollH, "day view still fits one screen").toBeLessThanOrEqual(m.innerH + 1);
      expect(errors).toEqual([]);
    });
  });
}

test.describe("header day cluster with a session in progress", () => {
  test.use({ viewport: { width: 390, height: 667 } });

  test("the taller in-progress header still fits one screen", async ({ page }) => {
    const errors = [];
    page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
    page.on("pageerror", (e) => errors.push(String(e)));

    await page.goto(url);
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.locator(".liftrow").first().click();
    await page.locator("#doneBtn").click();
    await page.locator("#skipRest").click();
    await page.locator("#backBtn").click();

    await expect(page.locator("#continueBtn")).toBeVisible();
    await expect(page.locator("#finishBtn")).toBeVisible();
    await expect(page.locator("#dayCluster .daytab")).toHaveCount(3);
    const m = await page.evaluate(() => ({
      rowMin: Math.min(...[...document.querySelectorAll(".liftrow")].map((r) => r.getBoundingClientRect().height)),
      scrollH: document.documentElement.scrollHeight,
      innerH: window.innerHeight
    }));
    expect(m.rowMin, "lift rows keep the 44px tap target").toBeGreaterThanOrEqual(44);
    expect(m.scrollH, "day view still fits one screen").toBeLessThanOrEqual(m.innerH + 1);
    expect(errors).toEqual([]);
  });
});