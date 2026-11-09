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

