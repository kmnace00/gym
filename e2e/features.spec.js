/* Functional checks for the new phases: persistence, auto-progression,
   backup import, and undo surviving navigation.                              */
const { test, expect } = require("@playwright/test");
const path = require("path");

const url = "file://" + path.resolve(__dirname, "..", "index.html");

async function seed(page, obj) {
  await page.goto(url);
  await page.evaluate((o) => localStorage.setItem("gym-tool-v2", JSON.stringify(o)), obj);
  await page.reload();
}

test("Set Done persists across reload", async ({ page }) => {
  await page.goto(url);
  await page.locator(".liftrow").first().click();
  await page.locator("#doneBtn").click();
  await expect(page.locator("#timerBar")).toHaveClass(/active/);
  await page.reload();
  await page.locator(".liftrow").first().click();
  await expect(page.locator("#setCount")).toContainText("Set 2 of 3");
});

test("pausing the rest freezes the clock and shows a consistent paused state", async ({ page }) => {
  await page.goto(url);
  await page.locator(".liftrow").first().click();
  await page.locator("#doneBtn").click();
  const before = await page.locator("#restTime").textContent();
  await page.locator("#pauseRest").click();
  await expect(page.locator("#pauseRest")).toHaveText("Resume");
  await expect(page.locator("#timerBar")).toHaveClass(/paused/);
  await expect(page.locator("#restMsg")).toContainText("Paused");
  await page.waitForTimeout(1200);
  expect(await page.locator("#restTime").textContent()).toBe(before);
  await page.locator("#pauseRest").click();
  await expect(page.locator("#pauseRest")).toHaveText("Pause");
  await expect(page.locator("#timerBar")).not.toHaveClass(/paused/);
  await expect(page.locator("#restMsg")).toContainText("Stretch");
});

test("set log shows a row per set and records the values", async ({ page }) => {
  await page.goto(url);
  await page.locator(".liftrow").first().click();
  await expect(page.locator("#setLog .setrow")).toHaveCount(3);
  await page.locator("#loadUp").click();
  const load = await page.locator("#loadVal").textContent();
  await page.locator("#doneBtn").click();
  await page.locator("#skipRest").click();
  await expect(page.locator("#setLog .setrow").nth(0)).toHaveClass(/done/);
  await expect(page.locator("#setLog .setrow").nth(0)).toContainText(load);
  await expect(page.locator("#setLog .setrow").nth(1)).toHaveClass(/now/);
  await expect(page.locator("#setCount")).toContainText("Set 2 of 3");
});

test("auto-progression suggests +step and Apply sets it", async ({ page }) => {
  await seed(page, {
    v: 2, cur: "fri", idx: 0,
    state: { "fri:0": { done: 0, load: 50, reps: 6, rir: 2, topHits: 0, lastRir: null } },
    liftHistory: { "fri:0": [{ date: "2026-11-01", load: 50, reps: 6, rir: 2, hitTop: true, setsDone: 3 }] }
  });
  await page.locator(".liftrow").first().click();
  await expect(page.locator("#suggestText")).toContainText("try");
  await expect(page.locator("#applyLoad")).toBeVisible();
  await page.locator("#applyLoad").click();
  await expect(page.locator("#loadVal")).toHaveText("52.5");
});

test("import restores a backup", async ({ page }) => {
  await page.goto(url);
  const backup = JSON.stringify({
    v: 2, cur: "fri", idx: 0,
    state: { "fri:0": { done: 0, load: 77, reps: 6, rir: 2, topHits: 0, lastRir: null } },
    liftHistory: {}
  });
  await page.locator("#menuBtn").click();
  await page.setInputFiles("#importFile", { name: "b.json", mimeType: "application/json", buffer: Buffer.from(backup) });
  await expect(page.locator("#modalMsg")).toContainText("imported");
  await page.locator("#modalClose").click();
  await page.locator(".liftrow").first().click();
  await expect(page.locator("#loadVal")).toHaveText("77");
});

test("back button reads Back and lift context shows the day", async ({ page }) => {
  await page.goto(url);
  await page.locator(".liftrow").first().click();
  await expect(page.locator("#backBtn")).toHaveText(/Back/);
  await expect(page.locator("#liftMeta")).toContainText("Lift 1 of 8");
  await expect(page.locator("#liftMeta")).toHaveText(/(Fri|Sat|Sun)/);
});

test("restart lift clears sets but keeps load", async ({ page }) => {
  await page.goto(url);
  await page.locator(".liftrow").first().click();
  await page.locator("#doneBtn").click();
  await page.locator("#skipRest").click(); // end rest, back to the lift
  await expect(page.locator("#setCount")).toContainText("Set 2 of 3");
  const loadBefore = await page.locator("#loadVal").textContent();
  await page.locator("#resetLiftBtn").click();
  await expect(page.locator("#setCount")).toContainText("Set 1 of 3");
  await expect(page.locator("#loadVal")).toHaveText(loadBefore);
});

test("reset day clears all lifts via the menu (two taps)", async ({ page }) => {
  await page.goto(url);
  await page.locator(".liftrow").first().click();
  await page.locator("#doneBtn").click();
  await page.locator("#skipRest").click();
  await page.locator("#backBtn").click();
  await page.locator(".liftrow").nth(1).click();
  await page.locator("#doneBtn").click();
  await page.locator("#skipRest").click();
  await page.locator("#backBtn").click();
  await page.locator("#menuBtn").click();
  await page.locator("#resetDay").click();
  await page.locator("#resetDay").click();
  await page.locator("#modalClose").click();
  await page.locator(".liftrow").first().click();
  await expect(page.locator("#setCount")).toContainText("Set 1 of 3");
});

test("clear all data wipes history", async ({ page }) => {
  await page.goto(url);
  await page.locator("#menuBtn").click();
  await expect(page.locator("#modalFoot")).toContainText("0 sessions saved");
  await page.locator("#clearAll").click();
  await page.locator("#clearAll").click();
  await expect(page.locator("#modalMsg")).toContainText("cleared");
});

test("undo on the lift steps back one set (visible)", async ({ page }) => {
  await page.goto(url);
  await page.locator(".liftrow").first().click();
  await expect(page.locator("#undoSetBtn")).toBeDisabled();
  await page.locator("#doneBtn").click();
  await page.locator("#skipRest").click();
  await expect(page.locator("#setCount")).toContainText("Set 2 of 3");
  await page.locator("#undoSetBtn").click();
  await expect(page.locator("#setCount")).toContainText("Set 1 of 3");
  await expect(page.locator("#undoSetBtn")).toBeDisabled();
});

test("undo on the rest screen after the final set restores it", async ({ page }) => {
  await page.goto(url);
  await page.locator(".liftrow").first().click();
  await page.locator("#doneBtn").click(); await page.locator("#skipRest").click();
  await page.locator("#doneBtn").click(); await page.locator("#skipRest").click();
  await page.locator("#doneBtn").click(); // completes all sets, resting
  await expect(page.locator("#undoBtn")).toBeVisible();
  await page.locator("#undoBtn").click();
  await expect(page.locator("#setCount")).toContainText("Set 3 of 3");
});
