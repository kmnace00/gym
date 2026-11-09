/* Guard against id drift: every literal `document.getElementById("x")` in
   app.js must exist in index.html or be created at runtime by a template
   string. A typo here is a silent null (or a crash) that e2e may not cover.   */
const fs = require("fs");
const path = require("path");
const root = path.join(__dirname, "..");

const app = fs.readFileSync(path.join(root, "app.js"), "utf8");
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");

const refs = [...new Set([...app.matchAll(/getElementById\(\s*"([^"]+)"\s*\)/g)].map((m) => m[1]))];
const htmlIds = new Set([...html.matchAll(/\bid="([^"]+)"/g)].map((m) => m[1]));
/* ids the app builds itself, e.g. the session pill's `<span id='elapsed'>` */
const dynamic = new Set([
  ...[...app.matchAll(/\bid='([^']+)'/g)].map((m) => m[1]),
  ...[...app.matchAll(/\bid=\\?"([^"\\]+)\\?"/g)].map((m) => m[1])
]);

const missing = refs.filter((id) => !htmlIds.has(id) && !dynamic.has(id));

if (missing.length) {
  console.error("check-ids FAIL — getElementById targets not in index.html or created at runtime:\n  " + missing.join("\n  "));
  process.exit(1);
}
console.log("check-ids OK — " + refs.length + " literal getElementById refs, " + htmlIds.size + " static ids");
