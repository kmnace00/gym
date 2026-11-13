/* N17: a bodyweight edit must survive renders and reloads. The old listener
   was `change`-only, so a value typed while the field still had focus (iOS can
   dismiss the keypad without firing change) was thrown away the next time the
   menu refilled the input from the saved payload. */
const { test, expect } = require("@playwright/test");
const path = require("path");
const url = "file://" + path.resolve(__dirname, "..", "index.html");

async function boot(page) {
  await page.goto(url);
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.locator("#menuBtn").click();
}

async function stored(page) {
  return page.evaluate(() => JSON.parse(localStorage.getItem("gym-tool-v2")).bodyweight);
}

test("a typed bodyweight is saved before blur and survives the reload", async ({ page }) => {
  await boot(page);
  const input = page.locator("#bwInput");
  await expect(input).toHaveValue("165");

  await input.selectText();
  await page.keyboard.type("150"); // input events only — no change, no blur

  // the value must already be persisted, not wait for a change event
  await expect.poll(() => stored(page)).toBe(150);

  await page.reload();
  await page.locator("#menuBtn").click();
  await expect(page.locator("#bwInput")).toHaveValue("150");
  await expect.poll(() => stored(page)).toBe(150);
});

test("an out-of-range value is rejected on blur, the saved weight stays", async ({ page }) => {
  await boot(page);
  const input = page.locator("#bwInput");
  await input.selectText();
  await page.keyboard.type("40");
  await page.keyboard.press("Tab"); // change fires here

  await expect(input).toHaveValue("165");
  await expect(page.locator("#modalMsg")).toContainText("66–700");
  expect(await stored(page)).toBe(165);
});
