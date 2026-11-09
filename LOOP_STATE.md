# LOOP_STATE — checkpoint

Status: RUNNING (OpenCode, Nov 9 15:25 CT) — Batch 3 B3-01…B3-23 are built and gated (B3-23 docs pending the next sync tick); **B3-24 is next**. Muse review (Nov 9, ~13:10 CT) covered B3-01…B3-10 and found no defects. L7/L8 are UNBLOCKED (research pass Nov 9, citations in `RESEARCH.md`); L6 alternate list is a T3 proposal in `BACKLOG.md` (P11) for Khang's approval.

Built this run (OpenCode, Nov 9, each item: `npm run check` + typecheck + `npm run e2e` at 390×667/844, no overflow, no console errors, program.js untouched):

- B3-11 summary PRs use the session date — 157/157 unit, 73/73 e2e, SW `gym-v47`. Commits `68c78b8`, `58d710a`, `20a20da`.
- B3-12 +15 at GO keeps the rest label — 157/157 unit, 73/73 e2e, SW `gym-v48`. Commit `e2ec96b`.
- B3-13 paused session pill reads "Resume" — 157/157 unit, 73/73 e2e, SW `gym-v49`. Commit `aad34f6`.
- B3-14 RIR buttons carry `aria-pressed` — 157/157 unit, 74/74 e2e, SW `gym-v50`.
- B3-15 focus lands in the lift view on open, back on the row on Back, on the Progress title on Progress — 157/157 unit, 75/75 e2e, SW `gym-v51`.
- B3-16 rest screen shows the session elapsed time — 158/158 unit, 76/76 e2e, SW `gym-v52`.
- B3-17 import/restore reject files over 5 MB (app + store guards) — 159/159 unit, 77/77 e2e, SW `gym-v53`.
- B3-18 load/reps clamped to 0–2000 / 1–999 in all four input paths — 159/159 unit, 78/78 e2e, SW `gym-v54`.
- B3-19 import-merge reports "+N new sessions, M same-date kept the fuller copy" — 160/160 unit, 79/79 e2e, SW `gym-v55`.
- B3-20 undo button names its snapshot ("Undo Reset day (Nov 9)") — 160/160 unit, 80/80 e2e, SW `gym-v56`.
- B3-21 corrupt bar copy names the empty log and the download-first step — 160/160 unit, 80/80 e2e, SW `gym-v57`.
- B3-22 `replaceBtn` uses the shared `twoTap()` arm (ad-hoc timer deleted) — 160/160 unit, 81/81 e2e, SW `gym-v58`.
- B3-23 SW update check on visibilitychange (throttled 10 min) — 160/160 unit, 82/82 e2e, SW `gym-v59`.

Note: gym-sync batches whatever is dirty at its ~3-minute tick, so two items can share one commit; every item was gated before the next started.

Muse review (Nov 9, ~13:10 CT) — B3-01…B3-10 VERIFIED, all PASS. Independent re-run from a fresh clone at HEAD `b4d5e8f`: `npm run check` 157/157 unit, typecheck clean, `npm run e2e` 73/73 (Chrome 157), `program.js` diff 0 lines, all 13 commits by Khang (auto-sync), Pages live `gym-v46`. Diffs checked per item against `QUEUE.md`: `finishReset` clears `finishUntil` + `frozen` in every phase and the arm timer repaints unconditionally; `futureRaw()` exported and boot skips `commit()` while any load warning is active; SW caches the shell only on `res.ok` and returns the cached hit on non-ok revalidation; `finalizeSession` guard, undo re-bank, restart snapshot, merge cursor, import button and rest hint all as specified; no `test.fail()` remnants. No new defects found — no Batch 4 items seeded by this review; B3-11…B3-35 (25 items) remain queued and are the plan. Next: Khang pastes the loop prompt into a fresh OpenCode session to resume at B3-11.

Previous: B3-10 BUILT (OpenCode, Nov 9 11:54 CT) — the PR/top-reps hint now survives on the rest screen: `restCtl.start` takes the hint, `restMsg` shows it in place of the stretch line (partials cue still wins; +30 s prefix applies), `extend15` carries it; advance still clears it. 2 unit tests + 1 e2e ("New PR", no "Stretch", no overflow). 157/157 unit, typecheck clean, 73/73 e2e, SW `gym-v46`. Commit: `b3aba7b` (auto-sync, on origin/main).

Previous: B3-01 BUILT (OpenCode, Nov 9 11:27 CT) — mid-rest finish-arm freeze fixed: `restctl.js` `finishReset()` clears `finishUntil` + `ctx.frozen` in every phase (it used to return early unless phase was `go`), and `app.js` repaints the rest view unconditionally when the 2,600 ms arm timer fires. After "End rest" on the final lift, a >2.6 s hesitation no longer strands a frozen clock / "Tap again to finish": the countdown resumes and the button reads "End rest" (second tap inside the window still finishes). Unit test updated to the new contract + 1 `page.clock` e2e. 154/154 unit, typecheck clean, 66/66 e2e at 390×667/844, no overflow, no console errors, SW `gym-v38`. Commit: `b3476d7` (auto-sync, on origin/main).

Previous: SET-LOG SIZING FIX (OpenCode, Nov 9 11:34 CT) — Khang flagged the set section as still oversized after `gym-v31`; rows are now a fixed 44 px (tap-target floor, no 56/64 px growth), gap 6 px, `.setlog` hugs its rows (144 px for 3 sets vs 180/208), and the 44 px Undo/Restart pills clear the first row by 9/7 px (they were 1 px into it). 154/154 unit, typecheck clean, 65/65 e2e at 390×667/844, SW `gym-v37`.

Previous: PIPELINE PASS 2 DONE (OpenCode, Nov 9 09:12 CT) — 154/154 unit, typecheck clean, 63/63 e2e at 390×667/844, SW `gym-v35`, CI green. P1 units on the lift screen (`a15af57`) + menu/summary reachability on short phones (`1b66b46`); P2 `Stats.progressSnapshot` (`976615d`); P3 shared session aggregate 4.6 → 3.4 ms (`4cf6e7a`); P4 midnight / off-day / summary journeys (`3815cbe`); P5 corrupt-date drop + dead-code cleanup (`4c8a977`). Batch 3 still awaits Khang (L8/L7 NEEDS_RESEARCH, L6 alternate list).
Loop: Batch 1 (L1–L5) and Batch 2 (B1–B3) complete and verified; L9 rest controller built. B3-01…B3-10 are done and Muse-verified; B3-11 is next. `QUEUE.md` holds Batch 3 (B3-01–B3-35, in order). OpenCode prompt is live in the repo (`OPENCODE_LOOP_PROMPT.md`) — Khang pastes it into a fresh OpenCode session and it works the queue. The queue is long by Khang's explicit ask — if the session gets long, finish the current item, checkpoint here, and stop; Khang restarts with the same prompt and work resumes from the checkpoint.

## Last verified

- B2 build (OpenCode, Nov 8 21:25 CT): nested unsafe keys. `store.js`
  `sanitizeRecord`, `sanitizeEntry` and `sanitizeSession` now call
  `stripUnsafeKeys` first, and `sanitizeSets` strips each set element, so
  `__proto__` / `constructor` / `prototype` inside a record, history entry,
  session or set cannot survive the store boundary. A record left with only
  unsafe keys is still a valid record (`getLift` fills defaults) — the lift
  is not dropped. 3 new unit tests (JSON-string payloads); merge winner rule
  unchanged. SW `gym-v13`. `npm run check` **106/106 unit**,
  `npm run typecheck` clean, `npm run e2e` **41/41** at 390×667/844.
- B1 build (OpenCode, Nov 8 21:18 CT): null / non-object records.
  `store.js` `sanitizePayload` drops null / non-object `state` records,
  history entries, `sessionLog` entries and session `lifts` values at the
  boundary; dropped state records fall back to `getLift()` defaults (no new
  defaults added). `normalize` / `mergePayload` / `migrateV2` / `reconcile`
  use an `isObj` check, and `mergePayload` skips a null incoming record,
  `migrateV2` treats it as not-done, `resetDay` skips it, `hasData` guards
  it. 7 new unit tests (JSON-string payloads). SW `gym-v12` because
  `store.js` changed. `npm run check` **103/103 unit**, `npm run typecheck`
  clean, `npm run e2e` **41/41** at 390×667/844. Commits: `37a4034` +
  `8c71719` + `8bdd583` (auto-sync, on origin/main).
- L5 build (OpenCode, Nov 8 20:42 CT): security audit probe. Added
  hostile payload tests for `__proto__` / `constructor` keys, `1e999`
  numbers, non-array `sets`, hostile session `lifts`, and oversized
  history/session caps. `store.js` now strips unsafe keys before
  sanitize/merge, uses null prototype objects in merge maps, rejects
  unsafe session ids, normalizes non-array `sets`, and keeps
  `Object.prototype` unpolluted. SW `gym-v11` because `store.js`
  changed. Threat model added to `PLAN.md`. `npm run check` **96/96
  unit**, `npm run typecheck` clean, `npm run e2e` **41/41** at
  390×667/844. Commits: `4258570` + `07d0d9b` + `c5dea85` (on
  origin/main).
- L4 build (OpenCode, Nov 8 20:21 CT): accessibility pass. Requested
  sub-44px controls now measure ≥44 px at 390×667/844: `.mini`,
  `.resetlift`, `.applybtn`, `.bbdismiss`, short-phone `.stepbtn`,
  `.setrow`, peek `.tbtns button`, peek `.detailsbtn`. Negative
  margins preserve the no-scroll layout; no requested control had to
  be left open. Keyboard rest order verified as +15 / Pause / End
  rest / Show workout / Undo / prep steppers; `restPrep` moved after
  the rest footer in DOM while CSS keeps it visually above the footer.
  Rest arrows remain unreachable. WCAG: dark ink 17.18/15.52, muted
  7.81/7.06, faint 5.23/4.73 on bg/surface; light ink 17.25/18.69,
  muted 5.48/5.93, faint 4.80/5.20. SW `gym-v10`. `npm run check`
  **93/93 unit**, `npm run typecheck` clean, `npm run e2e` **41/41**
  at 390×667/844. Commits: `d9cc70f` + `abcf5bd` (both on origin/main,
  Pages live).
- L3 build (OpenCode, Nov 8 20:10 CT): pure `Stats.sessionDrift`
  added + 5 unit tests; fixture-only audit (model 74/69/72 min for
  Fri/Sat/Sun), real-data verdict pending — no sessions recorded
  yet and this session cannot read the phone's localStorage. No
  constants or UI change. SW `gym-v9` (stats.js changed).
  `npm run check` **93/93 unit**, `npm run typecheck` clean,
  `npm run e2e` **38/38** at 390×667/844. Commits: `09798ca` +
  `36489b3` (both on origin/main, Pages live).
- L2 build (OpenCode, Nov 8 19:58 CT): partials-prompt timing
  confirmed by 3 new e2e cases (last set only, RIR ≤1 only, never on
  an unflagged lift) — no `app.js` change needed. Flag audit: 10
  `partial: 1` lifts, 9 match `RESEARCH.md`, Sun overhead cable
  extension is the outlier (flag untouched, T3). `npm run check`
  **88/88 unit**, `npm run typecheck` clean, `npm run e2e`
  **38/38** at 390×667/844, no overflow, no console errors. SW
  unchanged (`gym-v8`, no asset change). Commits: `b6645ea` +
  `78f319a` (both on origin/main, Pages live).
- L1 build (OpenCode, Nov 8 19:50 CT): `restMsg` / `goLabel` /
  `prepVisible` live in `rest.js`, `app.js` wired to them, no
  behaviour change. `npm run check` **88/88 unit** (3 new),
  `npm run typecheck` clean, `npm run e2e` **35/35** at
  390×667/844, no overflow, no console errors. SW `gym-v8`.
  Commit: `28b0c7b` (auto-sync, on origin/main, Pages live).
- Base: `7705a46` (Batch 1 queued) on Pass 4 `cbbf6a8`.
- Pass 4 verified: 85 unit / 35 e2e green, typecheck clean,
  SW `gym-v7`, schema v3 (key still `gym-tool-v2`), 24 lifts
  intact. Pages: https://kmnace00.github.io/gym/

## Batch 2 self-review verdict (one-time, per Khang's 21:10 CT instruction)

Reviewed by OpenCode against the `QUEUE.md` specs, HEAD `9556a73`:

- **B1 — PASS.** Every spec point present: `sanitizePayload` drops null /
  non-object `state` records, history entries, `sessionLog` entries and
  session `lifts` values before any consumer reads them; dropped state
  records are absent, so `getLift()` supplies the normal defaults (the test
  asserts the default record, nothing invented); `mergePayload` skips a null
  incoming record, `migrateV2` treats it as not-done, `resetDay` skips it.
  7 tests, all JSON-string payloads. Merge winner rule, history union,
  session log, schema and program data unchanged.
- **B2 — PASS.** `stripUnsafeKeys` runs at the top of `sanitizeRecord`,
  `sanitizeEntry` and `sanitizeSession`; session `lifts` values are verified
  to be covered (they go through `sanitizeRecord`), not assumed. A record
  that is only unsafe keys stays a valid record. No new key list — only
  `__proto__`, `constructor`, `prototype`. Deliberate extra: sets inside
  records/entries also get stripped (`sanitizeSets`), since a set is part of
  the same record boundary. Merge winner rule unchanged.
- **B3 — PASS.** `test` and the unit step of `check` now use
  `node --test test/*.test.js`. Finding recorded: `npm run check` does not
  call `npm test` — it runs the unit step inline — so both strings were
  changed to keep the gate identical. Glob expands under npm's sh on macOS
  (Node 26 here) and CI remains Node 20 with no change needed. No code
  change, no SW bump; asset guard green.
- **Suite re-run at HEAD:** `npm run check` 106/106 unit + asset guard OK,
  `npm run typecheck` clean, `npm run e2e` 41/41 at 390×667 and 390×844,
  no overflow, no console errors.
- **Program data:** `git diff b7d61f0 HEAD -- program.js` = 0 lines.
  `app.js`, `style.css`, `index.html`, `machine.js`, `stats.js`, `rest.js`,
  `timer.js` also untouched (0 lines).
- **Pages:** live at the new HEAD — `sw.js` serves `CACHE gym-v13` and the
  deployed `store.js` contains the B1/B2 guards.
- **Safety checks:** every commit author is Khang (auto-sync) or Muse; no
  force-push, no merge, no rebase; only `origin/main` pulled.
- **Open items for Muse:** (1) the null-record class is now closed at the
  store boundary; `app.js` consumers still assume records are objects, which
  is safe because sanitize is the only entry point; (2) L9 (rest controller,
  `DESIGN.md`) is the next T2 build, not queued; (3) no phone check needed
  for B1–B3 — no UI change.

**Verdict: Batch 2 shipped and clean. OpenCode stops here and waits for
Muse.**

## Current / next

- Current item: none — B3-21 done (160/160 unit, typecheck clean, 80/80 e2e, SW `gym-v57`).
- Next in queue: B3-22–B3-35 in order (`QUEUE.md`). Do not invent items or skip B3-22.
- After the batch, Muse reviews (ping "check the loop"). T3 proposals for Khang (Bulgarian rest, 2-for-2, deload week, partial finish, off-day decision, L6 alternates) are in `BACKLOG.md` P5–P11 — they do not block this queue.

## Last verified

- HEAD: `cbbf6a8` — "Build all: sessions, per-set truth, bodyweight
  metrics, data safety, week status" (Nov 8, 19:35 CT, Khang).
- Verified: 85 unit / 35 e2e green, typecheck clean, SW `gym-v7`,
  schema v3 (key still `gym-tool-v2`), 24 lifts intact.
  Pages: https://kmnace00.github.io/gym/
- Local Muse copy synced to this HEAD Nov 8 (was at Pass 3
  `f39f19f`). No conflicts: Khang's push did not touch `PLAN.md`
  or `AGENTS.md`; his `README.md` changes were kept and the loop
  paragraph was re-applied on top; `TASK.md` was not touched by
  this framework push.

## Current / next

- Current item: none.
- Next proposed batch: BACKLOG L1–L5 (T1). Not queued until Khang
  says go.
- Blocked on: Khang's go-ahead to create `QUEUE.md` with L1–L5 and
  issue L1 as the active `TASK.md`.

## Phone check (Khang, async — not blocking unless rest-critical)

Pass 3 build, on the phone in Safari / Home Screen app:
- [ ] Per-set log rows fill the lift view, no dead space (390×667/844)
- [ ] Prev line + real date on the suggestion; Plan today pre-fills
- [ ] Heatmap (8 weeks × Fri/Sat/Sun) + top PR in Progress
- [ ] Export CSV / Share summary work; Restore (replace) two-tap arm
- [ ] Per-lift Undo visible next to the set count; rest Undo same path
- [ ] Pause/Resume pill consistent; paused clock full-opacity
- [ ] Adjusters (load/reps/RIR) always visible; no Adjust leak onto
      the next lift (Loop 14 re-check after the revamp)

Pass 4 build, same phone check:
- [ ] Session clock + Finish workout summary; leaving sets open
      overnight banks the old day and starts today fresh
- [ ] Tap a logged set to edit it in place; extra sets upsert
- [ ] Week strip (Fri/Sat/Sun done/partial/missed/today) in day header
- [ ] Rest-screen next-set prep steppers; two-tap Restart

## Flags

- `NEEDS_RESEARCH`: none.
- `NEEDS_DESIGN`: none.
- `NEEDS_FIX`: none.
- `PAUSED`: no — resumed Nov 8, 21:09 CT. Finish Batch 2 (B1–B3) before 4:00 AM Mon, then stop and wait for Muse review. Muse is review-only after Batch 2.

## Log

- 2026-11-08: framework drafted (LOOP.md, BACKLOG.md, RESEARCH.md,
  LOOP_STATE.md). Local copy synced to remote HEAD `f39f19f`.
  Awaiting Khang's go-ahead for Batch 1 (L1–L5).
- 2026-11-08 19:28 CT: HOLD — Khang still editing on OpenCode, will
  push after. Do not push the framework until he says pushed.
  Paste-ready OpenCode prompt saved as `OPENCODE_LOOP_PROMPT.md`.
- 2026-11-08 19:35 CT: Khang pushed Pass 4 (`cbbf6a8`, 85/85 unit,
  35/35 e2e, schema v3, SW `gym-v7`). Muse synced, rebased the
  framework onto it, and pushed the framework files (LOOP.md,
  BACKLOG.md, RESEARCH.md, LOOP_STATE.md, OPENCODE_LOOP_PROMPT.md,
  PLAN.md, AGENTS.md, README.md). Batch 1 still awaiting approval;
  `QUEUE.md` not created, `TASK.md` still DONE/idle.
- 2026-11-08 19:41 CT: Khang approved Batch 1 with a Pass 4
  re-check. Muse re-read Pass 4 source and queued L1–L5 in
  `QUEUE.md` (L1 revised to the pure slice, full controller →
  backlog L9 [T2]; L2/L3/L4/L5 revised with Pass 4 findings).
  `TASK.md` now has L1 active. Awaiting Khang pasting the loop
  prompt into OpenCode.
- 2026-11-08 19:50 CT: OpenCode built L1 (rest decisions into
  `rest.js`). 88/88 unit, typecheck clean, 35/35 e2e at
  390×667/844, no overflow, no console errors. SW `gym-v8`.
  Waiting for gym-sync to commit/push before starting L2.
- 2026-11-08 19:53 CT: L1 pushed by gym-sync as `28b0c7b`, Pages
  live. Note: `~/.gym-sync-pause` was blocking the service since
  17:39 — Khang cleared it so the loop can push.
- 2026-11-08 20:05 CT: L2 pushed (`b6645ea` e2e cases, `78f319a`
  log/state), Pages live. L3 built (`Stats.sessionDrift` + 5 tests):
  93/93 unit, typecheck clean, 38/38 e2e, SW `gym-v9`.
- 2026-11-08 20:50 CT: Muse reviewed Batch 1 at HEAD `b7d61f0`.
  L5 verified independently: unit 96/96 (explicit glob), typecheck
  clean, syntax + assets clean, program.js/app.js untouched,
  Pages live at `gym-v11`. Prototype-pollution fix verified.
  Follow-up found by Muse probing beyond L5 spec: null state
  record crashes mergePayload (`theirs.done` on null), and nested
  `__proto__` inside a record survives sanitizeRecord (inert now,
  no Object.assign/spread on records). File as Batch 2 hardening,
  not a Batch 1 reopen. Also: `npm run check` still fails on
  Node 24 (`node --test test/` quirk) — CI uses Node 20, so CI
  should pass; fix test script to `node --test test/*.test.js`.
  Next batch is all T2 (L6–L9) — needs Muse design + Khang call.
- 2026-11-08 20:53 CT: Khang said "Do all recommended". Muse queued
  Batch 2 (B1 null-record hardening, B2 nested-proto strip, B3 test
  script glob — all T1, specs in `QUEUE.md`, B1 active in `TASK.md`)
  and designed L9 in `DESIGN.md` (new `restctl.js`, `{state, view,
  effects}` contract, 7 invariants, test plan, rollback = one revert).
  L9 build is proposed Batch 3, not queued. L6/L7/L8 designs follow in
  later sessions (L6 needs Khang's alternate list; L7/L8 are proposals).
  Phone check is async, not blocking. OpenCode stopped — Khang pastes
  the loop prompt again to start Batch 2.
- 2026-11-09 11:08–11:12 CT: set-log sizing fix (OpenCode, Khang:
  "Not quite fixed") — `.setrow` fixed 44 px, `.setlog` hugs its rows,
  Undo/Restart pills clear the first row. Commits `5db9414` + `6b3ffd6`
  (SW `gym-v36` → `gym-v37`, 65/65 e2e). HEAD moved to `6b3ffd6`.
- 2026-11-09 ~11:30 CT: Muse queued Batch 3 (B3-01–B3-35, 33 T1 + 2 T2)
  from three read-only audits, at Khang's "plan new improvements… very
  long list" ask. B3-01 is the mid-rest finish-arm freeze (verified by
  Muse in source; the L9 "fixed in review" note was wrong — the bug is
  still in the code at HEAD). L7/L8 unblocked by the research pass
  (citations in `RESEARCH.md`; Singer 2024 + Goto 2019 re-verified by
  Muse). T3 proposals P5–P11 in `BACKLOG.md` for Khang. **Push:** held
  while the set-log session was committing at 11:12 CT; pushed ~11:24
  CT after the head check showed no new commits since 11:12. Queue is
  live — Khang can paste the loop prompt.
- 2026-11-09 11:27 CT: B3-01 built (OpenCode). `finishReset()` now
  clears the arm + freeze in every phase; the 2,600 ms timeout repaints
  the rest view unconditionally. Old parity unit test replaced with
  the new contract; new `page.clock` e2e covers arm-mid-rest → expired
  window → ticking clock + "End rest". 154/154 unit, typecheck clean,
  66/66 e2e at 390×667/844, no overflow, no console errors, SW
  `gym-v38`. BUILD_LOG line written; waiting for auto-sync to publish
  before starting B3-02.
- 2026-11-09 11:31 CT: B3-02 built (OpenCode). `futureRaw()` accessor +
  "future" save-bar branch (download-only, no auto-restore) and boot keeps
  the store bytes when any load warning is active. Unit test extended; new
  e2e asserts the bar copy, intact boot bytes and a download equal to the
  original JSON. 154/154 unit, typecheck clean, 67/67 e2e at 390×667/844,
  no overflow, no console errors, SW `gym-v39`. Waiting for auto-sync to
  publish before starting B3-03.
- 2026-11-09 11:35 CT: B3-03 built (OpenCode). New HTTP e2e harness
  (`e2e/sw.spec.js`) with its own static server: registration + offline
  shell green; the 500-on-`app.js` and 500-navigation assertions are
  `test.fail()` expected failures (verified red with the marker removed)
  until B3-04. 154/154 unit, typecheck clean, 69/69 e2e (68 pass + 1
  expected failure), no console errors. No asset change, SW `gym-v39`.
  Waiting for auto-sync to publish before starting B3-04.
- 2026-11-09 11:38 CT: B3-04 built (OpenCode). Navigation caches the shell
  only when `res.ok`; asset revalidation returns the cached copy on a
  non-ok response. B3-03 harness fully green; `test.fail()` marker
  removed. 154/154 unit, typecheck clean, 69/69 e2e, SW `gym-v40`.
  Waiting for auto-sync to publish before starting B3-05.
- 2026-11-09 11:40 CT: B3-05 built (OpenCode). `finalizeSession` drops the
  `!startedAt` exemption, so a clock-started session with no logged sets
  banks nothing (finalize and next-day roll covered); an existing entry
  still updates. 1 new unit test. 155/155 unit, typecheck clean, 69/69
  e2e, SW `gym-v41`. Waiting for auto-sync to publish before starting
  B3-06.
- 2026-11-09 11:43 CT: B3-06 built (OpenCode). `undoSet` re-banks when the
  lift is still complete after the undo, so 4→3 leaves 3 sets in history.
  Extended the extra-set e2e. 155/155 unit, typecheck clean, 69/69 e2e,
  SW `gym-v42`. Waiting for auto-sync to publish before starting B3-07.
- 2026-11-09 11:46 CT: B3-07 built (OpenCode). `doRestartLift` snapshots
  `pre-restart-lift` before `resetLift`; 1 new e2e restores the lift via
  "Undo last reset / restore". 155/155 unit, typecheck clean, 70/70 e2e,
  SW `gym-v43`. Waiting for auto-sync to publish before starting B3-08.
- 2026-11-09 11:48 CT: B3-08 built (OpenCode). `mergePayload` keeps the base
  cursor (incoming `cur`/`idx` no longer copied); unit + e2e lock fri/idx 2
  across an import of sun/idx 5. 156/156 unit, typecheck clean, 71/71 e2e,
  SW `gym-v44`. Waiting for auto-sync to publish before starting B3-09.
- 2026-11-09 11:51 CT: B3-09 built (OpenCode). Import is now a real button
  clicking `#importFile`; Tab reaches it and Enter opens the picker. 1 new
  e2e. 156/156 unit, typecheck clean, 72/72 e2e, SW `gym-v45`. Waiting for
  auto-sync to publish before starting B3-10.
- 2026-11-09 11:54 CT: B3-10 built (OpenCode). The PR/top-reps hint shows
  on the rest message line (partials cue wins; +30 s prefix still applies;
  `extend15` carries it); advance still clears it. 2 unit tests + 1 e2e.
  157/157 unit, typecheck clean, 73/73 e2e, SW `gym-v46`.
- 2026-11-09 11:57 CT: CHECKPOINT. B3-01…B3-10 are built and pushed
  (last code commit before this docs pass; B3-10 auto-sync). Session stops
  for length; next is B3-11 (summary PR count uses the session date). No
  WIP claimed, no failing gate, program data untouched.
