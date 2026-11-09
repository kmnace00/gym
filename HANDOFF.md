# HANDOFF — paused Nov 9, 05:38 CT (OpenCode)

## Where it stopped
Khang's 5-phase pipeline (Mon 4:00 AM–7:00 PM CT) is **complete**. All five
phases gated and pushed. Repo is clean: `main` == `origin/main` at `c37b649`,
nothing uncommitted, no local server or test process running, the local model
slot is free.

Gate at HEAD: `npm run check` **130/130** unit · `npm run typecheck` clean ·
`npm run e2e` **47/47** (390×667 + 390×844, no overflow, no console errors).
SW cache `gym-v19`.

| Phase | Gate commit |
|---|---|
| 1 UI/UX + a11y | `a0afe70` |
| 2 architecture | `2e4bcb0` |
| 3 performance | `44d65a5` |
| 4 test coverage | `f9a1891` |
| 5 hardening | `c37b649` |

Both pipeline schedules (`sch_1be50f41e001RvUpNlwsHZuBO1` cron tick,
`sch_1be50f422001U9LIfGmzpMv2eD` 6:30 PM reminder) are deleted — nothing will
fire again.

## Not built, on purpose
- **L9** rest-controller extraction — design is in `DESIGN.md`, needs Khang's
  approval before it is queued.
- **P4** in `BACKLOG.md` — the new count caps (`DONE_MAX`/`SETS_MAX` 12,
  `ACC_SEC_MAX` 8 h, `BODYWEIGHT_MAX` 300 kg) plus the `getLift` backfill bound
  at `e.s`. Constants chosen by the loop; raising them is a Khang call.
- `SET_SECS`, `TRANSITION_SECS`, `RIR_PENALTY`, `QUARANTINE`, `SNAPSHOT` are
  exported but unread. Left in place as model constants — deleting them is a
  judgment call, not a cleanup the loop should make unasked.

## If a new lead resumes
1. `git fetch origin && git status -sb` (sync-first rule), confirm authors are
   only Khang/Muse.
2. `QUEUE.md` is empty — do not invent an item. Anything new needs a
   `TASK.md`/`BACKLOG.md` entry first.
3. Run the gate before any commit: `npm run check && npm run typecheck &&
   npm run e2e`.
4. `program.js` numbers stay read-only.

## Notes for the next session (model switch)
- `/models` applies to this session on the **next turn**; a request already in
  flight keeps the model it started with. Config is not rewritten by the pick.
- Reused subagent sessions keep their old pin — pass `<provider>/<model>`
  explicitly on a new dispatch, no `#variant`.
- Playwright here needs `channel: "chrome"` (the bundled headless shell is not
  installed). `file://` URLs can't register a service worker, so `sw.js` logic
  was validated by a mocked `self`/`caches`/`fetch` eval, not in a browser.
