/* Shell height pin: iOS Home-Screen (standalone) mode can under-report the
   dynamic viewport height, leaving a strip of body under the app ("chin gap").
   app.js syncViewportHeight() writes --app-h from window.innerHeight (lifted to
   screen.height in standalone), and .app sizes itself from that. These specs
   pin the mechanism: --app-h is set, the shell fills exactly that height, and
   nothing scrolls. */
const { test, expect } = require("@playwright/test");
const path = require("path");

const url = "file://" + path.resolve(__dirname, "..", "index.html");

for (const viewport of [{ width: 390, height: 844 }, { width: 430, height: 932 }, { width: 390, height: 667 }]) {
  test(`shell fills the viewport exactly at ${viewport.width}x${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto(url);

    const m = await page.evaluate(() => {
      const app = document.getElementById("app").getBoundingClientRect();
      return {
        pinned: document.documentElement.style.getPropertyValue("--app-h"),
        innerH: window.innerHeight,
        appTop: app.top,
        appBottom: app.bottom,
        scrollH: document.documentElement.scrollHeight
      };
    });

    // the CSS variable exists and matches the live viewport
    expect(m.pinned).toBe(m.innerH + "px");
    // the shell starts at the top and ends exactly at the screen bottom — the
    // legacy bug was an app box shorter than the viewport (empty strip below)
    expect(m.appTop).toBe(0);
    expect(Math.abs(m.appBottom - m.innerH)).toBeLessThanOrEqual(1);
    expect(m.scrollH).toBeLessThanOrEqual(m.innerH + 1);
  });
}
