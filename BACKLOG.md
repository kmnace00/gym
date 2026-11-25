# BACKLOG — ranked improvement ideas

## LOOP STATE — improvement loop (single source of truth; re-read every round)

- **lock**: FINISHED 2026-11-20T08:20:43Z (Fri 08:20 UTC). Started 2026-11-20T05:26:52Z. Queue honestly empty after two full surveys — stopped per loop rule (no stop word from Khang yet, but nothing genuinely useful left to build). Tree clean, three local commits, nothing pushed.
- **baseline check**: PASS at 2026-11-20T05:26:52Z — `npm run check` green (check-assets/ids/sw OK, 257 unit tests pass). No failures.
- **Nov 22 — round 16 (tooling guard):** `tools/check-ids.js` read day tabs from `index.html`, where none exist, so the guard could never fail; it now reads `Stats.weekStatus`'s day list from `stats.js` and checks both directions against `program.js` DAYS (CLI reports 3 day tabs, not 0). Tools/tests only — no version bump. Gate green: 286 unit, typecheck clean, 236 e2e; shipped in the round-16 fleet-ship batch.
- **Nov 22 — round 17 (UI/UX, light-theme contrast):** light `--accent` was `#8f5c2b` — accent text on the tinted `--accent-soft` background measured 4.03:1, below WCAG AA 4.5:1. Darkened to `#855126` (soft token matched), pinned by a new live-token contrast e2e in `a11y.spec.js` that failed pre-fix. Length-preserving edits keep the 7-byte precache headroom; `gym-v212`, CACHE-HASH `a2a77ba856953235`. Gate green: 286 unit, typecheck clean, 237 e2e; shipped in the round-17 fleet-ship batch.
- **Nov 22 — round 18 (UI/UX/a11y):** Set Done blurred its own hidden button and dropped keyboard focus to `<body>` while every other view transition sets a landing spot. `#restTime` now takes focus (tabindex=-1) after a set; new a11y e2e failed pre-fix and passes now. Historical comment condensed to fund bytes; `gym-v213`, CACHE-HASH `1022b159efc34bd5`. Gate green: 286 unit, typecheck clean, 238 e2e; shipped in the round-18 fleet-ship batch.
- **Nov 22 — round 19 (UI/UX/a11y):** `#skipRest` announced a fixed "End rest" while its visible text changed to "Tap again to finish"/"Start next set". Dropped the stale `aria-label` so the live text is the accessible name; new a11y e2e failed pre-fix and passes now. Net −22 bytes (headroom now 62); `gym-v214`, CACHE-HASH `541922e038b01323`. Gate green: 286 unit, typecheck clean, 239 e2e; shipped in the round-19 fleet-ship batch.
- **Nov 22 — round 20 (UI/UX/a11y):** the day-tab cluster is rebuilt with innerHTML on every render, so a keyboard-activated day switch dropped focus to `<body>`. Tab clicks now re-focus the freshly rebuilt tab; chevron navigation unchanged. New a11y e2e failed pre-fix and passes now. Comment condensed to fund bytes; `gym-v215`, CACHE-HASH `421790f82f5e5ab9`. Gate green: 286 unit, typecheck clean, 240 e2e; shipped in the round-20 fleet-ship batch.
- **Nov 22 — round 21 (UI/UX/a11y):** closing the swap chooser hid the focused choice and dropped keyboard focus to `<body>`. A single guard in `renderLift()` now returns focus to the Swap button before hiding, covering Cancel and both choose paths. New a11y e2e failed pre-fix and passes now. B6-09 comment condensed to fund bytes (headroom 71); `gym-v216`, CACHE-HASH `6bc6d6137d22824a`. Gate green: 286 unit, typecheck clean, 241 e2e; shipped in the round-20/21 fleet-ship batch.
- **Nov 22 — round 22 (UI/UX/a11y):** the rest→idle branch blurred focus to `<body>` with no landing spot. The two non-finish skip paths now carry a `focusLift` flag and the shell focuses `#exName` after repaint; the summary-owned finish path is untouched. New a11y e2e failed pre-fix and passes now. Two comments condensed (headroom 159); `gym-v217`, CACHE-HASH `0e36d36a39b6dbbe`. Gate green: 286 unit, typecheck clean, 242 e2e; shipped in the round-22 fleet-ship batch.
- **Nov 22 — round 23 (data/UX):** Import/Restore printed "✓" even when `commit()` had just failed to write to localStorage, while the save bar said "Couldn't save". A `saveResult()` helper now derives the message suffix from `saveFailed`; success wording unchanged. New e2e with a throwing `setItem` failed pre-fix and passes now. Headroom 68; `gym-v218`, CACHE-HASH `486593c4127318a5`. Gate green: 286 unit, typecheck clean, 243 e2e; shipped in the round-23 fleet-ship batch.
- **Nov 22 — round 24 (data/UX):** Clear all data restored an in-progress set edit into the freshly empty payload, and Reset day left a rest counting down with a false "set 1 done" label. Both destructive handlers now abandon pending edit/rest state before acting. Two new e2e tests failed pre-fix and pass now. Comment condensed (headroom 105); `gym-v219`, CACHE-HASH `ed23c2f7face5cb4`. Gate green: 286 unit, typecheck clean, 245 e2e; shipped in the round-24 fleet-ship batch.
- **Nov 22 — round 25 (data/UX):** Undo during a set edit removed the set but left the "Done editing" label and hint in place; the next tap silently logged an extra set and started a rest. `undoSet()` now calls `resetEdit()` first. New e2e failed pre-fix and passes now. Headroom 88; `gym-v220`, CACHE-HASH `2ca3e31165cc9b71`. Gate green: 286 unit, typecheck clean, 246 e2e; shipped in the round-25 fleet-ship batch.
- **Nov 22 — round 26 (data/UX):** A set edit started from the workout peek during rest followed the user to the next lift via `advanceTo`, and "Done editing" then wrote the old lift's values into the new one. `apply()` now calls `resetEdit()` on advance. New e2e failed pre-fix and passes now. Headroom 75; `gym-v221`, CACHE-HASH `7f489e3c4c58f256`. Gate green: 286 unit, typecheck clean, 247 e2e; shipped in the round-26 fleet-ship batch.
- **Nov 22 — round 27 (data/UX):** Importing or replacing the log during a set edit left the edit's backup alive; opening a lift afterwards restored the old values over the imported ones. Both handlers now call `resetEdit()` before swapping the payload. New e2e failed pre-fix and passes now. Comment condensed (headroom 160); `gym-v222`, CACHE-HASH `cad260fac75f7cce`. Gate green: 286 unit, typecheck clean, 248 e2e; shipped in the round-27 fleet-ship batch.
- **Nov 22 — round 28 (data/UX):** Merge-on-import cloned the local log before backing out a pending set edit, so a losing incoming backup preserved the abandoned edit's working values. `resetEdit()` now runs before the merge. New e2e failed pre-fix and passes now. Byte-neutral; `gym-v223`, CACHE-HASH `d6b9fa7056cc9b07`. Gate green: 286 unit, typecheck clean, 249 e2e; shipped in the round-28 fleet-ship batch.
- **Nov 22 — round 29 (backup/UX):** Copy/Download backup reported "backed up today" but exported the pre-stamp payload, so restoring the file showed a stale backup age. The export path now stamps before serializing. New e2e failed pre-fix and passes now. Headroom 137; `gym-v224`, CACHE-HASH `891b1f153c01bc82`. Gate green: 286 unit, typecheck clean, 250 e2e; shipped in the round-29 fleet-ship batch.
- **Nov 22 — round 30 (UI/UX):** Clock-learning menu showed absurd out-of-contract calibration values while the time estimate ignored them. `renderCalib()` now uses the same contract as `calOpts()` and falls back to starter values; The Reset button stays available. New e2e failed pre-fix and passes now. Headroom 70; `gym-v225`, CACHE-HASH `04c015c8fb9c55cd`. Gate green: 286 unit, typecheck clean, 251 e2e; shipped in the round-30 fleet-ship batch.
- **Nov 22 — round 31 (data/UX):** Finishing a workout via the last-lift rest two-tap path left a peek-started set edit alive through the summary. `finishWorkout()` now calls `resetEdit()` before finalizing. New e2e failed pre-fix and passes now. Headroom 53; `gym-v226`, CACHE-HASH `24160f69c7b23568`. Gate green: 286 unit, typecheck clean, 252 e2e; shipped in the round-31 fleet-ship batch.
- **Nov 22 — round 32 (UI/UX):** Swap chooser had no Escape handler; keyboard users could not dismiss it consistently with modals. Added a document Escape handler that closes it and restores focus to the Swap button. New e2e failed pre-fix and passes now. Headroom 106; `gym-v227`, CACHE-HASH `b02bedd1e1e8be32`. Gate green: 286 unit, typecheck clean, 253 e2e; shipped in the round-32 fleet-ship batch.
- **Nov 22 — round 33 (UI/UX):** Merge-import parse failure backed out a pending edit in memory but left stale "Done editing" UI. The error path now renders before showing the message. New e2e failed pre-fix and passes now. Headroom 96; `gym-v228`, CACHE-HASH `8b0f496e7da4cb32`. Gate green: 286 unit, typecheck clean, 254 e2e; shipped in the round-33 fleet-ship batch.
- **Nov 22 — round 34 (UI/UX):** Double-tapping Plan today after a no-op/manual-only plan reported the misleading "kept your loads". It now reports "Planned · no changes". New e2e failed pre-fix and passes now. Headroom 101; `gym-v229`, CACHE-HASH `ecb17046b1c200fc`. Gate green: 286 unit, typecheck clean, 255 e2e; shipped in the round-34 fleet-ship batch.
- **Nov 22 — round 35 (a11y/UX):** Summary close could leave keyboard focus on body after post-finish render hid the opener; menu modal close lacked a visibility guard for unfocusable openers. Close paths now restore/fallback focus to a visible control. New e2e failed pre-fix and pass now. Headroom 76; `gym-v230`, CACHE-HASH `9aa3a43b96cf56d0`. Gate green: 286 unit, typecheck clean, 257 e2e; shipped in the round-35 fleet-ship batch.
- **Nov 22 — round 36 (UI/UX):** Backup bar Save downloaded but gave no visible confirmation outside the menu. The backup bar now shows a one-render "Backup downloaded ✓" confirmation. New e2e added; existing enhancement e2e updated. Headroom 42; `gym-v231`, CACHE-HASH `389225aba5023c61`. Gate green: 286 unit, typecheck clean, 258 e2e; shipped in the round-36 fleet-ship batch.
- **Nov 22 — round 37 (state/UX):** Restore/merge/snapshot/clear-all left live rest running with stale context and could desync the session pill/interval from restored `payload.active`. Destructive payload swaps now idle rest and reconcile session clock/UI. New e2e added. Headroom 61; `gym-v232`, CACHE-HASH `b9624027974f0347`. Gate green: 286 unit, typecheck clean, 259 e2e; shipped in the round-37 fleet-ship batch.
- **Nov 22 — round 38 (data-IO/UX):** Failed merge import discarded live rest/edit UI before parsing; invalid merge files could wipe in-progress state despite no data change. Merge now parses before mutating UI, and resetEdit restores the edited set snapshot. New/updated e2e. Headroom 359; `gym-v233`, CACHE-HASH `297fd0744511f1d4`. Gate green: 286 unit, typecheck clean, 260 e2e; shipped in the round-38 fleet-ship batch.
- **Nov 22 — round 39 (rest/nav UX):** Active rest prep could edit the viewed day when browsing another day, and skipping rest from day view could drop focus to body. Rest prep now hides/clears when resting off active day; skip focus falls back to visible day row. Headroom 58; `gym-v234`, CACHE-HASH `a52182efa5ab97d0`. Gate green: 286 unit, typecheck clean, 262 e2e; shipped in the round-39 fleet-ship batch.
- **Nov 22 — round 40 (a11y/notify UX):** Load/reps direct edit was pointer-only and lost keyboard focus on commit/cancel; stale denied Notification permission could show Rest notifications On. Load/reps mids are keyboard-activatable with focus restore; notify init clears stale denied opt-in. Headroom 36; `gym-v235`, CACHE-HASH `ed4513619c3d4573`. Gate green: 286 unit, typecheck clean, 264 e2e; shipped in the round-40 fleet-ship batch.
- **Nov 22 — round 41 (rest/finish UX):** Finish-armed "Tap again to finish" survived navigation and could cause a misleading skip instead of finish. Navigation now clears finish arm/frozen state and rerenders resting view. Headroom 14; `gym-v236`, CACHE-HASH `f5341b7e7b816f39`. Gate green: 286 unit, typecheck clean, 265 e2e; shipped in the round-41 fleet-ship batch.
- **Nov 22 — round 42 (a11y/focus):** Entering set edit by keyboard/click lost focus to BODY after render. `startEdit()` now focuses Done editing. Headroom 104; `gym-v237`, CACHE-HASH `c155a5b0f3aedfa2`. Gate green: 286 unit, typecheck clean, 266 e2e; shipped in the round-42 fleet-ship batch.
- **Nov 22 — round 43 (a11y/focus):** Finishing set edit in rest peek and undoing via a control that becomes disabled/hidden could drop focus to BODY. `finishEdit()` falls back to the edited row; `undoSet()` restores focus to Done when needed. Headroom 88; `gym-v238`, CACHE-HASH `4acc08696f5fd1a9`. Gate green: 286 unit, typecheck clean, 268 e2e; shipped in the round-43 fleet-ship batch.
- **Nov 22 — round 44 (a11y/nav):** Progress view had no Escape dismiss path for keyboard users. Escape now closes progress to day when no modal/summary/swap is active. Headroom 7; `gym-v239`, CACHE-HASH `0d756bd52532fa5b`. Gate green: 286 unit, typecheck clean, 269 e2e; shipped in the round-44 fleet-ship batch.
- **Nov 22 — round 45 (a11y/nav):** Stale swap chooser state stole Escape while in Progress view, requiring extra Escape. Progress Escape now takes priority over stale swapOpen. Headroom 9; `gym-v240`, CACHE-HASH `8b097273ffa2926c`. Gate green: 286 unit, typecheck clean, 270 e2e; shipped in the round-45 fleet-ship batch.
- **Nov 22 — round 46 (a11y/focus):** After progress closed, stale swapOpen could consume Escape on day view and drop focus to BODY. `resetEdit()` now clears swapOpen; redundant clears removed. Headroom 45; `gym-v241`, CACHE-HASH `dac2a8e5b1922d6c`. Gate green: 286 unit, typecheck clean, 271 e2e; shipped in the round-46 fleet-ship batch.
- **Nov 22 — round 47 (a11y/state):** Paused rest button had stale static aria-label contradicting visible Resume text; stale swap state could consume Escape on day view. Pause button now uses visible text only; Escape closes swap only in lift view. Headroom 54; `gym-v242`, CACHE-HASH `b7d1698d3532fc9e`. Gate green: 286 unit, typecheck clean, 273 e2e; shipped in the round-47 fleet-ship batch.
- **Nov 22 — round 48 (a11y/rest-peek):** Hiding rest peek while editing a set stranded the edit UI hidden and unreachable. Hiding peek now finishes the edit and keeps focus on Show workout/details. Headroom 302; `gym-v243`, CACHE-HASH `ec38ba3ef70f9d06`. Gate green: 286 unit, typecheck clean, 274 e2e; shipped in the round-48 fleet-ship batch.
- **Nov 22 — round 49 (a11y/rest-peek):** Escape did not dismiss rest workout peek. Global Escape now closes show-details peek and restores focus to detailsBtn. Headroom 191; `gym-v244`, CACHE-HASH `1cd47d5125ec0106`. Gate green: 286 unit, typecheck clean, 275 e2e; shipped in the round-49 fleet-ship batch.
- **Nov 22 — round 50 (a11y/touch/notify):** `notifyAllowed()` could throw when Notification property was undefined; load/reps direct-edit mids were below 44px touch height at 390x844. Added Notification guard and 44px min-height/flex centering. Headroom 81; `gym-v245`, CACHE-HASH `0148e40e13bb0aac`. Gate green: 286 unit, typecheck clean, 277 e2e; shipped in the round-50 fleet-ship batch.
- **Nov 22 — round 51 (a11y/focus):** Ending rest while editing a set in rest peek moved focus to exName while edit stayed active. focusLift now prefers visible doneBtn/edited row when editing. Headroom 71; `gym-v246`, CACHE-HASH `d520f617e92b0c7f`. Gate green: 286 unit, typecheck clean, 278 e2e; shipped in the round-51 fleet-ship batch.
- **Nov 22 — round 52 (notify/clarity):** Unsupported Notification API left stale gym-notify opt-in showing On. `notifyAllowed()` now requires supported Notification and non-denied permission, so init clears stale unsupported opt-in. Headroom 73; `gym-v247`, CACHE-HASH `2b800364726dd828`. Gate green: 286 unit, typecheck clean, 279 e2e; shipped in the round-52 fleet-ship batch.
- **Nov 22 — round 53 (data-safety UX):** Keep recovered log reported success when save failed, hiding the real failure. Now reports save failure, keeps download/export recovery affordances visible. Headroom 10; `gym-v248`, CACHE-HASH `923d1aa44b371658`. Gate green: 286 unit, typecheck clean, 280 e2e; shipped in the round-53 fleet-ship batch.
- **Nov 22 — round 54 (cleanup/headroom):** Removed dead hidden rest lift-nav arrows/refs/CSS left after rest nav was locked to Show-workout peek; updated e2e. Headroom 1174; `gym-v249`, CACHE-HASH `61a8be812a90b5a5`. Gate green: 286 unit, typecheck clean, 280 e2e; shipped in the round-54 fleet-ship batch.
- **Nov 23 — round 55 (copy truthfulness):** Salvage bar claimed "Nothing is saved yet" even after ordinary navigation persisted the recovered log. Copy now states the recovery/choice without a save-state claim; Keep/download unchanged. Headroom 1193; `gym-v250`, CACHE-HASH `76412cdc259506f5`. Gate green: 286 unit, typecheck clean, 281 e2e; shipped in the round-55 fleet-ship batch.
- **Nov 23 — round 56 (a11y/feedback):** Menu action confirmations/errors were rendered off-screen inside the scrollable modal card, so users saw no feedback. `#modalMsg` now sticks to the bottom of the card when non-empty. Headroom 1025; `gym-v251`, CACHE-HASH `31128645adef5f0f`. Gate green: 286 unit, typecheck clean, 282 e2e; shipped in the round-56 fleet-ship batch.
- **Nov 23 — round 57 (data-safety honesty):** Reset day / Clear all data / Snapshot restore reported success even when the write failed and data was not persisted. All three now reuse `saveResult()` so failures say "NOT saved — storage full; export now". Headroom 1180; `gym-v252`, CACHE-HASH `8dd79d7e18e7a3b8`. Gate green: 286 unit, typecheck clean, 283 e2e; shipped in the round-57 fleet-ship batch.
- **Nov 23 — round 58 (feedback/focus):** "Keep recovered log" confirmed into a hidden modal and dropped keyboard focus to BODY. Confirmation now appears in the visible backup bar and focus moves to #menuBtn. Headroom 1146; `gym-v253`, CACHE-HASH `e883f18dbb0ebc39`. Gate green: 286 unit, typecheck clean, 284 e2e; shipped in the round-58 fleet-ship batch.
- **Nov 23 — round 59 (data-loss guard):** Two-tap "Restart lift" / menu confirm survived navigation and modal close, so one tap on an unrelated lift/day wiped its sets without fresh confirmation. `disarmTwoTap()` now clears arm state on every navigation (`resetEdit()`) and modal close. Headroom 943; `gym-v254`, CACHE-HASH `f92b195869350bab`. Gate green: 286 unit, typecheck clean, 286 e2e; shipped in the round-59 fleet-ship batch.
- **Nov 23 — round 60 (feedback/focus):** Round 58's salvage-keep confirmation went to a day-only bar, invisible from lift/progress/rest; focus fell to BODY during rest. Confirmation now shows in the view-agnostic save bar with focus fallback to menuBtn/skipRest. Rest GO now moves focus off a hidden prep stepper to skipRest. Headroom 266; `gym-v255`, CACHE-HASH `6e22f9626dd2530a`. Gate green: 286 unit, typecheck clean, 288 e2e; shipped in the round-60 fleet-ship batch.
- **Nov 23 — round 61 (a11y/focus):** Deload start/end toggle hid the activated button and dropped keyboard focus to BODY. Focus now moves to the newly visible counterpart. Headroom 70; `gym-v256`, CACHE-HASH `1b68036d74e25806`. Gate green: 286 unit, typecheck clean, 289 e2e; shipped in the round-61 fleet-ship batch.
- **Nov 23 — round 62 (a11y/focus):** Tab out of inline load/reps editor snapped focus back to the opener; at rest GO with clock focused, Enter was a no-op and the action was 3 Tabs away. Blur no longer restores focus; GO moves focus from the clock to #skipRest. Headroom 8; `gym-v257`, CACHE-HASH `e8d424dec477e6d3`. Gate green: 286 unit, typecheck clean, 291 e2e; shipped in the round-62 fleet-ship batch.
- **Nov 23 — round 63 (a11y/focus + byte funding):** Backup-bar ✕ hid the bar but left focus on the hidden button. Focus now moves to #menuBtn; removed two redundant `.liftlist{overflow-y:auto}` media declarations to fund it. Headroom 49; `gym-v258`, CACHE-HASH `1aa9dbad28c199cf`. Gate green: 286 unit, typecheck clean, 292 e2e; shipped in the round-63 fleet-ship batch.
- **Nov 23 — round 64 (a11y/focus):** At rest GO, hidden Pause button could keep focus and Enter did nothing. GO fallback now moves focus to #skipRest; condensed a persistence comment to fund it. Headroom 193; `gym-v259`, CACHE-HASH `2a3b4e5e2219eeb0`. Gate green: 286 unit, typecheck clean, 293 e2e; shipped in the round-64 fleet-ship batch.
- **Nov 23 — round 65 (notify/clarity):** A stored notify opt-in showed "On" after permission was downgraded to default, though notifications require granted. `notifyAllowed()` now requires granted. Headroom 192; `gym-v260`, CACHE-HASH `5a482ff490784ccb`. Gate green: 286 unit, typecheck clean, 294 e2e; shipped in the round-65 fleet-ship batch.
- **Nov 23 — round 66 (two-tap guard):** Re-arming the same destructive action let a stale timer disarm the new confirm window early. Timer is now cleared on disarm and re-arm. Headroom 193; `gym-v261`, CACHE-HASH `88c476d583990789`. Gate green: 286 unit, typecheck clean, 295 e2e; shipped in the round-66 fleet-ship batch.
- **Nov 23 — round 67 (session clock safety):** After Finish workout the pill showed "Resume" and tapping it resurrected the completed session, corrupting banked data. Pill now shows Start/0:00 when complete and tapping starts a fresh session. Headroom 13; `gym-v262`, CACHE-HASH `c9d237c2dd201fed`. Gate green: 286 unit, typecheck clean, 296 e2e; shipped in the round-67 fleet-ship batch.
- **Nov 23 — round 68 (notify copy):** Dismissing the permission prompt ("default") reported "Permission denied" though it was never denied. Message now "Not enabled — change in Settings". Headroom 19; `gym-v263`, CACHE-HASH `d79044fe128911e6`. Gate green: 286 unit, typecheck clean, 297 e2e; shipped in the round-68 fleet-ship batch.
- **Nov 23 — round 69 (a11y):** Trend toggle had a static "Show trend chart" label and no aria-pressed, so its state was invisible to screen readers. Label removed; aria-pressed reflects show-trend on every render. Headroom 210; `gym-v264`, CACHE-HASH `fa89710e4c133bd1`. Gate green: 286 unit, typecheck clean, 298 e2e; shipped in the round-69 fleet-ship batch.
- **Nov 23 — round 70 (feedback):** Cancelling/dismissing Share left the previous message (e.g. "CSV exported ✓") on screen. Reject branch now reports "Share cancelled". Headroom 182; `gym-v265`, CACHE-HASH `307bfd30138b82e7`. Gate green: 286 unit, typecheck clean, 299 e2e; shipped in the round-70 fleet-ship batch.
- **Nov 23 — round 71 (data-safety undo):** A failed import/restore overwrote the undo snapshot with post-change data, so "Undo Merge" became a no-op. Snapshot write now happens only after the file parses successfully (0 production bytes). Headroom 182; `gym-v266`, CACHE-HASH `064ef79ae8a62045`. Gate green: 286 unit, typecheck clean, 300 e2e; shipped in the round-71 fleet-ship batch.
- **Nov 23 — round 72 (undo correctness):** Destructive handlers snapshotted before restoring an abandoned set edit, so Undo reverted the user's working load to the edited set's temporary value. `resetEdit()` now precedes every snapshot. Headroom 198; `gym-v267`, CACHE-HASH `39c93c0510aed1e8`. Gate green: 286 unit, typecheck clean, 301 e2e; shipped in the round-72 fleet-ship batch.
- **Nov 23 — round 73 (notify clarity):** Notification permission revoked while the menu was open left the toggle showing On and a stale opt-in. Returning to the tab now re-runs initNotify to clear it. Headroom 184; `gym-v268`, CACHE-HASH `07a9f75513b773b8`. Gate green: 286 unit, typecheck clean, 302 e2e; shipped in the round-73 fleet-ship batch.
- **Nov 23 — round 74 (rest undo/focus):** Rest-bar Undo vanished after navigating to the day view mid-rest; undo's focus fallback targeted a hidden control. can-undo now includes active rests and focus falls back to the visible lift row. Headroom 54; `gym-v269`, CACHE-HASH `e548d841922caaa0`. Gate green: 286 unit, typecheck clean, 303 e2e; shipped in the round-74 fleet-ship batch.
- **Nov 23 — round 75 (copy):** Merge confirmation said "+1 new sessions" for a single imported session. Message now pluralizes correctly. Headroom 17; `gym-v270`, CACHE-HASH `47a5382411114847`. Gate green: 286 unit, typecheck clean, 304 e2e; shipped in the round-75 fleet-ship batch.
- **Nov 23 — round 76 (copy):** Salvage/import messages said "1 log entries recovered" / "Recovered 1 entries". Added shared entry/entries helper across all four count sites; funded by comment trims. Headroom 50; `gym-v271`, CACHE-HASH `8bebd25bfd9c1110`. Gate green: 286 unit, typecheck clean, 305 e2e; shipped in the round-76 fleet-ship batch.
- **Nov 23 — round 77 (copy):** Menu footer/Share said "1 workouts"/"1 sets" and rest/PR said "1 reps". Added pl(n, word) helper across all count sites; funded by condensing rampFor comment. Headroom 536; `gym-v272`, CACHE-HASH `fab6ff9c332e5b66`. Gate green: 286 unit, typecheck clean, 306 e2e; shipped in the round-77 fleet-ship batch.
- **Nov 23 — round 78 (set edit):** Applying a suggested load while editing a logged set changed the working load but left the edited row stale until Done. Apply now writes through applySetEdit(). Headroom 502; `gym-v273`, CACHE-HASH `86ee75278c24e225`. Gate green: 286 unit, typecheck clean, 307 e2e; shipped in the round-78 fleet-ship batch.
- **Nov 23 — round 79 (data integrity):** Abandoning a set edit restored the log's set but left the edited values in liftHistory, diverging from tonnage/PR/CSV. resetEdit() now re-banks the original set. Headroom 478; `gym-v274`, CACHE-HASH `19604406a0ac0a98`. Gate green: 286 unit, typecheck clean, 308 e2e; shipped in the round-79 fleet-ship batch.
- **Nov 23 — round 80 (undo/data integrity):** Undo on a past day cleared the set but left its history entry, so Progress/CSV kept counting it. Removed the session-date guard on the history pop. Headroom 535; `gym-v275`, CACHE-HASH `a714197718294d69`. Gate green: 286 unit, typecheck clean, 309 e2e; shipped in the round-80 fleet-ship batch.
- **Nov 23 — round 81 (history coherence):** Restart lift / Reset day on a past day cleared state sets but left stale history entries. Both now pop only a trailing snapshot that matches the current state (date or sets signature), so partial progress keeps earlier sessions' history. Headroom 108; `gym-v276`, CACHE-HASH `aff8d9bd55281c36`. Gate green: 286 unit, typecheck clean, 312 e2e; shipped in the round-81 fleet-ship batch.
- **Nov 23 — round 82 (session integrity):** Restart/reset-day after finishing resurrected the completed session and deleted its log entry. Call sites now skip reopenSession() when the session is complete. Headroom 119; `gym-v277`, CACHE-HASH `781c3d08dbae99df`. Gate green: 286 unit, typecheck clean, 313 e2e; shipped in the round-82 fleet-ship batch.
- **Nov 23 — round 83 (session integrity):** Logging the first set after a finished workout resumed the completed session's stale clock and reused its log id. startSessionTimer() now creates a fresh session when complete. Headroom 101; `gym-v278`, CACHE-HASH `4e10213aa0869a2c`. Gate green: 286 unit, typecheck clean, 314 e2e; shipped in the round-83 fleet-ship batch.
- **Nov 23 — round 84 (rest clock):** At GO, toggling workout peek left the "Workout M:SS" clock stale-hidden or duplicated with the header pill because ticks had stopped. CSS now owns peek hiding. Headroom 49; `gym-v279`, CACHE-HASH `653cd691ccf5aef5`. Gate green: 286 unit, typecheck clean, 315 e2e; shipped in the round-84 fleet-ship batch.
- **Nov 23 — round 85 (backup status):** Failed "Copy backup" stamped today's backup date and cleared the overdue reminder though nothing was backed up. Reject path now restores the prior date and reminder. Headroom 22; `gym-v280`, CACHE-HASH `1ace87dd68836b5b`. Gate green: 286 unit, typecheck clean, 316 e2e; shipped in the round-85 fleet-ship batch.
- **Nov 23 — round 86 (a11y):** Armed Restart button kept a static aria-label "Restart this lift", hiding the two-tap confirmation from screen readers. Label removed; accessible name now follows visible text. Headroom 53; `gym-v281`, CACHE-HASH `2932fe1fc7afbf5d`. Gate green: 286 unit, typecheck clean, 317 e2e; shipped in the round-86 fleet-ship batch.
- **Nov 23 — round 87 (copy):** Reset-day's two-tap arm read "reset today" even when a past day was being reset. Now "Tap again to reset day". Headroom 55; `gym-v282`, CACHE-HASH `c5c7b0bce17c98f8`. Gate green: 286 unit, typecheck clean, 318 e2e; shipped in the round-87 fleet-ship batch.
- **Nov 23 — round 88 (session/day coherence):** Starting the pill's clock from another day left the user stranded there with Set Done blocked. The pill now switches to the session's day. Headroom 180; `gym-v283`, CACHE-HASH `67d4d9a586f45257`. Gate green: 286 unit, typecheck clean, 319 e2e; shipped in the round-88 fleet-ship batch.
- **Nov 23 — round 89 (summary coherence):** Finishing while viewing another day mixed that day's title/sets/volume with the active session's duration/PRs. finishWorkout() now aligns to the session day first. Headroom 87; `gym-v284`, CACHE-HASH `105139a5a70e83f7`. Gate green: 286 unit, typecheck clean, 320 e2e; shipped in the round-89 fleet-ship batch.
- **Nov 23 — round 90 (day coherence):** "Continue" from a non-active day opened that day's lift with Set Done blocked. The handler now switches to the session day first. Headroom 72; `gym-v285`, CACHE-HASH `be4ff3eda95a51f8`. Gate green: 286 unit, typecheck clean, 321 e2e; shipped in the round-90 fleet-ship batch.
- **Nov 23 — round 91 (copy/aria):** Day view still said "Plan today"/"Today"/"Today's lifts" while browsing another day. Copy and aria-label are now day-agnostic. Headroom 74; `gym-v286`, CACHE-HASH `afcd7e88b58e0acd`. Gate green: 286 unit, typecheck clean, 322 e2e; shipped in the round-91 fleet-ship batch.
- **Nov 23 — round 92 (day coherence):** "Continue · Lift N" was labelled from the viewed day but opened the session day's lift, so the number could be wrong. Label now uses the destination day's first open lift. Headroom 114; `gym-v287`, CACHE-HASH `1f8002e05dfff85f`. Gate green: 286 unit, typecheck clean, 323 e2e; shipped in the round-92 fleet-ship batch.
- **Nov 23 — round 93 (day coherence):** Browsing a fresh day mid-workout hid Continue and Finish because their visibility used the viewed day. They now stay available from any day while the session has data. Headroom 137; `gym-v288`, CACHE-HASH `ba4e6454f16cc8e8`. Gate green: 286 unit, typecheck clean, 324 e2e; shipped in the round-93 fleet-ship batch.
- **Nov 23 — round 94 (copy/coherence):** Finish button text was keyed to the viewed day after round 93 made it visible off-day; it now uses session-day completeness. Headroom 139; `gym-v289`, CACHE-HASH `785e6548d00d9e2c`. Gate green: 286 unit, typecheck clean, 325 e2e; shipped in the round-94 fleet-ship batch.
- **Nov 23 — round 95 (save feedback):** Deload start/end reported success when the write failed and `deloadSince` was not persisted. Both now append saveResult() so failures say NOT saved. Headroom 101; `gym-v290`, CACHE-HASH `0cceb9f54d316d12`. Gate green: 286 unit, typecheck clean, 326 e2e; shipped in the round-95 fleet-ship batch.
- **Nov 23 — round 96 (save feedback):** Bodyweight edits reported success despite a failed write. Both handlers now append saveResult(). Headroom 63; `gym-v291`, CACHE-HASH `ce631abdcbf78782`. Gate green: 286 unit, typecheck clean, 327 e2e; shipped in the round-96 fleet-ship batch.
- **Nov 23 — round 97 (a11y/focus):** Escape from the rest workout peek left focus on a hidden control. The handler now moves focus to the visible Show workout button. Headroom 105; `gym-v292`, CACHE-HASH `b3417aa6a145fff3`. Gate green: 286 unit, typecheck clean, 328 e2e; shipped in the round-97 fleet-ship batch.
- **Nov 23 — round 98 (copy):** Summary read "1 new PRs" because the label was static. It now singularizes with the count. Headroom 188; `gym-v293`, CACHE-HASH `072186766f3ec90c`. Gate green: 286 unit, typecheck clean, 329 e2e; shipped in the round-98 fleet-ship batch.
- **Nov 23 — round 99 (copy):** Plan summary read "Planned +0 · reset 8" for all-reset plans. The zero increment is omitted. Headroom 171; `gym-v294`, CACHE-HASH `83d8c447d25af039`. Gate green: 286 unit, typecheck clean, 330 e2e; shipped in the round-99 fleet-ship batch.
- **Nov 23 — round 100 (state coherence):** A one-shot "Planned …" note survived Reset day / Clear all / restore/import wipes and reappeared on the empty day summary. All five wipe paths now clear it. Headroom 101; `gym-v295`, CACHE-HASH `801b3bf1d4d9eea6`. Gate green: 286 unit, typecheck clean, 331 e2e; shipped in the round-100 fleet-ship batch.
- **Nov 23 — round 101 (state coherence):** A one-shot "New PR" hint survived Reset day after its set was wiped. Hint clearing moved into resetEdit() and eight redundant clears removed. Headroom 336; `gym-v296`, CACHE-HASH `fbb66e8a003a3c6b`. Gate green: 286 unit, typecheck clean, 332 e2e; shipped in the round-101 fleet-ship batch.
- **Nov 23 — round 102 (copy):** Merge confirmation printed "+0 new sessions, 0 same-date kept" for no-change imports. Both clauses are now conditional with a "no changes" fallback. Headroom 218; `gym-v297`, CACHE-HASH `0fcf7f1b60142cc0`. Gate green: 286 unit, typecheck clean, 333 e2e; shipped in the round-102 fleet-ship batch.
- **Nov 23 — round 103 (copy):** Plan lifts said "all keep" when no lift was eligible for planning (only swap/deload history). It now says "no changes" when keep is zero. Headroom 209; `gym-v298`, CACHE-HASH `c89d363282662576`. Gate green: 286 unit, typecheck clean, 334 e2e; shipped in the round-103 fleet-ship batch.
- **Nov 23 — round 104 (state coherence):** A one-shot "Planned …" note reappeared in a fresh session started after finishing. finishWorkout() now clears it at the source. Headroom 195; `gym-v299`, CACHE-HASH `8bf1ece4c1618234`. Gate green: 286 unit, typecheck clean, 335 e2e; shipped in the round-104 fleet-ship batch.
- **Nov 23 — round 105 (layout):** Stacked off-day + Plan + deload-nudge text in #daySummary was clipped to two lines at 390×844/667, hiding the actionable tail. Line clamp raised to 3. Headroom 195; `gym-v300`, CACHE-HASH `9da509599c19b541`. Gate green: 286 unit, typecheck clean, 336 e2e; shipped in the round-105 fleet-ship batch.
- **Nov 23 — round 106 (layout):** Rest-screen label for long lift names was ellipsized, hiding "set N done". Full-rest label now wraps like the peek label. Headroom 176; `gym-v301`, CACHE-HASH `10681d79ea8f6dbd`. Gate green: 286 unit, typecheck clean, 337 e2e; shipped in the round-106 fleet-ship batch.
- **Nov 23 — round 107 (touch target):** Reps tap-to-edit block was only 30px wide; `.ctl .mid` now has min-width 44px. U45 extended to assert width. Headroom 173; `gym-v302`, CACHE-HASH `da0a4c289f079152`. Gate green: 286 unit, typecheck clean, 337 e2e; shipped in the round-107 fleet-ship batch.
- **Nov 23 — round 108 (copy):** Day band said "~105 min left" before any set was logged. "Left" is now gated on sets done, matching the day summary and sr-only text. Headroom 182; `gym-v303`, CACHE-HASH `d0ed9c0be749968d`. Gate green: 286 unit, typecheck clean, 338 e2e; shipped in the round-108 fleet-ship batch.
- **Nov 23 — round 109 (layout):** Rest-prep name for long lift names was ellipsized at 390px, hiding "Set 1 of 3". `.rpname` now wraps. Headroom 217; `gym-v304`, CACHE-HASH `ae07ebb19ac5b1bc`. Gate green: 286 unit, typecheck clean, 339 e2e; shipped in the round-109 fleet-ship batch.
- **Nov 23 — round 110 (layout):** Lift title clipped the longest alternate name, hiding the "assisted" qualifier; title clamp raised to 3 lines. Headroom 217; `gym-v305`, CACHE-HASH `ada217621dfa995b`. Gate green: 286 unit, typecheck clean, 340 e2e; shipped in the round-110 fleet-ship batch.
- **Nov 23 — round 111 (copy):** Lift header used remaining-time math but omitted "left" after a set, unlike the day summary/band/sr-only. It now matches. Headroom 190; `gym-v306`, CACHE-HASH `7dbad8f502084365`. Gate green: 286 unit, typecheck clean, 341 e2e; shipped in the round-111 fleet-ship batch.
- **Nov 23 — round 112 (swap coherence):** Rest label after a swapped lift named the original program lift instead of the alternate. Now `(s.swapAlt || e.n)`. Headroom 238; `gym-v307`, CACHE-HASH `defce0eafa229a72`. Gate green: 286 unit, typecheck clean, 342 e2e; shipped in the round-112 fleet-ship batch.
- **Nov 23 — round 113 (swap coherence):** Swapped day row named the original lift beside the alternate's load. Row now names the alternate and wraps long names. Headroom 228; `gym-v308`, CACHE-HASH `2371d3bfd137dc31`. Gate green: 286 unit, typecheck clean, 343 e2e; shipped in the round-113 fleet-ship batch.
- **Nov 23 — round 114 (copy):** Summary read "1 sets" for a one-set workout. Sets label now pluralizes with the count, mirroring the PR label. Headroom 135; `gym-v309`, CACHE-HASH `318862132431af72`. Gate green: 286 unit, typecheck clean, 344 e2e; shipped in the round-114 fleet-ship batch.
- **survey**: two full surveys, both explore agents, verified in code. Round 1 (5 priority buckets): 2 genuine items. Round 2 (6 fresh angles — a11y/keyboard, responsive layout, SW update flow, notifications/vibration/audio, backup/export/import UX, large-payload performance): **0 genuine items** — every candidate disproven or already parked. Queue honestly empty.
- **queue** (priority order):
  1. ~~v202 — PR card shows a plain load-0 lift's rep count as "lb" (bucket 3, user-visible correctness)~~ DONE (v202; critic-local GO; check/typecheck green; e2e 231 pass + 1 pre-existing env failure noted below).
  2. ~~Remove vestigial `daynav` class token on the two day-nav buttons (bucket 4, tidiness, trivial)~~ DONE (v203; Tier 0, no critic; gate green).
  3. ~~e2e "share summary states the workout count once (v187)" is environment-fragile: stubs `navigator.clipboard` but not `navigator.share`, which exists on file:// here, so the clipboard path is never exercised~~ DONE (test-only; full e2e now 232/0).
- **finished this loop**: v202 (PR reps-vs-lb, critic GO), v203 (dead `daynav` token), share-summary e2e stub fix. All committed locally; nothing pushed. Final gate green: unit 257 pass, typecheck clean, full e2e 232 passed / 0 failed. Verified at finish: tree clean, `npm run check` green.
- **baseline e2e failure**: none outstanding — the one environment-fragile test found at baseline was fixed as item 3 (full e2e now 232/0).
- **decisions / parked (waiting on Khang)**: none new; existing NEEDS DECISION items below still stand.
- **CRITIQUE_PENDING**: none.

## Nov 20 — v205: finished set rows stay compact on a phone

Khang reported three finished Bulgarian split-squat sets rendering as tall empty cards on the rest screen's workout peek. The base `.setrow` rule still had `flex:1 1 auto`, so all rows grew to fill the viewport-sized `.setlog`; only the ≤560px and ≥880px blocks overrode the stretch. Fixed in `style.css`: the base row is `flex:none` and the log explicitly `justify-content:flex-start`, so spare height is empty space after the last row in every layout. The 44px default / 54px tall-screen min-heights and the short-screen scroll behavior are unchanged; the now-redundant per-breakpoint `flex:none` declarations were dropped. `app.js`'s stale "rows flex to fill" comment was corrected. Discriminating e2e (`smoke.spec.js`, `liftgeom.spec.js`): rows stay ≤68px and top-aligned with slack below them, plus a new 12-set test pins that the log scrolls and the last row stays reachable — all **fail pre-fix** (94px rows at 390×844), verified both ways. Gate: unit **259 pass**, typecheck clean, full e2e **235 passed / 0 failed** (390×667 + 390×844, no console errors). `GYM_VERSION` `gym-v205`, CACHE-HASH `7fbc4d4ade5c5b80`. Tier 0 (looks) — no critic. Committed locally, nothing pushed.

## Nov 20 — v204: rest notifications pre-fire 10 s before GO and auto-close

Khang asked for the rest-done banner sooner so there's time to mentally prep the next set. `restctl.js` now emits one `notifyPrep` effect when a live rest hits 10 s left (`PRE_NOTIFY_SEC`); the shell shows "Rest almost done — get ready" through the same SW registration as GO, keeps the existing "Rest done — GO" banner, and gives the heads-up no buzz or beep (Khang's choices). Both share the `gym-rest` tag, so GO replaces the heads-up; one 30 s close timer is replaced by GO's timer so the shared tag isn't dismissed 20 s early. The N9 guards are unchanged: hidden page + granted permission + no fire >20 s past the scheduled end; a suspended iOS tab still can't fire or clean up until JS resumes (Web Push remains the separate Tier B idea).

Tests: two unit tests pin the exact effect at 10 s, no repeat on 200 ms ticks, unchanged GO order, and the flag reset on +15-at-GO; `e2e/notify.spec.js` pins the 169/170/175/181 s timeline, tag replacement and 30 s close (alongside the stale-fire and opt-out guards). Both **fail pre-fix**. To stay under the 300 KB precache ceiling (assets **306,971 bytes**), several historical comments in `app.js` were condensed — full reasoning stays in their own entries above; code untouched. Gate: unit **259 pass**, typecheck clean, full e2e **233 passed / 0 failed** (390×667 + 390×844 included, no console errors). `GYM_VERSION` `gym-v204`, CACHE-HASH `232e74ed0584a0eb`. Tier 1 — cloud `critic-flash` unavailable (insufficient balance), local `critic-local` **GO** (verified flag resets, stale-fire order, close-timer lifecycle and pause/extend semantics; one non-blocking pre-existing note on record: an async `showNotification` rejection is still uncaught).

## Nov 20 — test: the share-summary assertion now exercises the clipboard path

`progress.spec.js`'s "share summary states the workout count once (v187)" stubbed `navigator.clipboard` but not `navigator.share`. On file:// in the current Chrome `navigator.share` is a function, so the app took the Web Share branch and the stub was never called — a baseline e2e failure unrelated to app behavior. Stubbed `navigator.share` as undefined in that test's init script; the app now falls through to the clipboard stub as the test intends. Gate: unit **257 pass**, typecheck clean, full e2e **232 passed / 0 failed**. Test-only — production code byte-identical, no version bump. Tier 0 (test-only) — no critic.

## Nov 20 — v203: dead `daynav` class token removed from the day-nav buttons

The ‹ › day buttons still carried `class="mini daynav"`, but no `.daynav` CSS rule, JS toggle, or test selector remained — the rules were removed back at N24, and v189/v192 already cleaned the stale comments that referred to them. This was the last residue. Dropped the token from `index.html:79,81`; the buttons render identically via `.mini`. Gate: unit **257 pass**, typecheck clean, e2e dayheader + viewportpin + dayswitch **6 passed** (390×667 / 390×844 / 430×932). `GYM_VERSION` `gym-v203`, CACHE-HASH `1c4e359ac61b343f`. Tier 0 (mechanical) — no critic.

## Nov 20 — v202: a load-less lift's PR reads as reps, not pounds

The Progress PR card printed `Math.round(pr.metric) + " lb"` unconditionally, but `progressMetric` falls back to the raw rep count when a plain (non-bodyweight, non-assisted) lift has no load to estimate a 1RM from — so a first session on Leg extension (a `load: null` lift) logged at 0 showed "PR Leg extension · 12 lb" instead of 12 reps. Fixed (`stats.js` surfaces `assist` on the PR record; `app.js` shows "reps" only when the lift is plain and the winning set carried no load). Bodyweight and assisted lifts at 0 logged load still yield pounds and are unchanged. Discriminating e2e (`progress.spec.js`): a load-0 plain lift reads "12 reps" — **fails pre-fix**; a second test pins that an assisted lift at 0 help still reads lb. To stay under the 300 KB precache ceiling, the v159 day-switch guard comment was condensed (reasoning kept here; code untouched). Gate: unit **257 pass**, typecheck clean, e2e **231 passed / 1 pre-existing env failure** (the v187 share-summary test stubs clipboard but not `navigator.share`, which exists on file:// here — unrelated to this change; queued as a test fix). `GYM_VERSION` `gym-v202`, CACHE-HASH `b05036b2e5adbb08`. Tier 1 — `critic-local` **GO** (peak-time review): condition verified correct for every reachable PR shape; additive field safe for all consumers; comment-only change confirmed behavior-neutral. One non-blocking, pre-existing note on record: an assisted lift logged with help ≥ bodyweight makes `progressMetric` return reps while the card still reads lb (atypical input; unchanged by this fix).

## Nov 19 — v201: the workout-path view fade is snappier (UI phase U3)

Every view faded in over 180 ms (`viewIn`), so on the path tapped dozens of times per workout — day → lift → rest — each screen spent a visible beat half-transparent (the UI survey's first screenshots caught views mid-fade, washed out). The workout-path fades (`.view`, the rest `.timer`) are now 100 ms: still a soft landing, noticeably less lag. Deliberate surfaces keep 180 ms (modal card, summary card, hint). CSS-only (`style.css`); no test pins the duration. Gate: unit **257 pass**, typecheck clean, smoke + rest specs 12/12. `GYM_VERSION` `gym-v201`, CACHE-HASH `423cd26312b80f0d`. Tier 0 (looks) — no critic.

## Nov 19 — v200: a zero-volume day's bar no longer reads as a filled bar (UI phase U2)

Progress "Volume by day" drew every day's track at full width in `--line`, saturated enough that a day with no training looked like a full bar — only the tiny "—" gave it away (both themes, seen in the UI-phase screenshots). Fixed: the render tags a zero day's bar with a `zero` class (`app.js`), and `.pdbar.zero` uses the fainter `--surface-2` token (`style.css`), so an empty day reads as an empty slot. Nonzero days are byte-identical. Discriminating e2e (`progress.spec.js`): with only Friday volume seeded, Friday's bar has no `zero` class and the other two do — **fails pre-fix**, verified both ways. (The v198 comment in `store.js` was shortened to keep the asset size gate; its full reasoning lives in the v198 entry.) Gate: unit **257 pass**, typecheck clean, progress.spec 14/14. `GYM_VERSION` `gym-v200`, CACHE-HASH `787cfee764001d96`. Tier 0 (looks) — no critic.

## Nov 19 — v199: the phone's chrome tint matches the app's own background (UI phase U1)

`index.html` ships correct `theme-color` metas (`#17100b` dark / `#fdebd2` light — the `--bg` tokens), but `applyTheme` overwrote the first one at boot and on every toggle with stale cool-palette values (`#0b0e12` / `#f4f6f8`) from before the warm redesign, so the status-bar tint clashed with the app behind it. Fixed (`app.js`): `applyTheme` now writes the active theme's `--bg` color to **both** metas (they are media-scoped; writing both makes the forced-theme case right too). Found by the UI-phase screenshot survey (both themes, settled state). Discriminating e2e (`version.spec.js`): seeded dark boot yields `#17100b` in both metas, toggling to light yields `#fdebd2` — **fails pre-fix**, verified both ways. Gate: unit **257 pass**, typecheck clean. `GYM_VERSION` `gym-v199`, CACHE-HASH `0ea4130852e60891`. Tier 0 (looks) — no critic.

## Nov 19 — v198: a corrupt session-clock stamp can't inflate a workout to 8 hours

`sanitizeSession` kept any finite `runningSince`. A foreign or hand-edited backup carrying a near-epoch stamp (`1000`, or negative) made `sessionElapsedSec` — and the `durationSec` banked by `finalizeSession` — read the full 28800 s (8 h) cap for a workout that may have lasted minutes. Bounded (never past the cap, never negative) but wrong, and the one session field the third survey found unguarded. Fixed (`store.js`): the stamp survives only when it is finite, positive, and not earlier than the session's own `startedAt` — every app writer stamps it at or after `startedAt`, so anything earlier is corrupt; dropping it is safe because `startSessionClock` re-stamps on the next timer tap or first set logged, and banked `accSec` is untouched. Discriminating unit test (`test/store.test.js`): negative and pre-start stamps drop to null, a real stamp is kept — **fails pre-fix**, verified both ways. Gate: unit **257 pass**, typecheck clean. `GYM_VERSION` `gym-v198`, CACHE-HASH `c497ad0d6d16ac3d`. Tier 2 — Pro review Nov 19: **GO with nits** (the writer invariant verified back to the commit that introduced the stamp; harm and fix reproduced — a 10-minute workout banked 28800 s pre-fix, 600 post-fix. On record: if the device clock is corrected backward mid-session, a later legitimate stamp can predate `startedAt` and drop — bounded, one-directional, self-healing; accepted. The equality and no-`startedAt` cases were added to the test on the critic's note.)

## Nov 19 — v197: the Undo button dates an evening snapshot by the local day

The snapshot button's date came from `new Date(snap.at).toISOString().slice(0, 10)` — a **UTC** date — while every other date in the app is a local `Gym.dateKey`. A snapshot taken after 6 PM CST / 7 PM CDT (exactly when an evening-training user creates one, before a reset or restore) was labelled with tomorrow's date; the restore itself was unaffected. Found by the third survey (date/time boundaries — the rest of that surface verified clean, both 2026 DST transitions included). Fixed (`app.js`): the label now derives from `Gym.dateKey(new Date(snap.at))`, and a dateless snapshot (`at` coerced to 0 by v178) shows no date instead of the epoch's. Discriminating e2e (`enhancements.spec.js`): a snapshot stamped 8 PM local reads "Undo Reset day (Nov 18)" — **fails pre-fix** ("Nov 19"), verified both ways. Gate: unit **256 pass**, typecheck clean. `GYM_VERSION` `gym-v197`, CACHE-HASH `499d1f3e83f0e46e`. Tier 1 — Pro review Nov 19 (with v198): **GO with one nit** — the e2e test originally discriminated only in a UTC-negative timezone; it now pins `America/Chicago` in its own browser context and discriminates on any host (re-verified both ways).

## Nov 18 — v177: a history entry's own reps/rir are clamped like its sets

`sanitizeEntry` clamped a history entry's representative `load` (v158) but left its flat `reps`/`rir` merely coerced. A sets-less legacy entry's reps/rir are synthesized into sets by `entrySets`, so a hand-edited `reps:1000000, rir:99` entry minted 3×10^8 lb of tonnage and poisoned the PR baseline and `qualifies()` (the load-suggestion gate). Fixed (`store.js`): `sanitizeEntry` now clamps `reps`→`SET_REPS_MAX` (999) and `rir`→`RIR_MAX` (4), mirroring `sanitizeRecord` (v176) and `sanitizeSets`; presence-guarded so absent stays absent. Discriminating unit test (`test/store.test.js`): the hostile entry caps at 999/4, an in-range entry is untouched, a bare entry gains no reps/rir keys — **fails pre-fix**. Gate: unit **243 pass**, typecheck clean (e2e in this VM runs on the temp no-channel config; full run at batch end). `GYM_VERSION` `gym-v177`, CACHE-HASH `6fa4792f3567f620`. Review: Pro batch Nov 19 — **GO** (verified in code + reproduction).

## Nov 18 — v178: a hostile snapshot date can't blank the app at boot

`readSnapshot` returned any JSON that parsed, with no shape check — but its `at` feeds `new Date(at).toISOString()` in the boot footer, where `"garbage"` or `1e16` throws RangeError: the app never renders, and the user can't even reach the snapshot button to clear it. Fixed (`store.js`): `readSnapshot` now validates at the boundary — a non-object snapshot or non-object `payload` is dropped (null), and an `at` that isn't a finite, in-Date-range number is zeroed (the footer already treats 0 as dateless). A legit snapshot is byte-identical. Discriminating unit test (`test/store.test.js`): junk/out-of-range `at` zeroed and `toISOString` no longer throws, non-object payload/snapshot dropped — **fails pre-fix**. Gate: unit **244 pass**, typecheck clean. `GYM_VERSION` `gym-v178`, CACHE-HASH `a7969a89ccd30ba3`. Review: Pro batch Nov 19 — **GO** (verified in code + reproduction).

## Nov 18 — v179: a non-integer idx can't crash the lift view

`normalize` accepted any non-negative number as `idx`, but `idx` indexes the day's exercise list directly: `1.5` (or `Infinity`, from `1e999`) passes every range guard in app.js — they all compare `<`/`>=` — yet indexes nothing, so `ex()` returns undefined and the lift view dereferences it. Fixed (`store.js`, one site): `normalize` now requires a finite whole number, else 0. Every migrate path (including v1/v2's looser carry-forward) funnels through `normalize`, so the one check covers all versions; the upper bound stays with app.js, which knows the day's length. Discriminating unit test (`test/store.test.js`): fractional and infinite idx fall back to 0, a valid idx is untouched, and a v2 payload with `idx:0.5` lands at 0 — **fails pre-fix**. Gate: unit **245 pass**, typecheck clean. `GYM_VERSION` `gym-v179`, CACHE-HASH `ecd11bf873afa084`. Review: Pro batch Nov 19 — **GO** (verified in code + reproduction).

## Critique resolved (Nov 19, off-peak Pro batch)
- v177–v181 (Tier 2, saved data): **GO** — every claim verified in code and by reproduction (23 extra probes against store.js, all clean; the v180 shift-loop perf worry checked and closed).
- v193–v195 (Tier 2): **GO with two nits on record**, neither blocking, no code change recommended: (1) v194's exact-fullness tie now keeps the first copy where pre-v194 kept the last — exactly mergePayload's behaviour, which was the change's stated goal; (2) the fuller-entry measure ignores the sets array when `setsDone` is nonzero — inherited verbatim from merge, and real banked entries keep the two in sync.
- v196 batch: **GO** (separate review, Nov 18) — one test-timing nit found and fixed before the run.

## Nov 18 — v196: rest-lifecycle honesty — the GO screen, the finish path, and navigation

Four fixes from the second survey's rest-machinery pass, one theme: the rest controller's state and the shell's promises about it must agree. (1) The GO screen computed its label with completeness hardcoded `true` (`restctl.view`) while `skip()` re-checked honestly (`done >= sets`) — after a mid-rest change (ending a deload week from the menu via the peek, restart-lift, reset-day) the screen promised "Next lift"/"Finish" and the tap answered "Next set — go." `view()` now passes the same honest check. (2) Finishing from the day view never idled the controller — a live countdown outlived the banked workout, beeping and notifying over the summary and leaving a GO card that could still advance into the finalized session; `finishWorkout` now idles the rest first, as the controller's own finish path does. (3) `showDay`/`showProgress`/`switchDay` never cancelled a pending auto-advance, breaking rest.js's documented contract ("manual navigation clears pending") that `openLift`/`navigateLift` honour — a GO tap on the shared timer bar could silently advance the lift under the day list; all three now cancel it. (4) The shell's dead `clearSchedule` effect branch (no emitter exists) is deleted, the v188 class. Tests: two unit tests pin the GO label both ways (`restctl.test.js`, the incomplete case verified against the pre-fix code in memory); two e2e tests (`rest.spec.js`) pin the finish-idle and the navigation-cancel — both **run and pass** (Nov 19, once the write fault cleared; each also verified to fail with its fix reverted — the tests first needed the rest screen's real "Show workout" peek step to reach the day view at all). Gate: unit **256 pass**, typecheck clean. `GYM_VERSION` `gym-v196`, CACHE-HASH `be2cf840bdadc01e`. Review: critic **GO** (Nov 18). Committed Nov 19 after the fault cleared.

## Nov 18 — v195: a merge tie no longer erases a swap choice

`mergePayload`'s state rule adopted the incoming record on a zero-progress tie, on the stated premise that a record with no sets and no done count "is just a program default". The second survey falsified the premise: a record can carry a deliberate swap (`swapAlt`, its chosen load in `swapLoad`/`swapLoads`) with zero sets logged — swap choices are user intent that by design persists across days. Verified: merging an older backup whose record had no swap silently reverted a same-day swap setup and its load. Fixed (`store.js`): the zero-tie adoption now applies only when the local record carries no swap intent (`swapIntent()`); the bare-default adoption (the phone-migration case the rule exists for) is unchanged and pinned by its own test. Discriminating tests (`store.test.js`): the swap survives the merge, and the bare-default tie still adopts the incoming load — the first verified to fail against the pre-fix code (in-memory revert, as in v194). Gate: unit **254 pass**, typecheck clean. `GYM_VERSION` `gym-v195`, CACHE-HASH `2aa1bbfb64387cae` (the combined v194+v195 commit's tree digest, recomputed at commit time after the write fault — see the v193 note). Tier 2 — Pro batch Nov 19: **GO** (the swapLoads-only record and the one-sided guard verified by extra probes). Committed Nov 19 with v194.

## Nov 18 — v194: reconcile's collision rules now agree with mergePayload's

Two places where `reconcile` (which runs on every boot, restore and merge) resolved collisions more crudely than `mergePayload`, verified end-to-end by the second survey: (1) its same-date history dedupe was last-wins (`seen[dk] = en` unconditionally), so after a merge, reconcile re-ran over the merged payload and a partial incoming copy of a session silently replaced the completed one; it now keeps the fuller entry by the same measure merge uses (`setsDone`, else the sets array's length), first copy winning ties. (2) Its state-record collision compared only `done`, so a record carrying real logged sets lost an equal-`done` tie to an empty one; it now scores both records with `progressScore`, the exact function mergePayload uses. Discriminating tests (`store.test.js`): the fuller 100 lb × 3 entry survives a same-date partial 95 lb × 1 routing in from another key, and the 3-set record wins the equal-done collision — both verified to fail against the pre-fix code (compiled in memory with the hunks reverted, since the VM write fault blocks git). Gate: unit **252 pass**, typecheck clean. `GYM_VERSION` `gym-v194`, CACHE-HASH `2aa1bbfb64387cae` (combined-commit digest, as in the v195 note). Tier 2 — Pro batch Nov 19: **GO with two nits on record** (tie direction and the setsDone measure — both inherited from merge by design; see "Critique resolved"). Committed Nov 19.

## Nov 18 — v193: snapshot restore rolls the session forward (the v150 gap)

The "Undo last reset / restore" path (`restoreSnapshot`) replaced the payload via `migrate` → `reconcile` but never called `rollSession` — the one wholesale-replacement path v150 missed (boot and backup-restore both roll). A snapshot taken mid-workout on an earlier day keeps its stale `active.date` indefinitely; restoring it on a later day makes the next workout bank under the stale date, and the same-date upsert silently replaces that day's real history entry for the lift. Fixed (`app.js`): `Gym.rollSession(payload, Gym.todayDay())` right after the reconcile, mirroring the sibling paths. Discriminating e2e (`enhancements.spec.js`, clock-pinned): a week-old snapshot's restored `active.date` is today — written Nov 18 but run Nov 19, once the VM write fault (the Nov 13 one from AGENTS.md) cleared: **passes**. Gate at build: unit **250 pass**, typecheck clean. `GYM_VERSION` `gym-v193`, CACHE-HASH `648a5bc5be6376ed` — recomputed at commit time: the fault-era digest was taken on a transient tree that also carried later comment trims, so the committed tree (v193's changes only) hashes differently; the checker passes on the committed tree. Tier 2 — Pro batch Nov 19: **GO** (full restore path reproduced, incl. same-day no-op). Committed Nov 19.

## Nov 18 — v192: stale header comments corrected; the heat heading reads HEAT_WEEKS

Four stale spots from the survey's tail: `timer.js`'s header still said the state machines "stay in app.js" (they live in machine.js/restctl.js); `rest.js`'s header said the DOM controller "still lives in app.js" (it's restctl.js); `style.css` labelled the RIR line a "one-time explainer" (it always shows the selected RIR in plain words); and the Progress heat heading hardcoded "8 weeks" in index.html while the SR line beside it already read `snap.heatWeeks`. Fixed: the three comments now describe reality, and the heading span got `id="pHeatTitle"` and is set from `snap.heatWeeks` next to `pHeatCount` — renders identically today (8), but can no longer drift from `HEAT_WEEKS`. Gate: unit **250 pass**, typecheck clean, e2e progress.spec **13 passed**. `GYM_VERSION` `gym-v192`, CACHE-HASH `9bfb5f0641db99d7`. Tier 0 — docs/latent coupling, no critic.

## Nov 18 — v191: recentVolume drops the dateless phantom session

`sessionVolumes` groups entries by `e.date || ""`, so dateless legacy entries merge into one "" group that sorts as the oldest "session". Every other consumer guards on the date (`workoutDates`, `trainingDays`) or excludes "" by range (`volumeInRange`) — `recentVolume` alone let the phantom group occupy a slot in the Progress recent-sessions trend (progressSnapshot's `recent`). Fixed (`stats.js`): `recentVolume` filters out dateless groups before windowing; `sessionVolumes` itself is unchanged (its tonnage still counts in totals). Discriminating unit test (`test/stats.test.js`) — **fails pre-fix**. Gate: unit **250 pass**, typecheck clean. `GYM_VERSION` `gym-v191`, CACHE-HASH `e155c87345a9a147`. Tier 1, low (legacy-only reachability).

## Nov 18 — v190: a poisoned learned calibration can't poison the day estimate

The learned-calibration values live in their own `gym-calibration` localStorage key, outside the payload's sanitize path, and `calOpts` accepted any number stored there. A hand-edited or corrupted key (`warmupSec: 100000`, or Infinity via `1e999`) flowed straight into every day-duration estimate. Fixed (`app.js`): `calOpts` now accepts only what `Stats.calibration()` itself can write — warmup finite within 0–1200, overhead finite within 5–40 — and falls back to the `STRETCH_SECS`/`SETUP_SECS` seeds otherwise; legit learned values are untouched. Discriminating e2e (`progress.spec.js`): with `warmupSec:100000` stored, the day summary still reads ~105 min — **fails pre-fix** (~1,766 min). Gate: unit **249 pass**, typecheck clean. `GYM_VERSION` `gym-v190`, CACHE-HASH `0bcca68ec4791c9f`. Tier 1.

## Nov 18 — v189: the third stale N12 comment removed (style.css)

An orphan section header in `style.css` still claimed "the day tabs and their week marks are gone; day switching rides the .daynav chevrons" — false since N24 put the Fri/Sat/Sun tabs (with status dots) in the header, and no rules sat under the header anymore. The two app.js copies of this stale note were fixed in v169/v174; this was the third instance the earlier passes missed. Deleted the orphan comment; no rule changed. Gate: unit **249 pass**, typecheck clean. `GYM_VERSION` `gym-v189`, CACHE-HASH `cb02bc1633686796`. Tier 0 — docs only, no critic.

## Nov 18 — v188: dead restctl.finish removed

`restctl.finish` (force the rest machine to GO) had zero callers in app.js, the unit tests and the e2e suite — grep-verified before and after; the live end-of-rest paths are `tick()` reaching GO and `skip()` (with its two-tap finish on the last lift). Removed the function and its export entry, in the v163/v168 dead-export pattern (unlike the v166-declined store helpers, nothing — not even a test — referenced it). Gate: unit **249 pass**, typecheck clean, e2e rest + restquiet **5 passed**. `GYM_VERSION` `gym-v188`, CACHE-HASH `be3bcdb000bcfbce`. Tier 0 — no critic.

## Nov 18 — v187: the share summary states the workout count once

`summaryText` called `Stats.sessionCount(payload)` twice into `sessions` and `days` and printed both: "Gym — 24 workouts · 312 sets · 24 training days · …" — the same number (distinct workout dates) stated twice in one line, reading as two different stats. Fixed (`app.js`): the duplicate segment and variable are gone; the line is "N workouts · S sets · V lb tonnage". Discriminating e2e (`progress.spec.js`, clipboard stubbed): the copied text contains "2 workouts" and no "training days" — **fails pre-fix**. Gate: unit **249 pass**, typecheck clean. `GYM_VERSION` `gym-v187`, CACHE-HASH `dfbf5b006823123b`. Tier 0 — no critic.

## Nov 18 — v186: the CSV export credits a swapped session to the lift performed

`toCsv` resolved the lift name once per history key, from the programme slot, and never read the entry's `swap` stamp — so a session where the alternate was performed (e.g. close-grip bench banked under the Assisted dip slot) exported every set under the original lift's name, while Prev, the Plan header and the day view all label the same session with the alternate. Any spreadsheet analysis credited the wrong exercise. Fixed (`stats.js`): each entry's rows use `e.swap` when it's a non-empty string, else the slot name — non-swap rows byte-identical. Discriminating unit test (`test/stats.test.js`) — **fails pre-fix**. Gate: unit **249 pass**, typecheck clean. `GYM_VERSION` `gym-v186`, CACHE-HASH `42ffd627283c20dc`. Tier 1.

## Nov 18 — v185: "Prev:" names the deload session actually done last

`renderPrev` is defined as the actual-last-session read — its swap branch reads the newest raw entry and names the alternate — but a newest entry stamped `deload` fell through to `su.last`, the newest progression-filtered session, and was labelled "Prev:". After a deload week the reference line therefore showed the older, heavier full session (50×6 ×3) instead of the deload session actually done last (45×6 ×2) — the line he loads the bar from. Fixed (`app.js`): a deload newest entry renders its own sets under "Prev (deload):", formatted exactly like the normal path; the suggestion line keeps using the progression read, untouched. Discriminating e2e (`deloadfollow.spec.js`) — **fails pre-fix**. Gate: unit **248 pass**, typecheck clean. `GYM_VERSION` `gym-v185`, CACHE-HASH `f79f082778a84ecf`. Tier 1.

## Nov 18 — v184: personalRecords counts a count-less legacy entry's flat set

`personalRecords` iterated `entrySets(e)` only. For a legacy entry with a flat `load`/`reps` but no `sets` array and no `setsDone`, `entrySets` returns [] — the session was invisible to PRs, while `topMovers` (entry-as-fallback), `toCsv` (the v155 flat-row guard), the sparkline and the live PR hint all count the same session. Seeded proof: a 100 lb legacy session + a 50 lb setsDone session gave a 50 lb PR beside a −50% mover measured from 100 lb. Fixed (`stats.js`): when `entrySets` is empty but the entry carries a flat load/reps, the PR loop evaluates that one flat set, mirroring `toCsv`'s guard; a truly empty entry still yields no PR. Discriminating unit test (`test/stats.test.js`) — **fails pre-fix**. Gate: unit **248 pass**, typecheck clean. `GYM_VERSION` `gym-v184`, CACHE-HASH `f3e71f62adc94416`. Tier 1.

## Nov 18 — v183: the rest screen's "Up next" counts deload sets

The doneBtn inter-lift line built the next lift's count from the raw programme `nx.s` — the only raw `.s` read left in app.js. In a deload week it announced "Up next — Smith incline press · 3 × 6" while the day row, the lift view, and the rest-prep card directly below it all said 2 sets (the v161/v175 deload-consistency family, one surface short). Fixed (`app.js`): the count now goes through `effSets(nx)`, the one deload-aware target. Non-deload output is byte-identical. Discriminating e2e (`deload.spec.js`): start a deload week, complete lift 0 at its 2-set target, the rest headline reads "2 × 6" and the prep card agrees — **fails pre-fix** ("3 × 6"). Gate: unit **247 pass**, typecheck clean. `GYM_VERSION` `gym-v183`, CACHE-HASH `438c6eaf94c0abd9`. Tier 0 — no critic.

## Nov 18 — v182: the trend sparkline windows progression sessions, not raw history

`renderSpark` read `series(payload, cur, idx, 12).filter(progressionEntry)` — the last 12 **raw** entries, then discarded swaps/deloads. Every other progression reader filters the full history first. After a run of swapped sessions the trend silently shortened, and with 11 swaps in the last 12 it vanished entirely (toggle hidden) while the suggestion on the same screen still saw 14 real sessions. Fixed (`app.js`): filter first, then `slice(-12)`. Discriminating e2e (`progress.spec.js`): 13 real + 11 swapped + 1 real sessions plot exactly 12 points with the toggle visible — **fails pre-fix** (hidden, 1 point). Also in this commit: the v177–v181 comments were condensed (full reasoning lives in their BACKLOG entries) because the batch had pushed precached assets to 307,397 bytes, over the 300 KB size gate (307,200) — code unchanged by the trim, assets now 306,163. Gate: unit **247 pass**, typecheck clean, e2e progress.spec **11 passed** (full e2e at batch end). `GYM_VERSION` `gym-v182`, CACHE-HASH `80868b26102e3192`.

## Nov 18 — v181: an entry's deload flag is coerced to a real boolean

`sanitizeEntry` boolean-coerced `hitTop`, `bw` and `assist` but never touched `deload` — a flag banked only ever as literal `true`. A foreign backup that stringifies booleans lands `deload:"false"`, which is truthy, so a real, non-deload session was permanently excluded from progression, PRs and top movers (volume still counted it, so it looked present) with no UI to clear it. Fixed (`store.js`): `e.deload = e.deload === true`, the `bodyweightSet` precedent — anything that isn't literal `true` isn't a deload. (The survey proposed `!!e.deload`; verified before acting — `!!"false"` is `true`, so that shape would not have fixed the string case.) Discriminating unit test (`test/store.test.js`): `"false"` → `false`, `true` stays `true`, absent stays absent — **fails pre-fix**. Gate: unit **247 pass**, typecheck clean. `GYM_VERSION` `gym-v181`, CACHE-HASH `525a3724f54aa532`. Review: Pro batch Nov 19 — **GO** (verified in code + reproduction).

## Nov 18 — v180: an imported history is capped at HISTORY_MAX, like every writer

Every writer caps a lift's history at `HISTORY_MAX` (520) — `pushHistory`, `upsertHistory`, merge and reconcile all shift the oldest off the front — but `sanitizePayload`, the load/import path, sanitized entries with no length cap at all. A foreign backup (the import ceiling allows ~5 MB, i.e. tens of thousands of small entries under one lift) would land uncapped: every Progress render and every save walks and re-serializes all of it on the phone, and once the payload outgrows the storage quota, saves start failing — new workouts silently stop persisting. Fixed (`store.js`): after sanitizing, a lift's history is shifted down to `HISTORY_MAX`, keeping the newest, in the same idiom as the other four caps. This also covers salvage, which funnels through `normalize`. Discriminating unit test (`test/store.test.js`): 600 dated entries import as 520 with the oldest 80 dropped and the newest intact; a short history is untouched — **fails pre-fix**. Gate: unit **246 pass**, typecheck clean. `GYM_VERSION` `gym-v180`, CACHE-HASH `3fcfabcc26d931be`. Review: Pro batch Nov 19 — **GO** (verified in code + reproduction; the shift-loop perf worry checked and closed).

## Nov 17 — v176: data-integrity hardening (two Pro-critic follow-ups, un-deferred)

The two flagged gaps from the v154/v158 Pro review were the strongest remaining buildable candidates and both turn out cheap. (1) `unsafeKey` screened only `__proto__`/`constructor`/`prototype`, so other `Object.prototype` members like `hasOwnProperty`/`toString`/`valueOf` could still land as phantom own pairs on the recovered `swapLoads` map (inert to the current direct-key consumers, but a future `Object.keys` walk would trip). Fixed (`store.js`): `unsafeKey` now also returns `k in Object.prototype` — verifiably deletes no legitimate key (record/set/entry/session fields, `"day:idx"`/`"old:"` map keys, and every swap-alt name are none of them). (2) a record's own `reps`/`rir` were coerced but never upper-bounded (only `load`/`swapLoad` were), so a hand-edited backup could push a huge finite reps/rir into the live readout and — critically — into the `program.js:245` legacy backfill that copies record-level reps/rir into synthetic sets which set-level clamping never sees. Fixed: `sanitizeRecord` clamps `reps`→`SET_REPS_MAX` (999) and `rir`→`RIR_MAX` (4), mirroring `sanitizeSets`; presence-guarded so absent stays absent. Discriminating tests: the hostile swapLoads seed adds `hasOwnProperty/toString/valueOf` and asserts `Object.keys` is clean; a `reps:5000/rir:99` record clamps to 999/4 with the logged set untouched. Gate: unit **242 pass**, typecheck clean, e2e **219 passed**. `GYM_VERSION` `gym-v176`, CACHE-HASH `9c3a53212f077aca`. Review: **Pro critic GO** (off-peak) — confirmed the clamp closes a real read path (`program.js:245` backfill) and no legitimate key is deleted; only non-blocking wording suggestions, left as-is.

## Nov 17 — v159: a non-active day can't be logged while a session is active (mis-dating)

`bankLift` keys history by the current day `cur` but stamps entries with `active.date`, and `switchDay` changes only `cur`, never `active`. So before this change, switching to a different day and logging a set banked **that day's** lift under the **active session's date** — e.g. a Saturday lift dated Friday — mis-attributing it in weekStatus and mis-dating it in PR/CSV. The app keeps exactly one active session (one day + date), so the ‹ › chevrons are a review/completion tool for the active day, not a second off-day log target. Fixed (`app.js` doneBtn.onclick): a guard reads `payload.active.day` and, when it's set and differs from `cur`, shows a hint ("This is Sat's lift, but the session is Fri — switch back to log sets") and returns — blocking the add-set path, and (placed before the inline-edit `finishEdit` early-return per review) the edit-finish and undo-`bankLift` re-bank paths too. The active day logs exactly as before (`actDay === cur` is a no-op). Discriminating e2e (`e2e/dayswitch.spec.js`): (1) the active Fri day logs a set normally, then the switched-to Sat day blocks `doneBtn` with the hint and banks nothing under `sat:0`; (2) switching back to the active Fri day restores logging. Both **fail pre-fix** (an unguarded Sat doneBtn pushed a set ± the hint never read "switch back"). Gate: unit **248 pass**, typecheck clean, e2e **215 passed** (213 + 2). `GYM_VERSION` `gym-v159`, CACHE-HASH `07a298cb0d8af4db`. Review: critic-flash **GO** (Tier 1) + hoisted the guard above the edit early-return (re-bank paths) — applied. NOTE: this also blocks catching up a *missed* off-day (a session only ever starts for today); that's the existing P9 "off-day logging" NEEDS-DECISION — see below.


The store boundary clamps every *set's* `load` to `SET_LOAD_MAX` (2000, B5-15) — but the record's **own** `load`, `swapLoad`, and each `swapLoads` value, and a history entry's representative `load`, were only coerced, never upper-bounded. A hand-edited or foreign backup could therefore inject `load: 1e9` that flowed into `workingLoad`, the next-load suggestion (`suggestLoad`/`planFor`), the seeded starting guess, the live PR-hint baseline and finish-summary tonnage — exactly the "poison tonnage / PR baseline" B5-15 guards sets against. Fixed (`store.js`): `sanitizeRecord` clamps `load`/`swapLoad` to 2000 and `swapLoads` values to 2000 (kept in-range entries), and `sanitizeEntry` clamps the representative `load`. Clamping is presence-guarded (`own`), so a fresh lift with an absent load stays absent and the "start light" guess is untouched. Discriminating unit test (`test/store.test.js`): imports `load:1e9, swapLoad:5e8, swapLoads:{Leg press:3000,Hack squat:120}` → all cap at 2000 with in-range kept; a `{done:0}` lift keeps no `load` key; an entry `load:987654321` caps to 2000 — **fails pre-fix** (values survived; pre-fix the absent-load guard still passes but the caps were missing). Gate: unit **248 pass**, typecheck clean, e2e **213 passed**. `GYM_VERSION` `gym-v158`, CACHE-HASH `843e01967ecc6857`. Review: data-integrity / untrusted-import hardening (matches B5-15 / v154 class; peak time) — **CRITIQUE_PENDING** for the off-peak Pro batch.

## Critique pending

## Nov 16 — v157: a swapped lift hides the original's suggestion line and Apply button

`renderSuggest()` shows the ORIGINAL lift's next-load nudge, but while a lift is **swapped** the alternate's load lives in `swapLoad`/`swapLoads`, so the original's nudge is noise and its Apply button would write a dormant `load` field. Fixed: `renderSuggest` now computes the reads, always renders the swap-aware **Prev** line (`renderPrev`), then — only when `curSt().swapAlt` is set — hides `#suggestLine` and `#applyLoad` and returns. Undo-swap and re-`render()` restore them. Keep-transparency: `renderPrev`'s "Prev (swap): …" line and the alternate's own `loadVal` still show; nothing that should display is lost. Discriminating e2e (`e2e/alts.spec.js`): a swapped lift with a would-draw history **hides** the line/Apply (**fails pre-fix** — the nudge showed); a non-swapped lift whose last two sessions qualified still shows "hit top twice → …" with an enabled Apply (guards against over-hiding). The two prior specs that asserted a visible suggestion while swapped were updated to assert the hide instead. Because hiding erases the *swap* path of the **v153** `priorEntries` skip-regression from live tests, added a discriminating **deload**-variant test (`e2e/deloadfollow.spec.js`, the deload suggestion is not hidden): active deload week, fri:0 complete at its 2-set target, today's `deload:true` entry newest + two qualifying priors → suggestion is planFor(52.5)→deload **47.5**, not the two-back (keep 50)→45 — **fails pre-v153** (unconditional skip) and **fails pre-hide-free** (line was shown). Gate: unit **247 pass**, typecheck clean, e2e **213 passed**. `GYM_VERSION` `gym-v157`, CACHE-HASH `ff3e420461901bc3`. critic-flash **GO** (Tier 1) + one non-blocking note applied (added the deload regression test).

## Critique pending

## Nov 16 — v156: a swapped descending session banks the right top set

`bankLift` picked its representative top set with the ORIGINAL lift's metric, but while a lift is swapped its sets carry the ALTERNATE's plain external load — so on an originally-*assisted* lift the assist metric (bodyweight−help) inverted the pick and crowned the *lighter* of a descending run (e.g. 135 then 125 banked 125 as the entry's `load/reps`). It now picks the top with the same shared `liftValuation` rule (plain load while swapped; `v148/v151`) it already uses to stamp the banked flags and value volume/PR, so a descending run banks the heavier set. Non-swapped lifts are byte-equivalent (`liftValuation` returns the original's flags there). Regression e2e (`e2e/alts.spec.js`): seeds the swapped Assisted dip with two 135 sets, completes a 125 third set, asserts the banked entry shows **135** — **fails pre-fix** (banked 125). Gate: unit **247 pass**, typecheck clean, e2e **210 passed**. `GYM_VERSION` `gym-v156`, CACHE-HASH `f2d09d38f1c66596`. critic-flash **GO** (Tier 1).

## Critique pending

## Nov 16 — v155: the CSV export counts a legacy multi-set session's real sets, not one

`Stats.toCsv` fell back to a single flat row whenever a history entry had no `sets` array, but every other history reader (`entrySets` — volume, PRs, top movers) synthesizes `setsDone` copies for such legacy entries. So a legacy "3×50" session exported as one row while the app counted three — an under-reporting inconsistency in the export (the user's record). Fixed: `toCsv` now routes through `entrySets`, so its per-set row count agrees with every other reader; an entry that still carries a flat set field but no count keeps that one row rather than vanishing. Two unit tests (`test/pass3.test.js`): the legacy multi-set case asserts 3 synthesized rows (**fails pre-fix**, emitted 1) and the lone-flat-row case is preserved. Gate: unit **247 pass** (245 + 2), typecheck clean, e2e **209 passed**. `GYM_VERSION` `gym-v155`, CACHE-HASH `700868f9eb803781`. critic-flash **GO** (Tier 1).

## Critique pending

## Nov 16 — v154: the swap-load memory can't be seeded with prototype-poisoning key names

The `swapLoads` sanitizer rebuilt the per-alternate name→load map from storage but, unlike every other record/entry boundary, did not screen the inner key names (`stripUnsafeKeys`/`unsafeKey` strip `__proto__`/`constructor`/`prototype` from the record and entry objects — the map keys were the gap). A hostile storage/import could land `constructor`/`prototype` as phantom own properties of the recovered map. Fixed: the copy now skips `unsafeKey(k)`, matching the rule applied at every other map consumer. Unit test (`test/store.test.js`, same N14 case): seeds `{"__proto__":5, "constructor":3, "prototype":1, "Leg press":180}` and asserts the recovered map is exactly `{"Leg press":180}` with a clean prototype — **fails pre-fix** (the `constructor` shadow survived). Gate: unit **245 pass**, typecheck clean, e2e **209 passed**. `GYM_VERSION` `gym-v154`, CACHE-HASH `d07814c9aa28e7fe`. Review: defense-in-depth security hardening (committed during peak per the off-peak rule) — **CRITIQUE_PENDING** for the next off-peak Pro batch.

## Critique pending

## Nov 16 — v153: a swapped/deload session no longer eats the real "last session" from the next-load suggestion

`priorEntries()` (app.js) filtered history through `progressionEntry` (which excludes swaps and deload weeks), then — when the current lift was complete — unconditionally dropped the newest entry as "this session". But if today's banked entry was a **swap** (or a deload week), it had already been filtered out, so the drop threw away a *real* prior session and the next-load suggestion read two sessions back instead of one. Fixed: the drop now happens only when the newest filtered entry is actually dated today (`last.date === Gym.sessionDate(payload)`), so a swap/deload-complete session keeps its true prior. This also corrects the deload-week suggestion (`planFor` now reads the true newest prior) and the doneBtn PR baseline. Regression e2e (`e2e/alts.spec.js`) seeds two qualifying prior sessions then a today swap-complete and asserts the suggestion is "hit top twice → try 52.5", not "one more top session to go up" — **fails on pre-fix**. Gate: unit **245 pass**, typecheck clean, e2e **209 passed**. `GYM_VERSION` `gym-v153`, CACHE-HASH `14f6e72df589d120`. critic-flash **GO** (Tier 1).

## Nov 16 — v152: the menu's head is reachable in Home-Screen mode (card fit the physical screen, not the usable one)

Khang reported the `⋯` menu's top edge unreachable on his iPhone: the "Menu" head sat under the status bar, and scrolling up only rubber-banded back. Root cause was the v139/v144 pin, applied to the wrong box. In standalone the overlay (`position:fixed;inset:0`) is the **physical 852px screen**, but only **793px is usable** (59px status bar on top, 59px system chrome reserved at the bottom as `--app-b`). `.modal-card` was capped at `calc(var(--app-h) - 32px)` = 820px and centred on the 852px overlay, so it ran 16→836: **43px of its head under the status bar and 43px of its foot under the home indicator**. The menu's content happened to fit that 820px box, so the card had nothing to scroll back — the head was simply off-screen, which is exactly the "as far as I can scroll up" he saw.

BUILT: the two full-screen overlays (`.modal`, `.summary`) are now flex boxes padded to the usable area — `calc(20px + env(safe-area-inset-top))` on top and `calc(20px + max(env(safe-area-inset-bottom), var(--app-b, 0px)))` at the bottom — and their cards size from that box (`max-height:100%`) instead of from `--app-h`. Padding/`max-height` only changed; the cards keep their own scroll, so the menu still scrolls internally when it doesn't fit. Verified against his device numbers (screen 393×852, vp 793, safe 59/34, app-b 59, simulated in Chrome): card 79→773, head at 96 (clear of the 59px status bar), foot 20px above the usable 793 line; a chosen middle row ("Leg extension") and the footer both reachable after scrolling. Browser/667/844 geometry is unchanged apart from the 4px the old `-32px` cap was eating (card 16→828 becomes 20→824). New e2e (`a11y.spec.js`) emulates the pin at 393×852 and at the usable 393×793 with `--app-h` 852 / `--app-b` 59: asserts the bottom chrome is reserved, the card sits inside the padded box, and the head is visible at scroll 0 — **fails pre-fix** (padding-bottom 20 vs 79; card top −13.5 at 793). Gate: unit **245 pass**, typecheck clean, e2e **208 passed**. `GYM_VERSION` `gym-v152`, CACHE-HASH `88398bfa4a74a717`. Tier 0 (UI geometry + test) — no critic.

## Nov 16 — v151: the New PR hint values a swapped-in machine at its real load

v148's overlap. v148 fixed tonnage/PR-history mis-valuation of a swapped bodyweight/assist lift but missed the **live** `doneBtn` "New PR" hint, which still called `metricFor(e, …)` with the ORIGINAL exercise's `assist`/`bw` flags. On Friday's Assisted dip swapped to Close-grip bench at 135, the hint showed `(165−135)×1.2 = 36` instead of the real `135×1.2 = 162`, and since 36 < the prior 144 (a 45-lb-assisted session), a genuine swap-weight gain never announced "New PR".

BUILT: `metricForLive(e,s,load,reps)` routes live-set metric through `liftValuation` (`bw:false, assist:false` while swapped); the two live-set reads in `doneBtn` (today's banked sets + the new set) now use it. The prior-history loop stays on `metricForEntry` (`priorEntries` already strips swap/deload). Unswapped paths byte-for-byte identical. Regression e2e (seed swapped dip at 135 with prior assisted 45×6, log one set → `#hint` shows "New PR", "135 × 6", "est. 1RM 162"): **discriminating**, fails pre-fix. Gate: unit **245 pass**, typecheck clean, e2e **207 passed**. `GYM_VERSION` `gym-v151`, CACHE-HASH `3ef1cd4adb67da95`. `critic-flash` **GO** (Tier 1).

**Candidate (pre-existing, from critic, low):** `bankLift` (`app.js:127`) calls `topSetOf(e, s.sets)` with **no entry**, so it falls back to a metric using the ORIGINAL assist flag — for a swapped assisted lift that metric inverts, so a *descending*-load swapped session (135 then 125) banks `entry.load = 125` as "top". Affects the representative `entry.load/reps` only (volume/CSV read the full `sets`); single-set sessions and the hint are unaffected.

## HANDOFF — end of session (Nov 16) → for the next session

Gate last confirmed **green**: check/unit **245 pass**, typecheck clean, e2e **207 passed**, `check-sw-cache OK` digest `3ef1cd4adb67da95`. `main` ahead of `origin/main` (v145–v151 from this loop + tests + backlog notes), **nothing pushed** (stop instruction preserved this from pushing; never push without Khang). **Note:** a parallel session landed **v152** at the tail of this session (the Home-Screen `.modal`/`.summary` usable-area fix — sheets now pad to `--app-b`/safe area, cards `max-height:100%; gates 245 unit / 208 e2e) — see the release note above.

**Survey candidates recorded for next session** (in priority order; #3 investigated read-only over two sessions — NOT edited, nothing half-done to finish):
- **#3 (NEXT head candidate, correctness):** `priorEntries()` off-by-one (`app.js:467-472`). It filters via `progressionEntry(e)`, then **unconditionally** `slice(0,-1)` even when the newest *unfiltered* raw entry was already stripped (a swap/deload entry), so the `skip` drops a *real* prior session. Fix must gate `skip` on the newest entry actually being today's progression entry. Needs a discriminating test (`git stash`-verified) + gate. Read-only details for the next session: `entries` is `series(payload, cur, idx).filter(progressionEntry)` where `progressionEntry = countsForProgression(e) && !e.deload` and `countsForProgression = !!e && !e.swap`. The history entry `date` is `Gym.sessionDate(payload)` (banked in `bankLift`), so the correct gate is roughly `skip = done >= effSets && newest-filtered-entry.date === Gym.sessionDate(payload)` (i.e. only drop a real prior session when the newest progression entry is actually today's). Verify current skip also fires for swap/deload banked today when done is full.
- **#4 (Tier 2 security):** `sanitizeRecord` missing `unsafeKey` guard for `swapLoads` (`store.js:189-198`). Off-peak-only `critic` for this one.
- **#5 (low):** `toCsv` legacy multi-set emits 1 row vs `entrySets` synthesizes `setsDone`.
- **#topSetOf candidate (low, recorded above):** `bankLift` calls `topSetOf(e, s.sets)` with no entry → swapped descending-load session banks the wrong "top".

**Deferred / open (see below):** swap+`applyLoad`-while-swapped; swap+`planBtn`-into-dormant-load (out of scope); NEEDS DECISION partial-workout sets never reach history; bodyweight-alternate valuation decision for Khang.

**Tree state (IMPORTANT):** working tree had an uncommitted `style.css` in-progress edit (N25 Home-Screen modal usable-area fix) that appeared during the session; a **parallel session has since committed it as v152**, so the tree's non-doc contents are clean. Work only in files you own and re-verify `git status` after this because the parallel session is committing concurrently (`one writer per file`), and never force-push or overwrite.

## Nov 16 — v150: restore rolls the active session forward so old backups don't corrupt history

Survey finding #1 (destructive, invisible data corruption). The "Restore (replace)" handler assigned `payload` from `importRaw`/`reconcile` but — unlike boot (`app.js:2159`) — never called `rollSession`. `sanitizeSession` keeps a valid `active.date` verbatim, so a restored backup with an old `active.date` kept that stale date as the session date; the next workout `bankLift`'d under it (`sessionDate` = `active.date`) and `upsertHistory` replaced any history entry on that date — silently overwriting a real past session (corrupting PRs/CSV/tonnage). The merge/import path was already safe.

BUILT: one line — `Gym.rollSession(payload, Gym.todayDay())` right after `payload = restored`, mirroring boot's ordering (roll before `cur`/`idx` read). Backup active is today → no-op; stale with data → banks the restored session then starts today keeping loads. `liftHistory` never mutated (`finalizeSession` touches only `active`/`sessionLog`). Regression e2e (`e2e/pass3.spec.js`), date-pinned to a Friday: restores an old-active backup holding a `fri:0` history entry on the same old date, completes `fri:0`, asserts old entry preserved (length 2) and new set banks under a non-old date — **fails pre-fix** (length 1, overwritten). Gate: check/unit **245 pass**, typecheck clean, e2e **206 passed**. `GYM_VERSION` `gym-v150`, CACHE-HASH `247fe9139dcd5b78`. Critic **GO** (caught and verified the test needed a date pin for weekend determinism).

## Nov 16 — test: pin that a swap choice and load survive rollover to a new day

Survey finding #5 (unstated per-day swap invariant). `startSession`/`rollSession` clear set progress (`done`/`topHits`/`lastRir`/`sets`) but keep the working load **and** the `swapAlt`/`swapLoad`/`swapLoads` map unchanged — the intended per-lift persistence (a machine swapped in on Friday stays swapped next Friday, its load carrying over beside the original's). No test guarded it. New `test/store.test.js` case seeds a swapped `fri:0` (Barbell back squat @40) and asserts it survives both a same-day `startSession` (sets cleared, swap intact) and a `rollSession` across a day boundary (banked, load 50 + swap @40 kept). Pins current behavior — a future reset that silently drops the swap across days is now caught. Gate: unit **245 pass**, typecheck clean, e2e **205 passed**. Test-only, production code byte-identical (no version bump).

## NEEDS DECISION — partial-workout sets never reach history (#4, product contract)

`bankLift` (`app.js:117`) bails unless `s.done >= effSets(e)`, so an in-progress lift's logged sets are never written to `liftHistory`. `finalizeSession` (`store.js:764-794`) snapshots live `lifts` into `sessionLog`, but that feeds only duration/coverage — **not** tonnage, CSV, or PRs (all read `liftHistory`). So a *partial* finish (e.g. 2 of 3 squat sets) reports true sets/tonnage in the finish summary yet permanently under-counts Progress tonnage + CSV. Current behavior may be intentional ("only complete lifts bank"), but it's unstated. **Khang decision:** should `finalizeSession` bank each lift's live sets on finish, or is "only complete lifts bank" the contract? Implementation would add a `bankAll`/per-lift bank in `finalizeSession` + unit/e2e. Not building while unflagged.

## Nov 16 — v149: topMovers and PRs exclude swapped and deload sessions at their boundaries

Survey findings #2 + #3 (per-lift progression-reader consistency). `topMovers` compared filterless `arr[0]` to `arr[arr.length-1]`, so a deload week (intentionally ~10% light) sitting last dragged the top-mover delta into a false decline, and a swapped-boundary session compared a different exercise's 1RM. Every other per-lift progression read (`progressionEntry` = `countsForProgression && !e.deload`) already excluded both; `topMovers` excluded neither and `personalRecords` excluded only swap.

BUILT: both now use the shared rule — `topMovers` builds `seq = arr[countsForProgression && !deload]`, requires `seq.length >= 2`, reads first/last from `seq`; `personalRecords` also skips `e.deload` so a deload week can never be a PR. **v148 reconciliation:** v148's `topMovers` swap-aware `optsFor` branch is now dead (swaps filtered before `optsFor` runs) and was removed; its unit test was replaced with a coherent boundary-exclusion test + a banked-swap `entryVolume` plain-load test. v148's persistence fix (stamping swapped entries `bw:false/assist:false`) is untouched and still e2e-covered. Gate: check/unit **244 pass**, typecheck clean, e2e **205 passed**. `GYM_VERSION` `gym-v149`, CACHE-HASH `566797d905ea4f27`. Critic **GO** (noted minor cosmetics, no action).

## Nov 16 — v148: a swapped-in machine on a bodyweight/assist lift is valued at its real weight

Survey finding #1 (real data-correctness bug on an existing feature). `bankLift` stamped a history entry with the ORIGINAL exercise's valuation flags (`bw`/`assist`/`bwKg`) even when the lift was swapped, so e.g. Friday's Assisted dip or Sunday's pull-ups swapped to a plain machine alternate had its external weight mis-valued as `max(0, bodyweight − load)` — 90 lb of real work counted as (165−90)=75 lb. That corrupted Progress volume + `volumeByDay` and the finish summary for swaps (CSV actually exports raw loads, so it was never wrong; the context was overstated on that point). Untested before.

BUILT: one shared rule `liftValuation(e,s)` — while `s.swapAlt`, value sets as **plain external load** (`bw:false, assist:false`, no `bwKg`), matching `workingLoad`'s documented "plain numbers" semantics; non-swap paths are byte-identical. Used by `bankLift` (persisted flags), `showSummary` (live tonnage), and `topMovers` `optsFor` (boundary entries). Regression: unit test (fri:7 assisted dip — swapped 90 lb now epley 108.0, not 90.0; asserts delta −36, pct −25) + e2e (seed dip swapped to Close-grip bench at 135 lb, finish → `#sumVol` "2.4k lb" not "540 lb"). Gate: check/unit clean, typecheck clean, e2e **205 passed**. `GYM_VERSION` `gym-v148`, CACHE-HASH `7a5c73a213e31a7c`. Critic **GO** (noted one open decision below).

**KNOWN / decision for Khang (from critic, not blocking v148):** a few alternates are genuinely *bodyweight* movements ("Band-assisted pull-up", "Bench dip"). Under the new plain rule, a logged 0 on such a swap now contributes 0 tonnage (start-light) instead of ~bodyweight — consistent with the documented "bodyweight semantics don't apply while swapped," and no test covers them. Flag for his call if he ever wants bodyweight alternates valued by bodyweight.

## Nov 16 — v147: the day overview shows a swapped lift's working load, not the original's

Critique-pending follow-up (display-consistency). The day-overview list rendered each row's load from `s.load` (the exercised lift's own load) even while the lift was swapped, so a swapped lift showed the original's load there while its lift view correctly showed the alternate's — a stale, contradictory display. Now the day row reads via `workingLoad(s)` (the `swapLoad` while swapped), matching the lift view and B6-07/N14 semantics; non-swapped rows are byte-identical (`workingLoad` = `s.load`).

BUILT: `app.js` day-overview `loadTxt` (now routed through `workingLoad`). Regression e2e (`e2e/alts.spec.js`): seed swapped `fri:0` (`load:60` → `swapLoad:10`), assert the day row reads `"Load 10 lb"` and not `"Load 60 lb"` — **fails on pre-fix**. Gate: check/typecheck clean, e2e **204 passed** (203 + 1). `GYM_VERSION` `gym-v147`, CACHE-HASH `462f518196648e65`. Remaining critique-pending: `applyLoad`-while-swapped (hide Apply while swapped) and `planBtn`-into-dormant-load (out of scope).

## Nov 16 — v146: finish-screen tonnage now reads the live set arrays, agreeing with history and CSV

`showSummary()` derived tonnage from `Stats.volumeByDay` (aggregate **history**), so a session just finished or still in progress — whose today's lifts weren't all banked yet — under-reported, and a lift not yet touched could inherit a stale prior week's tonnage. The fix values each lift's **live `s.sets`** in place with the same `bw`/`assist` flags and `entryVolume` rule `bankLift` uses for history: the finish screen and the banked CSV always agree, extra-set sessions count their true sets, and a dormant lift contributes 0. `sets` now sums actual `s.done` (was `Σ min(done, effSets)`).

BUILT: `app.js` `showSummary()` (per-lift `Stats.entryVolume` accumulation). Regression e2e seeds literal 100×6 sets and asserts `sumVol` **"13.8k lb"** / `sumSets` **"24"** (complete: 7 plain lifts ×1800 + assisted dip (165−100)×6×3=1170) and **"10.8k lb"** / **"18"** (partial) — the partial `sumVol` assertion is the pre/post discriminator (old code read empty history → "0 lb"). Gate: unit 241/241, typecheck clean, e2e **203 passed**. `GYM_VERSION` `gym-v146`, CACHE-HASH `338511e6488802ee`. Reviewed by the critic on the diff (GO; noted the comment wording, tightened). The `applyLoadBtn`-while-swapped and day-row-load display items remain under Critique pending below.

## Nov 16 — v145: swap-mode set-edit no longer corrupts the original lift's load

The survey flagged a real data-corruption bug in the swap path (B6-07/N14). When a swapped lift was mid-edit and the user navigated away (Back, ‹ › chevrons, day switch), `resetEdit()` restored `editBackup.load` — captured from `workingLoad(s)`, i.e. the alternate's `swapLoad` while swapped — into `s.load`, the **original lift's** dormant field. The original's working load (e.g. 60) was silently overwritten with the alternate's (10) and resurfaced later when the lift was reset/un-swapped.

BUILT: `app.js` `resetEdit()` restores through `setWorkingLoad(s, editBackup.load)`, the exact inverse of how the load was captured (correct field while swapped; byte-identical for non-swapped lifts). This is the last direct `s.load = editBackup.load` write in the codebase (the other two restore paths already used `setWorkingLoad`). E2E regression (`e2e/alts.spec.js`): seed a swapped lift, edit a done set, tap Back, assert the original load is untouched — **fails on pre-fix** (`Received: 10` vs 60), passes after. Gate: unit 241/241, typecheck clean, e2e **203 passed** (202 + 1). `GYM_VERSION` `gym-v145`, CACHE-HASH `36830218b5ccb2d2`. Reviewed by the critic pre- and post-build (GO both times). NOT taken in this slice: the `applyLoadBtn`/`planBtn` and day-row-load items → recorded under Critique pending below.

## Nov 15 — v138: Home-Screen (standalone PWA) tall-canvas redesign

Khang added the app to his iPhone Home Screen and reported extra empty space at the bottom; the standalone PWA viewport is taller than the 667/844 canvases the layout was tuned for. On investigation the app already filled edge-to-edge with no literal void — the "space" was flex regions stretching day rows (52→~70–81px) and set-log rows into sparse cards. Khang chose the direction: **compact cards + a calm designed bottom band** — stop cards stretching, fix a comfortable height, and spend the leftover as an intentional bottom zone (finisher + today summary + breathing room) instead of stretched empty cards.

BUILT: the redesign is gated at `@media (min-height:880px)` so the heavily e2e-tested 667/844 layouts are untouched; Pro/Pro-Max standalone phones (≥~880, e.g. 932) get the tall treatment. `style.css` gains a `.dayband` base style (`display:none` below the tall tier) and the tall block — compact day rows (`min-height:58px`, no flex-grow), compact set rows (`min-height:54px`), roomier finisher/progress/lift/progress-view spacing, and the bottom band shown (`display:flex`). `app.js` `renderDay()` populates `#bandInfo` with the today tally ("N/… sets · done" or "· ~N min left") above the existing Zone 2 finisher row in the pinned `#dayBand`. A print override hides the band.

Gates: `npm run check` 236/236 unit (check-assets/ids/sw-cache OK), `npm run typecheck` clean, `npm run e2e` **193 passed** (192 base + the new `e2e/tall.spec.js` 3 tests at 430×932: day compact rows + visible band/tally + no overflow; lift compact set rows + Set Done on-screen + no overflow; progress no overflow). `GYM_VERSION` `gym-v138`, CACHE-HASH `aefeae3f8cea3d38`. Manual: 667/844 → band hidden, rows unchanged (53/70px); 932 → band flex, rows compact 58px, finisher bottom 920/932, lift Set Done on-screen (854–920), progress no overflow. Uncommitted — not yet pushed.

### Nov 15 — v139: the real cause of the "empty space" (Home-Screen viewport under-report)

Khang re-reported the gap on his iPhone 15 Pro (393×852) with a screenshot: 8 near-minimum rows, progress, finisher, then a strip of empty body at the bottom — and no band. Two findings:

- **He had no spare height to spend.** 852px minus the 59px status-bar and 34px home-indicator insets (the shell pads for both) leaves ~735px of content — *less* than the 390×844 e2e canvas. The ≥880 tall tier was therefore never reached; compact cards + band cannot fit a standard Pro without scrolling 8 rows.
- **The strip was a shell bug, not spare room.** In installed Home-Screen mode the dynamic viewport height under-reports, so `.app` (`height:100dvh`) ended above the real screen bottom and the body showed through. Rows looked short because the app box, not the screen, set the budget.

FIX (v139): `.app` now sizes from `--app-h` (`height:100dvh;height:var(--app-h,100dvh)`) and `syncViewportHeight()` in `app.js` pins it to `window.innerHeight` at boot, on `resize`, `orientationchange`, and `visualViewport` resize; in standalone it lifts to `window.screen.height` when the engine under-reports (guarded to ≤200px, covers the observed 128px gap). `@media (display-mode: standalone){.app{height:100vh;height:var(--app-h,100vh)}}` is the no-JS fallback, and both modal max-heights now use `var(--app-h,100dvh)`. Simulated 393×852 with iOS insets: rows settle at 59.8px, the day list does not scroll, finisher bottom 806/852 (exactly the bottom pad), document height = viewport. `e2e/viewportpin.spec.js` (3 tests: 390×667, 390×844, 430×932 — `--app-h` present and equal to `innerHeight`, shell top 0, bottom within 1px of the viewport, no page scroll). Gates: unit 236/236, typecheck clean, e2e **196 passed**. `GYM_VERSION` `gym-v139`, CACHE-HASH `d0dc54765e013c93`. Noted for Khang: the ≥880 tall tier (compact rows + Today band) still only covers Pro-Max-class phones; if he wants the band on his 15 Pro, merging the tally into the finisher card buys the ~80px it needs at the cost of ~5px per row.

### Nov 15 — v140: the day ends on a dock, not on a strip of background

v139 removed the 128px gap, but a screenshot of his 15 Pro still showed the finisher card floating ~46px above the screen edge: the home-indicator safe area was bare background, and the "Today" tally was gated away at 852px.

BUILT: the day view's tail is now one **bottom dock** (`#dayDock` wrapping `#dayBand` + `#dayFinisher`). `.dock` bleeds past the app's 14px side padding and cancels the bottom padding with a negative margin (`margin:10px -14px calc(-1*(12px+env(safe-area-inset-bottom)))`), then re-adds the inset as its own bottom padding — so the surface runs to the screen edge with the home indicator sitting on it, and its content stays above the indicator. The finisher is now a plain centered line inside the dock (no dashed card), and the tally row shows from `min-height:720px` (667 keeps the room for its 8 rows; measured: 667 dock 38.5px net, rows 53.7, no scroll). Verified at 393×852 with simulated 71/46px insets: dock bottom = 852 (flush with the screen), band visible, rows 57.6, no list scroll; 844 dock flush + rows 68.2; 932 flush + compact 58. `e2e/viewportpin.spec.js` grew the guard that matters: the dock's bottom edge must equal `innerHeight` (±1px) at 667/844/932, alongside the shell checks. Print neutralises the dock's bleed. Gates: unit 236/236, typecheck clean, e2e **196 passed**. `GYM_VERSION` `gym-v140`, CACHE-HASH `561e55feccf1e9ca`.

### Nov 15 — v141: the menu now reports the layout numbers (and a trimming of the dock)

Khang reported the bottom still being cut off after v140, so the shell numbers used to size the app are now visible on the device instead of inferred: the backup menu gains a second footer line (`#screenFoot`) — `Screen 393×852 · app 852 · vp 852/852 · safe 59/34 · standalone` — the reported screen, the app box height, `innerHeight`/`visualViewport.height`, the resolved safe-area insets (read back from `.app`'s computed padding minus the 12px constant) and the display mode. It is a permanent support line, tiny and read-only. The dock also lost 8px of chrome (`margin-top` 8, padding 8/8, gap 7) so the day list keeps slack if a device's insets run slightly larger than simulated. `e2e/version.spec.js` pins the line's shape and that the app box equals the live viewport. NOTE: this commit was made while a parallel session had uncommitted work in `program.js`/`app.js`/tests; only this session's hunks were staged (`git apply --cached` of the `screenFoot` hunk), the working tree was left untouched, and CACHE-HASH was computed from the index so the pushed tree is self-consistent — the parallel session must re-bump it when it commits. `GYM_VERSION` `gym-v141`, CACHE-HASH `5aa27c31beb49e11`.

Follow-up in the same push (v142): the dock's bottom padding is now `max(14px, calc(8px + env(safe-area-inset-bottom)))`, because if a Home-Screen webview reports a zero bottom inset, the old `calc(8px + env(...))` would put the Zone 2 line 8px from the edge — inside the home-indicator zone, which reads as the bottom being cut off. The floor guarantees the text clears the indicator even when `env()` gives nothing. CACHE-HASH `14b1c1e05b20ac74`.

### Nov 15 — v144: the dock paints to the edge, but content stops at the usable bottom

The menu's screen line settled it: on Khang's iPhone 15 Pro standalone, `Screen 393×852 · app 852 · vp 793/793 · safe 59/34 · standalone`. The engine reports a **793px** usable viewport inside an 852px screen — the bottom 59px is system chrome, and `env(safe-area-inset-bottom)` (34) under-reports it. v140/v141 painted the dock to 852 with only 42px of bottom padding, so the Zone 2 line sat at ~810 — 17px *below* the usable 793 — which is exactly the "bottom cut off" he saw.

FIX: `syncViewportHeight()` now also writes `--app-b` = `screen.height − innerHeight` (standalone only, guarded ≤200px). `.app`'s bottom padding and the dock's bleed/inset both use `max(env(safe-area-inset-bottom), var(--app-b, 0px))`, so the shell still paints to the physical edge while **all content stays above the usable line**: verified against his exact numbers (app 852, usable 793, insets 59/34) — dock bottom 852 (flush), Zone 2 text bottom 783 (10px above the usable edge), tally 741–759, last row 710, rows 55.2px, no list scroll. The same rule is inert in a browser (`--app-b` 0, `env` governs). NOTE: the parallel session released v143 (Sunday corrections) and tracked `icon.svg` while this was in flight; this commit stages only its own hunks of `app.js` and tags `gym-v144` so the two releases don't collide. `GYM_VERSION` `gym-v144`, CACHE-HASH `17cfbba9483312b8`.

### Nov 15 — v143: Sunday corrections (Khang's three comments)

Khang's comments on the Sunday session, and what changed for each:

- **Leg press ≠ hack squat.** The row read "Leg press / Hack squat" with one load of 180, as if the two machines were interchangeable — and his hack squat runs at **0 load**. The row is now **"Leg press"** (180, same `exId`, so history and progression carry) and **"Hack squat"** is its first alternate: a fresh swap seeds 0 and N14's per-alternate memory keeps the two numbers apart. He ruled out splitting them into two Sunday lifts ("that would be a re-evaluation of the program") — logged below as a T2.
- **Pull-ups are assisted.** `sun-pullups` is now "Assisted pull-up" with `assist: true` (and `bw: true` kept). The logged number is machine **help**, so 0 = bodyweight and it can never go below 0. Every surface now shows that help as a **negative load** — `-45` in the lift readout and set rows, `Help 45 lb` in the day row, `help 45 lb` in the prescription/up-next/PR lines, `-45` (or `BW`) in the suggestion history — and the load stepper is inverted for assisted lifts (▲ = less help = harder, ▼ = more help), so the visible number always grows toward harder. Typed input takes `-45` or `45` and stores 45 lb of help (the stored value stays positive, which is what `progressMetric`, `suggestLoad`, `stallLoad`, `deloadLoad` and `rampFor` already expect). Bodyweight lifts earn no ramp-up, so **day totals do not move** (Fri 105 / Sat 98 / Sun 100).
- **No cable flys on Sunday.** `sun-cable-fly` retires; its history re-homes to `old:sun-cable-fly` (volume/CSV only, no ghost PR, per N20) and the slot is **"Incline DB fly"** with a new id `sun-incline-db-fly` (alts: Flat DB fly, Pec deck fly, Machine chest fly). Cable and dumbbell loads don't transfer, so the N8 starting guess is re-anchored to Friday's incline DB press at **×0.5 per hand** (52.5 → 27.5, still the plan's lowest-confidence anchor).

Tests: unit **241/241** (+5: three `program.test.js` pins — the leg-press/hack-squat split, the assisted pull-up's downhill progression, zero-help floor and no-ramp behaviour, the fly's retirement — plus two `stats.test.js` cases: an assisted lift with help set values as `bodyweight − help` for volume/PR/top-movers, and the CSV keeps the stored positive help instead of the display negation; `stats.test.js`'s topMovers case now uses a synthetic bodyweight lift because both real bodyweight lifts are assisted), typecheck clean, e2e **202 passed** (+5 `e2e/sunday.spec.js`: hack squat swaps in at `light` while the leg press keeps 180, the assisted pull-up shows `-45` and ▲ walks it to `-42.5`, the fly row is the incline dumbbell one, the next-lift preview reports `help 45` instead of `bodyweight`, and a 2-for-2 suggestion applies as `-42.5`). `GYM_VERSION` `gym-v143`, CACHE-HASH `74f594a967501197`. Note for his first session: his saved Sunday pull-up record still holds the bodyweight-era `0` — set his assistance once and it sticks.

Critic review (run on the diff before committing): one defect found — the lift view's "next lift" preview read `bodyweight` for an assisted lift whose programme load is 0 even when 45 lb of help was stored, contradicting the rest-prep card and the Set Done line; fixed with a dedicated assisted branch and pinned by the new e2e test. Also added the ramp/no-ramp pin (`rampFor(pull, 45) === null`), the assisted volume/PR and CSV tests above, and a doc fix on `rampFor`'s comment. Declined: adding an assist column to the CSV (pre-existing gap since the dip, not a regression) and the `icon.svg` in `git status` (untracked, unrelated to this batch — left alone).

| Item | Triage |
|---|---|
| Programme re-evaluation (exercises, sequence, workout split) | **T2 — NEEDS_DESIGN.** Khang flagged that splitting Sunday's leg press and hack squat into separate lifts is really this, not a data edit. Needs a design session with him; nothing started. |

## Batch 6 — ACTIVE Nov 10, approved by Khang (one-tap); DECISIONS LANDED Nov 10
B6-01 (`Stats.parseKey` round-trip) is BUILT + VERIFIED. The decision-gated items are decided: on Nov 10 Khang delegated them ("Do the gym improvement list, do whatever you think is best") and the Planner/Reviewer decided all of them — P9 ATTRIBUTE (fix week-strip/heatmap visibility), `bodyweightSet` flag ADOPTED (schema v5), P6 2-for-2 ADOPTED, P8 APPROVED, P11 alternate list APPROVED for all 24 lifts (log under the original id with a swap marker, progression-exempt), P5 Bulgarian rest 120 → 150 APPROVED, P7 deload week APPROVED as a manual mode. Full rationale in `DECISIONS.md`; buildable specs in `QUEUE.md` as B6-02…B6-10 in dependency order. Nothing from this batch remains in the backlog sections below — the P5–P9 / P11 texts there are replaced with pointers.


This file is the live backlog. An item becomes work only when Khang names it (or
it is the top `[T1]` here). Order is value ÷ risk, highest first.
`[T1]` buildable now · `[T2]` needs a design first ·
`[T3]` Khang-only proposal — the loop never builds it.

The Muse-era queue machinery (`QUEUE.md`, `TASK.md`, `LOOP_STATE.md`, `LOOP.md`,
`BUILD_LOG.md`, `PLAN.md`, the supervisor) is archived under `archive/muse-era/`;
its historical mentions below are records of finished batches, not protocol.

## Critique pending

- **Swap + suggestion load (low, display-consistency):** `applyLoadBtn.onclick` (`app.js:1502`) writes the suggested load into `curSt().load` directly. The suggestion is always the ORIGINAL lift's next load (swapped entries are excluded from suggestions per P11), so while a lift is swapped the button applies the original's progression to the original's dormant `load` — invisible-but-coherent, not corruption. NOT fixed in v145: rewriting it into `swapLoad` (as first proposed) was rejected as wrong-value-into-wrong-field; the correct fix, if wanted, is to hide `applyLoad`/`suggestLine` while swapped. No test clicks Apply on a swapped lift today.
- **Swap + Plan day (low):** `planBtn` (`app.js:1578`) writes the planned load into `s.load`, so a swapped, not-yet-started lift is planned on the original lift's dormant field rather than the alternate's working load — an incompleteness, not corruption. Leave out of scope unless Khang wants planning to target swapped lifts.
- **Swap + day-row load (low, display):** ~~the day overview row (`app.js:419-421`) reports `s.load` (the programmed lift's load) rather than `workingLoad(s)`, so a swapped lift's day row shows the original's load while the lift view correctly shows the alternate's. Stale in the day view only.~~ **FIXED v147** (commit `2796535`): the day row now renders via `workingLoad(s)`, matching the lift view's B6-07/N14 semantics; regression e2e added. Still open: `applyLoad`-while-swapped (hide Apply while swapped) and `planBtn`-into-dormant-load (out of scope).

## Nov 13 — v131 release gate: intermittent e2e flake (PRE-EXISTING on main, publish paused)

`npm run e2e` on `v131-candidate` + the v131 version bump: 4 full-suite runs, **3 green
(172 passed, exit 0), 1 red** — `e2e/pass4.spec.js:246` "finishing from the rest screen…"
asserted `#sumDuration` `"30:00"`, got `"30:02"`.

- **Cause (test brittleness, not app logic):** the test seeds `accSec: 1800` with
  `runningSince: null`, then the app starts a live clock on the first set; the summary
  reads `accSec + (now - runningSince)` (`store.js:759-760`), so the assertion races the
  seconds spent clicking through. Under `fullyParallel` load that is ±2s.
- **Not from this candidate, not from the release diff:** the test line is `9d65a63`
  (2026-11-09), an ancestor of `c9453e7` on `main`. The v131 release diff touches only
  `version.js` (`GYM_VERSION`) and the `CACHE-HASH` comment in `sw.js`.
- **Options for Khang:** publish v131 now (gate green on the last 3 runs; flake is
  pre-existing) — or harden the assertion first (tolerate ±5s / freeze the clock), which
  is a separate item. Publishing is paused pending his call.

**Resolved Nov 13 — Khang chose "harden the test first".** `e2e/pass4.spec.js:246` now
installs a frozen clock (`page.clock.install`, the same house pattern as `e2e/rest.spec.js`)
before `goto`, so the seeded `accSec: 1800` is arithmetic rather than a race and the exact
`"30:00"` assertion stays. Validation: spec 11/11, then full `npm run e2e` × 3 = 172 passed
each, exit 0; `check` 228/228, typecheck clean. Release shipped in the v131 commit.

## Nov 13 — v132 batch (Khang's four items: N16, N17, N18, D1)

Khang named these four and specified them in chat; `program.js` untouched.

| # | Item | Triage |
|---|---|---|
| N16 | Day-header read-only week line: Fri/Sat/Sun + a status dot each (`Stats.weekStatus`), the viewed day marked, the day's time beside it. No buttons — the chevrons still switch days | T1 (specified) |
| N17 | Bodyweight edit does not stick (set 150, later reads 165) | T1 |
| N18 | "Clock learning" note clipped behind the next menu button | T1 |
| D1 | macOS desktop app: 400 px phone window on the live site, no fork, no sync | T1 (specified) |

Status lines (one per item, per house rules):

- N16 BUILT (v132 release commit): `.dayweek` slim line in `.dayhead` — `renderDayWeek()` reads `Stats.weekStatus`/`dayMins`; each day is name + dot (done filled / partial half / today ring / missed / upcoming), the viewed day is accent + underlined, the viewed day's `~N min` sits right-aligned (the cluster stays beside the `#daySummary` progress readout). Visual row is `aria-hidden`; `#dayWeekSummary` carries the sentence ("This week: Fri done, Sat today, Sun upcoming. Viewing Fri — about 92 minutes."). No new ids beyond those two; nothing tappable. Existing day fit holds: 390×667 rows 56.1 px min, no scroll. `e2e/dayweek.spec.js` (6 tests: states-match-`weekStatus`, chevron/viewed marker/time, fit at both sizes).
- N17 BUILT (v132): root cause was the `change`-only listener plus `renderBw()` refilling the input from the saved payload on every menu open — a typed value that had not produced a `change` yet (iOS can dismiss the numeric keypad, or a render/reload can land first) was replaced by the saved 165. Fix: `saveBw()` persists every legal value on `input` as well, `renderBw()` leaves a focused field alone, and the invalid path restores in place. `e2e/bodyweight.spec.js` (2 tests; the persistence test fails on the pre-fix code).
- N18 BUILT (v132): `.modalmsg` was a shrinkable flex item (`flex: 0 1 auto`, `min-height:1.1em`), so a two-line note was compressed to one line's height and painted under the following button. `.modalmsg` is now `flex:none` with a 1.35 line-height, and the starter copy is the shorter "Clock learning: starter values until 3 timed sessions." `e2e/menunote.spec.js` (4 tests: starter + learned two-line case at both sizes; both fail on the pre-fix CSS).
- D1 BUILT (v132): `desktop/` — Electron main process (`desktop/main.js`, 400 px content width, `min 340`, 820 tall) loads the live site (`https://kmnace00.github.io/gym/`, override with `GYM_DESKTOP_URL`), so there is one codebase and no sync. Opens with `desktop/Start Gym.command` (double-click; installs Electron once), `npm run desktop` from the root, or `cd desktop && npm install && npm start`. Launch check on the Mac: `GYM_DESKTOP_SMOKE` reported `width 400`, 8 lift rows, day title on screen, screenshot at the phone layout. Root gates do not cover `desktop/` (thin shell, no app logic).
- Gates for the web batch: `npm run check` 228/228 unit, check-assets/ids/sw-cache OK; `npm run typecheck` clean; `npm run e2e` 182 passed (390×667 + 390×844, up from 172 — 10 new tests). CACHE-HASH `21ab4d6cbe2ca860`, `GYM_VERSION` `gym-v132`.
- Critic follow-ups (v132, commit noted in git log): `npm run desktop` now installs `desktop/` deps first (fresh-clone path works); `desktop/main.js` gained a `will-navigate` guard (same deny→external-browser rule as the window-open handler); `test/desktop.test.js` pins the Electron posture (contextIsolation, sandbox, no Node, deny handlers, loads the live app); `e2e/dayweek.spec.js` gained the aria contract (visual row `aria-hidden`, sr-only sentence is the only copy) and the taller in-progress header fit at 390×667. Re-gated: unit 229/229, typecheck clean, e2e 184 passed; CACHE-HASH unchanged (no web asset changed).

## Nov 14 — v133 batch (Khang's named items: N19, N20, N21, N22, N23)

Khang named these five and shipped a `program.js` diff (approved numbers). SHIPPED as `gym-v133`.

Status lines (one per item, per house rules):

- N19 BUILT (v133): Saturday rename-in-place (same `exId`, history carries): `sat-cable-rdl` → "Smith machine RDL" (hinge cue kept; "Cable RDL" stays as an alternate), `sat-tbar-row` → "MTS row" (cue now "Chest tall, pull to ribs."), and both `sat-calf-raise`/`sun-calf-raise` → "Calf press" (Standing calf raise first in alts, pause cue kept). History/progression untouched because ids are unchanged.
- N20 BUILT (v133): the Bayesian curl retires — `sat-bayesian-curl` is replaced by `sat-rope-hammer-curl` ("Rope hammer curl", cable rope, neutral grip, 3×10–12, rest 90s, 1 RIR, partial, load null) in the same slot before preacher. `store.reconcile` now re-homes any state/history entry whose stamped `exId` is no longer a programme lift to a retired `"old:" + exId` key, so the Bayesian's banked history survives under its old id (still counts toward volume/CSV) while the new curl starts clean. `stats.personalRecords` skips non-program (`old:`) keys so there is no ghost Bayesian PR.
- N21 BUILT (v133): every loaded, non-first/non-feeler lift now shows a display-only "Warm-up:" line (50% load × half reps, snapped to step) before its first set — never logged. Full ramps and feelers (rest ≥ 150s) still apply where they already did. Skipped for bodyweight / unloaded (load null) / zero load / **assisted** lifts (e.g. the assisted dip: its logged number is help, so 50% would be *heavier* than the working set — flagged to Khang). `RAMP_WARM_SECS = 40s` per warm-up in the `dayMins` estimate.
- N22 BUILT (v133): each day closes with a display-only Zone 2 finisher card ("Zone 2 — 10 min (incline walk or bike)"), not a lift. `FINISHER_SECS = 600s` counted in `dayMins`/`dayMinsLeft` totals.
- N23 BUILT (v133): all three gates green — `check` OK (235 unit / check-assets / check-ids / check-sw-cache), `typecheck` clean, `e2e` 187 passed (exit 0).

New estimated day totals (was 92 / 86 / 88): **Fri 104 min · Sat 98 min · Sun 100 min**, via `dayMins`.

Test counts: unit 235/235, e2e 187/187. CLOCK DETERMINISM: the suite is Friday-anchored, so `phase1/phase2/alts/enhancements/features` specs now pin a Friday clock (`page.clock.install`, same house pattern) — the pre-existing Saturday failures (proven at baseline via `git stash`) are gone on any run day. `GYM_VERSION` `gym-v133`, CACHE-HASH `eccfc82e61ebd539`.

## Nov 14 — v134 batch (Khang's named items: N21-follow-up, N24; N25 + P2 QUEUED)

Khang named the N21 follow-up and N24, and specified N25 + P2 for queueing (not built here). SHIPPED as `gym-v134`.

| # | Item | Triage |
|---|---|---|
| N21-fu | Assisted-lift warm-up: a heavier help (more assistance) at lower reps — `snapStep(load×1.5)` at `max(3, round(r/2))` reps (the N-v133 "skip assisted" note was flagged to Khang, who wants them warmed up) | T1 (specified) |
| N24 | Move Fri/Sat/Sun control into the top header (left where the brand would sit), real ≥44px buttons wired through `switchDay` (same mid-edit-reset semantics), keep status dots, remove the N16 `.dayweek` under-title row, exactly one `~N min` readout (`#daySummary`) | T1 (specified) |
| N25 | Month calendar in Progress beside the heat card (`‹ ›` stepping; FINISHED if a sessionLog entry, PARTIAL if `t` set-timestamps but no session entry, else blank; tap → read-only summary; phone-only, Bear style, 44px, internal scroll acceptable) | **QUEUED** — build next web release |
| P2 | Web Push rest notifications + automatic data safety: Cloudflare Worker + ONE Durable Object, `setAlarm` (not cron), Declarative Web Push JSON (web-push library, RFC 8291 + VAPID RFC 8292), classic push fallback for iOS, `navigator.storage.persist()` + rotating snapshots, Export/Import demoted to advanced | **QUEUED** — build after N25; deploys independently |

Status lines (one per item, per house rules):

- N21-fu BUILT (v134): `rampFor` gained a dedicated `e.assist` branch before the isFirst/feeler logic — assisted lifts now warm up with `kind:"warm", secs:RAMP_WARM_SECS(40)`, one step `{load: snapStep(load*1.5, e.step), reps: Math.max(3, Math.round(e.r/2))}` (heavier help = more assistance = easier). The assisted dip (load 45, r 6, step 2.5) warms at 67.5×3. `e.assist` removed from the null-guard. Friday's total rose 104→105 min and the calibration 93→94 (`program.test.js`); `stats.test.js` `estimateMin` 105, `driftPct` −30.2.
- N24 BUILT (v134): `.daycluster` (`#dayCluster`) is a left-anchored `<nav>` in the header; `renderDayWeek()` renders three real `.daytab` buttons (data-day, aria-pressed, accessible name with the state word, a `.dwdot` status dot) wired to `switchDay(w.day)` — same path as the chevrons, so the B5-05 mid-edit reset is preserved. The `.dayweek` under-title row is gone; exactly ONE `~N min` readout remains (`#daySummary`); `#dayWeekSummary` sr-only sentence kept. Cluster hides in lift-mode (`.app.lift-mode .daycluster{display:none}`) where `.backbtn` owns the left edge. Header fit contract (gap 6px, pill padding 11px, daytab padding 7px/font 12px, cluster gap 3px): 360×800 + 390×844 measured, cluster x=14 w=147.2, pill ends 78.5, all inside 332px content width. `e2e/dayweek.spec.js` rewritten (7 tests: states/≥44px/aria-pressed, chevron+header switch parity, B5-05 via a real set edit + Fri clock pin, SR labels, fit at both sizes, in-progress fit); `layoutguards.spec.js` gained a header guard (containment, ≥44px, no cluster/progress/menu/pill overlap, header ≤56px, one-screen fit) at 360×800 + 390×844; `phase2.spec.js` day-summary 104→105.
- Desktop sync (v134): the uncommitted `desktop/main.js` icon change (APP_ICON `icon-512.png` + `app.dock.setIcon` on macOS) is sound and ships in this release so the desktop window/Dock keep the app identity instead of the Electron atom.
- Gates for the web batch: `npm run check` OK (236 unit, `program.js`/`program.test.js`/`stats.test.js` indicate 236/236; check-assets/check-ids OK — CACHE-HASH stale until ship), `npm run typecheck` clean, `npm run e2e` 190 passed.
- D1 REMOVED (Nov 14, Khang's order): the desktop app is retired and all testing is phone-only. Deleted: `desktop/` (Electron shell, `Start Gym.command`, its `package.json`/lock), `test/desktop.test.js`, the root `npm run desktop` script, plus the local-only launcher `~/Applications/Gym.app` and the desktop's Electron profile (`~/Library/Application Support/Gym`). No desktop target, script, or test remains; the web app is unaffected.

New estimated day totals: **Fri 105 min · Sat 98 min · Sun 100 min** (was 104/98/100 — the assisted dip now earns a warm-up).

## Nov 14 — v135 batch (two new backlog items: curl-slot change + Apple Health/Watch)

Two items added to the backlog and built through to a green, deployed release. Khang named them and delegated the evidence decisions ("best for hypertrophy" for the curl; "easiest method, less work" for Apple Health).

| # | Item | Triage |
|---|---|---|
| v135-A | Saturday curl-slot change: swap the neutral rope hammer curl for a **supinated cable curl** (best grip for biceps hypertrophy); keep 6 direct biceps sets, don't reorder/trim | T1 (decided) |
| v135-B | $0 Apple Health / Watch integration via a one-time **iOS Shortcut gateway** (no Apple Developer account, no native packaging) | T1 (decided) |

Status lines (one per item, per house rules):

- v135-A BUILT: `program.js` replaces `sat-rope-hammer-curl` (neutral "Rope hammer curl", v133 novelty) in the slot before preacher with `sat-supinated-curl` ("Cable curl (supinated)", underhand grip, 3×10–12, top 12, rest 90s, 1 RIR, partial, load null). Total direct biceps stays 6 sets (3 supinated curl + 3 preacher, which research shows is ≈ Bayesian for growth and stays untouched). Load is still `null`, so Saturday's estimate is unchanged at 98 min and `stats.test.js` `estimateMin`/`driftPct` are untouched. The old id retires via `store.reconcile` → `old:sat-rope-hammer-curl`; no real banked hammer history to preserve. Unit tests: the N20 test narrows to "Bayesian id no longer schedules" + a new v135 test pins the supinated curl (slot 4, name, alts, gauge, null load). Science recorded in `RESEARCH.md` (Coratella 2023 supinated>neutral; Bagchi & Raizada 2019 hammer carve-out unsupported; preacher≈Bayesian PMC11906226; Nunes 2021 order negligible).
- v135-B BUILT: Finish summary gains **"Send workout to Apple Health"** (`#sumHealth`), which hands a structured `GYMWORKOUT|strength|<mins>|<date>` line to `navigator.share` (iOS Web Share) so a user-built one-time Shortcut ("Log Gym Workout", receives Text → Health's "Log Workout" Strength Training) appears in the share sheet; clipboard + `shortcuts://` fallback; the menu gains "Apple Health / Watch" (`#healthBtn`) toggling the one-time build note (`#healthInfo`). Duration is the real banked session (`durationSec`). Pure helper `Stats.appleHealthText` is unit-tested (machine line + human line, tolerant of zero sets/volume, rejects empty mins); `e2e/health.spec.js` (2 tests: summary shares the exact `GYMWORKOUT|strength|30|<date>` record via a stubbed `navigator.share`; menu note toggles + aria-expanded). Reverses `DESIGN.md`'s "Apple Health needs native packaging" non-goal with a $0 static-safe path. Design mirrors the "Mac session sync" approach (one-shot script/shortcut, plain transport, no cloud/no shared live data).
- Gates for the batch: `npm run check` (unit **238/238** — was 236; check-assets/check-ids OK), `npm run typecheck` clean, `npm run e2e` green (new `health.spec.js` 2 tests; `v133.spec.js` curl name updated to the supinated curl). CACHE-HASH + `GYM_VERSION` bumped at the release commit.

New estimated day totals unchanged: **Fri 105 min · Sat 98 min · Sun 100 min**.

### Nov 14 — v136 (follow-up): in-app "Send workout to Apple Health" was silent on iPhone
`navigator.share(...)` was invoked with no `try/catch`, so when iOS throws synchronously (e.g. `NotAllowedError` from a lost transient activation, or a non-secure-context guard) the share sheet never opened **and** no on-screen message appeared. `app.js` `sendAppleHealthText` now wraps the call, surfaces the failure, and falls back to the clipboard with a "run the Log Gym Workout Shortcut" prompt. Shipped as `gym-v136` (gates green: 238 unit, 192 e2e, typecheck clean). The parallel shortcut error ("does not have access to your workouts / walking + running distance / active energy") is the iOS Health **write** permission not yet granted to Shortcuts — a Settings fix on the phone, not a code issue.

### Nov 14 — v135-B REVERSED (v137): Apple Health / Watch path deleted as not worth keeping
On Khang's decision after research (see `RESEARCH.md`), the whole Apple Health / Watch gateway is **removed in v137**: the Finish summary's "Send workout to Apple Health" button, the menu's "Apple Health / Watch" note, the `Stats.appleHealthText` helper, and `e2e/health.spec.js` (+ its 2 e2e tests and 2 unit tests and the a11y tab-order expectations). Rationale: HealthKit stores a workout *envelope* (duration/calories/HR/distance) with no fields for sets, reps, or weight, so it can't hold lifting volume anyway; Khang starts a Workout on his Watch every session, so the Watch already writes the strength-training entry with richer data; the app's only addition was a label+duration backfill — pure duplication for zero value, and dead UI made the program less clean. Recoverable in git history if ever wanted. Gates re-checked green for v137.

## Nov 13 — Khang's in-session requests + Phase 1 plan (approved by Khang in chat; full plan in his workspace PLAN-2026-11-13.md)

Khang authorized Muse to build these directly and push; he syncs on the MacBook after. All ship as one release, SW `gym-v131`.

| # | Item | Triage |
|---|---|---|
| N1 | Layout invariants: nothing shrinks below its content (lift rows, day header, sethead pills) + geometry guard e2e — Khang's recurring spacing bugs | T1 |
| N2 | Per-side clarity: "Both sides = 1 set · then rest" line on Bulgarian / cable lateral / preacher | T1 |
| N3 | Week strip removed; day tabs gain ✓ / · / — week marks from `Stats.weekStatus` | T1 |
| N4 | Next-exercise line in the lift view during the last set (name + load, name-only if unknown) | T1 |
| N5 | Completed lift: primary "Next: <lift> →" button (earliest open lift); "Add extra set" stays secondary — extra-set flow itself already built (app.js doneBtn), verify edge cases only | T1 |
| N6 | Honest clock: stretch block + per-set setup + ramp time in `dayMins`/`dayMinsLeft` | T1 |
| N7 | Ramp guide (display only, never logged): full ramp first lift, one feeler for later heavy lifts | T1 |
| N8 | Starting guess for Sunday cable fly only (← Friday pec deck × 0.7, marked, lowest confidence) | T1 |
| N9 | Rest alerts Tier A: `registration.showNotification()`, stale-fire suppression, wake-lock re-acquire | T1 |
| N10 | Set timestamps + self-calibrating clock (learned stretch / per-set overhead, menu display + reset, summary estimated-vs-actual) | T1 |

Status lines (one per finished item, per house rules):

- N1 BUILT (pending v131 push): `.liftrow` flex `1 0 auto` + min-height 52px, `.liftlist` scrolls in every tier, `.daytop` flex-none, negative margins removed from `.resetlift`/`.planbtn`, `.sethead`/`.setacts` wrap. Guards in `e2e/layoutguards.spec.js` (3 tests) fail on the pre-fix CSS and pass after — verified both ways.
- N2 BUILT: `per: "side"` on the three lifts + `.perline` in the lift view ("Both sides = 1 set · then rest 2:30"). Covered in `e2e/phase1.spec.js`.
- N3 BUILT: strip element/CSS/`renderWeekStrip` deleted; `renderDayMarks()` puts ✓/·/— on the day tabs from `Stats.weekStatus`, spoken state on the tab's aria-label. `journeys`/`pass4` specs updated to the marks.
- N4 BUILT: `.nextline` in the lift view from the last prescribed set onward (name + load, name-only when unknown, "Last lift of the day" on the final lift). Covered in `e2e/phase1.spec.js`.
- N5 BUILT: `#goNextBtn` on a completed lift routes to `firstOpen(0)` (B3-34's target) or, with the day complete, to the day view for Finish. The pre-existing extra-set flow was verified end to end (quick-adjust via steppers, logs like a normal set, lift stays complete) in `e2e/phase1.spec.js` — no rebuild needed.
- N6 BUILT: `STRETCH_SECS`/`SETUP_SECS` seeds + ramp time in `dayMins`/`dayMinsLeft` (stretch until the first set, ramp until each lift's first set, setup per remaining set; optional `{stretch, setup}` calibration override). Honest totals: Fri 92, Sat 86, Sun 88 (were 75/69/72). Unit-tested in `test/program.test.js`; `sessionDrift` expectation updated.
- N7 BUILT: `Gym.rampFor` (full ramp first lift, feeler for later `rest >= 150` lifts, never for bw/unloaded/guessed) shown in the lift view before set 1 and in the rest screen's up-next block before a lift's first set. Unit + `e2e/phase2.spec.js`.
- N8 BUILT: cable-fly guess (pec deck × 0.7, snapped to step) seeded once into a fresh record with `s.guess`; marked in the prescription line ("· starting guess") and the day row ("(guess)"); the mark clears on the first logged set; guesses never qualify a lift for a ramp. `e2e/phase2.spec.js`.
- N9 BUILT: `notifyRestDone()` routes through `navigator.serviceWorker.ready` → `registration.showNotification()` (constructor kept as fallback), stale fires (>20s past the scheduled end, tracked in `renderRestView`) suppressed, wake lock re-acquired on `visibilitychange` while resting. `e2e/notify.spec.js` (HTTP harness, stubbed registration). Tier B (Web Push) remains gated on real-world misses, per the plan.
- N10 BUILT: sets logged with `t` (edits keep `t`, gain `edited: true`); timestamps survive `bankLift`, `finalizeSession`, and the import sanitizer (normalized). `Stats.calibration` learns warm-up + per-set overhead (medians, last 6 timed sessions, >= 3 to engage, clamps 0–1200s / 5–40s) into `localStorage["gym-calibration"]` at Finish; `calOpts()` feeds the learned values to the clock; menu shows them with a reset; the finish summary gains "Estimated N min · Actual M min" on full days once engaged. Unit (`test/stats.test.js`) + `e2e/phase3.spec.js`.
- Precache ceiling raised 250 → 300 KB for this release (272 KB actual) — see DECISIONS.md.
- N11 BUILT (pending e2e run + batch publish): the resting lift view goes quiet. While a rest is active/paused and the workout is peeked open, a `.rest-quiet` class on the app hides the editor (lift name, prescription, cue/tempo, per/next/ramp lines, sethead actions, suggest/prev/spark, steppers + RIR, hint, Set Done / Next buttons) — the crumb nav and the set log stay as the reference, and the rest card (countdown, prep steppers, Undo) is the working surface. GO or idle restores everything; opening a set EDIT lifts the quiet deliberately until the edit is done (`syncRestQuiet()` runs at `renderRestView` entry and in `renderLift`, keyed on phase + `editSet`). Dedupe: the card's "Workout MM:SS" readout now hides whenever the peek is open (the header session pill shows the same clock; ticks keep it correct within a tick of toggling). Kept visible mid-rest by design: the set log — so the earlier sketch's "collapse to one summary line" narrowed to "editor hides, log stays". Specs: new `e2e/restquiet.spec.js` (quiet contract, clock-once, edit exception, GO restore); smoke + liftgeom peek blocks updated to the quiet contract. Gates at build: unit 225/225, typecheck clean, check-assets/ids/sw-cache OK (CACHE-HASH d6f3d27041099885).
- N12 BUILT (pending e2e run + batch publish): the Fri/Sat/Sun tab row is deleted (header markup, CSS, syncDays, tab handlers). Day switching = ‹ › chevron buttons (#dayPrev/#dayNext, 44px `.mini`) flanking the day title, cycling fri→sat→sun via `switchDay()` — the old tab handler's body verbatim, so the B5-05 mid-edit reset semantics are preserved. N3's tab week-marks retired with the tabs (`renderDayMarks` deleted; the B6-02 off-day line now takes the day name from the program label); `Stats.weekStatus` stays and P9 week visibility lives in Progress — the journeys spec now asserts it via `#pDays` "1/3" + the heatmap. Specs updated: pass4 (chevron round-trip), a11y (title + labelled chevrons), enhancements B5-05 and features (chevron stepping instead of tab clicks). check-ids now reports 0 day tabs. Gates at build: unit 225/225, typecheck clean, check-assets/ids/sw-cache OK (CACHE-HASH f3d02ef468b7451e).
- N14 BUILT (pending e2e run + batch publish): every lift now lists 2–3 alternates (`alts` in program.js; the B6-06 curated alternate stays first; two compound texts — Nordic/lying leg curl, barbell/goblet squat — were split into separate entries; names are Khang's to veto). Swap opens a chooser (`#swapChoices`, one 44px pill per alternate + Cancel); choosing sets `swapAlt` to the alternate's NAME (the built code showed B6-06 already stored the name, not the sketch's boolean/index — so history entries and the progression/PR exclusion needed no change and no migration). Loads are per-alternate: `swapLoad` remains the active alternate's load (B6-07 assertions intact), a new `swapLoads` name→load map remembers each alternate's load for the day (`stashSwapLoad` mirrors on every stepper write and on swap/undo; the store sanitizer keeps only sane entries), and a first-time alternate seeds from its last banked session in history (`lastSwapLoad`) before falling back to 0. Undo stays one tap on the swap button; swap still locks once sets are logged; the chooser resets on lift/day navigation. Known simplification: per-side flags follow the programmed lift, not the alternate (the per-side alternates are per-side in practice). Specs: new `e2e/alts.spec.js` (chooser contents, Cancel, per-alt memory, history seeding); features B6-07 and swapfit flows updated to pick from the chooser; program.test asserts ≥2 unique alternates per lift within the 120-char bound; store.test covers swapLoads sanitize. Gates at build: unit 226/226, typecheck clean, check-assets/ids/sw-cache OK (CACHE-HASH 62ff30a8f847d520).
- N15 BUILT (pending e2e run + batch publish): dips are assisted, not weighted (Khang, mid-workout Nov 13: assisted machine, currently 45 lb of help). The lift is renamed "Assisted dip" (`assist: true`, `bw` removed, programme load preset to his 45 setting; the exId is unchanged so history stays put). The logged number is the machine's assistance, so the machinery runs in reverse: `progressMetric` values a set at bodyweight − assistance (less help = higher metric = the PR), the 2-for-2 suggestion steps help DOWN (floor 0), stall resets and deloads add ~10% help, banked entries stamp `assist` + `bwKg` (store sanitizer keeps the flag), and stats volume/PRs/trends all read it. Old bodyweight-era dip entries keep their `bw` valuation. Tests that located Friday's bodyweight lift by `e.bw` now use Sunday pull-ups (the remaining bw lift), and the deload invariant asserts the inverted direction for assist lifts. Gates at build: unit 227/227, typecheck clean, check-assets/ids/sw-cache OK (CACHE-HASH 3dbdbe02d2e2778b). Note for his first session on the new build: his saved dip record still holds the old bodyweight-era load — set it to the machine number once.
- N13 BUILT (pending e2e run + batch publish): the RIR line is now permanent and speaks plainly — it always shows the selected value in words ("2 in the tank — two more reps if you had to", 0 = "couldn't do another rep", 4 = "easy, four or more left") and re-words on every tap; button aria-labels match. The B5-03 one-time explainer machinery (`gym-rir-seen`, show/hide functions) is removed — it had retired itself after Khang's first-ever set, which is exactly why the bare number needed translating. Wording only: values, rest penalties, progression untouched. The old B5-03 spec was rewritten to the new contract in `e2e/enhancements.spec.js`. Gates at build: unit 225/225, typecheck clean, check-assets/ids/sw-cache OK (CACHE-HASH 77b4aabdb930528f).

- e2e gate (Nov 13, v131-candidate): 15 failures triaged — 3 real app bugs (the unexported `Gym.LOAD_GUESS_FROM` map, which made every null-load lift's render throw and left the prescription blank; a swapped lift with no load yet reading "—" in the load stepper while its own line said "light"; and the sethead rhythm drifting 3px after N1 removed the negative margins — margin-bottom 9 → 6, so the border gap *is* the 6px beat) and the rest stale tests/measurements rewritten to the N1–N15 contracts (N11 quiet peek, N14 swap chooser, N12 no week strip/day tabs, the phase2 cable-fly test both stale and blocked by the export bug, the phase3 seed's `doneMap` shape, the restquiet GO reached by clock run-out, the smoke log's per-row rounding, the B5-01 top-stack budget re-derived for N1's in-flow pills + N7's ramp line). Gates: unit 228/228, typecheck clean, e2e 172/172 (390×667 + 390×844), CACHE-HASH 93cc5a65d978b68f. `version.js` untouched (gym-v130) — publishing is separate. Carried forward [T1, a11y]: B3-24's per-day state naming retired with the strip, so Progress exposes only the aggregate count — deciding where per-day state should live (if anywhere) is Khang's.

## Batch 5 — QUEUED Nov 9 (1 T2 + 19 T1, from three Planner/Reviewer audits + Khang's redesign direction)

Full specs in `QUEUE.md` (B5-01–B5-20); `TASK.md` has B5-01 active. Centerpiece: the lift-page redesign [T2, designed in `DESIGN.md`] answering Khang's Nov 9 screenshot critique (five stacked text layers at the top, ~150–190 px dead band at 390×844) and his user-workflows-first direction. Behind it: workflow fixes (inter-lift rest prep targeting the next lift, day-tab mid-edit backup corruption, false "New PR" on extra sets, stranded `twoTap` confirm label, overnight session-duration clamp, RIR explainer retirement, backup banner that backs up), data safety (salvage on Restore/Merge, newer-version import message, `validDate` round-trip, per-set clamps at the store boundary, sessionLog bad-date drop, salvaged-bar vs save-failure priority), a11y (44 px `.bbact`, week-strip `role`, danger-text contrast, dead menu button hidden), and the Export CSV e2e. Still blocked, not queued: off-day logging (needs Khang's P9 decision) and the `bodyweightSet` flag (schema change, Khang's call).

## Batch 4 — QUEUED Nov 9 (1 T1 + 1 T2, from the Planner/Reviewer's Batch 3 review)

Full specs in `QUEUE.md` (B4-01–B4-02); `TASK.md` has B4-01 active. B4-01 is the B3-29 follow-up (`workoutDates` / `trainingDays` null-prototype maps). B4-02 is the corrupt-payload salvage, designed in `DESIGN.md`. Closed without queueing: the pro-review finding that `weekStatus` hardcodes 8 lifts — it already takes a `dayLens` parameter (pipeline, Nov 9 08:40) and `app.js` passes `DAY_LIFTS`; the 8 is only a fallback default. Still blocked, not queued: off-day logging (needs Khang's P9 decision) and the `bodyweightSet` flag (schema change, Khang's call per P4).

## Batch 3 — QUEUED Nov 9 (33 T1 + 2 T2, from three Planner/Reviewer audits)

Full specs in `QUEUE.md` (B3-01–B3-35); `TASK.md` has B3-01 active. Sources: code audit (20 items), UX audit (20 items), science research pass (L7/L8 unblocked, L6 list ready). Two findings merged (mid-rest freeze = UX #1 + code #12; pill "Start" = UX #8 + code #16). The Planner/Reviewer spot-verified the top claims in source before queuing (future-version wipe, SW `res.ok` gaps, `jsconfig` gap, phantom sessions, merge cursor, undo-extra-set, summary PR date, restart snapshot, import size, SW register) and two key citations (Singer 2024, Goto 2019 — see `RESEARCH.md`).

Status corrections Nov 9: L9 is BUILT (verified 145/145 unit, 48/48 e2e, SW `gym-v20`) — the "proposed for Batch 3" line below is stale. Batch 2 (B1–B3) is COMPLETE + self-reviewed by OpenCode at `9556a73`. Pipeline Phases 1–5 + Pass 2 DONE (154/154 unit, 63/63 e2e, SW `gym-v35`, schema v4). The pipeline's "remaining work is Khang's" is answered by this batch (research done) and the T3 proposals below.

| # | Item | Triage |
|---|---|---|
| B3-01 | Mid-rest finish-arm freeze (rest clock strands after final lift) | T1 |
| B3-02 | Future-version payload silently wiped at boot | T1 |
| B3-03 | SW e2e harness (HTTP, not `file://`) — gates B3-04 | T1 |
| B3-04 | SW caches error pages as shell / serves errors over cache | T1 |
| B3-05 | `finalizeSession` logs phantom empty sessions | T1 |
| B3-06 | Undo of an extra set leaves a stale history entry | T1 |
| B3-07 | Restart-lift takes no snapshot | T1 |
| B3-08 | Import-merge silently adopts incoming cursor | T1 |
| B3-09 | "Import backup" unreachable by keyboard | T1 |
| B3-10 | PR / top-reps hint wiped before the lifter sees it | T1 |
| B3-11 | Summary PR count uses wall-clock date, not session date | T1 |
| B3-12 | +15 at GO blanks the rest label | T1 |
| B3-13 | Session pill says "Start" after a pause, not "Resume" | T1 |
| B3-14 | RIR buttons expose no selected state to a screen reader | T1 |
| B3-15 | No focus placement on day ↔ lift ↔ progress navigation | T1 |
| B3-16 | Rest screen hides the session elapsed time | T1 |
| B3-17 | Import has no file-size guard | T1 |
| B3-18 | No upper bound on typed/stepped load and reps | T1 |
| B3-19 | Import-merge reports no counts | T1 |
| B3-20 | "Undo last reset / restore" never says what it will undo | T1 |
| B3-21 | Corrupt-payload bar understates what happened (copy only) | T1 |
| B3-22 | Restore (replace) re-implements the two-tap arm | T1 |
| B3-23 | SW never checks for updates while the app stays open | T1 |
| B3-24 | Week strip / heatmap states invisible to screen readers | T1 |
| B3-25 | "Planned +2" stays in the day summary after the workout starts | T1 |
| B3-26 | Tempo line only exists on the first lift of the day | T1 |
| B3-27 | `typecheck` never checks `restctl.js` | T1 |
| B3-28 | Tooling-guard gaps (check script, check-ids, check-assets) | T1 |
| B3-29 | Stats maps use plain `{}` keyed by user-controlled dates | T1 |
| B3-30 | Untested pure-store paths + program-id uniqueness (tests) | T1 |
| B3-31 | No automated check that the SW `CACHE` version bumps | T1 |
| B3-32 | First run has no guidance at all | T1 |
| B3-33 | No deploy version anywhere in the UI | T1 |
| B3-34 | `nextLift` never wraps to an earlier open lift | T2 (designed) |
| B3-35 | Bodyweight-resolution rule duplicated in four places | T2 (designed) |

## Next (T2 — designs in `DESIGN.md`, not queued)

### Off-day logging is misattributed (UX audit #5) [T2] — DECIDED Nov 10 → `QUEUE.md` B6-02
P9 decided ATTRIBUTE: sessions keep banking under the next training day; the build fixes the week-strip/heatmap visibility and adds the one-line "Off day — this logs as Friday" note. Decision record in `DECISIONS.md`.

### Corrupt-payload salvage [T2] — BUILT (B4-02, Nov 9; extended to Restore/Merge by B5-06)
Closed: `store.js` `salvage()` ships in B4-02 and B5-06 wires the same fallback into `importRaw`/`importMerge`. Kept here as history; not an open item.

### `bodyweightSet` flag (code audit #19) [T2, schema change] — DECIDED Nov 10 → `QUEUE.md` B6-03
Adopted: schema v4 → v5, legacy payloads derive the flag (≠ 165 ⇒ set), an explicitly set local bodyweight always wins a merge. Decision record in `DECISIONS.md`.

## Proposals (T3 — Khang only, never auto-built)

### P5 — Bulgarian split squat rest 120 s → 150 s (L8, Nov 9) — DECIDED Nov 10 → `QUEUE.md` B6-08
Approved (the only per-lift rest change the audit found; +90 s Friday, ~75 min total). Decision record in `DECISIONS.md`.

### P6 — Progression trigger: adopt the 2-for-2 rule (L7, Nov 9) — DECIDED Nov 10 → `QUEUE.md` B6-04
Adopted, evaluated at read time from the banked set arrays (last set ≥ top + 2 at target RIR in each of the last two sessions); `hitTop` stamping and the stall rule unchanged. Decision record in `DECISIONS.md`.

### P7 — Planned program-wide deload week every ~5–6 weeks (L7, Nov 9) — DECIDED Nov 10 → `QUEUE.md` B6-09 + B6-10
Approved as a MANUAL mode (menu-started, 7 days, sets × 0.6, loads × 0.9, deload sessions progression-exempt) with a once-a-week nudge line after 5+ weeks — never automatic. The companion rename (stall rule → "stall reset" in user-visible copy) is in B6-10. Decision record in `DECISIONS.md`.

### P8 — Finish a partial workout (UX audit #14) — DECIDED Nov 10 → `QUEUE.md` B6-05
Approved: Finish shows with any logged data; the summary is titled "partial, N of 8 lifts". Decision record in `DECISIONS.md`.

### P9 — Off-day logging: block or attribute? (see T2 above) — DECIDED Nov 10 → `QUEUE.md` B6-02
ATTRIBUTE (see the T2 entry above and `DECISIONS.md`).

### P10 — Overhead cable extension `partial: 1` flag: KEEP (recommended, Nov 9)
The evidence for triceps lengthened partials is the strongest in the partials literature — Goto 2019 (partial-ROM triceps extensions at long muscle lengths grew CSA +48.7% vs +28.2% full ROM, trained men, 8 weeks) and Maeo 2023 (overhead cable extensions — the exact exercise — grew the long head +28.5% vs +19.6% neutral, 12 weeks). The Nov 8 list was incomplete, not the flag wrong. `RESEARCH.md` now lists triceps; the flag stays unless Khang says otherwise. Counterweight recorded: Wolf 2025 — in trained lifters, lengthened partials tie full ROM rather than beating it; the app's conservative use (only after full-ROM failure, last set only) is exactly the "extend the last set" application, so "tie" still supports keeping it.

### P11 — L6 exercise-swap alternates — DECIDED Nov 10 → `QUEUE.md` B6-06 + B6-07
Approved: the proposed alternate list for all 24 lifts, unchanged (the verbatim strings, coaching parentheticals included, live in `QUEUE.md` B6-06 — that is now the single source). Progression model decided: log the swap under the original lift's `id` with a swap marker; swapped entries count toward volume and completion but are excluded from load suggestions, stall detection, the sparkline and PRs; no partials prompt while swapped; the swap locks once a set is logged. Decision record in `DECISIONS.md`.

## Batch 2 — QUEUED Nov 8 (B1–B3, all T1, hardening from the Planner/Reviewer's Batch 1 review)

`QUEUE.md` holds the full specs. `TASK.md` has B1 active. B1: null / non-object
records crash merge/migrate/resetDay (reproduced on `b7d61f0`).
B2: nested `__proto__` inside a record survives sanitize (inert today).
B3: `node --test test/` fails on Node 24 — fix the test script to the glob.

## Batch 1 — COMPLETE Nov 8 (L1–L5, all T1, verified at `b7d61f0`)

`QUEUE.md` holds the full specs (history — do not re-run). L1 rest pure slice,
L2 partials audit, L3 sessionDrift, L4 a11y pass, L5 security audit.
Verified: 96/96 unit, typecheck clean, 41/41 e2e, Pages live `gym-v11`.

### L1 — Rest decisions into rest.js (pure slice) [T1] — ACTIVE
Revised in re-check: full controller extraction is T2 (new item
L9 below), so this batch takes the safe pure slice only — the
remaining pure decisions (`restMsg`, `goLabel`, `prepVisible`)
into `rest.js` + tests, `restCtx` stays in `app.js`.

### L2 — Audit the lengthened-partials prompt [T1]
Re-check: timing looks correct in source (`app.js:967` — fires
only on lift completion with last RIR ≤1); this item verifies it
with e2e. Open question found: Sun overhead cable extension is
flagged `partial: 1` but is NOT in the `RESEARCH.md` list —
report it, do not change the flag.

### L3 — Day-time model vs real sessions [T1, audit]
Re-check: Pass 4 `sessionLog` (`day` + `durationSec` +
`status`) makes this measurable at last — add pure
`Stats.sessionDrift`, test with fixtures, report. Expect
"insufficient data" (sessions are brand new; no phone data
reaches this session). No constants change, no UI change.

### L4 — Accessibility pass [T1]
Re-check: concrete sub-44px controls found in Pass 4 CSS —
`.mini` 44×36, `.resetlift` 30px, `.applybtn` 30px (28px
short-phone), `.bbdismiss` 26×26, short-phone steppers 40px,
peek-strip buttons 40px. Rest arrows already out of tab order
(`.rnav{display:none}` while resting) — verify.

### L5 — Security audit: import + service worker [T1]
Re-check: Pass 4 extended sanitization to sessions; existing
hostile coverage is one test. Probes: `__proto__` /
`constructor` keys via merge, `1e999` / `Infinity` numbers,
non-array sets, hostile session lifts. Plus SW discipline
(`gym-v7`) and the threat-model paragraph in `PLAN.md`.

## Next (T2 — the Planner/Reviewer designs first)

### L6 — Exercise swap map [T2]
Curated alternates per lift (e.g. what replaces Smith squat if the
machine is taken). Needs a curated map in `program.js` and a
progression model for swapped lifts — and Khang's sign-off on the
alternate list, since it touches program data. DESIGN first.

### L7 — Progression model review [T2]
Double progression (top reps at target RIR → +step) + 3-missed-top
→ ~10% deload. Review against the literature in `RESEARCH.md`
(2-for-2 rule, RIR accuracy, deload size/frequency). Outcome is a
proposal to Khang, not a silent model change.

### L8 — Rest-interval audit [T2]
App rests are 90/120/150/180 s. Literature (to be cited in
`RESEARCH.md`) generally favours ~2–3 min for compounds, ~1–2 min
for isolations. Audit each lift's rest against that, propose
changes — T3 for the actual numbers.

### Round 144 — `[DONE round 144]` Complete day's SR sentence says workout complete
The sr-only week sentence now says "workout complete" on a finished day instead of "about 0 minutes left" (`app.js`). U144 e2e. Gate: 286 unit, typecheck clean, 378 e2e. critic-flash GO (hy4-flash-free). `gym-v339`.
- Taken from the parked near-miss list: fresh survey found no new T1.

### Round 143 — `[DONE round 143]` One-shot hint live region only writes on change
`renderLift()` now guards the `#hint` text write so unrelated renders don't re-announce a one-shot warning (`app.js`). U143 e2e. Gate: 286 unit, typecheck clean, 377 e2e. critic-flash GO (hy4-flash-free). `gym-v338`.

### Round 142 — `[DONE round 142]` Undo one set clears the done day dot
`weekStatus()` now ignores same-day session snapshots when `liftHistory` already reports the day, so undoing one set shows `partial` instead of `done` (`stats.js`). U142 e2e. Gate: 286 unit, typecheck clean, 376 e2e. critic-flash GO (hy4-flash-free). `gym-v337`.

### Round 141 — `[DONE round 141]` Merge counts whole workout dates, not per-lift rows
`mergePayload()` now classifies incoming workout dates against the local date set, so an already-logged date is never reported as a new session (`store.js`). Two U141 e2e. Gate: 286 unit, typecheck clean, 375 e2e. critic-flash GO (hy4-flash-free). `gym-v336`.

### Round 140 — `[DONE round 140]` Print rows stay compact on a tall canvas
The 880px layout tier is now screen-only, so print keeps its 44px lift rows (`style.css`). U140 e2e. Gate: 286 unit, typecheck clean, 373 e2e. critic-flash GO (hy4-flash-free). `gym-v335`.

### Round 139 — `[DONE round 139]` Apply suggested load refreshes rest copy
`#applyLoad` now calls `syncRestNext()` so the GO headline/notification match the applied load (`app.js`). U139 e2e. Gate: 286 unit, typecheck clean, 372 e2e. critic-flash GO (hy4-flash-free). `gym-v334`.

### Round 138 — `[DONE round 138]` Print sheet hides day-switcher chrome
Print hide list now includes `.daycluster` and `.mini`, so day tabs and chevrons no longer print (`style.css`). U138 e2e. Gate: 286 unit, typecheck clean, 371 e2e. critic-flash GO (hy4-flash-free). `gym-v333`.

### Round 137 — `[DONE round 137]` GO notification body says Up now
Notification body now reads `restCtl.view().nextText` so the GO banner matches the in-app "Up now —" line; dead `restNextRaw` cache removed (`app.js`). U137 e2e. Gate: 286 unit, typecheck clean, 370 e2e. critic-flash GO (hy4-flash-free). `gym-v332`.

### Round 136 — `[DONE round 136]` Rest live region no longer announces every tick
`setRestLabel()` now skips unchanged writes, so the polite `#restLive` region only mutates on real label/msg changes (`app.js`). U136 e2e. Gate: 286 unit, typecheck clean, 369 e2e. critic-flash GO (hy4-flash-free). `gym-v331`.

### Round 135 — `[DONE round 135]` Forced colors keep day tabs distinguishable
Day-tab selection and done/partial/today dots now use Highlight outlines/fills under forced-colors (`style.css`). U135 e2e. Gate: 286 unit, typecheck clean, 368 e2e. critic-flash GO (hy4-flash-free). `gym-v330`.

### Round 134 — `[DONE round 134]` Rest Up next follows a deload toggle
Deload start/end mid-rest now call `syncRestNext()`, so the headline follows the changed set target (`app.js`). U134 e2e. Gate: 286 unit, typecheck clean, 367 e2e. critic-flash GO (hy4-flash-free). `gym-v329`.

### Round 133 — `[DONE round 133]` Undo after Finish refreshes the session snapshot
`undoSet()` now refreshes a completed session's derived `sessionLog` snapshot via `finalizeSession()`, so day-tab dots/SR sentence agree with undone sets (`app.js`). U133 e2e. Gate: 286 unit, typecheck clean, 366 e2e. critic-flash GO (hy4-flash-free). `gym-v328`.

### Round 132 — `[DONE round 132]` Set count acknowledges extra sets
`#setCount` now appends "· K extra" when more sets than prescribed are logged, matching the checked rows and summary (`app.js`). U132 e2e. Gate: 286 unit, typecheck clean, 365 e2e. critic-flash GO (hy4-flash-free). `gym-v327`.

### Round 131 — `[DONE round 131]` Empty movers copy no longer claims a lift was never logged twice
Progress empty movers copy is now "No comparable lifts yet" — truthful for mixed-unit skips and all other empty causes (`app.js`). U131 e2e. Gate: 286 unit, typecheck clean, 364 e2e. critic-flash GO (hy4-flash-free). `gym-v326`.

### Round 130 — `[DONE round 130]` Top movers never divides reps by 1RM
`topMovers()` skips a plain lift whose boundary metrics mix reps (load 0) and lb (loaded), killing the `+955.8%` nonsense (`stats.js`). U130 e2e. Gate: 286 unit, typecheck clean, 363 e2e. critic-flash GO (hy4-flash-free). `gym-v325`.

### Round 129 — `[DONE round 129]` Merge confirmation counts workouts, not lift rows
`mergePayload()` now counts distinct dates for `added`/`collisions`, so a one-workout backup reports "+1 new session" instead of one per lift row (`store.js`). U129 e2e. Gate: 286 unit, typecheck clean, 362 e2e. critic-flash GO (hy4-flash-free). `gym-v324`.
- Rejected round-129 first candidate: "partial-lift set edit doesn't re-bank" — no history entry exists for partial lifts (verified live), nothing stale.

### Round 128 — `[DONE round 128]` Undo after ending a deload drops the banked snapshot
`undoSet()` now uses the shared `Gym.bankedSnapshot` predicate instead of `wasComplete`, so undo after a mid-workout deload end removes the stale 2-set history entry (`app.js`, `store.js`). U128 e2e. Gate: 286 unit, typecheck clean, 361 e2e. critic-flash GO (hy4-flash-free). `gym-v323`.

### Round 127 — `[DONE round 127]` Ramp guide tracks a single stepper tap
`paintRamp()` shared by `renderLift()` and `updateLiftReadouts()` keeps the ramp steps in sync with the load on a single stepper tap (`app.js`). U127 e2e. Gate: 286 unit, typecheck clean, 360 e2e. critic-flash GO (hy4-flash-free). `gym-v322`.

### Round 126 — `[DONE round 126]` Direct load/reps edit refreshes rest copy
`editLoad()`/`editReps()` now call `syncRestNext()` like the steppers, so the GO "Up now" line matches a typed-in load/reps (`app.js`). U126 e2e. Gate: 286 unit, typecheck clean, 359 e2e. critic-flash GO (hy4-flash-free). `gym-v321`.

### Round 125 — `[DONE round 125]` Single stepper tap keeps the starting-guess tag
`updateLiftReadouts()` now paints ` · starting guess` like `renderLift()`, so a single stepper tap no longer hides a still-active guess (`app.js`). U125 e2e. Gate: 286 unit, typecheck clean, 358 e2e. critic-flash GO (hy4-flash-free). `gym-v320`.

### Round 124 — `[DONE round 124]` Completed lift's Next button uses the GO target
`#goNextBtn` now reuses the `Rest.nextLift` destination already computed for `#nextLine`, so both surfaces and GO agree (`app.js`). U124 e2e. Gate: 286 unit, typecheck clean, 357 e2e. critic-flash GO (hy4-flash-free). `gym-v319`.

### Round 123 — `[DONE round 123]` Rest "Up next" tracks prep steppers
`#restNext` now recomputes after rest prep load/reps changes (`nextUpText()` + `restctl.setNextText()`), so active/GO copy matches the set that opens (`app.js`, `restctl.js`). U123 e2e (mid-lift + inter-lift). Gate: 286 unit, typecheck clean, 356 e2e. critic-flash GO (hy4-flash-free). `gym-v318`.

### Round 122 — `[DONE round 122]` Deload nudge no longer claims a deload happened
Nudge copy now says "5+ weeks without a deload" — truthful when the anchor falls back to the first logged session (`app.js`); approved nudge behavior/cadence untouched (P7). U122 e2e. Gate: 286 unit, typecheck clean, 354 e2e. critic-flash GO (hy4-flash-free). `gym-v317`.

### Round 121 — `[DONE round 121]` Learned warm-up no longer reads as 0 min
Menu Clock-learning line prints learned warm-up in seconds, so 0–29 s no longer shows "warm-up ~0 min" (`app.js`). U121 e2e. Gate: 286 unit, typecheck clean, 354 e2e. critic-flash GO (hy4-flash-free). `gym-v316`.

### Round 120 — `[DONE round 120]` Switching set rows no longer corrupts the edit baseline
`startEdit()` commits any active set edit via `finishEdit()` before snapshotting a newly tapped row; row 0's temporary value no longer leaks into the working load or next set (`app.js`). U119/U120 e2e. Gate: 286 unit, typecheck clean, 353 e2e. critic-flash GO (hy4-flash-free, after Big Pickle free limit). `gym-v315`.

### Round 119 — `[DONE round 119]` One session no longer claims a tonnage trend
Progress note no longer claims "tonnage trend" with a single session and an empty spark chart; " · tonnage trend" emitted only when recent.length > 1 (`app.js`). U118 e2e. Gate: 286 unit, typecheck clean, 351 e2e. critic-flash GO. `gym-v314`.

### Round 118 — `[DONE round 118]` Modal focus trap skips hidden controls
Modal Tab trap no longer includes hidden buttons (`#restoreSnapshot`, `#deloadEnd`); selector now `button:not([hidden])` (`app.js`). U117 e2e. Gate: 286 unit, typecheck clean, 349 e2e. critic-flash GO. `gym-v313`.

### Round 117 — `[DONE round 117]` Swap button aria-expanded only for disclosure
`#swapBtn` no longer exposes stale `aria-expanded="false"` when it acts as undo/locked; aria-expanded is set only in disclosure state (`app.js`). U116 e2e. Gate: 286 unit, typecheck clean, 348 e2e. critic-flash GO. `gym-v312`.

### Round 116 — `[DONE round 116]` Restart lift restores keyboard focus
Restart lift no longer drops keyboard focus to `body` when `#resetLiftBtn` becomes disabled. `doRestartLift()` focuses `#doneBtn` (lift view) or visible lift row only when active element is lost/hidden (`app.js`). U115 e2e. Gate: 286 unit, typecheck clean, 347 e2e. critic-flash GO. `gym-v311`.

### Round 115 — `[DONE round 115]` Out-of-order next-lift copy truthful
Out-of-order completion no longer lies about workout completion/next lift. GO/next-line derive destination from `Rest.nextLift` B3-34 wrap (`app.js`, `restctl.js`), tests in `e2e/nextlift.spec.js` + `e2e/phase1.spec.js`, `test/restctl.test.js` fixture aligned. Gate: 286 unit, typecheck clean, 346 e2e. critic-flash GO. `gym-v310`.

### L9 — Full rest-controller extraction [T2] — DESIGNED Nov 8
Design is in `DESIGN.md` ("L9 design"): new `restctl.js`, controller owns
`rest` + `restCtx` + interval + finish-arming, returns `{state, view,
effects}`; `app.js` stays the DOM shell and performs effects (beep /
vibrate / notify / advance / finish). Pure `machine.js` / `rest.js` untouched.
BUILT Nov 9 (verified 145/145 unit, 48/48 e2e, SW `gym-v20`) — see `TASK.md`. Next T2 designs, in order: L6 (alternate list now proposed as P11, needs Khang's approval first), then L7/L8 (research done Nov 9; proposals P5–P7, program numbers are T3).

## Proposals (T3 — Khang only, never auto-built)

### P1 — Rest / load / rep number changes in `program.js`
Any change to a lift's rest, load, reps, or sets. Comes from L7/L8
research as a concrete proposal with evidence. Khang approves per
lift or declines.

### P2 — Split / days change
E.g. a 4th day, or Wed/Fri/Sun instead of Fri/Sat/Sun. Proposal
only, with the time-budget math (75–90 min/day target).

### P3 — New features
Anything not in the current scope (e.g. new views, new tracking).
Khang decides; the loop does not add fluff.

### P4 — Count caps in `store.js` (set Nov 9, Phase 5)
`DONE_MAX` / `SETS_MAX` = 12, `ACC_SEC_MAX` = 8 h, `BODYWEIGHT_MAX` = 300 kg,
and `getLift` now backfills legacy placeholder rows only up to the lift's
scheduled `e.s`. These are code constants, not program data, but they decide
what an imported backup is allowed to contain. If a lift ever goes above 12
scheduled sets, or a session is legitimately longer than 8 h, the cap has to
be raised — that is a Khang call, not a loop change.

## Deferred / non-goals (do not re-propose without new evidence)

- Cloud backend / accounts, Apple Watch / Health, full ESM migration,
  IndexedDB. Reasoning in `DESIGN.md`.
- Exercise swap was deferred in Pass 2 for exactly the reasons in L6
  — it is T2 now, not forgotten.

## Pro review findings — Nov 9, 05:55 CT (one sparse run; plan in `QUEUE.md` Batch 3)

| # | Sev | Finding | Disposition |
|---|---|---|---|
| 1 | MED | `package.json` `check` never runs `node --check rest.js` (loaded by `index.html:209`, cached in `sw.js:9`) — a syntax error there ships past the fast gate | queued as **B4** [T1] |
| 2 | LOW | `stats.js:48` `setsLogged` is exported and unit-tested but never called by the app (`app.js:393` uses `setsRecorded`) | leave — deliberate exported surface, do not delete |
| 3 | LOW | `app.js:9` + `timer.js:23` `sessionElapsed` alias/function unused in production (`Gym.sessionElapsedSec` is the real clock) | leave — same reason |
| 4 | LOW | `stats.js:296` `weekStatus` hardcodes `n >= 8` lifts as "done" — latent coupling to read-only program data | T1 candidate after L9 (pass the day's lift count in, default 8) |
| 5 | LOW | `sw.js` `CACHE` must be `gym-v20` + `restctl.js` in ASSETS or `check-assets` fails | enforced by the in-flight L9 build |

**Declined for now (Khang only):** raising `DONE_MAX`/`SETS_MAX`/`ACC_SEC_MAX`/
`BODYWEIGHT_MAX` (P4); deleting the exported-but-unread symbols above; any
`program.js` number change (P1/P2). The reviewer's top pick is L8, with B4 as
the only immediately buildable T1.
