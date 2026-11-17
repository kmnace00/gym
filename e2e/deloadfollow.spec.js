/* B6-10: deload follow-through — a deload-week entry is excluded from the
   progression reads (2-for-2, stall, trend) by the same filter that drops
   swaps, the stall line says "reset to", and 5+ weeks after a deload with an
   empty Mon–Sun week the day summary nudges toward the menu. */
const { test, expect } = require("@playwright/test");
const path = require("path");

const url = "file://" + path.resolve(__dirname, "..", "index.html");
const sizes = [{ width: 390, height: 667 }, { width: 390, height: 844 }];

const NUDGE = "5+ weeks since a deload — start one in the Menu.";

async function seed(page, obj, clock) {
  if (clock) await page.clock.install({ time: new Date(clock) });
  await page.goto(url);
  await page.evaluate((o) => localStorage.setItem("gym-tool-v2", JSON.stringify(o)), obj);
  await page.reload();
}

async function noOverflow(page) {
  const ok = await page.evaluate(() => document.documentElement.scrollHeight <= window.innerHeight + 1);
  expect(ok, "page must not scroll").toBe(true);
}

/* the progression chain: 60×8 @2 RIR qualifies (top 6 + 2), 60×5 @1 does not */
const CHAIN = {
  v: 5, cur: "fri", idx: 0, state: {},
  liftHistory: {
    "fri:0": [
      { date: "2026-10-20", load: 60, reps: 8, rir: 2, hitTop: true, setsDone: 3 },
      { date: "2026-10-27", load: 60, reps: 5, rir: 1, hitTop: false, setsDone: 2, deload: true },
      { date: "2026-11-03", load: 60, reps: 8, rir: 2, hitTop: true, setsDone: 3 }
    ]
  }
};

test("a deload-week session does not break the 2-for-2 chain (B6-10)", async ({ page }) => {
  const errors = [];
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
  page.on("pageerror", (e) => errors.push(String(e)));

  await seed(page, CHAIN, "2026-11-10T10:00:00");
  await page.locator(".liftrow").first().click();
  // the deload entry sits between the two qualifying sessions and is skipped
  await expect(page.locator("#suggestText")).toContainText("(hit top twice) → try 62.5");
  await expect(page.locator("#suggestText")).not.toContainText("deload");
  expect(errors, "no console errors").toEqual([]);
});

test("a completed deload lift keeps its real prior session for the deload suggestion (v153)", async ({ page }) => {
  /* v153 regression, deload variant: priorEntries() drops the newest history
     entry when the current lift is COMPLETE — but must only do so when that
     entry is actually THIS session (dated today). During an ACTIVE deload week
     (cut to 2 sets) fri:0 is complete, and today's entry was banked as a deload
     (deload:true), so progressionEntry already filtered it out — the unconditional
     drop then threw away the real Oct 30 prior and the deload suggestion read TWO
     sessions back. Seed two consecutive qualifying sessions (50×8@2) then a
     today deload-complete; the deload suggestion must derive from the newest real
     prior (planFor 52.5 → deloadLoad 47.5), NOT the two-back one (planFor keep 50
     → deloadLoad 45). */
  const errors = [];
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
  page.on("pageerror", (e) => errors.push(String(e)));

  await seed(page, {
    v: 5, cur: "fri", idx: 0, bodyweight: 165, bodyweightSet: false, deloadSince: "2026-11-01",
    state: { "fri:0": { done: 2, load: 50, reps: 6, rir: 2,
      sets: [{ load: 50, reps: 6, rir: 2 }, { load: 50, reps: 6, rir: 2 }] } },
    liftHistory: {
      "fri:0": [
        { date: "2026-10-23", load: 50, reps: 8, rir: 2, hitTop: true, setsDone: 3 },
        { date: "2026-10-30", load: 50, reps: 8, rir: 2, hitTop: true, setsDone: 3 },
        { date: "2026-11-06", load: 50, reps: 6, rir: 2, setsDone: 2, deload: true }
      ]
    },
    sessionLog: [],
    active: { id: "ses_deloadskip", date: "2026-11-06", day: "fri", startedAt: Date.now() - 600000, endedAt: null, accSec: 600, runningSince: null, status: "active" }
  }, "2026-11-06T10:00:00");
  await page.locator(".liftrow").first().click(); // open fri:0, complete via deload
  await expect(page.locator("#suggestText")).toContainText("Deload week → ");
  /* 52.5 (two qualified priors) × 0.9 → 47.25 → 47.5 at the 2.5 step. Pre-fix it
     read the two-back-only prior → planFor keep 50 → deloadLoad 45. */
  await expect(page.locator("#suggestText")).toContainText("47.5");
  await expect(page.locator("#suggestText")).not.toContainText("try 45");
  expect(errors, "no console errors").toEqual([]);
});

test("a deload-week session does not count toward the 3-session stall", async ({ page }) => {
  await seed(page, {
    v: 5, cur: "fri", idx: 0, state: {},
    liftHistory: {
      "fri:0": [
        { date: "2026-10-18", load: 60, reps: 5, rir: 1, hitTop: false, setsDone: 3 },
        { date: "2026-10-25", load: 60, reps: 5, rir: 1, hitTop: false, setsDone: 3 },
        { date: "2026-11-01", load: 60, reps: 5, rir: 1, hitTop: false, setsDone: 2, deload: true }
      ]
    }
  }, "2026-11-10T10:00:00");
  await page.locator(".liftrow").first().click();
  await expect(page.locator("#suggestText")).toContainText("keep 60");
  await expect(page.locator("#suggestText")).not.toContainText("stalled");
});

test("the stall line reads 'reset to', not 'deload to'", async ({ page }) => {
  await seed(page, {
    v: 5, cur: "fri", idx: 0, state: {},
    liftHistory: {
      "fri:0": [
        { date: "2026-10-18", load: 60, reps: 5, rir: 1, hitTop: false, setsDone: 3 },
        { date: "2026-10-25", load: 60, reps: 5, rir: 1, hitTop: false, setsDone: 3 },
        { date: "2026-11-01", load: 60, reps: 5, rir: 1, hitTop: false, setsDone: 3 }
      ]
    }
  }, "2026-11-10T10:00:00");
  await page.locator(".liftrow").first().click();
  await expect(page.locator("#suggestText")).toContainText("3 sessions stalled → reset to 55");
  await expect(page.locator("#applyLoad")).toBeVisible();
  await page.locator("#applyLoad").click();
  await expect(page.locator("#loadVal")).toHaveText("55");
});

/* Sunday 2026-12-13: the last deload started 2026-11-01 (ended 2026-11-08),
   so 35 days have passed and this Mon–Sun week (Dec 7–13) is still empty. */
const DUE = {
  v: 5, cur: "sun", idx: 0, state: {}, deloadSince: "2026-11-01",
  sessionLog: [{ id: "s1", date: "2026-11-01", day: "sun", durationSec: 1200, status: "complete", lifts: {} }],
  liftHistory: {
    "sun:0": [{ date: "2026-11-01", load: 180, reps: 6, rir: 2, hitTop: false, setsDone: 2, deload: true }]
  }
};

for (const size of sizes) {
  test.describe(`deload nudge viewport 390x${size.height}`, () => {
    test.use({ viewport: size });

    test("5+ weeks after a deload with an empty week: the day summary nudges", async ({ page }) => {
      const errors = [];
      page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
      page.on("pageerror", (e) => errors.push(String(e)));

      await seed(page, DUE, "2026-12-13T10:00:00");
      await expect(page.locator("#deloadBar")).toBeHidden();
      await expect(page.locator("#daySummary")).toContainText(NUDGE);
      await noOverflow(page);

      /* the first logged set of the week closes the nudge */
      await page.locator(".liftrow").first().click();
      await page.locator("#doneBtn").click();
      await page.locator("#skipRest").click();
      await page.locator("#backBtn").click();
      await expect(page.locator("#daySummary")).not.toContainText("Start deload week");
      await noOverflow(page);
      expect(errors, "no console errors").toEqual([]);
    });

    test("a session logged earlier in the same week means no nudge", async ({ page }) => {
      const logged = JSON.parse(JSON.stringify(DUE));
      logged.sessionLog.push({ id: "s2", date: "2026-12-11", day: "fri", durationSec: 1200, status: "complete", lifts: {} });
      await seed(page, logged, "2026-12-13T10:00:00");
      await expect(page.locator("#daySummary")).not.toContainText("Start deload week");
    });

    test("while a deload week is running there is no nudge", async ({ page }) => {
      const active = JSON.parse(JSON.stringify(DUE));
      active.deloadSince = "2026-12-08";
      await seed(page, active, "2026-12-13T10:00:00");
      await expect(page.locator("#deloadBar")).toBeVisible();
      await expect(page.locator("#daySummary")).not.toContainText("Start deload week");
    });

    test("35 days is the threshold: 34 days after the deload ended, no nudge", async ({ page }) => {
      await seed(page, DUE, "2026-12-12T10:00:00"); // ended 2026-11-08 → 34 days
      await expect(page.locator("#daySummary")).not.toContainText("Start deload week");
    });

    test("never deloaded: the anchor is the first logged session", async ({ page }) => {
      const fresh = JSON.parse(JSON.stringify(DUE));
      delete fresh.deloadSince;
      await seed(page, fresh, "2026-12-13T10:00:00");
      await expect(page.locator("#daySummary")).toContainText(NUDGE);
    });
  });
}
