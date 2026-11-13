/* Day-header regression guard (R2 critique): with a session in progress the
   Continue and Finish actions share the header row with the day title. The
   title must keep a usable measure — the actions wrap below it instead of
   crushing it into a one-word-per-line stack. */
const { test, expect } = require("@playwright/test");
const path = require("path");

const url = "file://" + path.resolve(__dirname, "..", "index.html");

test.use({ viewport: { width: 390, height: 844 } });

test("in-progress day: title stays on one line, both actions visible", async ({ page }) => {
  await page.goto(url);
  await page.locator(".liftrow").first().click();
  await page.locator("#doneBtn").click();
  await page.locator("#skipRest").click();
  await page.locator("#backBtn").click();

  await expect(page.locator("#continueBtn")).toBeVisible();
  await expect(page.locator("#finishBtn")).toBeVisible();
  const title = await page.evaluate(() => {
    const r = document.getElementById("dayTitle").getBoundingClientRect();
    return { h: Math.round(r.height), w: Math.round(r.width) };
  });
  expect(title.h, "day title must not wrap into a stack").toBeLessThanOrEqual(24);
  expect(title.w).toBeGreaterThanOrEqual(150);
  const fits = await page.evaluate(() => document.documentElement.scrollHeight <= window.innerHeight + 1);
  expect(fits, "day view still fits one screen").toBe(true);
});
