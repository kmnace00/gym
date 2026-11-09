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
            { date: "2026-10-01", load: 50, reps: 6, rir: 2, hitTop: true, setsDone: 3 },
            { date: "2026-10-08", load: 52.5, reps: 6, rir: 2, hitTop: true, setsDone: 3 }
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
      await expect(page.locator("#exName")).toBeVisible();
      await expect(page.locator("#doneBtn")).toBeVisible();

      await boxAtLeast(page.locator("#plus15"), 44, 44);
      await boxAtLeast(page.locator("#pauseRest"), 44, 44);
      await boxAtLeast(page.locator("#skipRest"), 44, 44);
      await boxAtLeast(page.locator(".detailsbtn"), 44, 44);

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

test("day tabs announce which day is active", async ({ page }) => {
  await page.goto(url);
  const pressed = () => page.evaluate(() => Array.from(document.querySelectorAll(".day")).map((b) => b.getAttribute("aria-pressed")));
  expect(await pressed()).toEqual(["true", "false", "false"]);
  await page.locator('.day[data-day="sat"]').click();
  expect(await pressed()).toEqual(["false", "true", "false"]);
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

test("the session pill announces Start, then Pause", async ({ page }) => {
  const errors = [];
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
  page.on("pageerror", (e) => errors.push(String(e)));

  await page.goto(url);
  const pill = page.locator("#sessBtn");
  expect(await pill.getAttribute("aria-label"), "idle pill label").toBe("Start workout timer");

  // renderSessionPill() runs after the interval is armed, so the label flips
  // on the same click that starts the clock — no reload needed.
  await pill.click();
  expect(await pill.getAttribute("aria-label"), "running pill label").toBe("Pause workout timer");
  await pill.click();
  expect(await pill.getAttribute("aria-label"), "paused pill label").toBe("Start workout timer");
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
