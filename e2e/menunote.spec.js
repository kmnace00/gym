/* N18: the Clock-learning line in the menu must render in full — its second
   line used to be squeezed into one line's height by the card's flex layout and
   painted under the next button. */
const { test, expect } = require("@playwright/test");
const path = require("path");
const url = "file://" + path.resolve(__dirname, "..", "index.html");
const sizes = [{ width: 390, height: 667 }, { width: 390, height: 844 }];

async function openMenu(page, calibration) {
  await page.goto(url);
  await page.evaluate((cal) => {
    localStorage.clear();
    if (cal) localStorage.setItem("gym-calibration", JSON.stringify(cal));
  }, calibration);
  await page.reload();
  await page.locator("#menuBtn").click();
  await expect(page.locator("#calibInfo")).toBeVisible();
}

async function measure(page, nextId) {
  return page.evaluate((id) => {
    const el = document.getElementById("calibInfo");
    const next = document.getElementById(id);
    return {
      text: el.textContent,
      clientH: el.clientHeight,
      scrollH: el.scrollHeight,
      bottom: el.getBoundingClientRect().bottom,
      nextTop: next.getBoundingClientRect().top,
      nextHidden: next.hidden
    };
  }, nextId);
}

for (const size of sizes) {
  test.describe(`clock learning note 390x${size.height}`, () => {
    test.use({ viewport: size });

    test("starter copy renders in full above the next button", async ({ page }) => {
      await openMenu(page, null);
      const m = await measure(page, "calibReset"); // hidden in the starter state
      const next = await page.evaluate(() =>
        document.getElementById("resetDay").getBoundingClientRect().top
      );
      expect(m.text).toBe("Clock learning: starter values until 3 timed sessions.");
      expect(m.scrollH, "no line is clipped away").toBeLessThanOrEqual(m.clientH + 1);
      expect(m.bottom, "the note stays above the next button").toBeLessThanOrEqual(next);
      expect(await page.evaluate(() => document.getElementById("calibReset").hidden)).toBe(true);
    });

    test("learned copy renders both lines above the reset button", async ({ page }) => {
      await openMenu(page, { warmupSec: 420, overheadSec: 27, sessions: 6, at: Date.now() });
      const m = await measure(page, "calibReset");
      expect(m.text).toContain("6 timed sessions");
      expect(m.text).toContain("per-set overhead");
      expect(m.scrollH, "no line is clipped away").toBeLessThanOrEqual(m.clientH + 1);
      expect(m.bottom, "the note stays above the next button").toBeLessThanOrEqual(m.nextTop);
    });
  });
}
