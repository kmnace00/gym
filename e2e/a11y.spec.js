/* Accessibility gate: 44px touch targets where the one-screen layout can
   absorb them, keyboard order on the rest screen, and hidden controls stay
   unreachable. The no-scroll invariant is asserted in the same pass.       */
const { test, expect } = require("@playwright/test");
const path = require("path");

const url = "file://" + path.resolve(__dirname, "..", "index.html");
const sizes = [{ width: 390, height: 667 }, { width: 390, height: 844 }];

async function seed(page, obj) {
  await page.goto(url);
  await page.evaluate((o) => localStorage.setItem("gym-tool-v2", JSON.stringify(o)), obj);
  await page.reload();
}

async function noOverflow(page) {
  const ok = await page.evaluate(() => document.documentElement.scrollHeight <= window.innerHeight + 1);
  expect(ok, "page must not scroll").toBe(true);
}

async function boxAtLeast(locator, minW, minH) {
  const box = await locator.boundingBox();
  expect(box, "control must be visible").not.toBeNull();
  expect(box.width >= minW, `control width ${Math.round(box.width)} must be >= ${minW}`).toBe(true);
  expect(box.height >= minH, `control height ${Math.round(box.height)} must be >= ${minH}`).toBe(true);
}

for (const size of sizes) {
  test.describe(`accessibility viewport 390x${size.height}`, () => {
    test.use({ viewport: size });

    test("lift arrows, set actions, apply, backup dismiss, steppers, and set rows meet 44px", async ({ page }) => {
      const errors = [];
      page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
      page.on("pageerror", (e) => errors.push(String(e)));

      await seed(page, {
        v: 2,
        cur: "fri",
        idx: 0,
        state: {
          "fri:0": { done: 0, load: 55, reps: 6, rir: 2, topHits: 0, lastRir: null, sets: [] }
        },
        liftHistory: {
          "fri:0": [
            { date: "2026-10-01", load: 50, reps: 8, rir: 2, hitTop: true, setsDone: 3 },
            { date: "2026-10-08", load: 52.5, reps: 8, rir: 2, hitTop: true, setsDone: 3 }
          ]
        }
      });

      await expect(page.locator("#backupBar")).toBeVisible();
      await noOverflow(page);
      await boxAtLeast(page.locator(".bbdismiss"), 44, 44);

      await page.locator(".liftrow").first().click();
      await expect(page.locator("#exName")).toBeVisible();
      await noOverflow(page);

      await boxAtLeast(page.locator("#prevLift"), 44, 44);
      await boxAtLeast(page.locator("#nextLift"), 44, 44);

      await expect(page.locator("#trendToggle")).toBeVisible();
      await boxAtLeast(page.locator("#trendToggle"), 44, 44);
      await boxAtLeast(page.locator("#undoSetBtn"), 44, 44);
      await boxAtLeast(page.locator("#resetLiftBtn"), 44, 44);

      await expect(page.locator("#setLog .setrow").first()).toBeVisible();
      await boxAtLeast(page.locator("#setLog .setrow").first(), 44, 44);

      await expect(page.locator("#suggestLine")).toBeVisible();
      await expect(page.locator("#applyLoad")).toBeVisible();
      await boxAtLeast(page.locator("#applyLoad"), 44, 44);

      await boxAtLeast(page.locator("#loadDown"), 44, 44);
      await boxAtLeast(page.locator("#repUp"), 44, 44);

      await page.locator("#doneBtn").click();
      await expect(page.locator("#timerBar")).toHaveClass(/active/);
      await noOverflow(page);

      await page.locator("#detailsBtn").click();
      await noOverflow(page);
      // N11: a running rest peek is quiet — the rest card is the working
      // surface and the editor waits for GO (or for a set edit). The set log
      // stays as the reference, and the rest controls keep their 44px targets.
      await expect(page.locator("#setLog")).toBeVisible();
      await expect(page.locator("#exName")).toBeHidden();
      await expect(page.locator("#doneBtn")).toBeHidden();

      await boxAtLeast(page.locator("#plus15"), 44, 44);
      await boxAtLeast(page.locator("#pauseRest"), 44, 44);
      await boxAtLeast(page.locator("#skipRest"), 44, 44);
      await boxAtLeast(page.locator(".detailsbtn"), 44, 44);

      // ending the rest restores the editor (GO and idle both do)
      await page.locator("#skipRest").click();
      await noOverflow(page);
      await expect(page.locator("#exName")).toBeVisible();
      await expect(page.locator("#doneBtn")).toBeVisible();

      expect(errors.filter((e) => !/vibrate|AudioContext/i.test(e))).toEqual([]);
    });

    test("backup and save-bar action buttons meet 44px (B5-13)", async ({ page }) => {
      const errors = [];
      page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
      page.on("pageerror", (e) => errors.push(String(e)));

      // the backup banner's "Backup" button
      await seed(page, {
        v: 2, cur: "fri", idx: 0, state: {},
        liftHistory: { "fri:0": [{ date: "2026-11-01", load: 50, reps: 6, rir: 2, hitTop: true, setsDone: 3 }] }
      });
      await expect(page.locator("#backupBarSave")).toBeVisible();
      await boxAtLeast(page.locator("#backupBarSave"), 44, 44);
      await noOverflow(page);

      // the salvaged save bar: "Keep recovered log" + "Download copy"
      await page.goto(url);
      await page.evaluate(() => {
        const day = Gym.todayDay(), date = Gym.dateKey();
        const good = { date, load: 77, reps: 6, rir: 2, hitTop: true, setsDone: 3,
          sets: [{ load: 77, reps: 6, rir: 2 }, { load: 77, reps: 6, rir: 2 }, { load: 77, reps: 6, rir: 2 }] };
        localStorage.setItem("gym-tool-v2", '{"v":4,"cur":"' + day + '","idx":0,"state":{},"sessionLog":[],"bodyweight":165,' +
          '"liftHistory":{"' + day + ':0":[' + JSON.stringify(good) + ',{"date":"2026-11-08","load":80');
      });
      await page.reload();
      await expect(page.locator("#saveBar")).toBeVisible();
      await boxAtLeast(page.locator("#saveBarAction"), 44, 44);
      await boxAtLeast(page.locator("#saveBarDownload"), 44, 44);
      await noOverflow(page);

      expect(errors.filter((e) => !/vibrate|AudioContext/i.test(e))).toEqual([]);
    });
  });
}

test("keyboard rest order is +15 / Pause / End rest / Show workout / Undo / prep steppers", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 667 });
  await page.goto(url);
  await page.locator(".liftrow").first().click();
  await page.locator("#doneBtn").click();
  await expect(page.locator("#timerBar")).toHaveClass(/active/);

  await page.locator("#plus15").focus();
  const order = [];
  for (let i = 0; i < 7; i++) {
    await page.keyboard.press("Tab");
    const id = await page.evaluate(() => document.activeElement && document.activeElement.id);
    if (id) order.push(id);
  }

  expect(order).toEqual([
    "pauseRest",
    "skipRest",
    "detailsBtn",
    "undoBtn",
    "restLoadDown",
    "restLoadUp",
    "restRepDown"
  ]);

  const hiddenNotReachable = await page.evaluate(() => {
    const ids = ["rPrevBtn", "rNextBtn"];
    return ids.every((id) => {
      const el = document.getElementById(id);
      const wrap = el.closest(".rnav");
      el.focus();
      return wrap && getComputedStyle(wrap).display === "none" && !el.hasAttribute("tabindex") && document.activeElement !== el;
    });
  });
  expect(hiddenNotReachable).toBe(true);
});

test("Import backup is reachable and activatable by keyboard", async ({ page }) => {
  await page.goto(url);
  await page.evaluate(() => {
    window.__importClicked = false;
    document.getElementById("importFile").addEventListener("click", () => { window.__importClicked = true; });
  });
  await page.locator("#menuBtn").click();
  await page.locator("#modalClose").focus();

  let found = false;
  for (let i = 0; i < 8 && !found; i++) {
    await page.keyboard.press("Tab");
    found = await page.evaluate(() => document.activeElement && document.activeElement.id === "importBtn");
  }
  expect(found, "Tab reaches Import backup").toBe(true);

  await page.keyboard.press("Enter");
  expect(await page.evaluate(() => window.__importClicked), "Enter opens the file picker").toBe(true);
});

test("the day title names the day; the day chevrons are labelled (N12)", async ({ page }) => {
  await page.goto(url);
  await expect(page.locator(".day")).toHaveCount(0);
  const label = await page.evaluate(() => Gym.DAYS[Gym.todayDay()].label);
  await expect(page.locator("#dayTitle")).toContainText(label.split(" — ")[0]);
  await expect(page.locator("#dayPrev")).toHaveAttribute("aria-label", "Previous day");
  await expect(page.locator("#dayNext")).toHaveAttribute("aria-label", "Next day");
  // one chevron step moves the title to the neighbouring training day
  const nextName = await page.evaluate(() => {
    const keys = ["fri", "sat", "sun"];
    return Gym.DAYS[keys[(keys.indexOf(Gym.todayDay()) + 1) % 3]].label.split(" — ")[0];
  });
  await page.locator("#dayNext").click();
  await expect(page.locator("#dayTitle")).toContainText(nextName);
});

test("keyboard focus is visible on role=button rows and on buttons", async ({ page }) => {
  await page.goto(url);
  // Chrome only paints :focus-visible when the focus came from the keyboard,
  // so reach every control by Tab rather than by el.focus().
  const focusedOutline = () => page.evaluate(() => {
    const st = getComputedStyle(document.activeElement);
    return st.outlineStyle !== "none" && parseFloat(st.outlineWidth) > 0;
  });
  const tabTo = async (cls) => {
    for (let i = 0; i < 25; i++) {
      await page.keyboard.press("Tab");
      const hit = await page.evaluate((c) => {
        const el = document.activeElement;
        return !!el && (el.className || "").includes(c);
      }, cls);
      if (hit) return true;
    }
    return false;
  };
  expect(await tabTo("liftrow")).toBe(true);
  expect(await focusedOutline()).toBe(true);
  await page.locator(".liftrow").first().click();
  // only logged set rows are role="button" tabindex="0": log one, skip the rest
  await page.locator("#doneBtn").click();
  await page.waitForTimeout(200);
  await page.locator("#skipRest").click();
  expect(await tabTo("setrow")).toBe(true);
  expect(await focusedOutline()).toBe(true);
  expect(await tabTo("donebtn")).toBe(true);
  expect(await focusedOutline()).toBe(true);
  expect(await tabTo("stepbtn")).toBe(true);
  expect(await focusedOutline()).toBe(true);
});

test("Escape closes the menu, and the menu close control is 44px", async ({ page }) => {
  await page.goto(url);
  await page.locator("#menuBtn").click();
  await expect(page.locator("#modal")).toBeVisible();
  await boxAtLeast(page.locator("#modalClose"), 44, 44);
  await page.keyboard.press("Escape");
  await expect(page.locator("#modal")).toBeHidden();
});

test("the session pill announces Start, then Resume", async ({ page }) => {
  const errors = [];
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
  page.on("pageerror", (e) => errors.push(String(e)));

  await page.clock.install({ time: new Date("2026-11-06T10:00:00") });
  await page.goto(url);
  const pill = page.locator("#sessBtn");
  expect(await pill.getAttribute("aria-label"), "idle pill label").toBe("Start workout timer");

  // renderSessionPill() runs after the interval is armed, so the label flips
  // on the same click that starts the clock — no reload needed.
  await pill.click();
  expect(await pill.getAttribute("aria-label"), "running pill label").toBe("Pause workout timer");
  await page.clock.runFor(60000); // a minute of the session is on the clock
  await pill.click();
  expect(await pill.getAttribute("aria-label"), "paused pill label").toBe("Resume workout timer");
  expect(await pill.textContent(), "a paused clock reads Resume, not Start").toContain("Resume");
  expect(errors, "no console errors").toEqual([]);
});

test("the RIR picker exposes which value is selected", async ({ page }) => {
  const errors = [];
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
  page.on("pageerror", (e) => errors.push(String(e)));

  await page.goto(url);
  await page.locator(".liftrow").first().click();
  await page.locator('.rir[data-rir="2"]').click();

  const pressed = await page.evaluate(() =>
    Array.from(document.querySelectorAll(".rir")).map((b) => [b.getAttribute("data-rir"), b.getAttribute("aria-pressed")])
  );
  expect(pressed, "only RIR 2 is pressed").toEqual([
    ["0", "false"], ["1", "false"], ["2", "true"], ["3", "false"], ["4", "false"]
  ]);
  expect(errors, "no console errors").toEqual([]);
});

test("view changes place keyboard focus where the user is looking", async ({ page }) => {
  const errors = [];
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
  page.on("pageerror", (e) => errors.push(String(e)));

  await page.goto(url);

  // open a lift with the keyboard: focus the row, press Enter
  await page.locator('.liftrow[data-i="2"]').focus();
  await page.keyboard.press("Enter");
  const inLift = await page.evaluate(() => {
    const el = document.activeElement;
    return {
      id: el ? el.id : "",
      inLiftView: !!(el && document.getElementById("liftView").contains(el))
    };
  });
  expect(inLift.inLiftView, "focus lands inside the lift view").toBe(true);
  expect(inLift.id, "the landing spot is the lift heading").toBe("exName");

  // Back returns focus to the row that was left
  await page.locator("#backBtn").focus();
  await page.keyboard.press("Enter");
  const back = await page.evaluate(() => {
    const el = document.activeElement;
    return { cls: el ? el.className : "", dataI: el ? el.getAttribute("data-i") : "" };
  });
  expect(back.cls, "Back returns focus to the lift row").toContain("liftrow");
  expect(back.dataI, "it is the row the user was on").toBe("2");

  // Progress gets a landing spot too
  await page.locator("#progressBtn").focus();
  await page.keyboard.press("Enter");
  expect(await page.evaluate(() => document.activeElement.id), "progress focus lands on its title").toBe("progTitle");

  expect(errors, "no console errors").toEqual([]);
});

test("status messages are announced to screen readers", async ({ page }) => {
  await page.goto(url);
  const live = await page.evaluate(() => {
    const out = {};
    for (const id of ["saveBar", "backupBar", "modalMsg"]) {
      const el = document.getElementById(id);
      out[id] = el ? { role: el.getAttribute("role"), live: el.getAttribute("aria-live") } : null;
    }
    out.hint = document.getElementById("hint") ? document.getElementById("hint").getAttribute("aria-live") : null;
    return out;
  });
  for (const id of ["saveBar", "backupBar", "modalMsg"]) {
    expect(live[id], `#${id} must exist`).not.toBeNull();
    expect(live[id].role, `#${id} role must be status`).toBe("status");
    expect(live[id].live, `#${id} aria-live must be polite`).toBe("polite");
  }
  expect(live.hint, "#hint aria-live must be polite").toBe("polite");
});

test("day pills and rest steppers meet the 44px target and Plan today is distinct", async ({ page }) => {
  const errors = [];
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
  page.on("pageerror", (e) => errors.push(String(e)));

  await page.setViewportSize({ width: 390, height: 667 });
  await seed(page, {
    v: 3,
    cur: "fri",
    idx: 0,
    state: { "fri:0": { done: 1, load: 50, reps: 6, rir: 2, sets: [{ load: 50, reps: 6, rir: 2 }] } },
    liftHistory: { "fri:0": [{ date: "2026-10-01", load: 50, reps: 6, rir: 2, setsDone: 3 }] },
    sessionLog: [],
    bodyweight: 75
  });

  await expect(page.locator("#continueBtn")).toBeVisible();
  await expect(page.locator("#planBtn")).toBeVisible();
  await noOverflow(page);
  await boxAtLeast(page.locator("#continueBtn"), 44, 44);
  await boxAtLeast(page.locator("#planBtn"), 44, 44);

  const bgOf = (sel) => page.evaluate((s) => getComputedStyle(document.querySelector(s)).backgroundColor, sel);
  const contBg = await bgOf("#continueBtn");
  const planBg = await bgOf("#planBtn");
  expect(planBg, "Plan today must read as secondary, not accent").not.toBe(contBg);

  await page.locator(".liftrow").first().click();
  await page.locator("#doneBtn").click();
  await expect(page.locator("#timerBar")).toHaveClass(/active/);
  await boxAtLeast(page.locator("#restLoadUp"), 44, 44);
  await boxAtLeast(page.locator("#restLoadDown"), 44, 44);

  await noOverflow(page);
  expect(errors, "no console errors").toEqual([]);
});

test("the summary traps focus and returns it on close", async ({ page }) => {
  const errors = [];
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
  page.on("pageerror", (e) => errors.push(String(e)));

  await page.goto(url);
  const { day, date } = await page.evaluate(() => ({ day: Gym.todayDay(), date: Gym.dateKey() }));
  await page.evaluate(({ day, date }) => {
    const state = {};
    Gym.DAYS[day].ex.forEach((e, i) => {
      state[day + ":" + i] = { done: e.s, load: e.load || 0, reps: e.r, rir: e.rir, sets: [] };
    });
    localStorage.setItem("gym-tool-v2", JSON.stringify({
      v: 3, cur: day, idx: 0, bodyweight: 75, state, liftHistory: {}, sessionLog: [],
      active: { id: "ses_a11y", date: date, day: day, startedAt: Date.now() - 1800000, endedAt: null, accSec: 1800, runningSince: null, status: "active" }
    }));
  }, { day, date });
  await page.reload();

  await page.locator("#finishBtn").click();
  await expect(page.locator("#summary")).toBeVisible();
  expect(await page.evaluate(() => document.activeElement && document.activeElement.id)).toBe("sumDone");

  // Tab wraps inside the dialog instead of escaping to the page behind it
  await page.keyboard.press("Tab");
  expect(await page.evaluate(() => document.activeElement && document.activeElement.id)).toBe("sumClose");
  await page.keyboard.press("Shift+Tab");
  expect(await page.evaluate(() => document.activeElement && document.activeElement.id)).toBe("sumDone");

  // Escape closes and focus lands somewhere usable (the opener is hidden now)
  await page.keyboard.press("Escape");
  await expect(page.locator("#summary")).toBeHidden();
  expect(await page.evaluate(() => document.activeElement && document.activeElement.id)).toBe("menuBtn");
  expect(errors.filter((e) => !/vibrate|AudioContext/i.test(e)), "no console errors").toEqual([]);
});

test("the menu is reachable on a short phone", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 667 });
  await page.goto(url);
  await page.locator("#menuBtn").click();

  const card = await page.evaluate(() => {
    const c = document.querySelector(".modal-card");
    const r = c.getBoundingClientRect();
    return { top: r.top, bottom: r.bottom, inner: window.innerHeight, scrollH: c.scrollHeight, clientH: c.clientHeight };
  });
  expect(card.top >= 0 && card.bottom <= card.inner, "the menu card must not overflow the viewport").toBe(true);

  await page.evaluate(() => { const c = document.querySelector(".modal-card"); c.scrollTop = c.scrollHeight; });
  const clear = await page.evaluate(() => {
    const e = document.getElementById("clearAll").getBoundingClientRect();
    return { top: e.top, bottom: e.bottom, h: e.bottom - e.top, inner: window.innerHeight };
  });
  expect(clear.top >= 0 && clear.bottom <= clear.inner, "Clear all is reachable after scrolling").toBe(true);
  expect(clear.h).toBeGreaterThanOrEqual(44);
});

/* B3-24 — adherence is drawn with symbols and colour, so a screen reader needs
   the states in words. N12 removed the week strip (day switching lives on the
   day chevrons, week state in Progress), so the states are read from the heat
   card: the cells carry the pattern and the hidden summary states the count. */
test("the heat card names each week's training days and states the count (B3-24)", async ({ page }) => {
  const errors = [];
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
  page.on("pageerror", (e) => errors.push(String(e)));

  /* The heatmap projects the last 8 Fri–Sun blocks (stats.js progressSnapshot),
     so the clock is pinned to the Wednesday the journey tests use — which puts
     30–31 Oct in a finished week. */
  await page.clock.install({ time: new Date("2026-11-04T10:00:00") }); // Wednesday
  const fri = "2026-10-30", sat = "2026-10-31";
  const history = {};
  for (let i = 0; i < 8; i++) history["fri:" + i] = [{ date: fri, load: 50, reps: 6, rir: 2, hitTop: false, setsDone: 8 }];
  for (let i = 0; i < 3; i++) history["sat:" + i] = [{ date: sat, load: 40, reps: 6, rir: 2, hitTop: false, setsDone: 3 }];

  await page.goto(url);
  await page.evaluate((h) => localStorage.setItem("gym-tool-v2", JSON.stringify({ v: 2, cur: "fri", idx: 0, state: {}, liftHistory: h })), history);
  await page.reload();

  await page.locator("#progressBtn").click();

  // 8 weeks × Fri/Sat/Sun, each cell named for a screen reader by the summary
  expect(await page.locator("#heatmap .hweek").count()).toBe(8);
  expect(await page.locator("#heatmap .hday").count()).toBe(24);
  const box = await page.locator("#heatSummary").boundingBox();
  expect(box && box.width <= 1 && box.height <= 1, "the summary is for screen readers only").toBe(true);
  const count = (await page.locator("#pHeatCount").textContent()).split("/")[0];
  expect(count, "two training days were seeded into the finished week").toBe("2");
  expect(await page.locator("#heatmap .hday.on").count(), "the painted cells agree with the count").toBe(2);
  expect((await page.locator("#heatSummary").textContent()) || "", "heat card names the count")
    .toContain(count + " of 24 training days in the last 8 weeks");
  expect(errors.filter((e) => !/vibrate|AudioContext/i.test(e)), "no console errors").toEqual([]);
});

test("destructive buttons meet 4.5:1 contrast in both themes (B5-18)", async ({ page }) => {
  await page.goto(url);
  const dangerRatio = () => page.evaluate(() => {
    const nums = (s) => (s.match(/\d+/g) || []).map(Number);
    const lum = (c) => {
      const ch = c.slice(0, 3).map((v) => {
        v /= 255;
        return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
      });
      return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2];
    };
    const btn = document.getElementById("clearAll");
    const fg = lum(nums(getComputedStyle(btn).color));
    const bg = lum(nums(getComputedStyle(btn).backgroundColor));
    return (Math.max(fg, bg) + 0.05) / (Math.min(fg, bg) + 0.05);
  });
  const dark = await dangerRatio();
  expect(dark, `dark-theme danger text contrast ${dark.toFixed(2)} must be >= 4.5`).toBeGreaterThanOrEqual(4.5);
  await page.evaluate(() => document.documentElement.setAttribute("data-theme", "light"));
  const light = await dangerRatio();
  expect(light, `light-theme danger text contrast ${light.toFixed(2)} must be >= 4.5`).toBeGreaterThanOrEqual(4.5);
});

for (const size of sizes) {
  test.describe(`swap mode viewport 390x${size.height}`, () => {
    test.use({ viewport: size });

    test("swapped lift: swap button is a 44px target and the view does not scroll", async ({ page }) => {
      const errors = [];
      page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
      page.on("pageerror", (e) => errors.push(String(e)));

      await seed(page, {
        v: 5, cur: "fri", idx: 0, bodyweight: 165, bodyweightSet: false,
        state: { "fri:0": { done: 0, load: 60, reps: 6, rir: 2 } },
        liftHistory: {}, sessionLog: []
      });
      await page.locator(".liftrow").first().click();
      await page.locator("#swapBtn").click();

      // N14: Swap opens the alternatives chooser — every pill is a 44px target
      await expect(page.locator("#swapChoices")).toBeVisible();
      await boxAtLeast(page.locator(".swapchoice").first(), 44, 44);
      await page.locator(".swapchoice", { hasText: "Barbell back squat" }).click();

      await expect(page.locator("#exName")).toHaveText("Barbell back squat");
      await expect(page.locator("#swapSub")).toBeVisible();
      await expect(page.locator("#swapBtn")).toBeVisible();
      await boxAtLeast(page.locator("#swapBtn"), 44, 44);
      await noOverflow(page);

      expect(errors, "no console/page errors").toEqual([]);
    });
  });
}
