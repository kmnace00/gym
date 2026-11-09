/* Guard against asset drift: every local file index.html references must be in
   the service worker's ASSETS list, and every listed asset must exist on disk.
   The hand-maintained list in sw.js is the fragile part; this makes drift a
   test failure instead of an offline blank screen.                            */
const fs = require("fs");
const path = require("path");
const root = path.join(__dirname, "..");

function read(f) { return fs.readFileSync(path.join(root, f), "utf8"); }

const html = read("index.html");
const sw = read("sw.js");

const refs = [...html.matchAll(/(?:src|href)="([^"]+)"/g)]
  .map((m) => m[1])
  .filter((u) => !/^(?:https?:|data:|#)/.test(u))
  .map((u) => u.replace(/^\.\//, ""));

const listMatch = /const ASSETS\s*=\s*\[([\s\S]*?)\];/.exec(sw);
if (!listMatch) {
  console.error("check-assets FAIL: could not find the ASSETS array in sw.js");
  process.exit(1);
}
const assets = [...listMatch[1].matchAll(/"([^"]+)"/g)]
  .map((m) => m[1].replace(/^\.\//, ""))
  .filter((a) => a !== ""); // "./" is the document root, not a file

const problems = [];
for (const r of refs) {
  if (!assets.includes(r)) problems.push("index.html references " + r + " but sw.js ASSETS omits it");
}
for (const a of assets) {
  if (!fs.existsSync(path.join(root, a))) problems.push("sw.js ASSETS lists a missing file: " + a);
}

/* the manifest is the other place icons are named — a renamed icon there is
   invisible to the page refs, so parse it too. */
let manifestIcons = [];
try {
  const manifest = JSON.parse(read("manifest.webmanifest"));
  manifestIcons = (manifest.icons || []).map((i) => (i && i.src ? i.src : "")).filter(Boolean);
} catch (e) {
  console.error("check-assets FAIL: manifest.webmanifest is not valid JSON — " + e.message);
  process.exit(1);
}
for (const icon of manifestIcons) {
  const file = icon.replace(/^\.\//, "");
  if (!fs.existsSync(path.join(root, file))) problems.push("manifest.webmanifest references a missing icon: " + icon);
  if (!assets.includes(file)) problems.push("manifest.webmanifest references " + icon + " but sw.js ASSETS omits it");
}

if (problems.length) {
  console.error("check-assets FAIL\n" + problems.join("\n"));
  process.exit(1);
}
console.log("check-assets OK — " + refs.length + " page refs, " + assets.length + " cached assets, " + manifestIcons.length + " manifest icons");
