/* B3-33: the deploy tag lives in exactly one place. index.html loads this file,
   sw.js importScripts() it, and the menu footer prints it — so the version the
   user sees is the version the cache is keyed on. Bump GYM_VERSION when an asset
   changes; tools/check-sw-cache.js keeps the CACHE-HASH in sw.js honest.      */
var GYM_VERSION = "gym-v132";

if (typeof module === "object" && module.exports) module.exports = { GYM_VERSION: GYM_VERSION };
