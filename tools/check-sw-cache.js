/* B3-31: the service worker's CACHE version is bumped by hand, and a missed
   bump leaves offline users on an old shell until they come back online. This
   guard hashes every file in sw.js ASSETS and compares the digest with the
   `CACHE-HASH` comment in sw.js: change an asset without updating the version,
   the check fails. Deterministic — same inputs, same digest, no timestamps.
   The hash covers file contents only, so the comment itself is not in it.    */
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const root = path.join(__dirname, "..");

const sw = fs.readFileSync(path.join(root, "sw.js"), "utf8");

const listMatch = /const ASSETS\s*=\s*\[([\s\S]*?)\];/.exec(sw);
if (!listMatch) {
  console.error("check-sw-cache FAIL: could not find the ASSETS array in sw.js");
  process.exit(1);
}

const assets = [...listMatch[1].matchAll(/"([^"]+)"/g)]
  .map((m) => m[1].replace(/^\.\//, ""))
  .filter((a) => a !== ""); // "./" is the document root, not a file

const missing = assets.filter((a) => !fs.existsSync(path.join(root, a)));
if (missing.length) {
  console.error("check-sw-cache FAIL: ASSETS lists missing files: " + missing.join(", "));
  process.exit(1);
}

const digest = crypto
  .createHash("sha256")
  .update(assets.map((a) => a + "\n" + fs.readFileSync(path.join(root, a)).toString("utf8")).join("\u0000"))
  .digest("hex")
  .slice(0, 16);

const hashMatch = /CACHE-HASH:\s*([0-9a-f]{16})/.exec(sw);
if (!hashMatch) {
  console.error("check-sw-cache FAIL: sw.js has no `CACHE-HASH: <16 hex>` comment. Add one next to CACHE, value " + digest);
  process.exit(1);
}
if (hashMatch[1] !== digest) {
  console.error("check-sw-cache FAIL: assets changed but CACHE-HASH is stale — recorded " + hashMatch[1] + ", actual " + digest + ". Bump CACHE and update CACHE-HASH.");
  process.exit(1);
}

console.log("check-sw-cache OK — " + assets.length + " assets, digest " + digest);
