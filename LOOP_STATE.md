# LOOP_STATE — improvement loop (single short state file)

Baseline verified: `npm run check` green (259 unit tests, check-assets/ids/sw OK, digest 7fbc4d4ade5c5b80), `npm run typecheck` clean, `npm run e2e` 235 passed after round 1. `main` in sync with `origin/main`, all commit authors Khang.

Full gate per round: `npm run check` + `npm run typecheck` + `npm run e2e`. Cached-asset convention: bump `GYM_VERSION` in `version.js` and update `CACHE-HASH` in `sw.js`.

## Queue (one item per finding, newest appended)

1. [Tier 0] `[DONE round 1]` Summary-tonnage e2e read the real clock but asserted Friday-specific tonnage — failed every Saturday.
2. [Tier 1] A swapped lift's set-log rows show the original's dormant load, not the alternate's working load (`app.js:648`).
3. [Tier 0/1] Two-tap guard's 2500 ms arm / 2600 ms reset duplicated in `rest.js`, `restctl.js` and `app.js`; a tap in the 100 ms gap re-arms instead of confirming.
4. [Tier 0, low value] `"+30s for 0–1 RIR"` message literal duplicates the private `RIR_PENALTY` (`rest.js:94`) — derive from `sec - baseRest`.

## Rounds

### Round 1 — `[DONE round 1]` Pin the summary-tonnage test to Friday
- **Wrong:** the test used the real clock, but its 13.8k lb expectation includes an assisted dip valued at bodyweight−help. Saturday has no assisted lifts, so the same data reads 14.4k lb and the test failed all day Saturday.
- **Changed:** one line in `e2e/journeys.spec.js` — install a fixed Friday clock before navigation, exactly like the test's two siblings. Production code untouched, no version bump.
- **Verified in plain terms:** first ran the test and watched it fail (14.4k vs 13.8k); after the fix it passed. Full gate green: 259 unit, typecheck clean, 235 e2e. Then removed the fix and watched the same test fail again (14.4k), restored it. Independent Big Pickle reviewer: see review log below.

## Review log

- **Round 1 — Big Pickle reviewer: GO**, no findings. Confirmed the app's tonnage math is correct for whichever day it is given; only the test's hardcoded Friday expectation was wrong. Verified the Friday pin preserves the other assertions (title, 24 sets, 1 PR, "Next" line) and matches the spec's sibling tests. Test-only change → no version bump needed.

## Parked (one-line reason)

_None yet._
