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
  await expect(page.locator("#setDots .setcount")).toContainText("Set 2 of 3");
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

test("undo survives navigating to another lift while resting", async ({ page }) => {
  await page.goto(url);
  await page.locator(".liftrow").first().click();
  await page.locator("#doneBtn").click();
  await page.locator("#rNextBtn").click(); // navigate during rest
  await expect(page.locator("#liftMeta")).toContainText("Lift 2 of 8");
  await page.locator("#undoBtn").click();
  await page.locator("#backBtn").click();
  await page.locator(".liftrow").first().click();
  await expect(page.locator("#setDots .setcount")).toContainText("Set 1 of 3");
});
