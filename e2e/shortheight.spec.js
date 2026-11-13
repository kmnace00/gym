/* Short-height (landscape phone) regression guard: at 844x390 the portrait
   one-screen layout cannot fit, so it must degrade to scrolling regions —
   never crushed rows, overlapping text, or unreachable actions. Found in
   the Nov 12 expert critique: day rows crushed to 21px, Set Done 20px
   off-screen, the rest card overflowing both ends. */
const { test, expect } = require("@playwright/test");
const path = require("path");

const url = "file://" + path.resolve(__dirname, "..", "index.html");

test.use({ viewport: { width: 844, height: 390 } });

test("day view: lift rows keep their height, page does not scroll", async ({ page }) => {
  await page.goto(url);
  const rows = await page.evaluate(() => [...document.querySelectorAll(".liftrow")].map((r) => Math.round(r.getBoundingClientRect().height)));
  expect(rows.length).toBe(8);
  for (const h of rows) expect(h, "row must not crush below the 44px target").toBeGreaterThanOrEqual(44);
  const pageScrolls = await page.evaluate(() => document.documentElement.scrollHeight > window.innerHeight + 1);
  expect(pageScrolls).toBe(false);
});

test("lift view: set rows keep their height, Set Done is reachable", async ({ page }) => {
  await page.goto(url);
  await page.locator(".liftrow").first().click();
  const rows = await page.evaluate(() => [...document.querySelectorAll("#setLog .setrow")].map((r) => Math.round(r.getBoundingClientRect().height)));
  for (const h of rows) expect(h).toBeGreaterThanOrEqual(44);
  await page.locator("#doneBtn").scrollIntoViewIfNeeded();
  const done = await page.locator("#doneBtn").boundingBox();
  expect(done).not.toBeNull();
  expect(done.y).toBeGreaterThanOrEqual(0);
  expect(done.y + done.height).toBeLessThanOrEqual(390 + 1);
});

test("rest view: clock visible at rest, footer reachable by scrolling the card", async ({ page }) => {
  await page.goto(url);
  await page.locator(".liftrow").first().click();
  await page.locator("#doneBtn").click();
  await expect(page.locator("#timerBar")).toHaveClass(/active/);
  const clock = await page.evaluate(() => { const r = document.getElementById("restTime").getBoundingClientRect(); return { top: r.top, bottom: r.bottom }; });
  expect(clock.top).toBeGreaterThanOrEqual(0);
  expect(clock.bottom).toBeLessThanOrEqual(390 + 1);
  await page.locator("#undoBtn").scrollIntoViewIfNeeded();
  const undo = await page.locator("#undoBtn").boundingBox();
  expect(undo).not.toBeNull();
  expect(undo.y + undo.height).toBeLessThanOrEqual(390 + 1);
  await page.locator("#restTime").scrollIntoViewIfNeeded();
  const clock2 = await page.evaluate(() => { const r = document.getElementById("restTime").getBoundingClientRect(); return { top: r.top, bottom: r.bottom }; });
  expect(clock2.top).toBeGreaterThanOrEqual(0);
  expect(clock2.bottom).toBeLessThanOrEqual(390 + 1);
});
