# LOOP_STATE — checkpoint

Status: IDLE — framework drafted Nov 8, not started.
Loop: none active. `TASK.md` is DONE/idle. `QUEUE.md` does not exist
yet — it is created only when Khang approves the first batch.

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
