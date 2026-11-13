/* N9 (Tier A): rest-done notifications must go through the service worker
   registration — iOS throws on the Notification constructor, so the old
   code silently never fired on an iPhone. Served over HTTP (file:// has no
   SW); the registration itself is stubbed so the test captures exactly what
   the app asks it to show, and when it must stay silent. */
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
    const reg = { showNotification: (t, o) => { window.__shown.push([t, o]); } };
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

test("GO routes the notification through the SW registration", async ({ page }) => {
  await armedPage(page);
  await page.locator(".liftrow").first().click();
  await page.locator("#doneBtn").click(); // set 1 -> rest (3:00)
  await expect(page.locator("#timerBar")).toHaveClass(/active/);
  await page.clock.runFor(181000); // rest expires -> GO -> notify effect
  const shown = await page.evaluate(() => window.__shown);
  expect(shown.length).toBe(1);
  expect(shown[0][0]).toBe("Rest done — GO");
  expect(shown[0][1].tag).toBe("gym-rest");
});

test("a thawed tick far past the rest's end stays silent (no stale banner)", async ({ page }) => {
  await armedPage(page);
  await page.locator(".liftrow").first().click();
  await page.locator("#doneBtn").click();
  await expect(page.locator("#timerBar")).toHaveClass(/active/);
  await page.clock.runFor(5000); // a few live ticks anchor the scheduled end
  await page.clock.setSystemTime(new Date("2026-11-13T10:10:00")); // "locked phone": wall clock jumps, timers frozen
  await page.clock.runFor(1000); // the thawed tick flips to GO, minutes late
  const shown = await page.evaluate(() => window.__shown);
  expect(shown.length).toBe(0);
});

test("opted out means no notification even at GO", async ({ page }) => {
  await armedPage(page);
  await page.evaluate(() => localStorage.setItem("gym-notify", "0"));
  await page.locator(".liftrow").first().click();
  await page.locator("#doneBtn").click();
  await page.clock.runFor(181000);
  const shown = await page.evaluate(() => window.__shown);
  expect(shown.length).toBe(0);
});
