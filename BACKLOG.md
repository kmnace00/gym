# BACKLOG — ranked improvement ideas

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
