# HANDOFF — continuous loop, Nov 9, 08:05 CT (OpenCode)

## Where it stands
All shipped work is gated and pushed; `main` == `origin/main` at `0446523`
(SW `gym-v29`). Nothing is uncommitted, no subagent is running, the local
model slot is free.

Gate at HEAD: `npm run check` **149/149** unit (plus `check-assets` and
`check-ids`) · `npm run typecheck` clean · `npm run e2e` **57/57** at
390×667 + 390×844, no overflow, no console errors. GitHub CI and Pages are
green on every pushed HEAD.

## What landed today
- 4:00–5:40 AM: the 5-phase pipeline — Phase 1 `a0afe70`, 2 `2e4bcb0`,
  3 `44d65a5`, 4 `f9a1891`, 5 `c37b649` (`gym-v15`→`v19`).
- L9 rest-controller extraction (approved T2): `6ae2432`, `restctl.js`
  owns the rest orchestration, `app.js` is the DOM shell. Reviewer PASS,
  independent tester 7/7.
- Continuous T1/T2 loop since: `weekStatus` per-day lift counts; set-edit
  navigation + undo restore the working load; "This week" counts the
  Fri–Sun block; count strings derived from data; the rest-screen Finish
  finalizes the session + summary; extra sets cap at `SETS_MAX`;
  bodyweight history valued at the weight in force (`bwKg`); midnight
  sessions anchor to their start date; failed snapshots are reported;
  44 px day pills / rest steppers + a visible Undo; `tools/check-ids.js`
  gate (found and removed a dead `bwNote` lookup). Every item carries a
  BUILD_LOG line and a test; two review findings were fixed before push
  (non-discriminating PR assertion, a self-skipping Saturday e2e).

## Not built, on purpose
- **Batch 3 in `QUEUE.md`**: L8 / L7 are NEEDS_RESEARCH (no verifiable
  citations in `RESEARCH.md`), L6 needs Khang's curated alternate list;
  B4 delivered inside L9. Nothing there is approved.
- **Reconcile for a removed lift** (unknown `exId` currently re-binds to
  the same day:index): a real latent risk on the next program edit, but
  the fix needs a schema decision (quarantine bucket) — Khang's call.
- **SW update flow**: atomic `addAll` install is deliberate (a partial
  precache could serve a broken app); no `controllerchange` auto-reload
  (reloading mid-set is worse than stale code).
- **"End rest" on the last lift freezes the clock** (parity with the old
  app): pause/resume or +15 recovers; the 2.6 s arm can expire while the
  label still says "Tap again to finish". Low-frequency UX nuance, not a
  data issue — flagged for Khang, not changed unilaterally.
- **P4 caps** (`DONE_MAX`/`SETS_MAX`/`ACC_SEC_MAX`/`BODYWEIGHT_MAX`) are
  a Khang sign-off in `BACKLOG.md`. Program numbers stay read-only.

## If a new lead resumes
1. `git fetch origin && git status -sb`; confirm authors are only
   Khang/Muse (the auto-sync watcher commits as Khang).
2. Read `TASK.md` (WIP + completed), then `QUEUE.md` Batch 3 and
   `BACKLOG.md` tail (the Pro findings table + dispositions).
3. Pick the next T1 from BACKLOG/QUEUE — do not invent features (T3) and
   do not touch `program.js` numbers. Gate every item: `npm run check &&
   npm run typecheck && npm run e2e`, one BUILD_LOG line, SW `CACHE` bump
   when an asset changed.
4. Note: the auto-sync watcher commits and pushes mid-edit, so an
   intermediate commit can be CI-red for a minute. Always verify CI on
   the *final* HEAD, not on the auto-sync in between.
5. Playwright needs `channel: "chrome"`; `file://` cannot register a SW,
   so SW logic is validated with a mocked `self`/`caches`/`fetch` eval.
