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

/* Every script the page loads must also be typechecked, or a module can ship
   with a type error nobody sees. `sw.js` is deliberately out of scope (its
   `self`/`caches` globals are not in this tsconfig's lib set). */
const OUT_OF_SCOPE = new Set(["sw.js"]);
const scripts = [...new Set([...html.matchAll(/<script src="([^"]+\.js)"/g)].map((m) => m[1]))];
const included = new Set(JSON.parse(fs.readFileSync(path.join(root, "jsconfig.json"), "utf8")).include || []);
const untyped = scripts.filter((s) => !OUT_OF_SCOPE.has(s) && !included.has(s));

if (untyped.length) {
  console.error("check-ids FAIL — index.html loads scripts that typecheck does not cover:\n  " + untyped.join("\n  "));
  process.exit(1);
}

console.log("check-ids OK — " + refs.length + " literal getElementById refs, " + htmlIds.size + " static ids, " + scripts.length + " scripts typechecked");
