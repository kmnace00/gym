/* N16: the day header carries a slim, read-only week line — Fri/Sat/Sun with a
   status dot from Stats.weekStatus, the viewed day marked, and that day's
   scheduled time. Nothing in it is tappable; the chevrons stay the only way to
   switch days. Screen readers get the same facts as one sentence. */
const { test, expect } = require("@playwright/test");
const path = require("path");

const url = "file://" + path.resolve(__dirname, "..", "index.html");
const NAMES = ["Fri", "Sat", "Sun"];

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

test("three read-only day cells, states match Stats.weekStatus", async ({ page }) => {
  await page.goto(url);
  await page.evaluate(() => localStorage.clear());
  await page.reload();

  const week = page.locator("#dayWeek");
  await expect(week).toBeVisible();
  await expect(week.locator(".dwday")).toHaveCount(3);
  await expect(week.locator(".dwday")).toHaveText(NAMES);
  await expect(week.locator(".dwdot")).toHaveCount(3);
  await expect(week.locator("button"), "the line is read-only — no buttons").toHaveCount(0);
  await expect(week.locator(".dwtime")).toHaveText(/^~\d+ min$/);

  const model = await weekStates(page);
  const classes = await page.evaluate(() =>
    [...document.querySelectorAll("#dayWeek .dwday")].map((e) => e.className)
  );
  model.states.forEach((state, i) => expect(classes[i], "dot state for " + NAMES[i]).toContain(state));

  await expect(week.locator(".dwday.on")).toHaveCount(1);
  const viewed = model.cur === "sat" ? "Sat" : model.cur === "sun" ? "Sun" : "Fri";
  await expect(week.locator(".dwday.on")).toHaveText(viewed);

  const sr = await page.locator("#dayWeekSummary").textContent();
  expect(sr).toContain("This week:");
  expect(sr).toContain("Viewing " + viewed);
  expect(sr).toContain("minutes");
});

test("the viewed marker follows the chevrons and keeps its own time", async ({ page }) => {
  await page.goto(url);
  await page.evaluate(() => localStorage.clear());
  await page.reload();

  const start = (await page.locator("#dayWeek .dwday.on").textContent()).trim();
  const next = NAMES[(NAMES.indexOf(start) + 1) % 3];
  await page.locator("#dayNext").click();

  await expect(page.locator("#dayWeek .dwday.on")).toHaveText(next);
  await expect(page.locator("#dayWeek .dwday.on")).toHaveCount(1);
  await expect(page.locator("#dayWeekSummary")).toContainText("Viewing " + next);

  const key = { Fri: "fri", Sat: "sat", Sun: "sun" }[next];
  const mins = await page.evaluate((d) => Gym.dayMins(d), key);
  await expect(page.locator("#dayWeek .dwtime")).toHaveText("~" + mins + " min");
});

for (const size of [{ width: 390, height: 667 }, { width: 390, height: 844 }]) {
  test.describe(`week line fits 390x${size.height}`, () => {
    test.use({ viewport: size });

    test("the added line keeps every lift row on one screen", async ({ page }) => {
      const errors = [];
      page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
      page.on("pageerror", (e) => errors.push(String(e)));

      await page.goto(url);
      await page.evaluate(() => localStorage.clear());
      await page.reload();
      await expect(page.locator("#dayWeek .dwday")).toHaveCount(3);

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
