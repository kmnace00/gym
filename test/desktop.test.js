/* D1 guard: the desktop shell is deliberately out of the root gates (thin
   Electron wrapper, no app logic), but its security posture is load-bearing.
   These keys are what keep a page running in that window away from Node and
   from silently replacing the app; a future "just add a preload" edit must
   fail here first. String-read, no Electron launch needed. */
const test = require("node:test");
const assert = require("node:assert");
const fs = require("fs");
const path = require("path");

const src = fs.readFileSync(path.join(__dirname, "..", "desktop", "main.js"), "utf8");

test("desktop shell keeps the hardened Electron posture", () => {
  assert.match(src, /contextIsolation:\s*true/, "contextIsolation must stay on");
  assert.match(src, /sandbox:\s*true/, "sandbox must stay on");
  assert.match(src, /nodeIntegration:\s*false/, "the renderer must not get Node");
  assert.match(src, /setWindowOpenHandler/, "new windows must be intercepted");
  assert.match(src, /action:\s*"deny"/, "the window handler must deny, not open a second window");
  assert.match(src, /will-navigate/, "the window must not navigate away from the app");
  assert.match(src, /loadURL\(APP_URL\)/, "the shell loads the live app, not a forked copy");
});
