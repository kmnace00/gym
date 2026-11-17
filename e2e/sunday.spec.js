/* Nov 15 — Khang's three Sunday corrections:
   1. the leg press and the hack squat are different machines (his hack squat
      runs at 0 load), so the hack squat is a swap with its own number;
   2. pull-ups are assisted — the number is HELP, shown as a negative load,
      and ▲ makes the lift harder (less help);
   3. the cable stack is gone from Sunday — an incline DB fly replaces it.   */
const { test, expect } = require("@playwright/test");
const path = require("path");

const url = "file://" + path.resolve(__dirname, "..", "index.html");

/* Sunday is the subject; pin a Sunday clock so the seeded day and the header
   agree on any run day. */
test.beforeEach(async ({ page }) => {
  await page.clock.install({ time: new Date("2026-11-08T10:00:00") });
});

async function seedSunday(page) {
  await page.goto(url);
  await page.evaluate(() => {
    localStorage.clear();
    localStorage.setItem("gym-tool-v2", JSON.stringify({
      v: 4, cur: "sun", idx: 0, bodyweight: 75, state: {}, liftHistory: {}, sessionLog: []
    }));
  });
  await page.reload();
}

test("the hack squat is a swap with its own load, not the leg press's 180", async ({ page }) => {
  await seedSunday(page);
  const row = page.locator(".liftrow").first();
  await expect(row.locator(".liftname")).toHaveText("Leg press");
  await expect(row.locator(".liftmeta")).toContainText("Load 180");

  await row.click();
  await expect(page.locator("#loadVal")).toHaveText("180");
  await page.locator("#swapBtn").click();
  await page.locator(".swapchoice", { hasText: "Hack squat" }).click();
  await expect(page.locator("#exName")).toHaveText("Hack squat");
  /* a fresh alternate seeds at 0 — the machine's starting load, never the
     leg press number */
  await expect(page.locator("#loadVal")).toHaveText("light");

  // and the leg press's own 180 comes back untouched
  await page.locator("#swapBtn").click(); // undo
  await expect(page.locator("#exName")).toHaveText("Leg press");
  await expect(page.locator("#loadVal")).toHaveText("180");
});

test("an assisted pull-up logs HELP: it displays as a negative load and ▲ is harder", async ({ page }) => {
  await seedSunday(page);
  await page.locator(".liftrow").nth(1).click(); // Assisted pull-up
  await expect(page.locator("#exName")).toHaveText("Assisted pull-up");
  await expect(page.locator("#exPres")).toContainText("bodyweight"); // 0 help
  await expect(page.locator("#loadVal")).toHaveText("0");

  // typing "-45" (or "45") means 45 lb of machine help
  await page.locator("#loadVal").click();
  await page.locator(".vin").fill("-45");
  await page.locator(".vin").press("Enter");
  await expect(page.locator("#loadVal")).toHaveText("-45");
  await expect(page.locator("#exPres")).toContainText("help 45 lb");

  // ▲ adds strength: less help, so the number rises toward zero
  await page.locator("#loadUp").click();
  await expect(page.locator("#loadVal")).toHaveText("-42.5");
  await page.locator("#loadDown").click();
  await expect(page.locator("#loadVal")).toHaveText("-45");

  // the day row names it as help too
  await page.locator("#backBtn").click();
  await expect(page.locator(".liftrow").nth(1).locator(".liftmeta")).toContainText("Help 45 lb");
});

test("the rest-prep card shows an assisted lift's load as negative help, no unit (v172)", async ({ page }) => {
  /* Non-swapped assisted lift (sun:1 = Assisted pull-up) stored at 45 lb of help.
     Its load reads as a negative number with no unit ("-45") in the rest-prep
     card — the same form the lift-view stepper readout uses — not "-45 lb" (the
     only place a negative number otherwise carried a unit). */
  await page.goto(url);
  await page.evaluate(() => {
    localStorage.clear();
    const state = {};
    state["sun:0"] = { done: 2, load: 180, reps: 10, rir: 2, sets: [] };        // one set left on the leg press
    state["sun:1"] = { done: 0, load: 45, reps: 8, rir: 2, sets: [] };          // assisted pull-up, 45 lb help
    localStorage.setItem("gym-tool-v2", JSON.stringify({
      v: 4, cur: "sun", idx: 0, bodyweight: 75, state, liftHistory: {}, sessionLog: [],
      active: { id: "ses_assistprep", date: "", day: "sun", startedAt: Date.now() - 600000, endedAt: null, accSec: 600, runningSince: null, status: "active" }
    }));
  });
  await page.reload();

  // finish the leg press's last set -> inter-lift rest naming the assisted pull-up
  await page.locator(".liftrow").first().click();
  await page.locator("#doneBtn").click();
  await expect(page.locator("#timerBar")).toHaveClass(/active/);

  await expect(page.locator("#restPrepName")).toHaveText("Next — Assisted pull-up, Set 1 of 3");
  await expect(page.locator("#restPrepLoad")).toHaveText("-45");
  await expect(page.locator("#restPrepLoad")).not.toHaveText("-45 lb");
});

test("the retired cable fly is an incline DB fly now", async ({ page }) => {
  await seedSunday(page);
  const fly = page.locator(".liftrow").nth(3);
  await expect(fly.locator(".liftname")).toHaveText("Incline DB fly");
  await expect(fly.locator(".liftmeta"), "no cable stack on Sunday").not.toContainText("Cable fly");

  await fly.click();
  await page.locator("#swapBtn").click();
  await page.locator(".swapchoice", { hasText: "Flat DB fly" }).click();
  await expect(page.locator("#exName")).toHaveText("Flat DB fly");
});

test("the next-lift preview names the help it will use, not bodyweight", async ({ page }) => {
  /* On the leg press's last set the preview must report the pull-up's stored
     help — the programme load is 0, so "bodyweight" would contradict the
     rest-prep card and the Set Done line. */
  await page.goto(url);
  await page.evaluate(() => {
    localStorage.clear();
    localStorage.setItem("gym-tool-v2", JSON.stringify({
      v: 5, cur: "sun", idx: 0, bodyweight: 165, sessionLog: [], liftHistory: {},
      state: {
        "sun:0": { done: 2, load: 180, reps: 6, rir: 2 },
        "sun:1": { done: 0, load: 45, reps: 6, rir: 2 }
      }
    }));
  });
  await page.reload();
  await page.locator(".liftrow").first().click();
  await expect(page.locator("#nextLine")).toContainText("Assisted pull-up");
  await expect(page.locator("#nextLine")).toContainText("help 45");
});

test("a suggested assisted load applies as help and shows negative", async ({ page }) => {
  await page.goto(url);
  await page.evaluate(() => {
    localStorage.clear();
    localStorage.setItem("gym-tool-v2", JSON.stringify({
      v: 5, cur: "sun", idx: 0, bodyweight: 165, state: {}, sessionLog: [],
      liftHistory: {
        "sun:1": [
          { date: "2026-10-25", load: 45, reps: 8, rir: 2, hitTop: true, setsDone: 3, assist: true, exId: "sun-pullups" },
          { date: "2026-11-01", load: 45, reps: 8, rir: 2, hitTop: true, setsDone: 3, assist: true, exId: "sun-pullups" }
        ]
      }
    }));
  });
  await page.reload();
  await page.locator(".liftrow").nth(1).click();
  await expect(page.locator("#suggestText")).toContainText("hit top twice");
  await page.locator("#applyLoad").click();
  // two top sessions at 45 lb of help → one step less help, 42.5, shown negative
  await expect(page.locator("#loadVal")).toHaveText("-42.5");
  await expect(page.locator("#exPres")).toContainText("help 42.5 lb");
});
