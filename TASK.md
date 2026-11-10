# TASK — for OpenCode (planner: Muse)

Status: ACTIVE — BATCH 5, queued Nov 9 (Muse) from three audits + Khang's redesign direction; 20 items B5-01…B5-20 in `QUEUE.md`, B5-01 first. Base HEAD: `0d4ed1a` (SW `gym-v68`, 177/177 unit, 93/93 e2e, Pages live). Batch 4 VERIFIED PASS by Muse (record in `LOOP_STATE.md`).

## Completed — B5-01: Lift-page redesign [T2, designed]
- Built Nov 9 (OpenCode). Top stack de-stacked to three blocks (name / one meta line / cue+tempo guide), `.setlog` flexes and set rows grow to fill the dead band, `.rir` back to 44 px at ≤720 px, Set Done edit-state `aria-label` starts with "Done editing". New `e2e/liftgeom.spec.js` geometry contract (gap ≤8 px, stack ≥20% shorter, no-scroll at both viewports). Before/after measurements in `BUILD_LOG.md`. SW `gym-v69`. 177/177 unit, typecheck clean, 97/97 e2e. Commits `b16700f`…`af4e41c`.

## Completed — B5-02: Rest prep steppers target the next lift between lifts [T1]
- Built Nov 9 (OpenCode). `rest.js` `prepVisible` → pure `prepTarget(phase, editSet, done, sets, idx, nextIdx)`; `restctl.js` view carries `prepIdx`; `app.js` labels inter-lift prep "Next — <lift>, Set N of S" and the rest steppers edit the target lift's working record. 2 net new unit tests, 1 new e2e journey. SW `gym-v70`. 179/179 unit, typecheck clean, 98/98 e2e. Commits `c8a0969`…`077d6ac`.

## Completed — B5-03: RIR explainer retires on the first logged set [T1]
- Built Nov 9 (OpenCode). `doneBtn` now calls `hideRirHint()` when a set is banked (the `gym-rir-seen` flag was only set by the RIR buttons). 1 new e2e in `e2e/enhancements.spec.js`. SW `gym-v71`. 179/179 unit, typecheck clean, 99/99 e2e.

## Completed — B5-04: The backup banner's "Backup" button backs up [T1]
- Built Nov 9 (OpenCode). `backupBarSave` now runs `downloadBackup` directly (modal never opens; banner clears via `noteBackup`). Banner spec in `e2e/enhancements.spec.js` rewritten to the new contract. SW `gym-v72`. 179/179 unit, typecheck clean, 99/99 e2e.

## Completed — B5-05: Switching day tabs mid-edit writes the edit backup into the wrong lift [T1]
- Built Nov 9 (OpenCode). `app.js` `.day` handler now runs `resetEdit(); clearUndo();` before `cur = …; idx = 0;`, matching `openLift`/`navigateLift`/`showDay`. New e2e in `e2e/enhancements.spec.js` (mid-edit Fri load bump → tap Sat tab → Sat lift 1 keeps its own 90 lb; stored state Fri=60/Sat=90). Mutation check: old order turns the spec red. SW `gym-v73`. 179/179 unit, typecheck clean, 100/100 e2e.

## Completed — B5-06: Restore/Merge salvage a damaged backup instead of rejecting it [T1]
- Built Nov 9 (OpenCode). `store.js` `importRaw`/`importMerge` run `salvage(raw)` when `migrate()` returns null (not `__future`); with `recovered > 0` they build the payload the way `load()` does (empty payload + recovered history/log, normalized), save it, and return it with a `salvaged: {recovered, dropped}` marker; zero recovered still throws. `app.js` shows "Recovered N entries from a damaged backup" on restore/merge. 3 new unit tests, 1 new e2e. Mutation check: removing the fallback turns the unit test red. SW `gym-v74`. 182/182 unit, typecheck clean, 101/101 e2e.

## Completed — B5-07: Restoring a newer-version backup says so [T1]
- Built Nov 9 (OpenCode). `importRaw`/`importMerge` throw a distinct "Backup is from a newer version of the app" for `__future` payloads; `app.js` shows "That backup is from a newer version of the app — reload the app, then try again". 3 new unit tests, 1 new e2e. SW `gym-v75`. 185/185 unit, typecheck clean, 102/102 e2e.

## Completed — B5-08: Extra sets can announce a false "New PR" [T1]
- Built Nov 9 (OpenCode). `doneBtn`'s PR baseline now also maxes over the sets already banked today (`s.sets`), so an extra set lighter than today's PR set cannot announce a new PR; `priorEntries()` is untouched for suggestions. New e2e in `e2e/enhancements.spec.js` (three 70×6 sets complete the lift → extra set at 67.5×6 → no "New PR"). Mutation check: deleting the loop turns the spec red. SW `gym-v76` (`CACHE-HASH` 6199e88c4b5debae). 185/185 unit, typecheck clean, 103/103 e2e.

## Completed — B5-09: A session left running overnight finalizes with a ~24-hour duration [T1]
- Built Nov 9 (OpenCode). `store.js` `sessionElapsedSec` and `finalizeSession`'s `durationSec` now clamp to `ACC_SEC_MAX` (8 h), matching the load-time rule. 2 new unit tests (30 h running → `durationSec === ACC_SEC_MAX`; a 15 min session still banks 900 s). Mutation check: restoring the unclamped arithmetic turns both red. SW `gym-v77` (`CACHE-HASH` 9ae3815272ca8981). 187/187 unit, typecheck clean, 103/103 e2e.

## Active — B5-10: `twoTap`'s shared arm state can strand a confirm label forever [T1]

Spec in `QUEUE.md` (B5-10): one global `armedFn`/`armedUntil` pair serves all destructive buttons; arming button B inside A's window means A's scheduled label restore never fires (`if (armedFn === fn)`), leaving "Tap again to…" stuck on A. Do: track the armed button alongside `armedFn`; arming a new button restores the previously armed button's label immediately. Files: `app.js`, `e2e/*`. Verify: e2e — tap Reset today once, then Clear all once, wait >2.6 s → Reset's label is back to its `data-label` text (fails before); full gate green; SW bump.

## Completed — B4-01: `workoutDates` / `trainingDays` still use plain `{}` keyed by user-controlled dates [T1, defence in depth]
- Built Nov 9 (OpenCode). `workoutDates` (`seen`) and `trainingDays` (`have`) are `Object.create(null)`, matching `sessionVolumes`/`weekLiftIndex` from B3-29 — a `__proto__` date from imported history or the session log is now a key, not a silent prototype write. 1 new unit test in `test/stats.test.js` feeds a `"__proto__"` date through both and asserts the date is counted, the real Fri still counts in the 8-week grid, and `Object.prototype` is untouched. SW `gym-v67`. 170/170 unit, typecheck clean, 91/91 e2e at 390×667/844, no overflow, no console errors.

## Completed — B4-02: Corrupt-payload salvage [T2, designed]
- Built Nov 9 (OpenCode). `store.js` `salvage(raw)` recovers what still parses from a corrupt payload — balanced `{...}` pieces inside `liftHistory`'s arrays and the `sessionLog` array (Case A, unparseable bytes) or the valid object fields of a payload-shaped object (Case B) — every piece through the same sanitize path as an import, truncated tail dropped rather than guessed. `load()` reports `{ kind: "salvaged", recovered: N, dropped: M }`, the original bytes stay quarantined and the boot copy is never overwritten; the save bar names the counts and offers "Keep recovered log" (explicit save, never auto-committed) plus "Download copy" for the original bytes. New `#saveBarDownload` button, save bar wraps under 430px. SW `gym-v68`. 7 new unit tests, 1 new e2e at 390×667/844. 177/177 unit, typecheck clean, 93/93 e2e, reviewer PASS.
- Docs nit for Muse: this section's body was a duplicate of B4-01's spec (stats.js / `Object.create(null)`); the real B4-02 spec is in `QUEUE.md`. The duplicate is removed here.


## Completed — B3-35: Bodyweight-resolution rule duplicated in four places [T2, designed]
- Built Nov 9 (OpenCode). `Stats.resolveBodyweight(entry, fallback)` is the single rule (banked `bwKg` if finite and positive, else the fallback, else 165); `app.js bwFor`, `entryVolume`, `personalRecords` and `topMovers` now call it. 2 new unit tests pin the helper's behaviour and prove tonnage/PR numbers are unchanged. SW `gym-v66`. 169/169 unit, 91/91 e2e, reviewer PASS. `QUEUE.md` is now empty — Batch 3 done.

## Completed — B3-34: `nextLift` never wraps to an earlier open lift [T2, designed]
- Built Nov 9 (OpenCode). `nextLift` searches forward, then wraps to the earliest open lift, and returns -1 only when the day is done; `restctl.js` passes `firstOpen(0)`. Rewrote the fallback unit test, added `e2e/nextlift.spec.js` (out-of-order journey → wrap → two-tap Finish → summary), and fixed `e2e/features.spec.js` which relied on the old resting state. SW `gym-v65`. 167/167 unit, 91/91 e2e, reviewer PASS.

## WIP

WIP: OpenCode editing store.js, test/store.test.js, version.js, sw.js since 23:55 CT (B5-09)

## Completed — B3-33: No deploy version anywhere in the UI [T1]
- Built Nov 9 (OpenCode). `version.js` is the single source of the deploy tag (`GYM_VERSION = "gym-v64"`); `sw.js` `importScripts()` it and sets `const CACHE = GYM_VERSION`, `index.html` loads it, and the menu footer prints "v4 · gym-v64 · N workouts · backed up …". Added to ASSETS, the `check` syntax list and the typecheck include. 2 new e2e (footer shape; sw.js has no second literal). 167/167 unit, 90/90 e2e.

## Completed — B3-32: First run has no guidance at all [T1]
- Built Nov 9 (OpenCode). One line under the day summary — "Tap a lift, do the set, tap Set Done — rest starts itself" — shown only while `Gym.hasData(payload)` is false (no new storage key; `hasData` is now exported from store.js). SW `gym-v63`. 3 new e2e in `e2e/firstrun.spec.js` (fresh profile shows it, first logged set clears it and it stays cleared after reload, seeded history shows nothing; no viewport overflow). Verified 167/167 unit, typecheck clean, 88/88 e2e.

## Completed — B3-31: No automated check that the SW `CACHE` version bumps [T1]
- Built Nov 9 (OpenCode). `tools/check-sw-cache.js` hashes every file in `sw.js` ASSETS and compares it with a `CACHE-HASH:` comment next to `CACHE`; wired into `npm run check` (and `npm run check:sw`). Verified red two ways — an asset edited without a bump, and the comment removed — and green on the real tree. 167/167 unit, 85/85 e2e.

## Completed — B3-30: Untested pure-store paths + program-id uniqueness [T1]
- Built Nov 9 (OpenCode). 7 new unit tests: 24 unique `exId`s in `program.js`; `reconcile` collisions (higher-done wins, either order) and history merge by `exId`; `rollSession` re-finalizes a complete session that has data (updates the log entry, never appends) and banks nothing when empty; `mergePayload` bodyweight adopts only when local is the 165 default and rejects 0/negative/>700/NaN/string/null. 167/167 unit, 85/85 e2e. No rule changed — the 165 ambiguity stays a Khang-call design note.

## Completed — B3-29: Stats maps use `Object.create(null)` [T1]
- Built Nov 9 (OpenCode). `weekLiftIndex` and `sessionVolumes` are `Object.create(null)`; a unit test feeds a `__proto__` date through `weekStatus`/`sessionVolumes` and asserts `Object.prototype` stays clean. `workoutDates`/`trainingDays` still use plain `{}` — flagged for a follow-up. 161/161 unit, 85/85 e2e.

## Completed — B3-28: Tooling-guard gaps (check script, check-ids, check-assets) [T1]
- Built Nov 9 (OpenCode). `check` syntax-checks the two tool files; `check-ids.js` covers single-quoted refs and `data-day` vs `DAYS`; `check-assets.js` parses the manifest. Each guard verified against a broken fixture.

## Completed — B3-27: `typecheck` never checks `restctl.js` [T1]
- Built Nov 9 (OpenCode). `restctl.js` added to `jsconfig.json` include; `check-ids.js` now fails if `index.html` loads a script the typecheck doesn't cover. 85/85 e2e, typecheck clean.

## Completed — B3-26: The tempo line only exists on the first lift of the day [T1]
- Built Nov 9 (OpenCode). `#tempoLine` is now shown on every lift. SW `gym-v62`. 160/160 unit, typecheck clean, 85/85 e2e.

## Completed — B3-25: "Planned +2" stays in the day summary after the workout starts [T1]
- Built Nov 9 (OpenCode). `renderDay` only appends `planMsg` while no sets are logged. SW `gym-v61`. 160/160 unit, typecheck clean, 84/84 e2e.

## Completed — B3-24: Week strip and heatmap states are invisible to screen readers [T1]
- Built Nov 9 (OpenCode). Each `.wk` cell got an `aria-label` naming its state and its mark is `aria-hidden`; the heat card gained a `.sr-only` summary ("N of 24 training days in the last 8 weeks"). SW `gym-v60`. 160/160 unit, typecheck clean, 83/83 e2e.

## Completed — B3-23: The service worker never checks for updates while the app stays open [T1]
- Built Nov 9 (OpenCode). `swReg` is kept from the register call; the existing `visibilitychange` handler calls `swReg.update()` when the page becomes visible (throttled to once per 10 min, silent on failure). SW `gym-v59`. 160/160 unit, typecheck clean, 82/82 e2e.

## Completed — B3-22: Restore (replace) re-implements the two-tap arm instead of using `twoTap()` [T1]
- Built Nov 9 (OpenCode). `replaceBtn` now routes through the shared `twoTap()` arm (2.5 s window, 2.6 s label reset); `replaceArmedUntil` and its ad-hoc timer are gone. The action had to be hoisted to a named `openReplacePicker` — `twoTap` compares function identity, so an inline literal armed forever. 1 new e2e (single tap arms, second tap clicks the picker, timeout restores the label). SW `gym-v58`. 160/160 unit, typecheck clean, 81/81 e2e.

## Completed — B3-21: The corrupt-payload bar understates what happened [T1]
- Built Nov 9 (OpenCode). Bar copy now names the empty log and the download-first step; download action unchanged. SW `gym-v57`. 160/160 unit, 80/80 e2e.

## Completed — B3-20: "Undo last reset / restore" never says what it will undo [T1]
- Built Nov 9 (OpenCode). `updateFoot` renders the snapshot's label + date into the button ("Undo Reset day (Nov 9)"), generic text when there is no snapshot. SW `gym-v56`. 160/160 unit, 80/80 e2e.

## Completed — B3-19: Import-merge reports no counts [T1]
- Built Nov 9 (OpenCode). `mergePayload`/`importMerge` accept an optional stats side-channel; `#modalMsg` renders "Merged: +N new sessions, M same-date kept the fuller copy ✓". SW `gym-v55`. 160/160 unit, 79/79 e2e.

## Completed — B3-18: No upper bound on user-typed / stepped load and reps [T1]
- Built Nov 9 (OpenCode). `clampLoad` (0–2000) and `clampReps` (1–999) applied in `stepLoad`, `stepReps`, `editLoad`, `editReps`. SW `gym-v54`. 159/159 unit, 78/78 e2e.

## Completed — B3-17: Import has no file-size guard [T1]
- Built Nov 9 (OpenCode). `app.js` rejects files > 5 MB before reading (both inputs); `store.js` `importRaw`/`importMerge` throw on strings over 5,000,000 chars. SW `gym-v53`. 159/159 unit, 77/77 e2e.

## Completed — B3-16: The rest screen hides the session elapsed time [T1]
- Built Nov 9 (OpenCode). `restctl.js` `view()` carries `elapsedSec` (optional `elapsed` getter, null when absent); `app.js` wires `Gym.sessionElapsedSec(payload)` and paints `#restElapsed` ("Workout 42:03") during rest, hidden when idle. SW `gym-v52`. 158/158 unit, 76/76 e2e.

## Completed — B3-15: Focus goes nowhere on day ↔ lift ↔ progress moves [T1]
- Built Nov 9 (OpenCode). `openLift`/`navigateLift` focus `#exName` (`tabindex="-1"`), Back refocuses the row left, Progress focuses `#progTitle`. SW `gym-v51`. 157/157 unit, 75/75 e2e.

## Completed — B3-14: RIR buttons expose no selected state to a screen reader [T1]

The `.active` fill was the only selected-state signal, so VoiceOver heard five identical "RIR 0…4" buttons. The loop that toggles `.active` now also sets `aria-pressed` (true for the selected value, false for the rest), matching the day tabs. 1 new e2e (open a lift, tap RIR 2 → only RIR 2 reports `aria-pressed="true"`). SW `gym-v50`. Verified 157/157 unit, typecheck clean, 74/74 e2e at 390×667/844, no overflow, no console errors.

## Completed — B3-13: After pausing, the session pill says "Start", not "Resume" [T1]

`renderSessionPill` rendered "▶ Start" / "Start workout timer" whenever the interval was off, even with time already on the clock. "Start" is now reserved for a session with nothing elapsed; the pill text and `aria-label` read Resume when `sessionElapsedSec(payload) > 0`. The existing a11y pill test runs the fake clock a minute before pausing and asserts both. SW `gym-v49` (batched with B3-14; published `gym-v50`). Verified 157/157 unit, typecheck clean, 73/73 e2e at 390×667/844, no overflow, no console errors.

## Completed — B3-12: +15 at GO blanks the rest label [T1]

`restctl.js` `extend15()` restarted the 15 s rest at GO with `ctx.label`, a field the controller never writes (always `""`), so the lift line under the countdown went blank for the whole 15 s. The dead `label` field is removed from the context and the restart uses `ctx.startLabel` — the label the rest started with. The unit test that enshrined the blank label now asserts the lift label, phase `active` and 15 s. SW `gym-v48`. Verified 157/157 unit, typecheck clean, 73/73 e2e at 390×667/844, no overflow, no console errors.

## Completed — B3-11: Summary PR count uses the wall-clock date, not the session date [T1]

`app.js` `showSummary` now filters PRs with `Gym.sessionDate(payload)` instead of `Gym.dateKey()`, so a workout that starts before midnight and is finished after it still reports the PRs it just set (history, week strip and CSV already key off the session date). The midnight journey in `e2e/journeys.spec.js` now finishes the whole Friday session after 00:04 and asserts `#sumPrs` reads "8 new" (it read "—" at HEAD — verified red with the fix reverted). No new test count; the existing 73 e2e cases cover it. SW `gym-v47`. Verified 157/157 unit, typecheck clean, 73/73 e2e at 390×667/844, no overflow, no console errors. Commits: `68c78b8` + `58d710a` (auto-sync, on origin/main).

Status: RUNNING (OpenCode, Nov 9 13:25 CT) — Batch 3 items B3-01…B3-11 are
built, gated and pushed; B3-12 is next. A new session with the same loop prompt
reads `QUEUE.md`, copies B3-12 into this file and starts it. Base HEAD: `58d710a`
(B3-11 auto-sync). Note: the pipeline's "Remaining work is Khang's" line from
Nov 9 is now answered by this batch — the Batch 3 research (L7/L8) is done and
in `RESEARCH.md`, and the T3 proposals are in `BACKLOG.md` for Khang.

## Completed — B3-10: The PR / top-reps hint is set on the final set — and wiped before the lifter ever sees it [T1]

The PR/top-reps hint now surfaces on the rest screen: `restCtl.start` takes the hint, `restMsg` uses it in place of the stretch line (the in-rest partials cue still wins; the +30 s prefix still applies) and `extend15` at GO carries it. The rest message line shows "New PR — …" for the whole rest; advance still clears `hintText`. 2 unit tests + 1 e2e (seeded prior best 50×6 → log 60×6 → `#restMsg` contains "New PR", not "Stretch", no overflow). SW `gym-v46`. Verified 157/157 unit, typecheck clean, 73/73 e2e. Commit: `b3aba7b` (auto-sync, on origin/main).

## Completed — B3-09: "Import backup" is unreachable by keyboard [T1]

The `<label>` wrapper is now a real button (`#importBtn`) that clicks the hidden `#importFile`, mirroring Restore (replace); styling and the change handler are unchanged and the modal focus trap now includes it. 1 new e2e (Tab from the menu lands on Import, Enter triggers the file input's click). SW `gym-v45`. Verified 156/156 unit, typecheck clean, 72/72 e2e. Commit: `1be4051` (auto-sync, on origin/main).

## Completed — B3-08: Import-merge silently adopts the incoming backup's day/lift cursor [T1]

`mergePayload` no longer copies `incoming.cur` / `incoming.idx`; the base payload's cursor wins (full replace via `importRaw` still adopts). Unit test + e2e (seed `fri`/idx 2, import `sun`/idx 5 → saved cursor `fri`/2, "Lift 3 of 8"). SW `gym-v44`. Verified 156/156 unit, typecheck clean, 71/71 e2e. Commit: `983e2a1` (auto-sync, on origin/main).

## Completed — B3-07: Restart-lift takes no snapshot [T1]

`doRestartLift` calls `Gym.snapshot(payload, "pre-restart-lift")` before `Gym.resetLift`, so "Undo last reset / restore" brings the restart back (and no longer exposes an older snapshot). 1 new e2e (seeded completed lift → restart → empty history → restore → done/sets back). SW `gym-v43`. Verified 155/155 unit, typecheck clean, 70/70 e2e. Commit: `955ee81` (auto-sync, on origin/main).

## Completed — B3-06: Undo of an extra set leaves a stale history entry [T1]

`undoSet` now calls `bankLift(cur, idx)` when the lift is still complete after the undo, so undoing 4→3 on a 3-set lift re-banks 3 sets instead of leaving the banked entry at 4 (Prev/tonnage/PRs/CSV are honest); the below-scheduled pop path is unchanged. Extended the existing extra-set e2e. SW `gym-v42`. Verified 155/155 unit, typecheck clean, 69/69 e2e. Commit: `f03157c` (auto-sync, on origin/main).

## Completed — B3-05: `finalizeSession` logs phantom empty sessions [T1]

`finalizeSession`'s no-data guard no longer exempts a clock-started session (`!a.startedAt` removed), so Start on the session pill → log nothing → next-day roll banks no `sessionLog` entry with empty `lifts`; the Progress "Workouts" count and `sessionDrift`'s median stay honest. A session with an existing entry still takes the update path. 1 new unit test (clock-started finalize, next-day roll, existing-entry update). SW `gym-v41`. Verified 155/155 unit, typecheck clean, 69/69 e2e. Commit: `fa383cf` (auto-sync, on origin/main).

## Completed — B3-04: SW caches error pages as the shell and serves errors instead of cached assets [T1]

Navigation caches the shell only when `res.ok` (a transient 500/404 can no longer become `./index.html`); asset revalidation returns the cached `hit` when non-ok instead of serving the error. 304 path, conditional headers and cache-first/offline behaviour unchanged. B3-03's harness is fully green (app.js 500 and navigation 500) and its temporary `test.fail()` marker is removed. SW `gym-v40`. Verified 154/154 unit, typecheck clean, 69/69 e2e. Commit: `5181d7e` (auto-sync, on origin/main).

## Completed — B3-03: SW e2e harness (HTTP, not `file://`) [T1]

`e2e/sw.spec.js` starts its own `node:http` static server on an ephemeral port (repo root; no `playwright.config.js` change) and covers SW install, the offline shell, a 500 on `app.js` after boot, and a 500 navigation not poisoning the shell. The 500 cases were `test.fail()` expected failures at HEAD (verified red with the marker removed: `.liftrow` = 0); B3-04 removes the marker. No asset change. Verified 154/154 unit, typecheck clean, 69/69 e2e (68 pass + 1 expected failure). Commits: `5921025` + `120f5ae` (auto-sync, on origin/main).

## Completed — B3-02: Future-version payload is silently wiped at boot [T1]

`store.js` exports `futureRaw()` (the bytes `load()` preserves in `gym-tool-v2-future`); `app.js` treats `kind: "future"` like `corrupt` in `syncSaveBar` — "Saved data is from a newer version — showing an empty log; original copy kept" — and the bar's "Download copy" saves `gym-future-<date>.json`. Boot no longer calls `commit()` while a load warning is active, so the original store bytes and the `-future` copy stay intact until the user acts; nothing auto-restores or deletes the copy. Unit test extended (load-error kind, `futureRaw()`, store bytes) + 1 e2e (bar + empty-log wording, boot bytes intact, download === original JSON). SW `gym-v39`. Verified 154/154 unit, typecheck clean, 67/67 e2e at 390×667/844. Commit: `db1a18e` (auto-sync, on origin/main).

## Completed — B3-01: Mid-rest finish-arm freeze [T1]

`restctl.js` `finishReset()` now clears `finishUntil` and `ctx.frozen` in every phase (it used to return early unless phase was `"go"`), and `app.js` repaints the rest view unconditionally when the 2,600 ms `scheduleFinishReset` timer fires. After "End rest" on the final lift, hesitating past the window resumes the countdown and the button reads "End rest" instead of stranding "Tap again to finish" on a frozen clock. The two-tap arm, the 2,600 ms window and the 400 ms GO guard are unchanged. Existing parity unit test updated to the new contract + 1 `page.clock` e2e (last lift → arm mid-rest → window expires → ticking clock, label restored). SW `gym-v38`. Verified 154/154 unit, typecheck clean, 66/66 e2e at 390×667/844. Commit: `b3476d7` (auto-sync, on origin/main).

## Completed — set log sizing (Nov 9, Khang: "Not quite fixed") [T1]

`.setrow` is a fixed 44 px (the L4 tap-target floor) at both viewports instead of 56/64, gap 6 px, and `.setlog` hugs its rows (`flex:0 1 auto`) so the section no longer keeps the leftover height as dead space — 144 px for 3 sets, down from 180 px at 390×667 and 208 px at 390×844. Short-phone `max-height:56px` + negative-margin override removed. The 44 px Undo/Restart pills (`margin:-7px 0`) were 1 px inside the first row; `.sethead` bottom margin 8→16 px (6→14 px short) gives 9/7 px clearance. 1 new e2e (rows 44–46 px, log ≤ 3×46 + gaps, `rowTop - pillBottom ≥ 4`) at both viewports. SW `gym-v37`. Verified 154/154 unit, typecheck clean, 65/65 e2e.

## Completed — continuous-loop T1s (Nov 9, after L9)

1. `weekStatus` takes a per-day lift-count map (`DAY_LIFTS` derived from `DAYS`), no more `n >= 8` (1 unit test).
2. `resetEdit()` restores the working load/reps/RIR when leaving an in-progress set edit (e2e proves the old one-liner leaked the set's load into the next set).
3. Count strings derived from data: "This week" counts the Fri–Sun block (`weekStatus`) instead of a rolling 7 days, "8 lifts" is `list.length`, heatmap denominator is `weeks × days` (e2e with `page.clock` on a Friday).
SW `gym-v22`. Verified 146/146 unit, typecheck clean, 50/50 e2e.

## Completed — L9: Full rest-controller extraction [T2, approved]

New `restctl.js` (`createRestController(deps)`) owns the rest orchestration —
the `Machine` state, the 10-field context and the two-tap arm window — and
returns `{state, view, effects}` from every transition; `app.js` is the DOM
shell (`apply()` runs the effect list, `renderRestView()` paints the view, the
200 ms interval follows `view.ticking`). `machine.js` / `rest.js` untouched.
Parity kept byte for byte; two drifts found in review and fixed ("End rest"
mid-rest on the last lift freezes the clock and shows "Tap again to finish";
`notifyRestDone()` keeps the raw "Up next —" body). 15 new unit tests +
1 `page.clock` sleep e2e. SW `gym-v20`. Verified 145/145 unit, typecheck
clean, 48/48 e2e; reviewer PASS, independent tester 7/7.
Files: `restctl.js` (new), `app.js` (rest block only), `index.html` (script
tag), `sw.js` (ASSETS + `CACHE` `gym-v20`), `package.json` (`node --check
restctl.js`), `test/restctl.test.js` (new), `e2e/rest.spec.js` (new: simulated
phone sleep).

## Completed — Phase 5: hardening & cleanup (input bounds, JSDoc, dead-code audit) [T1]

Delivered: `store.js` bounds the count fields on the untrusted-input boundary
(`DONE_MAX`/`SETS_MAX` 12, `ACC_SEC_MAX` 8 h, bodyweight 0–300 kg), and
`program.js` `getLift` caps the legacy placeholder backfill at the lift's
scheduled `e.s` — an imported `done: 1e9` can no longer spin the loop. Dead-code
audit: no unreferenced functions or exports (the "never called" hits are handler
references such as `undoSetBtn.onclick = undoSet`). JSDoc added to the 34
undocumented `store.js` functions, `fmt`/`esc`/`round2`/`dayMins` in `program.js`
and `keyOf`/`shiftKey`/`volumeInRange` in `stats.js`; no trailing whitespace or
tabs anywhere. 3 new unit tests + 1 new e2e (hostile payload renders bounded
sets, keeps the no-scroll invariant, no `Infinity`/`NaN` in the progress stats).
SW `gym-v19`. Verified 130/130 unit, typecheck clean, 47/47 e2e at 390×667/844.

## Completed — B2: Nested unsafe keys inside records / entries / sessions [T1]

Delivered: `store.js` calls `stripUnsafeKeys` at the top of `sanitizeRecord`,
`sanitizeEntry` and `sanitizeSession`, and on every `sets` element through
`sanitizeSets`, so `__proto__` / `constructor` / `prototype` nested inside a
record, history entry, session or set cannot survive the store boundary. A
record left with only unsafe keys is still a valid record — `getLift()` fills
the defaults, the lift is not dropped. 3 new unit tests (JSON-string
payloads); merge winner rule unchanged. SW bumped to `gym-v13` (`store.js`
changed). Verified: `npm run check` 106/106 unit, typecheck clean,
`npm run e2e` 41/41 at 390×667/844, no overflow, no console errors.

## Completed — B3: Fix the Node test script (`node --test test/` fails on Node 24) [T1]

Delivered: `package.json` `test` and the unit step of `check` now run
`node --test test/*.test.js` (explicit glob). Finding worth recording:
`npm run check` does not call `npm test` — it runs the unit step inline — so
both strings were changed to keep the gate identical. Glob expands under the
sh npm uses on macOS and on the CI runner (Node 20, unchanged in
`.github/workflows/ci.yml`). No code change, no SW bump; asset-drift guard
still green (11 page refs, 12 cached assets). Verified: `npm run check`
106/106, `npm test` 106/106, typecheck clean, `npm run e2e` 41/41 at
390×667/844.

## Completed — B1: Null / non-object records: sanitize at the boundary, guard every consumer [T1]

Delivered: `store.js` `sanitizePayload` now drops null / non-object `state`
records, history entries, `sessionLog` entries and session `lifts` values at
the boundary (dropped state records fall back to `getLift()` defaults — no
new defaults invented), and `normalize` / `mergePayload` / `migrateV2` /
`reconcile` use an `isObj` check so an array can no longer masquerade as
`state` / `liftHistory`. Defence-in-depth guards added in `mergePayload`
(null incoming record skipped), `migrateV2` (null record not counted as
done), `resetDay` (null record skipped, non-array history skipped) and
`hasData`. 7 new unit tests in `test/store.test.js` (JSON-string payloads).
No schema, program-data or UI change. SW bumped to `gym-v12` (`store.js`
changed). Verified: `npm run check` 103/103 unit, typecheck clean,
`npm run e2e` 41/41 at 390×667/844, no overflow, no console errors.
Commit: `37a4034` + `8c71719` + `8bdd583` (auto-sync, on origin/main).

## Completed — L5: security audit: import + service worker [T1]

Delivered: hostile-payload tests for `__proto__` / `constructor` keys,
`1e999` numbers, non-array `sets`, hostile session `lifts`, and
oversized history/session caps. `store.js` merge/sanitize now strips
unsafe keys, uses null-prototype merge maps, rejects unsafe session
ids, normalizes non-array `sets`, and keeps `Object.prototype` clean.
SW bumped to `gym-v11`; asset-drift guard green. Threat-model paragraph
added to `PLAN.md`. Verified 96/96 unit, typecheck clean, 41/41 e2e at
390×667/844. Commits: `4258570` + `07d0d9b` + `c5dea85`.

## Completed — L4: accessibility pass [T1]

Delivered: 3 e2e cases prove the requested controls are ≥44px at
390×667/844 and the rest-screen keyboard order is +15 / Pause / End
rest / Show workout / Undo / prep steppers; hidden rest arrows remain
unreachable. Negative margins preserved no-scroll. `--faint` contrast
fixed in both themes. SW `gym-v10`. Verified 93/93 unit, typecheck
clean, 41/41 e2e.

## Completed — L3: day-time model vs real sessions [T1, audit]

Delivered: pure `Stats.sessionDrift(payload, day, estimate)` in
`stats.js`, five unit tests in `test/stats.test.js`, fixture-only
report in `BUILD_LOG.md`, SW `gym-v9`. Verified 93/93 unit, typecheck
clean, 38/38 e2e at 390×667/844. Commit: `09798ca` + `36489b3`.

## Completed — L2: audit the lengthened-partials prompt [T1]

Delivered: 3 new e2e cases prove the partials cue fires only on the
final set of a flagged lift at RIR ≤1 (never sets 1–2, never RIR 2,
never on an unflagged lift) — no `app.js` change was needed. Flag
audit: 10 `partial: 1` lifts, 9 match `RESEARCH.md`, Sun overhead
cable extension is the outlier (flag untouched, T3). Verified 88/88
unit, typecheck clean, 38/38 e2e at 390×667/844.

## Completed task — Pass 4 “Build all” (Nov 8, Khang's direct ask)

Delivered: session boundary + session log; per-set truth (extra sets, tap-to-edit); bodyweight metrics; corrupt quarantine + snapshots; week strip; Continue + Finish summary; rest-screen next-set prep; two-tap Restart; SW `gym-v7`.

## Completed task — UI/UX nav + reset

Delivered:
- Back button `‹ Lifts` → `‹ Back`; lift context shows the day ("Friday · Lift 3 of 8").
- `↺ Restart lift` (clears sets, keeps weight) on the set-dots row.
- `⋯` menu: Reset day, Clear all data (both two-tap confirm), Theme toggle moved in; header decluttered.
- Persistent `Undo` pill (day + lift views, not just rest).

---

## Previous task — holistic build (phases 1–5)

## Completed task — holistic build (phases 1–5)

Delivered:

1. **Data safety** — schema v2 (`gym-tool-v2`), real v1→v2 migration (no silent discard; unknown versions backed up, never overwritten), Export/Import via the `⋯` menu (copy / download / import JSON).
2. **Architecture** — `app.js` split into `program.js` (data + pure math), `store.js` (persistence/history), `timer.js` (timer math), `app.js` (controller). `save()` moved out of `render()`. UMD guards so the pure modules run under `node:test`. Unit tests (27) + Playwright viewport/functional e2e (6).
3. **Progression + history** — per-lift ring buffer (`liftHistory`), "Last <day>: … → try X" suggestion with one-tap Apply, inline e1RM sparkline.
4. **UX hardening** — single `navigateLift()`, undo survives navigation, GO double-tap guard, double-tap "Finish" confirm, one-time RIR explainer, `prefers-color-scheme` fallback on first load.
5. **PWA** — `manifest.webmanifest`, `sw.js` (cache-first offline), generated 192/512 icons.

Verified:

- `node --test test/` 27/27; `npx playwright test` 6/6 at 390×667 and 390×844 (no overflow).
- Program data `DAYS` unchanged (24 lifts). Details in `BUILD_LOG.md`.

---

## Previous task — full revamp

Rebuild the tool as a **Day → Lift** two-view app, dark-first, with persistence, keeping the program data byte-for-byte.

Delivered:

1. **Day view** — 8-lift overview with status, name, sets×reps, load, rest; day tabs, session pill, per-lift progress. Tap a row to drill in.
2. **Lift view** — big prescription, cue, tempo, set dots, and always-visible load / reps / RIR adjusters (no hidden "Adjust" panel). Set Done.
3. **Fullscreen rest** — big countdown, +15, Pause/Resume, End rest, Undo, Show-workout peek, GO beep + vibration, RIR ≤1 → +30 s, partials prompt, progression hint.
4. **Persistence** — localStorage `gym-tool-v1`: adjusted load/reps/RIR, done count, topHits, lastRir, day/index. Hydrates on load, saves on change.
5. **Theme** — dark-first with a light toggle (persisted as `gym-theme`).

Verified:

- 390×844 and 390×667: app 844/844 & 667/667, lift view 766/766 & 596/596, day rows fit, progress bar paints (6 px), rest goes fullscreen, peek strip 157 px with the lift name and Set Done still on-screen.
- No console errors (only benign `navigator.vibrate` blocks from synthetic clicks, not user taps).
- Program data identical to the previous commit (`DAYS` JSON 3383 → 3383).
- Persistence across reload, undo (and undo-cleared-on-back), day switch, theme toggle, set→rest→advance, and workout-complete session stop all pass.

## Open decisions (need Khang, not a loop edit)

- Any change to `program.js` numbers (loads, reps, rests, sets,
  exercises, split, days) or any new feature — T3 proposals in
  `BACKLOG.md`, never auto-built.
- Overhead cable extension is flagged `partial: 1` but is not in
  the `RESEARCH.md` partials list (L2 open question) — flag stays
  until Khang decides.

## How to use this file

- Muse writes this file. OpenCode reads it, builds, tests, updates BUILD_LOG.md.
- Stop when the task is done or verification fails — report back in BUILD_LOG.md, do not keep looping.
