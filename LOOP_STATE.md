# LOOP_STATE — improvement loop (single short state file)

Baseline verified green at loop start; current gate after round 4: `npm run check` OK (261 unit tests, check-assets/ids/sw OK, digest 63a57136aa08a356), `npm run typecheck` clean, `npm run e2e` 236 passed. `main` ahead of the local fleet mirror; the mirror auto-pushed round 2 without any push from this loop. All commit authors Khang.

Full gate per round: `npm run check` + `npm run typecheck` + `npm run e2e`. Cached-asset convention: bump `GYM_VERSION` in `version.js` and update `CACHE-HASH` in `sw.js`.

## Queue (one item per finding, newest appended)

1. [Tier 0] `[DONE round 1]` Summary-tonnage e2e read the real clock but asserted Friday-specific tonnage — failed every Saturday.
2. [Tier 1] `[DONE round 2]` A swapped lift's set-log rows show the original's dormant load, not the alternate's working load (`app.js:648`).
3. [Tier 0/1] Two-tap guard's 2500 ms arm / 2600 ms reset duplicated in `rest.js`, `restctl.js` and `app.js`; a tap in the 100 ms gap re-arms instead of confirming.
4. [Tier 0, low value] `"+30s for 0–1 RIR"` message literal duplicates the private `RIR_PENALTY` (`rest.js:94`) — derive from `sec - baseRest`.
5. [Tier 0/1] `[DONE round 3]` An unfinished session-log entry inflates the dashboard's "Workouts" count (`stats.js:38`) — only `status === "complete"` should count.
6. [Tier 0, tooling] SW-cache guard hashes PNGs as UTF-8 text, so a real icon change can go undetected (`tools/check-sw-cache.js:32`).
7. [Tier 0, low frequency] `[DONE round 4]` Salvage's `valueStart` finds the first string `"liftHistory"`, not the JSON key (`store.js:527`).
8. [Tier 1, low real-world risk] SW same-origin guard is a URL prefix test, not an origin test (`sw.js:31`).

## Rounds

### Round 1 — `[DONE round 1]` Pin the summary-tonnage test to Friday
- **Wrong:** the test used the real clock, but its 13.8k lb expectation includes an assisted dip valued at bodyweight−help. Saturday has no assisted lifts, so the same data reads 14.4k lb and the test failed all day Saturday.
- **Changed:** one line in `e2e/journeys.spec.js` — install a fixed Friday clock before navigation, exactly like the test's two siblings. Production code untouched, no version bump.
- **Verified in plain terms:** first ran the test and watched it fail (14.4k vs 13.8k); after the fix it passed. Full gate green: 259 unit, typecheck clean, 235 e2e. Then removed the fix and watched the same test fail again (14.4k), restored it. Independent Big Pickle reviewer: see review log below.

### Round 2 — `[DONE round 2]` Set-log rows follow the swapped lift's working load
- **Wrong:** when a lift was swapped, the big weight readout showed the alternate's load (e.g. 180) but the set list still showed the original lift's saved load (60). Holding the weight button briefly updated the row to 180, but letting go rebuilt the page and snapped it back to 60 — two parts of one screen disagreeing.
- **Changed:** one line in `app.js:648` — an unfinished row's fallback record now uses `workingLoad(s)` (the same helper the readout, day row and rest screen use). Non-swapped lifts get exactly the old `s.load`; finished rows keep their recorded sets. Bumped `GYM_VERSION` to `gym-v206` and `CACHE-HASH` to `f102f63fd9676a7d` per the cached-asset convention.
- **Verified in plain terms:** new e2e seeded a lift swapped to Leg press at 180 with the original saved at 60, then checked the big readout and the set row agree. It failed before the fix ("60 × 6"), passed after. Full gate green: 259 unit, typecheck clean, 236 e2e. Undid the one-line fix and watched the new test fail again ("60 × 6"), then restored it. Independent Big Pickle reviewer: see review log below.

### Round 3 — `[DONE round 3]` Unfinished sessions no longer count as workouts
- **Wrong:** the "Workouts" number on Progress counted every dated entry in the session log, even a session still marked active. An imported or recovered backup can carry an active session, so the app claimed an extra workout on a day its own week strip marked as missed.
- **Changed:** one line in `stats.js:38` — a log entry counts only when its status is `complete`, matching the rule used by week status and session calibration. Bumped `GYM_VERSION` to `gym-v207` and `CACHE-HASH` to `c1c70fcd9ca77017`.
- **Verified in plain terms:** new unit test seeds one active and one completed session and checks only the completed one counts. It failed before the fix (the active date appeared) and passed after. Full gate green: 260 unit, typecheck clean, 236 e2e. Undid the line and watched the test fail again, then restored it. Independent Big Pickle reviewer: see review log below.

### Round 4 — `[DONE round 4]` Salvage looks past a decoy "liftHistory" string
- **Wrong:** when a damaged backup was repaired, the recovery code took the first occurrence of the text `"liftHistory"` as the real JSON key. If some earlier field happened to contain that word as its value (e.g. a notes field), recovery gave up and rescued no workout history at all, even though the real history was intact later in the file.
- **Changed:** `valueStart` in `store.js:526` now keeps looking through later occurrences until it finds one followed by a colon — the marker of an actual JSON key. Normal payloads take the first match exactly as before. Bumped `GYM_VERSION` to `gym-v208` and `CACHE-HASH` to `63a57136aa08a356`.
- **Verified in plain terms:** new unit test feeds a truncated backup with a decoy `"liftHistory"` value before the real key; it recovered 0 entries before the fix and 1 after. Full gate green: 261 unit, typecheck clean, 236 e2e. Undid the loop and watched recovery fall back to 0, then restored it. Independent Big Pickle reviewer: see review log below.

## Review log

- **Round 4 — Big Pickle reviewer: GO**, no blockers. Confirmed the retry loop preserves the common path byte-for-byte, handles JSON whitespace, and terminates; `valueStart` has only two callers (both corruption-path), so the new behavior can only recover more, always through the existing sanitizer. Test is genuine and existing salvage coverage holds. Version/CACHE-HASH correct and complete.
- **Round 3 — Big Pickle reviewer: GO**, no blockers. Confirmed every consumer of the "workouts" metric wants finished sessions only; active sessions still contribute their banked lifts through the tonnage/heatmap path. Verified all production writers of the session log stamp `status:"complete"`, and every load/import/salvage path funnels through the sanitizer, so no legitimate older workout is lost. Test discriminates and guards against an over-broad fix.
- **Round 2 — Big Pickle reviewer: GO**, no blockers. Confirmed `workingLoad(s)` is byte-identical for non-swapped lifts and correct for swapped 0-load ("light"); done rows keep their recorded sets, and the new test exercises the full-render path. Non-blocking note on record only: `program.js:245`'s legacy backfill seeds synthetic done sets with `s.load` even when swapped, so a hand-crafted swapped record with `done > 0` and a short `sets` array could still show the dormant load in done rows — pre-existing and unreachable via normal flow (swap is locked once sets exist). Out of scope; no code change.
- **Round 1 — Big Pickle reviewer: GO**, no findings. Confirmed the app's tonnage math is correct for whichever day it is given; only the test's hardcoded Friday expectation was wrong. Verified the Friday pin preserves the other assertions (title, 24 sets, 1 PR, "Next" line) and matches the spec's sibling tests. Test-only change → no version bump needed.

## Parked (one-line reason)

_None yet._
