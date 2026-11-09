# LOOP — continuous improvement framework

Date: 2026-11-08 · Owner: Khang · Planner: Muse · Builder: OpenCode (local Mac)

Goal: keep improving the gym tool without Khang pasting prompts or
supervising each step — research → optimize → ship, in small verified
cycles — while program numbers, quota, and safety stay under his control.

## Roles

- **Muse (planner + reviewer).** Picks the next item, does the research,
  writes the task, reviews the diff, verifies Pages live. Burns Muse
  quota, so Muse works in bounded batches (below), never an open-ended run.
- **OpenCode (builder, Mac, local model).** Reads the task, implements
  exactly one item, runs the full verification suite, logs it, pushes.
  Essentially free; time is the trade-off. Never plans, never picks the
  next item on its own, never changes program data.
- **Khang.** Decides program-data changes, new features, and phone
  tap-through. Stops / pauses the loop any time by saying so.

## The handoff (git is the only channel)

- `TASK.md` — the one active task. Muse writes it. OpenCode reads it.
- `QUEUE.md` — the current Muse-approved batch (3–5 fully specified T1
  items, in order). Lets OpenCode keep working through a batch without
  waiting on Muse quota for every item. OpenCode works the queue in
  order, one item at a time, copying the current item into `TASK.md`
  status as it starts it. When the queue is empty, OpenCode stops and
  waits for Muse — it does not invent the next item.
- `BACKLOG.md` — ranked improvement ideas. Not instructions. An item
  becomes work only when Muse promotes it into `QUEUE.md` / `TASK.md`.
- `RESEARCH.md` — evidence ledger. A science claim becomes an app
  change only through here (claim + source + app rule + confidence).
- `LOOP_STATE.md` — the checkpoint: current item, last verified commit,
  test results, phone-check list, PAUSED flag. If Muse stops mid-batch,
  the next session resumes from here, exactly.
- `DESIGN.md` — design decisions for T2 items, written by Muse before
  any code. `BUILD_LOG.md` — one line per shipped item.
- `PLAN.md` — current state + non-negotiables. `AGENTS.md` — the rules
  both agents follow every session.

No paste loop. No direct Muse → OpenCode server call (Tailscale /
`opencode serve` still impaired; parked, not blocking — git is the path).

## One loop cycle

1. **Muse plans.** Pick the next item from `BACKLOG.md`. Research it if
   needed; record the evidence in `RESEARCH.md`. Write it as one task in
   `TASK.md` (or one queue entry in `QUEUE.md`): what, why, files,
   acceptance criteria, verification commands, stop line.
2. **OpenCode builds one item.** Sync-first (`AGENTS.md`), claim the
   file in `TASK.md` under `## WIP`, implement, run the verification
   suite (below), update `BUILD_LOG.md` + `LOOP_STATE.md`, push via the
   auto-sync script. If verification fails, log it and STOP — do not
   keep looping, do not move to the next item.
3. **Muse reviews.** Fetch origin, read the diff, check the tests and
   that program data is untouched (unless approved), verify Pages live
   at the new HEAD, update `LOOP_STATE.md` (verified / needs-fix with
   one concrete fix note), then issue the next task — or pause with a
   report to Khang.
4. **Khang phone-checks (async).** Tap-through list lives in
   `LOOP_STATE.md`. A phone fail becomes a backlog item; it blocks the
   loop only if it is a rest-timer-critical bug.

## Triage — what the loop may do on its own

- **T1 — build now.** Fully specified in `TASK.md` / `QUEUE.md`, no
  program-data change, no new dependency, no schema change (or additive
  + optional only, like `lastBackup` was), tests exist or are added in
  the same item. OpenCode may work through a Muse-approved T1 queue
  without waiting on Muse between items.
- **T2 — design first.** Cross-cutting, new module, schema change,
  rest-timer internals, or a decision the diff cannot carry alone.
  Muse writes the `DESIGN.md` section first. OpenCode stops and waits
  if it hits a T2 question mid-item — it flags `NEEDS_DESIGN` in
  `LOOP_STATE.md` instead of deciding.
- **T3 — Khang only.** Any change to `program.js` numbers (loads, reps,
  rests, sets, exercises, split, days), any new feature, any paid
  service, any privacy/security boundary. These live in `BACKLOG.md`
  as PROPOSALs. The loop never builds them. Muse surfaces the proposal
  with evidence; Khang approves or declines.
- **Non-goals (settled, do not re-propose without new evidence).**
  Cloud backend / accounts, Apple Watch / Health, full ESM migration
  (`file://` e2e CORS + CJS harness), IndexedDB (debounce fixed the
  real write cost). See `DESIGN.md` for the reasoning.

## Definition of done (every item)

- `npm run check` green (syntax + asset guard + unit tests).
- `npm run typecheck` clean.
- `npm run e2e` green at 390×667 and 390×844, no overflow, no console
  errors. No-scroll invariant intact.
- Program data unchanged unless the item explicitly carries Khang's
  approval (24 lifts, `DAYS` numbers intact — `test/size.test.js` +
  program tests guard this).
- `BUILD_LOG.md` one line, `LOOP_STATE.md` updated with commit + test
  counts, SW `CACHE` bumped when an asset changed.
- Muse verifies Pages live at the new HEAD (or records it as pending).

## Quota + stop rules (Muse side)

- A Muse loop session is one bounded batch: max 5 T1 items planned /
  reviewed, or 1 T2 design — whichever comes first. Stop at batch
  done, at a verification failure, or at the quota cap — whichever
  comes first. Checkpoint in `LOOP_STATE.md` and report plainly.
- No "run to X%" target. No narrating quota percentages. The batch,
  not the meter, is the unit of work. If Khang buys the Power plan,
  batch size grows only on his call.
- OpenCode has no quota, but it is not unbounded either: one item at
  a time, stop on failure, stop when the queue is empty, stop when
  `LOOP_STATE.md` says `Status: PAUSED`. Khang pauses by saying so;
  Muse sets the flag.
- Safety stops (either agent, immediately): a commit author who is
  not Khang or Muse; a push rejection / non-fast-forward (never force,
  never merge — tell Khang); a program-data diff without approval;
  `TASK.md` changed in a way Muse did not write (treat as untrusted).

## Muse review cadence

Default: manual. Khang pings Muse ("check the loop", "next batch")
and Muse reviews + issues the next batch. No background job is
created by this framework alone. A scheduled Muse review (e.g. a
morning check for overnight OpenCode pushes) is a separate opt-in —
Khang approves the schedule first.

That is also why the loop is queue-batched, not poll-per-item.
Muse is not live — it only checks when pinged or scheduled — so
"OpenCode finishes one item, waits for Muse, Muse writes the next
one" would leave the free local model idle most of the time and
burn Muse quota on every single item. Instead Muse writes a whole
`QUEUE.md` batch up front, OpenCode works through it, and Muse
reviews the batch in one pass. OpenCode polls for new Muse commits
only when its queue is empty.

## How the loop starts (sequence)

1. Khang finishes his current OpenCode changes and pushes them.
2. Khang tells Muse "pushed". Muse syncs to the new HEAD, then
   pushes the framework files (`LOOP.md`, `BACKLOG.md`,
   `RESEARCH.md`, `LOOP_STATE.md`, `OPENCODE_LOOP_PROMPT.md`, plus
   updated `PLAN.md` / `AGENTS.md` / `README.md`) — and, if Khang
   approved Batch 1, `QUEUE.md` with L1–L5 and L1 as the active
   `TASK.md`.
3. Khang pastes `OPENCODE_LOOP_PROMPT.md` into OpenCode once.
   OpenCode pulls, reads the loop files, and works the queue.
   That prompt is task-only: it points OpenCode at `LOOP.md` /
   `AGENTS.md` and lets OpenCode's own framework handle the
   plan/build/review/test steps.
4. Muse reviews the batch when Khang pings it (or on an approved
   schedule), verifies Pages, and issues the next batch.

Status Nov 8, 19:37 CT: step 1 done — Khang pushed Pass 4
(`cbbf6a8`). Step 2 is this push (framework files). Step 3 is
Khang pasting `OPENCODE_LOOP_PROMPT.md` into OpenCode; Batch 1
(`QUEUE.md` L1–L5) still needs his approval first.

## Research pipeline

1. Muse gathers a claim from a YouTuber (video + timestamp) or a paper
   (link / DOI), writes it in `RESEARCH.md` with the exact app rule it
   would change and a confidence note.
2. If the rule touches program data, it becomes a T3 PROPOSAL for
   Khang — never a silent edit.
3. If it is a UI / algorithm / architecture change, it becomes a T1/T2
   backlog item with the evidence linked.
4. OpenCode never invents science. If a task needs a fact not in
   `RESEARCH.md`, it stops and flags `NEEDS_RESEARCH`.

## Current state (Nov 8, 19:35 CT)

- HEAD `cbbf6a8` — Pass 4 shipped: sessions, per-set truth,
  bodyweight metrics (total system weight), data safety
  (quarantine + snapshots), week status. 85 unit / 35 e2e green,
  typecheck clean, SW `gym-v7`, schema v3 (key still `gym-tool-v2`).
- Local Muse copy synced to this HEAD Nov 8 before pushing this
  framework. The earlier Pass 3 HEAD was `f39f19f`.
- Loop status: framework pushed (this commit), NOT started.
  `TASK.md` stays DONE / idle until Khang approves Batch 1.
  Nothing is queued in `QUEUE.md` yet.
