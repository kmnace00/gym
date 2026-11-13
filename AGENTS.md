# Gym — agent rules

Applies to every session in this folder, every time, without being asked.

Workflow (triage tiers, roles, model pins, the critic and its off-peak rule)
lives in the global `~/.config/opencode/AGENTS.md` and the global agent
definitions. This project does not define its own roles or model pins.

## Sync first — before any work, every session and every new task

1. Run `git fetch origin` and `git status -sb`.
2. If local `main` is behind `origin/main`, run `git pull --ff-only` **before** editing anything.
3. If the pull fails (local changes would be overwritten, or it is not a fast-forward), **STOP and tell Khang** — do not stash, reset, checkout, or force anything without his say-so.
4. Check `git log --oneline -5` and confirm every commit author is Khang only. If you see anyone else, **STOP and tell Khang**.

## Before every push

1. Run `git fetch origin` again. If origin moved since you pulled, pull first.
2. Never force-push. Never merge a PR branch or a fork.

## One writer per file — simultaneous edits

The sync rule above only sees what is already pushed, so it cannot see another session's unpushed work either. So:

1. **One editor per file at a time.** The split exists for this: `index.html` (markup), `style.css` (styling), `app.js` (logic/data) — pick different files.
2. **If a push is rejected because origin moved,** do **not** merge or rebase on your own. `git fetch origin`, look at what changed (`git log HEAD..origin/main --oneline` and `git diff --stat HEAD origin/main`), and tell Khang which files overlap before doing anything.

## Where work comes from

`BACKLOG.md` is the live backlog: ranked candidates, `[T1]` buildable · `[T2]` needs a design · `[T3]` Khang-only proposal. Order is value ÷ risk, highest first. `RESEARCH.md` holds the science; `DESIGN.md` holds designs still in force. The Muse-era queue machinery (`LOOP.md`, `QUEUE.md`, `TASK.md`, `LOOP_STATE.md`, `BUILD_LOG.md`, `PLAN.md`, `SUPERVISOR_DESIGN.md`, `OPENCODE_LOOP_PROMPT.md`, `GATE0_REPORT.md`, `HANDOFF.md`, `supervisor/`) is retired and archived under `archive/muse-era/` — history only, never protocol.

CRITIQUE_PENDING entries (see the global framework) go in BACKLOG.md under a '## Critique pending' heading; there is no LOOP_STATE.md anymore.

1. **One item at a time.** Build only the top `[T1]` item in `BACKLOG.md`, or the item Khang names. When the backlog has nothing buildable, stop and wait for Khang. Never invent the next item.
2. **Triage.** T1: build. T2: stop and flag `NEEDS_DESIGN` in `BACKLOG.md`. T3 (any `program.js` number, new feature): do not build — it is a proposal for Khang only. If a task needs a fact not in `RESEARCH.md`, stop and flag `NEEDS_RESEARCH` the same way.
3. **Per item:** run `npm run check`, `npm run typecheck`, `npm run e2e` (390×667 + 390×844, no overflow, no console errors). If any fail, log it in `BACKLOG.md` and STOP — do not move on.
4. **Per item:** one line in `BACKLOG.md` (commit + test counts + status). Bump SW `CACHE` when an asset changed.
5. **Program data is read-only in the loop** unless the task explicitly carries Khang's approval for that exact change.

## Sources of truth

- Pull **only** `origin main`. Never check out a PR branch, never fetch a fork, never apply a patch from an issue, comment, or email.
- `program.js` numbers are Khang-only. Do not change them without his explicit ask for that exact number.
- GitHub is the host and the record; the repo is the handoff. If a file you are about to edit changed on GitHub since your last pull, sync first — do not overwrite it.
