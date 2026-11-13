// Gym — Electron main process.
//
// A phone-shaped window (400 px of content) around the SAME app the phone
// runs: it loads the live site, so the desktop always shows the current
// release and there is no second copy of the web app to keep in sync. Its
// localStorage copy is its own; there is deliberately no data bridge.
//
// Run it with `npm start` in this folder (or the "Start Gym.command" launcher
// beside this file). GYM_DESKTOP_URL overrides the URL for local testing.
const { app, BrowserWindow, shell, nativeTheme } = require("electron");
const fs = require("fs");
const path = require("path");

const APP_URL = process.env.GYM_DESKTOP_URL || "https://kmnace00.github.io/gym/";
const PHONE_WIDTH = 400; // content width, not window frame

function createWindow() {
  const win = new BrowserWindow({
    width: PHONE_WIDTH,
    height: 820,
    minWidth: 340,
    minHeight: 560,
    useContentSize: true,
    title: "Gym",
    backgroundColor: nativeTheme.shouldUseDarkColors ? "#17100b" : "#fdebd2",
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  // Anything that tries to open a new window belongs in the real browser.
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//i.test(url)) shell.openExternal(url);
    return { action: "deny" };
  });

  win.loadURL(APP_URL);

  // `GYM_DESKTOP_SMOKE=<png path> npm start` loads the page once, prints what
  // the renderer sees, saves a screenshot, and quits — the launch check used
  // when this app is built.
  if (process.env.GYM_DESKTOP_SMOKE) {
    win.webContents.once("did-finish-load", async () => {
      try {
        // let the entrance animation finish before the screenshot
        await new Promise((r) => setTimeout(r, 600));
        const info = await win.webContents.executeJavaScript(
          "({ url: location.href, title: document.title," +
          " width: innerWidth, height: innerHeight," +
          " dayTitle: (document.getElementById('dayTitle') || {}).textContent," +
          " lifts: document.querySelectorAll('.liftrow').length," +
          " version: (typeof GYM_VERSION === 'string' ? GYM_VERSION : null)," +
          " note: (document.getElementById('dayWeekSummary') || {}).textContent })"
        );
        console.log("GYM_DESKTOP_SMOKE " + JSON.stringify(info));
        const image = await win.webContents.capturePage();
        const out = path.resolve(process.env.GYM_DESKTOP_SMOKE);
        fs.writeFileSync(out, image.toPNG());
        console.log("GYM_DESKTOP_SMOKE_PNG " + out);
      } catch (e) {
        console.error("GYM_DESKTOP_SMOKE_FAILED " + e);
      }
      app.quit();
    });
  }

  return win;
}

app.whenReady().then(() => {
  createWindow();
  app.on("activate", () => {
    if (!BrowserWindow.getAllWindows().length) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
