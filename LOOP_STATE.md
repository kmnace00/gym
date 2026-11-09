# LOOP_STATE — checkpoint

Status: BATCH 1 QUEUED — L1 active.
Loop: Batch 1 (L1–L5) approved by Khang Nov 8, 19:41 CT, after
Muse re-checked each item against Pass 4 source. `TASK.md` has L1
active; `QUEUE.md` holds the full batch. OpenCode prompt is live
in the repo (`OPENCODE_LOOP_PROMPT.md`) — Khang pastes it into
OpenCode once and it works the queue.

## Last verified

- HEAD: `a18272b` — framework push (on Pass 4 `cbbf6a8`).
- Pass 4 verified: 85 unit / 35 e2e green, typecheck clean,
  SW `gym-v7`, schema v3 (key still `gym-tool-v2`), 24 lifts
  intact. Pages: https://kmnace00.github.io/gym/
- Re-check (Muse, Nov 8, read against Pass 4 source): L1 revised
  to the pure slice (full controller extraction is T2, new
  backlog L9); L2 timing looks correct in source, needs e2e
  proof, overhead-extension flag is the one outlier; L3 now
  measurable via `sessionLog` but expect "insufficient data";
  L4 has concrete sub-44px targets; L5 has precise probes
  (`__proto__` via merge, `1e999`, hostile session lifts).

## Current / next

- Current item: L1 — rest decisions into `rest.js` (pure slice).
- Next in queue: L2 → L3 → L4 → L5 (`QUEUE.md`, in order).
- Blocked on: Khang pasting the loop prompt into OpenCode.
  After the batch, Muse reviews (ping "check the loop").

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
