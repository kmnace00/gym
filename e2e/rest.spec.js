/* Rest honesty across a simulated phone sleep: the countdown must be
   re-derived from its end timestamp, never accumulated by the interval.     */
const { test, expect } = require("@playwright/test");
const path = require("path");

const url = "file://" + path.resolve(__dirname, "..", "index.html");

function toSecs(t) {
  const p = t.trim().split(":");
  return parseInt(p[0], 10) * 60 + parseInt(p[1], 10);
}
function fmt(s) {
  return Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0");
}

test("rest is re-derived after a simulated sleep", async ({ page }) => {
  const errors = [];
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
  page.on("pageerror", (e) => errors.push(String(e)));

  await page.clock.install({ time: new Date("2026-11-09T10:00:00") });
  await page.goto(url);

  await page.locator(".liftrow").first().click();
  await expect(page.locator("#exName")).toBeVisible();
  await page.locator("#doneBtn").click();
  await expect(page.locator("#timerBar")).toHaveClass(/active/);

  const startSecs = toSecs(await page.locator("#restTime").textContent());

  // jump Date.now() forward 60 s WITHOUT firing the interval callbacks
  await page.clock.setSystemTime(new Date("2026-11-09T10:01:00"));
  await page.clock.runFor(300); // one 200 ms tick

  await expect(page.locator("#restTime")).toHaveText(fmt(startSecs - 60));
  expect(errors.filter((e) => !/vibrate|AudioContext/i.test(e))).toEqual([]);
});
