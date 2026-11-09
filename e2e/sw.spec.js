/* Service-worker behaviour over real HTTP. Every other e2e spec loads the app
   from file://, where service workers cannot register — so install, the
   offline shell, stale-while-revalidate and the update check were never
   exercised. This spec starts its own tiny static server (no
   playwright.config.js change) and covers the offline promise the app makes:
   registration, the offline shell, a failed asset revalidation, a failed
   navigation never poisoning it, and the visibility-triggered deploy check. */
const { test, expect } = require("@playwright/test");
const http = require("http");
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json",
  ".webmanifest": "application/manifest+json",
  ".png": "image/png"
};

let server = null;
let base = "";
let failAppJs = false;
let failNav = false;
let swHits = 0;

test.describe.configure({ mode: "serial" });

test.beforeAll(async () => {
  server = http.createServer((req, res) => {
    const urlPath = decodeURIComponent((req.url || "/").split("?")[0]);
    const rel = urlPath === "/" ? "index.html" : urlPath.replace(/^\/+/, "");
    if (failNav) {
      res.writeHead(500, { "Content-Type": "text/plain" });
      res.end("navigation failed");
      return;
    }
    if (failAppJs && rel === "app.js") {
      res.writeHead(500, { "Content-Type": "text/plain" });
      res.end("app.js failed");
      return;
    }
    if (rel === "sw.js") swHits++;
    const file = path.resolve(ROOT, rel);
    if (!file.startsWith(ROOT + path.sep) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
      res.writeHead(404, { "Content-Type": "text/plain" });
      res.end("not found");
      return;
    }
    res.writeHead(200, {
      "Content-Type": MIME[path.extname(file)] || "application/octet-stream",
      "Cache-Control": "no-store"
    });
    fs.createReadStream(file).pipe(res);
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  base = "http://127.0.0.1:" + server.address().port + "/";
});

test.afterAll(async () => {
  if (server) await new Promise((resolve) => server.close(resolve));
});

/** Load the app over HTTP and wait until the SW is installed and controlling. */
async function bootWithSw(page) {
  await page.goto(base);
  await page.evaluate(async () => { await navigator.serviceWorker.ready; });
  await page.waitForFunction(() => navigator.serviceWorker.controller !== null);
  await expect(page.locator(".liftrow")).toHaveCount(8);
}

test("the service worker registers and serves the offline shell from cache", async ({ page, context }) => {
  await bootWithSw(page);

  const registered = await page.evaluate(async () => {
    const reg = await navigator.serviceWorker.getRegistration();
    return !!(reg && reg.active);
  });
  expect(registered).toBe(true);

  await context.setOffline(true);
  await page.reload();
  await expect(page.locator(".liftrow")).toHaveCount(8);
  await context.setOffline(false);
});

test("a 500 on app.js or a navigation still serves the cached app", async ({ page, context }) => {
  await bootWithSw(page);

  // (a) asset revalidation fails after boot → the cached app.js must still run
  failAppJs = true;
  await page.reload();
  await expect(page.locator(".liftrow")).toHaveCount(8);
  failAppJs = false;

  // (b) a failed navigation must never replace the cached shell
  failNav = true;
  await page.goto(base);
  failNav = false;
  await context.setOffline(true);
  await page.reload();
  await expect(page.locator(".liftrow")).toHaveCount(8);
  await context.setOffline(false);
});

/* B3-23 — an app that never reloads never revalidates the deploy. Coming back
   to the tab must ask the service worker for a newer sw.js (throttled), so the
   next navigation serves the new build. */
test("coming back to the app checks for a service worker update (B3-23)", async ({ page }) => {
  await bootWithSw(page);

  const wired = await page.evaluate(async () => {
    const reg = await navigator.serviceWorker.getRegistration();
    if (!reg || typeof reg.update !== "function") return false;
    const real = reg.update.bind(reg);
    window.__updateCalls = 0;
    window.__fetched = false;
    reg.update = function () {
      window.__updateCalls++;
      return real().then((r) => { window.__fetched = true; return r; });
    };
    return true;
  });
  expect(wired).toBe(true);

  swHits = 0;

  // hidden: no check while the tab is out of view
  await page.evaluate(() => {
    Object.defineProperty(document, "visibilityState", { get: () => "hidden", configurable: true });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  expect(await page.evaluate(() => window.__updateCalls)).toBe(0);

  // visible: the check runs, and the real update resolves after fetching ./sw.js
  await page.evaluate(() => {
    Object.defineProperty(document, "visibilityState", { get: () => "visible", configurable: true });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await page.waitForFunction(() => window.__fetched, { timeout: 10000 });
  expect(swHits, "registration.update() must actually fetch ./sw.js").toBeGreaterThan(0);

  // throttled: a second visibilitychange inside the window does not re-check
  await page.evaluate(() => document.dispatchEvent(new Event("visibilitychange")));
  expect(await page.evaluate(() => window.__updateCalls)).toBe(1);
});
