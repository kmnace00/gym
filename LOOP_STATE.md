# LOOP_STATE — checkpoint

Status: BATCH 1 IN PROGRESS — L1, L2 shipped; L3 built and green,
awaiting auto-sync push; L4 next.
Loop: Batch 1 (L1–L5) approved by Khang Nov 8, 19:41 CT, after
Muse re-checked each item against Pass 4 source. `TASK.md` has L3
active; `QUEUE.md` holds the full batch. OpenCode prompt is live
in the repo (`OPENCODE_LOOP_PROMPT.md`) — Khang pastes it into
OpenCode once and it works the queue.

## Last verified

- L3 build (OpenCode, Nov 8 20:10 CT): pure `Stats.sessionDrift`
  added + 5 unit tests; fixture-only audit (model 74/69/72 min for
  Fri/Sat/Sun), real-data verdict pending — no sessions recorded
  yet and this session cannot read the phone's localStorage. No
  constants or UI change. SW `gym-v9` (stats.js changed).
  `npm run check` **93/93 unit**, `npm run typecheck` clean,
  `npm run e2e` **38/38** at 390×667/844. Commit: `pending`.
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

## Current / next

- Current item: L3 — built, checks green; waiting for the
  gym-sync commit to appear on origin/main before starting L4.
- Next in queue: L4 → L5 (`QUEUE.md`, in order).
- After the batch, Muse reviews (ping "check the loop").

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
- `PAUSED`: no. (Khang says "pause the loop" → Muse sets this to yes;
  OpenCode finishes the current item, then stops.)

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
