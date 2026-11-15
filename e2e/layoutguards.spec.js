/* Layout invariants (Khang's recurring spacing bugs, Nov 13): nothing in the
   app shell may shrink below its content. Rows keep their full height and the
   list scrolls; header buttons never paint over the summary line; the sethead
   action pills never overlap each other or their neighbours. These guards
   assert GEOMETRY (containment + non-overlap), not screenshots, so a future
   "fix" that reintroduces shrink-to-fit fails here first. */
const { test, expect } = require("@playwright/test");
const path = require("path");

const url = "file://" + path.resolve(__dirname, "..", "index.html");

function overlapArea(a, b) {
  if (!a || !b) return 0;
  const x = Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x));
  const y = Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y));
  return x * y;
}

async function boxes(page, selectors) {
  return page.evaluate((sels) => {
    const box = (el) => {
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { x: r.x, y: r.y, w: r.width, h: r.height };
    };
    const out = {};
    for (const [key, sel] of Object.entries(sels)) {
      out[key] = sel.startsWith("all:")
        ? [...document.querySelectorAll(sel.slice(4))].map(box)
        : box(document.querySelector(sel));
    }
    return out;
  }, selectors);
}

function expectContained(outer, inner, label) {
  expect(inner, label + " exists").not.toBeNull();
  expect(inner.x, label + " left inside").toBeGreaterThanOrEqual(outer.x - 2);
  expect(inner.y, label + " top inside").toBeGreaterThanOrEqual(outer.y - 2);
  expect(inner.x + inner.w, label + " right inside").toBeLessThanOrEqual(outer.x + outer.w + 2);
  expect(inner.y + inner.h, label + " bottom inside").toBeLessThanOrEqual(outer.y + outer.h + 2);
}

async function seedBulgarianRest(page) {
  const { day, date } = await page.evaluate(() => ({ day: Gym.todayDay(), date: Gym.dateKey() }));
  await page.evaluate(({ day, date }) => {
    const ex = Gym.DAYS[day].ex;
    const state = {};
    ex.forEach((e, i) => {
      state[day + ":" + i] = { done: i < 2 ? e.s : i === 2 ? 2 : 0, load: e.load || 0, reps: e.r, rir: e.rir, sets: [] };
    });
    localStorage.setItem("gym-tool-v2", JSON.stringify({
      v: 4, cur: day, idx: 2, bodyweight: 75, state, liftHistory: {}, sessionLog: [],
      active: { id: "ses_guard", date, day, startedAt: Date.now() - 2400000, endedAt: null, accSec: 2400, runningSince: Date.now(), status: "active" }
    }));
  }, { day, date });
  await page.reload();
  await page.locator(".liftrow").nth(2).click();
  await page.locator("#doneBtn").click(); // final Bulgarian set -> rest starts
  await expect(page.locator("#timerBar")).toHaveClass(/active/);
}

for (const vp of [{ width: 390, height: 844 }, { width: 360, height: 800 }]) {
  test(`day view under the rest peek never crushes rows or the header (${vp.width}x${vp.height})`, async ({ page }) => {
    await page.setViewportSize(vp);
    await page.goto(url);
    await seedBulgarianRest(page);
    await page.locator("#detailsBtn").click(); // peek: show workout under the rest card
    await page.locator("#backBtn").click();    // day view while still resting
    await page.waitForTimeout(250);

    const m = await boxes(page, {
      rows: "all:.liftrow",
      names: "all:.liftrow .liftname",
      metas: "all:.liftrow .liftmeta",
      daysub: ".daysub",
      finishBtn: "#finishBtn",
      contBtn: "#continueBtn",
      planBtn: "#planBtn",
      daytop: ".daytop"
    });

    expect(m.rows.length).toBe(8);
    m.rows.forEach((row, i) => {
      expect(row.h, `row ${i} keeps at least tap-target height`).toBeGreaterThanOrEqual(44);
      expectContained(row, m.names[i], `row ${i} name`);
      expectContained(row, m.metas[i], `row ${i} meta`);
    });
    for (const [key, btn] of [["finish", m.finishBtn], ["continue", m.contBtn], ["plan", m.planBtn]]) {
      if (btn && btn.w > 0) {
        expect(overlapArea(btn, m.daysub), `${key} button must not paint over the summary line`).toBeLessThanOrEqual(6);
        expectContained(m.daytop, btn, `${key} button inside daytop`);
      }
    }
  });
}

test("sethead action pills never overlap in any lift state", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(url);
  await page.locator(".liftrow").nth(3).click(); // Incline DB press
  await page.waitForTimeout(250);

  async function assertSethead(stage) {
    const m = await boxes(page, {
      swap: "#swapBtn", undo: "#undoSetBtn", restart: "#resetLiftBtn",
      sethead: ".sethead", guide: ".guide", setrow: ".setrow"
    });
    const pills = [["swap", m.swap], ["undo", m.undo], ["restart", m.restart]].filter(([, b]) => b && b.w > 0);
    for (let i = 0; i < pills.length; i++) {
      for (let j = i + 1; j < pills.length; j++) {
        expect(overlapArea(pills[i][1], pills[j][1]), `${stage}: ${pills[i][0]} must not overlap ${pills[j][0]}`).toBeLessThanOrEqual(6);
      }
      expectContained(m.sethead, pills[i][1], `${stage}: ${pills[i][0]} inside sethead`);
    }
    expect(overlapArea(m.sethead, m.guide), `${stage}: sethead vs guide`).toBeLessThanOrEqual(6);
    expect(overlapArea(m.sethead, m.setrow), `${stage}: sethead vs first set row`).toBeLessThanOrEqual(6);
  }

  await assertSethead("set 1");
  await page.locator("#doneBtn").click();       // log set 1 -> rest
  await page.locator("#skipRest").click();      // end rest -> back on the lift, set 2
  await page.waitForTimeout(250);
  await assertSethead("set 2 (undo available)");
  await page.locator("#doneBtn").click();
  await page.locator("#skipRest").click();
  await page.waitForTimeout(250);
  await page.locator("#doneBtn").click();       // final set -> rest
  await page.locator("#skipRest").click();      // GO wraps to the next open lift
  await page.waitForTimeout(250);
});

/* N24: the header packs the day cluster (left) + Progress + menu + the running
   clock pill — the fit contract at both phone sizes. Nothing may overlap and
   every tap target stays ≥44px. */
async function seedRunningSession(page) {
  const { day, date } = await page.evaluate(() => ({ day: Gym.todayDay(), date: Gym.dateKey() }));
  await page.evaluate(({ day, date }) => {
    const state = {};
    Gym.DAYS[day].ex.forEach((e, i) => {
      state[day + ":" + i] = { done: 0, load: e.load || 0, reps: e.r, rir: e.rir, sets: [] };
    });
    localStorage.setItem("gym-tool-v2", JSON.stringify({
      v: 4, cur: day, idx: 0, bodyweight: 75, state, liftHistory: {}, sessionLog: [],
      active: { id: "ses_clock", date, day, startedAt: Date.now() - 900000, endedAt: null, accSec: 900, runningSince: Date.now() - 40000, status: "active" }
    }));
  }, { day, date });
  await page.reload();
  await expect(page.locator("#sessBtn")).toHaveClass(/on/);
}

for (const vp of [{ width: 360, height: 800 }, { width: 390, height: 844 }]) {
  test(`header holds day cluster + Progress + menu + running clock with no overlap (${vp.width}x${vp.height})`, async ({ page }) => {
    await page.setViewportSize(vp);
    await page.goto(url);
    await seedRunningSession(page);

    const m = await boxes(page, {
      header: ".header",
      clusterTabs: "all:#dayCluster .daytab",
      progress: "#progressBtn",
      menu: "#menuBtn",
      pill: "#sessBtn"
    });

    // every header control sits inside the header row
    for (const tab of m.clusterTabs) expectContained(m.header, tab, "day tab");
    expectContained(m.header, m.progress, "progress");
    expectContained(m.header, m.menu, "menu");
    expectContained(m.header, m.pill, "session pill");

    // day tabs ≥44px each
    m.clusterTabs.forEach((tab, i) => {
      expect(tab.h, `day tab ${i} height ≥44px`).toBeGreaterThanOrEqual(44);
      expect(tab.w, `day tab ${i} width ≥44px`).toBeGreaterThanOrEqual(44);
    });

    // no overlaps between the cluster, progress, menu and pill
    const controls = [["progress", m.progress], ["menu", m.menu], ["pill", m.pill]];
    m.clusterTabs.forEach((tab, i) => {
      for (const [name, b] of controls) {
        expect(overlapArea(tab, b), `day tab ${i} must not overlap ${name}`).toBeLessThanOrEqual(1);
      }
    });
    for (let i = 0; i < controls.length; i++) {
      for (let j = i + 1; j < controls.length; j++) {
        expect(overlapArea(controls[i][1], controls[j][1]), `${controls[i][0]} must not overlap ${controls[j][0]}`).toBeLessThanOrEqual(1);
      }
    }

    // the header itself stays on one row of ≤ 44px-plus content height, and the
    // day view still fits one screen with the taller header
    const view = await page.evaluate(() => ({
      headerH: document.querySelector(".header").getBoundingClientRect().height,
      scrollH: document.documentElement.scrollHeight,
      innerH: window.innerHeight
    }));
    expect(view.headerH, "header stays compact").toBeLessThanOrEqual(56);
    expect(view.scrollH, "day view still fits one screen").toBeLessThanOrEqual(view.innerH + 1);
  });
}
