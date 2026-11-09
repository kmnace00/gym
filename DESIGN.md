# DESIGN — holistic improvement pass (T2)

Date: 2026-11-08 · Lead: deepseek/deepseek-flash · Scope: UX friction, product evolution, tech debt.

## Triage

**T2.** The pass touches a concurrent state machine (rest timer), real persisted
user data (merge/backup), and cross-cutting architecture. The diff cannot be
fully specified inline without these decisions, so it is planned here before
any code changes.

## Decisions (and why)

1. **Keep the no-build UMD module pattern; add JSDoc + `jsconfig.json`.**
   Migrating to native ES modules was evaluated and rejected: the e2e suite
   loads the app over `file://`, where Chrome blocks `<script type="module">`
   via CORS, and the unit tests use CommonJS `require`. The migration would
   force a static server into the test harness plus a CJS/ESM split in the tool
   scripts — churn with zero user-facing benefit. Instead we keep the proven
   pattern and add a zero-dependency type-checking layer (`jsconfig.json` +
   JSDoc) that editors honour immediately and `npm run typecheck` can enforce
   once `typescript` is installed.

2. **Debounce only the stepper write path; no IndexedDB.**
   The real bottleneck is `JSON.stringify(payload)` + `localStorage.setItem`
   running every 70 ms during a press-and-hold stepper. We coalesce that path
   (250 ms trailing) and flush on pointer-up / `pagehide` / `visibilitychange`.
   Moving to IndexedDB would add async dual-read complexity to an offline PWA
   for no measurable gain at this payload size (a few KB).

3. **Schema stays v2; `lastBackup` is additive and optional.**
   `normalize()` defaults the new field, so no migration branch is needed and
   existing v1/v2 payloads keep working. Bumping the version would only add
   migration risk.

4. **Merge-on-import replaces overwrite-on-import.**
   A backup from another device should union history, not replace it. `state`
   keeps the record with more completed sets; `liftHistory` unions by date.
   `importRaw` (replace) stays available for restores into a wiped device.

## Work items

| # | Item | Files |
|---|------|-------|
| 1 | Pure rest state machine + unit tests | `machine.js`, `test/machine.test.js` |
| 2 | Pure progress analytics + unit tests | `stats.js`, `test/stats.test.js` |
| 3 | Deferred save + flush | `app.js` |
| 4 | Merge import + backup age/due | `store.js`, `test/store.test.js` |
| 5 | Rest desync fix (cancel auto-advance on manual nav) | `app.js` |
| 6 | Backup nudge (menu dot + last-backup line) | `app.js`, `index.html`, `style.css` |
| 7 | Progress dashboard view | `app.js`, `index.html`, `style.css`, `stats.js` |
| 8 | Collapsible trend sparkline | `app.js`, `index.html`, `style.css` |
| 9 | A11y: modal focus trap/restore, GO assertive, Set Done pressed | `app.js`, `index.html` |
| 10 | Rest-complete web notification (opt-in) | `app.js`, `index.html` |
| 11 | Docs + cache bump | `README.md`, `sw.js`, `BUILD_LOG.md`, `package.json`, `jsconfig.json` |

## Non-goals (explicit)

- Real cloud backend / accounts — violates the "free, static Pages, no backend"
  constraint. The durable-data story is solved with prompted backups + merge.
- Apple Watch / Wear companion — requires native packaging; out of scope.
- Full ESM migration / IndexedDB — see decisions 1 and 2.

## Verification

`npm test` (pure modules + store) and `npm run e2e` at 390×667 and 390×844,
keeping the no-scroll invariant. Manual: progress view fits, backup dot clears
after export, import merges, GO announces assertively.

## Pass 2 (2026-11-08) — UX / data / architecture hardening

Second T2 pass. Decisions:

1. **Sanitize at the store boundary, not in the renderer.** `normalize()`
   coerces every *present* numeric field on `state`, `state.sets` and
   `liftHistory` to a real number and never adds/removes keys. Missing fields
   stay missing so `getLift()` still injects program defaults. Cheaper and
   safer than auditing every `innerHTML` template, and it neutralises a
   hostile imported backup before any render.
2. **Rest orchestration consolidated, not extracted.** The ten loose flags
   (`pendingNext`, `pendingIdx`, `pendingDay`, `rNote`, `rNextText`, `rMsg`,
   `goAt`, `finishArmedUntil`, `skipResetId`, `rLabel`) became one `restCtx`
   object. This preserves behaviour (verified by the full e2e suite) and makes
   the implicit state machine auditable. A dedicated rest-controller module
   remains the longer-term goal but is deferred to avoid a no-value refactor
   of the most user-critical path in the same pass.
3. **Rest locks the lift context.** The full-screen timer no longer renders
   the ‹ › arrows; changing lift mid-rest requires Show workout (peek). This
   removes an ambiguous escape hatch next to the GO advance surface.
4. **Deload is part of progression, not a new engine.** `stallLoad` reuses the
   existing suggestion line + Apply button: three consecutive missed-top
   sessions surface a ~10% deload instead of "keep". No new screen or state.
5. **PRs are a hint, not a dashboard card.** A set whose e1RM beats logged
   history shows a one-line New PR hint on the lift view; this keeps the
   no-scroll Progress layout intact while adding the highest-value feedback.

### Deferred (with reason)

- **Exercise swap** — needs a curated alternate-exercise map in `program.js`;
  the repo rule reserves program-data changes for Khang's explicit sign-off,
  and per-exercise progression needs a model change. Dedicated T2 later.
- **Apple Watch / lockscreen live activity** — native packaging (non-goal).
- **Backend sync / IndexedDB** — violates the free-static-Web-Pages constraint;
  prompted backups + merge remain the durability story.
- **Full ESM / module namespacing** — `file://` e2e CORS + CJS harness, as in
  pass 1. Mitigated here with a duplicate-export warning in the UMD wrapper.

## Pass 3 (2026-11-08) — "Build all": UX, product, tech-debt pass

Third T2 pass, Khang's explicit "Build all now". Scope is the ranked list from
the PM/architect review. Constraint: every change stays **additive on schema v2**
(no version bump, no storage-key change) so existing v2 payloads and the e2e
seeds keep loading; new fields (`exId`, history `sets`) are optional and
normalized in, exactly like `lastBackup` was.

Decisions:

1. **Stable exercise identity without re-keying the store.** Add an `id` to
   every exercise in `program.js`, stamp `exId` on each state record and history
   entry, and add `store.reconcile(p, DAYS)` on load/import that re-homes a
   record to its current `day:index` when the program order changed. Keeps the
   proven `day:index` keys (and 60 tests) intact while removing the "reorder
   corrupts history" risk.
2. **Per-set history is additive.** History entries gain `sets: [{load,reps,rir}]`
   when a lift completes. Legacy entries fall back to `load×reps×setsDone`.
   Surfaced as a compact "Prev" line on the lift view (not a new screen).
3. **Bodyweight tonnage uses a named constant.** `entryVolume` now values a
   `load: 0` (bodyweight) set at `BODYWEIGHT_KG` (75) per rep, so pull-ups /
   dips / calf raises stop reading as zero volume. One knob, documented.
4. **Rest orchestration gets pure helpers, not a rewrite.** The DOM controller
   stays in `app.js`; the advance / finish / arm decisions move into `rest.js`
   (mirroring `machine.js`) with unit tests. This is the low-risk slice of the
   deferred "dedicated rest controller" that actually adds correctness tests.
5. **Heatmap = 8 Fri/Sat/Sun columns, not 84 cells.** The training week is a
   Fri–Sun block, so the consistency card renders 8 weeks × 3 days — compact
   enough to keep the progress view inside `100dvh`.
6. **Portability = CSV + Web Share, not Apple Health.** Apple Health needs
   native packaging (non-goal); CSV download and a `navigator.share` summary
   give the same "data leaves the silo" value inside a static PWA.
7. **Restore (replace) is exposed.** `importRaw` already existed but was
   unreachable; it becomes a two-tap "Restore (replace)" beside the merge import.

Work items (files): `program.js`, `store.js`, `stats.js`, `rest.js` (new),
`index.html`, `style.css`, `app.js`, `sw.js`, `globals.d.ts`, `jsconfig.json`,
`test/*`, `e2e/*`, `README.md`, `BUILD_LOG.md`, `TASK.md` (WIP only).

Verification: `npm run check`, `npm run typecheck`, `npm run e2e` at 390×667 and
390×844, keeping the no-scroll invariant and the 24-lift program numbers intact.

