/* B5-01 lift-page geometry. Baselines recorded at d1e18e3 (fresh profile,
   lift 1, default state — suggestion / Prev / sparkline hidden):
   topStack (nav-row bottom -> first setrow top) 217.8 at 390x844, 177.1 at
   390x667; setlog bottom -> .adjust top gap 141.9 / 47.3; set rows 44px.
   The new contract: top stack >=20% shorter, gap <=8px, rows grow to fill
   the log, nothing scrolls, nothing clips. N1 (Nov 13) then put the 44px
   action pills fully in flow (+14px, no negative margins) and N7 added the
   ramp guide to the first lift's view, so the budget allows for exactly
   those two blocks and everything else must still meet the 20% cut.        */
const { test, expect } = require("@playwright/test");
const path = require("path");

const url = "file://" + path.resolve(__dirname, "..", "index.html");
const BASE = { 844: 217.8, 667: 177.1 };

for (const size of [{ width: 390, height: 844 }, { width: 390, height: 667 }]) {
  test.describe(`lift geometry 390x${size.height}`, () => {
    test.use({ viewport: size });

    test("B6-11 spacing rhythm: stack gaps on the beat, pills clear the first row", async ({ page }) => {
      await page.goto(url);
      await page.evaluate(() => localStorage.clear());
      await page.reload();
      await page.locator(".liftrow").first().click();
      await expect(page.locator("#exName")).toBeVisible();
      const m = await page.evaluate(() => {
        const R = (el) => el.getBoundingClientRect();
        const head = R(document.querySelector(".sethead"));
        const rows = [...document.querySelectorAll("#setLog .setrow")].map(R);
        const nav = R(document.querySelector(".liftnav"));
        const name = R(document.getElementById("exName"));
        const pres = R(document.getElementById("exPres"));
        const pillBottom = Math.max(
          ...[document.getElementById("undoSetBtn"), document.getElementById("resetLiftBtn")]
            .map((b) => b.getBoundingClientRect().bottom)
        );
        return {
          headGap: +(rows[0].top - head.bottom).toFixed(2),
          rowGap: +(rows[1].top - rows[0].bottom).toFixed(2),
          navGap: +(name.top - nav.bottom).toFixed(2),
          presGap: +(pres.top - name.bottom).toFixed(2),
          clear: +(rows[0].top - pillBottom).toFixed(2),
          paintedGap: +(rows[0].top - pillBottom).toFixed(2),
          rirMt: getComputedStyle(document.querySelector(".rirrow")).marginTop
        };
      });
      expect(m.clear, "44px pills must not touch the first set row").toBeGreaterThanOrEqual(1);
      if (size.height === 844) {
        // N1 (Nov 13): the action pills sit fully in flow now — no negative
        // margins — so the visible gap above the first row is the border gap.
        // B10-01 still holds: it equals the gap between rows (the 6px beat).
        expect(m.headGap, "border gap above the first row equals the row gap").toBeCloseTo(m.rowGap, 0);
        expect(m.navGap, "nav -> name is 8px").toBeCloseTo(8, 0);
        expect(m.presGap, "name -> prescription is 8px").toBeCloseTo(8, 0);
        expect(m.rirMt, "RIR row margin-top is 8px").toBe("8px");
        // B10-01: the rhythm is a PAINTED-box rhythm — the gap the eye sees
        // between the pills and the first row equals the gap between rows.
        expect(Math.abs(m.paintedGap - m.rowGap), "painted gap above the first row equals the gap between rows").toBeLessThanOrEqual(0.6);
      }
    });

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
        const rampEl = document.getElementById("rampLine");
        return {
          topStack: +(rows[0].getBoundingClientRect().top - nav.bottom).toFixed(1),
          ramp: rampEl.getBoundingClientRect().height ? +(rampEl.getBoundingClientRect().height + 8).toFixed(1) : 0, // + its 8px top margin
          gap: +(adj.top - log.bottom).toFixed(1),
          rows: rows.map(h),
          rir: Math.min(...[...document.querySelectorAll(".rir")].map(h)),
          done: h(document.getElementById("doneBtn")),
          scrollH: document.documentElement.scrollHeight,
          innerH: window.innerHeight
        };
      });

      // B5-01's twenty-percent cut was calibrated on the pre-N1 layout, where
      // the 44px action pills painted 14px INTO the gap above them (negative
      // margins) and there was no ramp guide. N1 (Nov 13) put those pills
      // fully in flow and N7 added the ramp line to the first lift's view;
      // both are deliberate, so the budget allows for exactly those two
      // blocks (+2px for rounding) and everything else must still fit the cut.
      const N1_PILL_INFLOW = 14, ROUNDING = 2;
      expect(m.topStack - m.ramp, "the top stack must be >=20% shorter than the baseline (plus N1's in-flow pills)")
        .toBeLessThanOrEqual(0.8 * BASE[size.height] + N1_PILL_INFLOW + ROUNDING);
      expect(m.gap, "no void between the last set row and the adjust cluster").toBeLessThanOrEqual(8);
      expect(Math.min(...m.rows), "set rows keep the 44px tap target").toBeGreaterThanOrEqual(44);
      expect(m.rir, "RIR pills stay 44px").toBeGreaterThanOrEqual(44);
      expect(m.done, "Set Done stays >=44px").toBeGreaterThanOrEqual(44);
      expect(m.scrollH, "one screen, no scroll").toBeLessThanOrEqual(m.innerH + 1);

      // peek mode (Set Done -> rest -> show workout): the lift view goes
      // quiet (N11) — editor hidden, the set log stays as the reference —
      // and nothing overflows
      await page.locator("#doneBtn").click();
      await page.locator("#detailsBtn").click();
      await expect(page.locator("#doneBtn")).toBeHidden();
      await expect(page.locator("#setLog")).toBeVisible();
      const peek = await page.evaluate(() => ({
        scrollH: document.documentElement.scrollHeight,
        innerH: window.innerHeight,
        guide: document.querySelector(".guide").getBoundingClientRect().height
      }));
      expect(peek.guide, "the cue block is part of the quieted editor").toBe(0);
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
