/* B3-33: the menu footer names the deploy, and the tag it prints is the same
   single constant the service worker keys its cache on (no second copy).     */
const { test, expect } = require("@playwright/test");
const fs = require("fs");
const path = require("path");

const url = "file://" + path.resolve(__dirname, "..", "index.html");
const { GYM_VERSION } = require("../version.js");

test("the backup menu footer shows the schema version and the deploy tag", async ({ page }) => {
  await page.goto(url);
  await page.locator("#menuBtn").click();
  await expect(page.locator("#modal")).toBeVisible();
  const foot = await page.locator("#modalFoot").textContent();
  expect(foot).toContain("v5");
  expect(foot).toContain(GYM_VERSION);
  expect(/v5 · gym-v\d+ · \d+ workouts · /.test(foot), "footer reads like 'v5 · gym-v90 · 0 workouts · never backed up'").toBe(true);
});

test("the menu's screen line reports the layout numbers used on this device", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(url);
  await page.locator("#menuBtn").click();
  const line = await page.locator("#screenFoot").textContent();
  expect(line).toMatch(/^Screen \d+×\d+ · app \d+ · vp \d+\/\d+ · safe \d+\/\d+ · (browser|standalone)$/);
  const vp = await page.evaluate(() => window.innerHeight);
  expect(line, "the reported app box matches the live viewport").toContain("app " + vp + " · vp " + vp);
});

test("the service worker takes its cache name from version.js, not a second literal", () => {
  const sw = fs.readFileSync(path.resolve(__dirname, "..", "sw.js"), "utf8");
  expect(sw).toMatch(/importScripts\("\.\/version\.js"\);/);
  expect(sw).toMatch(/const CACHE = GYM_VERSION;/);
  expect(sw, "no hardcoded cache name in sw.js").not.toMatch(/const CACHE = "gym-v\d+"/);
  expect(sw).toMatch(/"\.\/version\.js"/); // it must be cached like every other asset
});
