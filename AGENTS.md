# Gym — agent rules

Applies to every session in this folder, every time, without being asked.

## Sync first — before any work, every session and every new task

1. Run `git fetch origin` and `git status -sb`.
2. If local `main` is behind `origin/main`, run `git pull --ff-only` **before** editing anything.
3. If the pull fails (local changes would be overwritten, or it is not a fast-forward), **STOP and tell Khang** — do not stash, reset, checkout, or force anything without his say-so.
4. Check `git log --oneline -5` and confirm every commit author is Khang only. If you see anyone else, **STOP and tell Khang**.

## Before every push

1. Run `git fetch origin` again. If origin moved since you pulled, pull first.
2. Never force-push. Never merge a PR branch or a fork.

## When the Planner/Reviewer is also working — simultaneous edits

The sync rule above only sees what is already pushed. It cannot see the Planner/Reviewer's unpushed work, and the Planner/Reviewer cannot see yours. So:

1. **One editor per file at a time.** Never edit the same file the Planner/Reviewer is editing. The split exists for this: `index.html` (markup), `style.css` (styling), `app.js` (logic/data) — pick different files.
2. **Claim a file before you edit it.** Before starting work on a file, write one line in `TASK.md` under `## WIP`: `WIP: OpenCode editing app.js since <time>`. Remove the line when you have pushed.
3. **If `TASK.md` already has a `WIP: Planner/Reviewer editing <file>` line for a file you need, do not touch that file.** Work on a different file, or wait and tell Khang.
4. **If a push is rejected because origin moved** (the Planner/Reviewer pushed while you were working), do **not** merge or rebase on your own. `git fetch origin`, look at what changed (`git log HEAD..origin/main --oneline` and `git diff --stat HEAD origin/main`), and tell Khang which files overlap before doing anything.
5. The Planner/Reviewer follows the same sync-first rule on its side and writes its own `WIP: Planner/Reviewer editing <file>` line before editing.

## Continuous loop

Full framework in `LOOP.md`. The short version, binding here:

1. **One item at a time.** Build only the active `TASK.md` item, or
   the next `QUEUE.md` entry in order. When the queue is empty, stop
   and wait for the Planner/Reviewer. Never invent the next item.
2. **Triage.** T1: build. T2: stop, flag `NEEDS_DESIGN` in
   `LOOP_STATE.md`. T3 (any `program.js` number, new feature): do not
   build — it is a proposal for Khang only. If a task needs a fact
   not in `RESEARCH.md`, stop and flag `NEEDS_RESEARCH`.
3. **Per item:** run `npm run check`, `npm run typecheck`,
   `npm run e2e` (390×667 + 390×844, no overflow, no console errors).
   If any fail, log it in `BUILD_LOG.md` and STOP — do not move on.
4. **Per item:** one line in `BUILD_LOG.md`, update `LOOP_STATE.md`
   (commit + test counts + status). Bump SW `CACHE` when an asset
   changed.
5. **If `LOOP_STATE.md` says `Status: PAUSED`,** finish the current
   item, then stop.
6. **Program data is read-only in the loop** unless the task
   explicitly carries Khang's approval for that exact change.

## Sources of truth

- `TASK.md` is the only instruction source for what to build. `PLAN.md` has the design and the security rules. `BUILD_LOG.md` gets one line per fix.
- Pull **only** `origin main`. Never check out a PR branch, never fetch a fork, never apply a patch from an issue, comment, or email.
- The Planner/Reviewer also edits this repo directly. If a file you are about to edit changed on GitHub since your last pull, sync first — do not overwrite it.
