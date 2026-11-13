/* N14: Swap opens a chooser of the lift's alternates; each alternate keeps
   its own load (today's memory, then its last banked session). */
const { test, expect } = require("@playwright/test");
const path = require("path");

const url = "file://" + path.resolve(__dirname, "..", "index.html");

async function openFirstLift(page) {
  await page.goto(url);
  await page.locator(".liftrow").first().click();
  await expect(page.locator("#exName")).toHaveText("Smith squat");
}

test("the chooser lists the alternates; each keeps its own load", async ({ page }) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(url);
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await openFirstLift(page);

  // Swap opens the chooser instead of swapping outright
  await page.locator("#swapBtn").click();
  await expect(page.locator("#swapChoices")).toBeVisible();
  await expect(page.locator(".swapchoice")).toHaveCount(4); // 3 alternates + Cancel
  await expect(page.locator("#exName")).toHaveText("Smith squat"); // not swapped yet

  // Cancel backs out cleanly
  await page.locator(".swapchoice.cancel").click();
  await expect(page.locator("#swapChoices")).toBeHidden();

  // choose the barbell, step its load up to 10
  await page.locator("#swapBtn").click();
  await page.locator(".swapchoice", { hasText: "Barbell back squat" }).click();
  await expect(page.locator("#exName")).toHaveText("Barbell back squat");
  await expect(page.locator("#swapChoices")).toBeHidden();
  for (let i = 0; i < 4; i++) await page.locator("#loadUp").click();
  await expect(page.locator("#loadVal")).toHaveText("10");

  // a different alternate starts fresh — the barbell's 10 does not carry over
  await page.locator("#swapBtn").click(); // undo
  await page.locator("#swapBtn").click(); // chooser again
  await page.locator(".swapchoice", { hasText: "Leg press" }).click();
  await expect(page.locator("#exName")).toHaveText("Leg press");
  await expect(page.locator("#loadVal")).toHaveText("light");

  // the stepper fast path (updateLiftReadouts) shows the same word at 0
  await page.locator("#loadUp").click();
  await expect(page.locator("#loadVal")).toHaveText("2.5");
  await page.locator("#loadDown").click();
  await expect(page.locator("#loadVal")).toHaveText("light");

  // back to the barbell: its own 10 is remembered
  await page.locator("#swapBtn").click(); // undo
  await page.locator("#swapBtn").click(); // chooser again
  await page.locator(".swapchoice", { hasText: "Barbell back squat" }).click();
  await expect(page.locator("#loadVal")).toHaveText("10");

  expect(errors).toEqual([]);
});

test("an alternate with a banked session starts from that session's load", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(url);
  await page.evaluate(() => localStorage.setItem("gym-tool-v2", JSON.stringify({
    v: 5, cur: "fri", idx: 0, state: {},
    liftHistory: {
      "fri:0": [{
        date: "2026-11-06", load: 180, reps: 6, rir: 2, hitTop: false, setsDone: 3,
        swap: "Leg press",
        sets: [{ load: 180, reps: 6, rir: 2 }, { load: 180, reps: 6, rir: 2 }, { load: 180, reps: 5, rir: 1 }]
      }]
    }
  })));
  await page.reload();
  await openFirstLift(page);

  await page.locator("#swapBtn").click();
  await page.locator(".swapchoice", { hasText: "Leg press" }).click();
  await expect(page.locator("#exName")).toHaveText("Leg press");
  await expect(page.locator("#loadVal")).toHaveText("180");
});
