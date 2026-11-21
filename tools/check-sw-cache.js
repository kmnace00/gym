/* B3-31: the service worker's CACHE version is bumped by hand, and a missed
   bump leaves offline users on an old shell until they come back online. This
   guard hashes every file in sw.js ASSETS and compares the digest with the
   `CACHE-HASH` comment in sw.js: change an asset without updating the version,
   the check fails. Deterministic — same inputs, same digest, no timestamps.
   The hash covers file contents only, so the comment itself is not in it.
   Assets are hashed as RAW bytes: decoding a binary icon as UTF-8 turns every
   invalid byte into U+FFFD, so two different PNGs could share a digest and a
   real icon change would ship without a version bump.                       */
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const root = path.join(__dirname, "..");

/**
 * SHA-256 over asset names and their raw bytes, truncated to 16 hex chars.
 * `readFile(name)` must return a Buffer — never a decoded string.
 * @param {string[]} names
 * @param {(name: string) => Buffer} readFile
 * @returns {string}
 */
function assetDigest(names, readFile) {
  const h = crypto.createHash("sha256");
  names.forEach(function (a, i) {
    if (i) h.update("\u0000");
    h.update(a + "\n");
    h.update(readFile(a));
  });
  return h.digest("hex").slice(0, 16);
}

/**
 * Parse the hand-maintained ASSETS list out of sw.js. Returns null when it is
 * missing or looks truncated, so every gate using this fails closed instead of
 * checking an empty list and reporting success.
 * @param {string} sw
 * @returns {string[]|null}
 */
function parseAssets(sw) {
  const listMatch = /const ASSETS\s*=\s*\[([\s\S]*?)\];/.exec(sw);
  if (!listMatch) return null;
  const assets = [...listMatch[1].matchAll(/(["'])([^"']+)\1/g)]
    .map((m) => m[2].replace(/^\.\//, ""))
    .filter((a) => a !== ""); // "./" is the document root, not a file
  return assets.length >= 10 ? assets : null;
}

module.exports = { assetDigest, parseAssets };

if (require.main === module) {
  const sw = fs.readFileSync(path.join(root, "sw.js"), "utf8");

  const assets = parseAssets(sw);
  if (!assets) {
    console.error("check-sw-cache FAIL: could not find a plausible ASSETS array in sw.js");
    process.exit(1);
  }

  const missing = assets.filter((a) => !fs.existsSync(path.join(root, a)));
  if (missing.length) {
    console.error("check-sw-cache FAIL: ASSETS lists missing files: " + missing.join(", "));
    process.exit(1);
  }

  const digest = assetDigest(assets, (a) => fs.readFileSync(path.join(root, a)));

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
}
