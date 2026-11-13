/* N11: while a rest runs, the peeked-open lift view goes quiet — the rest
   card is the working surface, the editor waits for GO — and the workout
   clock shows exactly once. Editing a logged set lifts the quiet. */
const { test, expect } = require("@playwright/test");
const path = require("path");

const url = "file://" + path.resolve(__dirname, "..", "index.html");

test("resting peek is quiet, the clock shows once, GO restores the editor", async ({ page }) => {
  const errors = [];
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
  page.on("pageerror", (e) => errors.push(String(e)));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(url);

  await page.locator(".liftrow").first().click();
  await page.locator("#doneBtn").click(); // set 1 logged -> rest starts, details auto-close

  // peek closed: only the rest card — and it carries the workout clock
  await expect(page.locator("#timerBar")).toHaveClass(/active/);
  await expect(page.locator("#liftView")).toBeHidden();
  await expect(page.locator("#restElapsed")).toBeVisible();
  await expect(page.locator("#restElapsed")).toContainText("Workout");

  // peek open: the lift view returns, quieted, and the card drops its clock
  await page.locator("#detailsBtn").click();
  await expect(page.locator("#liftView")).toBeVisible();
  await expect(page.locator("#setLog")).toBeVisible();
  await expect(page.locator("#exName")).toBeHidden();
  await expect(page.locator("#doneBtn")).toBeHidden();
  await expect(page.locator("#loadUp")).toBeHidden();
  await expect(page.locator("#rirRow")).toBeHidden();
  await expect(page.locator("#swapBtn")).toBeHidden();
  await expect(page.locator("#restElapsed")).toBeHidden();
  await expect(page.locator("#sessBtn")).toBeVisible();

  // editing the logged set is the deliberate exception: the editor returns
  await page.locator("#setLog .setrow").first().click();
  await expect(page.locator("#doneBtn")).toBeVisible();
  await expect(page.locator("#doneBtn")).toContainText("Done editing");
  await page.locator("#doneBtn").click(); // finish the edit -> quiet again
  await expect(page.locator("#doneBtn")).toBeHidden();

  // GO restores the full editor
  await page.locator("#skipRest").click();
  await expect(page.locator("#restTime")).toHaveText("GO");
  await expect(page.locator("#exName")).toBeVisible();
  await expect(page.locator("#doneBtn")).toBeVisible();

  // the next rest closes the details again and the card clock is back
  await page.locator("#doneBtn").click(); // set 2 logged -> rest starts
  await expect(page.locator("#timerBar")).toHaveClass(/active/);
  await expect(page.locator("#liftView")).toBeHidden();
  await expect(page.locator("#restElapsed")).toBeVisible();

  expect(errors.filter((e) => !/vibrate|AudioContext/i.test(e)), "no console errors").toEqual([]);
});
