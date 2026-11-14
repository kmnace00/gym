/* v133 — N19/N20/N22 visible changes: the rename-in-place swaps, the Baye-
   sian's replacement by the rope hammer curl, and the closing Zone 2 finisher
   card. N21 (the warm-up line) is covered in phase2.spec.js. */
const { test, expect } = require("@playwright/test");
const path = require("path");

const url = "file://" + path.resolve(__dirname, "..", "index.html");

async function openDay(page, dayKey) {
  await page.evaluate((dayKey) => {
    localStorage.setItem("gym-tool-v2", JSON.stringify({
      v: 4, cur: dayKey, idx: 0, state: {}, liftHistory: {}, sessionLog: []
    }));
  }, dayKey);
  await page.reload();
}

test("the Saturday day list carries the new names and the finisher card, no old names", async ({ page }) => {
  await page.goto(url);
  await openDay(page, "sat");
  const names = await page.locator(".liftrow .liftname").allTextContents();
  expect(names.join("|")).toContain("Smith machine RDL");
  expect(names.join("|")).toContain("MTS row");
  expect(names.join("|")).toContain("Rope hammer curl");
  expect(names.join("|")).not.toContain("Bayesian curl");
  expect(names.join("|")).not.toContain("T-bar row");
  expect(names.join("|")).not.toContain("Cable RDL");
  await expect(page.locator("#dayFinisher")).toHaveText("Zone 2 — 10 min (incline walk or bike)");
});

test("the Sunday Calf press replaces the Standing calf raise in the day list", async ({ page }) => {
  await page.goto(url);
  await openDay(page, "sun");
  const names = await page.locator(".liftrow .liftname").allTextContents();
  expect(names.join("|")).toContain("Calf press");
  expect(names.join("|")).not.toContain("Standing calf raise");
});

test("the rope hammer curl opens as the new lift, start light", async ({ page }) => {
  await page.goto(url);
  await openDay(page, "sat");
  await page.locator(".liftrow").nth(4).click(); // the slot before preacher curl
  await expect(page.locator("#exName")).toHaveText("Rope hammer curl");
  await expect(page.locator("#exPres")).toContainText("10–12 reps");
  await expect(page.locator("#exPres")).toContainText("start light");
  await expect(page.locator("#exPres")).toContainText("1 RIR");
  await expect(page.locator("#exPres")).toContainText("Rest 2:00");
});