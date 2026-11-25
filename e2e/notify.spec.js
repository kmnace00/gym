/* N9 (Tier A): rest-done notifications must go through the service worker
   registration — iOS throws on the Notification constructor, so the old
   code silently never fired on an iPhone. Served over HTTP (file:// has no
   SW); the registration is stubbed so the test captures exactly what the
   app asks it to show, when it must stay silent, and when it auto-closes.
   Nov 20: a silent 10 s heads-up now precedes the GO banner. */
const { test, expect } = require("@playwright/test");
const http = require("http");
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const MIME = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".json": "application/json", ".webmanifest": "application/manifest+json", ".png": "image/png" };

let server = null;
let base = "";

test.describe.configure({ mode: "serial" });

test.beforeAll(async () => {
  server = http.createServer((req, res) => {
    const urlPath = decodeURIComponent((req.url || "/").split("?")[0]);
    const rel = urlPath === "/" ? "index.html" : urlPath.replace(/^\/+/, "");
    const file = path.join(ROOT, rel);
    if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { "Content-Type": MIME[path.extname(file)] || "application/octet-stream" });
    fs.createReadStream(file).pipe(res);
  });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  base = "http://127.0.0.1:" + server.address().port + "/";
});

test.afterAll(async () => { if (server) await new Promise((r) => server.close(r)); });

async function armedPage(page) {
  await page.addInitScript(() => {
    window.__shown = [];
    window.__closed = [];
    window.__live = [];
    const live = window.__live;
    const reg = {
      showNotification: (t, o) => {
        /* Same tag replaces the old banner, as a real SW registration does. */
        const prior = live.findIndex((n) => n.options.tag === o.tag);
        if (prior >= 0) live.splice(prior, 1);
        const n = {
          title: t, options: o,
          close: () => {
            const i = live.indexOf(n);
            if (i >= 0) live.splice(i, 1);
            window.__closed.push(t);
          }
        };
        live.push(n);
        window.__shown.push([t, o]);
        return Promise.resolve();
      },
      getNotifications: (query) => Promise.resolve(live.filter((n) => !query || !query.tag || n.options.tag === query.tag))
    };
    Object.defineProperty(navigator, "serviceWorker", {
      configurable: true,
      value: { ready: Promise.resolve(reg), register: () => Promise.resolve(reg), controller: null, addEventListener: () => {} }
    });
    window.Notification = { permission: "granted", requestPermission: () => Promise.resolve("granted") };
    Object.defineProperty(document, "hidden", { configurable: true, get: () => true });
  });
  await page.clock.install({ time: new Date("2026-11-13T10:00:00") });
  await page.goto(base);
  await page.evaluate(() => localStorage.setItem("gym-notify", "1"));
}

async function startRest(page) {
  await page.locator(".liftrow").first().click();
  await page.locator("#doneBtn").click(); // set 1 -> rest (3:00)
  await expect(page.locator("#timerBar")).toHaveClass(/active/);
}

test("a 10 s heads-up precedes GO; both route through the SW registration", async ({ page }) => {
  await armedPage(page);
  await startRest(page);
  await page.clock.runFor(169000); // 11 s left — still quiet
  expect(await page.evaluate(() => window.__shown.length)).toBe(0);

  await page.clock.runFor(1000); // 10 s left -> silent heads-up
  let shown = await page.evaluate(() => window.__shown);
  expect(shown.length).toBe(1);
  expect(shown[0][0]).toBe("Rest almost done — get ready");
  expect(shown[0][1].tag).toBe("gym-rest");

  await page.clock.runFor(5000); // still active — no repeat on 200 ms ticks
  expect(await page.evaluate(() => window.__shown.length)).toBe(1);

  await page.clock.runFor(6000); // rest expires -> GO -> second banner
  shown = await page.evaluate(() => window.__shown);
  expect(shown.length).toBe(2);
  expect(shown[1][0]).toBe("Rest done — GO");
  expect(shown[1][1].tag).toBe("gym-rest");
});

test("GO notification body says Up now, matching the in-app rest line (U137)", async ({ page }) => {
  await armedPage(page);
  await startRest(page);
  await expect(page.locator("#restNext")).toContainText("Up next —");
  await page.clock.runFor(181000); // heads-up at 170 s, GO at 180 s
  await expect(page.locator("#restNext")).toContainText("Up now —"); // in-app already right
  const shown = await page.evaluate(() => window.__shown);
  expect(shown[1][0]).toBe("Rest done — GO");
  expect(shown[0][1].body).toContain("Up next —"); // prep banner unchanged
  expect(shown[1][1].body).toContain("Up now —"); // stale pre-fix ("Up next — …")
  expect(shown[1][1].body).not.toContain("Up next —");
});

test("each banner auto-closes 30 s after it appears (GO replaces the heads-up timer)", async ({ page }) => {
  await armedPage(page);
  await startRest(page);
  await page.clock.runFor(181000); // heads-up at 170 s, GO at 180 s
  expect(await page.evaluate(() => window.__shown.length)).toBe(2);
  expect(await page.evaluate(() => window.__live.length)).toBe(1);

  await page.clock.runFor(20000); // the heads-up's old 30 s timer was replaced
  expect(await page.evaluate(() => window.__closed.length)).toBe(0);

  await page.clock.runFor(10000); // 30 s after GO
  expect(await page.evaluate(() => window.__closed)).toEqual(["Rest done — GO"]);
  expect(await page.evaluate(() => window.__live.length)).toBe(0);
});

test("a thawed tick far past the rest's end stays silent (no stale banner)", async ({ page }) => {
  await armedPage(page);
  await startRest(page);
  await page.clock.runFor(5000); // a few live ticks anchor the scheduled end
  await page.clock.setSystemTime(new Date("2026-11-13T10:10:00")); // "locked phone": wall clock jumps, timers frozen
  await page.clock.runFor(1000); // the thawed tick flips to GO, minutes late
  const shown = await page.evaluate(() => window.__shown);
  expect(shown.length).toBe(0);
});

test("opted out means no notification even at GO", async ({ page }) => {
  await armedPage(page);
  await page.evaluate(() => localStorage.setItem("gym-notify", "0"));
  await startRest(page);
  await page.clock.runFor(181000);
  const shown = await page.evaluate(() => window.__shown);
  expect(shown.length).toBe(0);
});
