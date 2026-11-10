/* B5-01 lift-page geometry. Baselines recorded at d1e18e3 (fresh profile,
   lift 1, default state — suggestion / Prev / sparkline hidden):
   topStack (nav-row bottom -> first setrow top) 217.8 at 390x844, 177.1 at
   390x667; setlog bottom -> .adjust top gap 141.9 / 47.3; set rows 44px.
   The new contract: top stack >=20% shorter, gap <=8px, rows grow to fill
   the log, nothing scrolls, nothing clips.                              */
const { test, expect } = require("@playwright/test");
const path = require("path");

const url = "file://" + path.resolve(__dirname, "..", "index.html");
const BASE = { 844: 217.8, 667: 177.1 };

for (const size of [{ width: 390, height: 844 }, { width: 390, height: 667 }]) {
  test.describe(`lift geometry 390x${size.height}`, () => {
    test.use({ viewport: size });

    test("the top stack is cut and the set log absorbs the slack", async ({ page }) => {
      const errors = [];
      page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
      page.on("pageerror", (e) => errors.push(String(e)));

      await page.goto(url);
      await page.evaluate(() => localStorage.clear());
      await page.reload();
      await page.locator(".liftrow").first().click();
      await expect(page.locator("#exName")).toBeVisible();

      const m = await page.evaluate(() => {
        const nav = document.querySelector(".liftnav").getBoundingClientRect();
        const rows = [...document.querySelectorAll("#setLog .setrow")];
        const log = document.getElementById("setLog").getBoundingClientRect();
        const adj = document.querySelector(".adjust").getBoundingClientRect();
        const h = (el) => +el.getBoundingClientRect().height.toFixed(1);
        return {
          topStack: +(rows[0].getBoundingClientRect().top - nav.bottom).toFixed(1),
          gap: +(adj.top - log.bottom).toFixed(1),
          rows: rows.map(h),
          rir: Math.min(...[...document.querySelectorAll(".rir")].map(h)),
          done: h(document.getElementById("doneBtn")),
          scrollH: document.documentElement.scrollHeight,
          innerH: window.innerHeight
        };
      });

      expect(m.topStack, "the top stack must be >=20% shorter than the baseline")
        .toBeLessThanOrEqual(0.8 * BASE[size.height]);
      expect(m.gap, "no void between the last set row and the adjust cluster").toBeLessThanOrEqual(8);
      expect(Math.min(...m.rows), "set rows keep the 44px tap target").toBeGreaterThanOrEqual(44);
      expect(m.rir, "RIR pills stay 44px").toBeGreaterThanOrEqual(44);
      expect(m.done, "Set Done stays >=44px").toBeGreaterThanOrEqual(44);
      expect(m.scrollH, "one screen, no scroll").toBeLessThanOrEqual(m.innerH + 1);

      // peek mode: the timer strip must not push anything off screen
      await page.locator("#detailsBtn").click();
      await expect(page.locator("#doneBtn")).toBeVisible();
      const peek = await page.evaluate(() => ({
        scrollH: document.documentElement.scrollHeight,
        innerH: window.innerHeight,
        guideClamp: getComputedStyle(document.querySelector(".guide")).webkitLineClamp
      }));
      expect(peek.scrollH, "peek mode must not overflow").toBeLessThanOrEqual(peek.innerH + 1);

      expect(errors.filter((e) => !/vibrate|AudioContext/i.test(e))).toEqual([]);
    });

    test("the prescription meta line never clips (longest text in the program)", async ({ page }) => {
      await page.goto(url);
      await page.evaluate(() => localStorage.setItem("gym-tool-v2", JSON.stringify({
        v: 4, cur: "sun", idx: 7, state: {}, liftHistory: {}
      })));
      await page.reload();
      await page.locator(".liftrow").nth(7).click();
      await expect(page.locator("#exName")).toHaveText("Standing calf raise");

      const meta = await page.evaluate(() => {
        const el = document.getElementById("exPres");
        return { text: el.textContent, scrollH: el.scrollHeight, clientH: el.clientHeight };
      });
      expect(meta.text).toBe("15–20 reps · start light · 0 RIR · Rest 2:00");
      expect(meta.scrollH, "the meta line is not clipped").toBeLessThanOrEqual(meta.clientH + 1);
    });
  });
}
