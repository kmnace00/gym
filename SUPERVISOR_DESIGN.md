# SUPERVISOR_DESIGN — a launchd waker for the gym loop

Date: 2026-11-09 · Status: **DRAFT — design only. Nothing is installed,
nothing on the Mac has been changed, and `LOOP.md` is not amended
until Khang approves this design and the build gates below pass.
Gate 0 COMPLETE 2026-11-09 (see §10) — spawn method decided: A.**
Owner: Khang · Planner: Planner/Reviewer · Builder: OpenCode (local Mac)

## 1. The problem this solves — and only this problem

GitHub stays the medium. `LOOP.md`, `TASK.md`, `QUEUE.md`,
`LOOP_STATE.md`, the T1/T2/T3 triage, and the Planner/Reviewer's 15-minute review
hook all stay exactly as they are. What is broken is one narrow
thing: **who wakes the builder when a new batch lands.**

Evidence, all from Nov 9:

- Batch 4 was queued at 17:36 CT (commit `7c29a9f`). One hour later
  HEAD had not moved. OpenCode's own 5-minute watch
  (`sch_1c22d75f8001brE544zgavnnP9`) never fired — roughly 12 missed
  checks. Khang had to be told to paste the loop prompt into a fresh
  session.
- The watch was created by, and lived inside, an OpenCode session.
  Sessions checkpoint and stop for length (Batch 3 checkpointed
  after B3-10). A waker owned by a disposable session dies with it —
  silently. The revised paste prompt's "VERIFIED" step can *detect*
  that failure after the fact; it cannot prevent it.
- Secondary, suspected not proven: two intermediate Batch 3 commits
  failed CI (`58a4015` failed check instantly at 14:53 CT;
  `73635f9` failed e2e at 14:22 CT) while the final gate is green.
  Working hypothesis: the ~60 s gym-sync tick committed files
  mid-edit. Any design that adds a builder must not add a second
  mid-edit commit path.

**Design conclusion:** the waker must live outside OpenCode, outside
any session, and on the Mac — because that is where the builder is,
and because the Planner/Reviewer cannot run shell or tests on the Mac (paired-device
access is file read/write only). macOS already ships the right
supervisor: launchd — the same mechanism gym-sync already runs under.

## 2. Goals / non-goals

Goals:

1. A batch queued by the Planner/Reviewer starts building with **zero action from
   Khang** — no paste, no ping, no fresh session.
2. If the waker dies, it comes back on its own (launchd), and if the
   builder dies mid-batch, the next batch is not silently lost.
3. Fully reversible: uninstall returns the loop to today's
   paste-prompt behaviour with no repo damage.
4. No new trust surface (see §8, hardening preserved verbatim).

Non-goals:

- No direct Planner/Reviewer → OpenCode call, local or remote. Tailscale /
  `opencode serve` from the Planner/Reviewer's side stays parked, as Khang set it.
- No change to what gets built: triage, queue order, verification
  suite, and stop rules in `LOOP.md` are untouched.
- No real-time anything. A 2-minute wake latency is fine; batches
  run 30 min – 2 h.
- Not a general agent framework. This serves `kmnace00/gym` only;
  generalising is a later decision, with a second project as evidence.

## 3. Architecture

```
The Planner/Reviewer (planner/reviewer)                    Khang (owner)
   │  queues batch, reviews batch               │  T3 / pause / approvals
   ▼                                            ▼
        GitHub — kmnace00/gym, main only  (durable ledger)
   ▲                                            │
   │ commits at item boundaries                 │ git fetch
   │                                            ▼
┌──┴─────────────────────────────────────────────────────────┐
│ Mac — /Users/khang/gym (working copy, path: Gate 0 check)  │
│                                                            │
│  launchd (StartInterval 120 s)                             │
│     └─ supervisor.py — one tick, then exits (§4)           │
│           ├─ state + lock + logs: ~/.gym-supervisor/       │
│           ├─ lease gate → gym-sync (§6)                    │
│           └─ spawns ONE fresh builder (§5)                 │
│                └─ OpenCode (default model, unchanged)      │
│                     └─ local Qwen — builds, tests, logs    │
└────────────────────────────────────────────────────────────┘
```

Key properties:

- **launchd is the supervisor, not a daemon I write.** The script is
  a *tick*: it runs, decides, and exits. There is no long-lived
  process of mine to hang, leak, or die quietly. launchd re-runs it
  every 120 s, at load, and after the Mac wakes.
- **The builder is disposable.** One fresh OpenCode run per batch.
  It never polls, never waits, never arms a watch — prompt steps 4
  and 8 of the current loop prompt are *deleted* for supervised
  runs, replaced by "work the queue, then exit" (§5).
- **All durable state stays in git.** Supervisor-local state is only
  bookkeeping (last HEAD seen, builder PID, lease). If
  `~/.gym-supervisor/` were deleted entirely, the next tick would
  rebuild it from the repo and lose nothing but time.

## 4. The tick (supervisor.py, stdlib-only Python 3, ~250 lines)

One tick, in order. Any step can end the tick with a logged,
one-line reason. Exit code is 0 for every "nothing to do" outcome.

1. **Lock.** `fcntl.flock` on `~/.gym-supervisor/tick.lock`,
   non-blocking. Already locked → another tick is running → exit.
   This is the duplicate-spawn guard at the supervisor level.
2. **Kill switch.** If `~/.gym-supervisor/PAUSED` exists → exit.
   (Khang's local, instant off-switch, independent of git.)
3. **Builder already running?** If the lease (§6) names a live PID
   whose log has been written within the inactivity window → exit.
   If the PID is dead or the log has been silent past the window →
   mark the lease stale, log `BUILDER_LOST` with the item ID, and
   continue to step 4 (the batch, if unfinished, gets a fresh
   builder — resuming from `LOOP_STATE.md`, exactly as a fresh paste
   does today).
4. **Fetch.** `git fetch origin` in the Mac working copy.
   Unreachable → exit, retry next tick. No state changes.
   **Watermark rule (root cause of the Nov 9 watch failure):**
   work-detection compares `origin/main` against the supervisor's
   *own* stored watermark in `state.json`, captured here — never a
   `git diff HEAD..origin/main` after the fact. Gate 0 found the
   old watch `sch_1c22…` alive and checking 48 times with 0 runs:
   its condition was exactly that diff, and repo-sync's clean-tree
   fast-forward pulls kept erasing the diff before the watch saw
   it. A detector that races its own syncer will never fire.
5. **Safety pre-checks** (mirror `AGENTS.md`, in code, before any
   pull): HEAD authors are Khang only; branch is `main`;
   origin has not diverged. Any failure → write an `ALERT` line to
   the supervisor log + a macOS notification, exit, and do not pull,
   spawn, or touch the tree. Never stash, reset, or force — ever.
6. **Pull.** Working tree clean + behind origin → `git pull
   --ff-only`. Dirty tree with no live builder lease → exit and log
   `DIRTY_TREE` (that is Khang editing by hand; the supervisor never
   competes with him). Dirty + diverged → same alert path as step 5.
7. **Is there work?** Parse the active-work signal (§7). No active
   batch → record HEAD as seen, exit. `LOOP_STATE.md` says
   `PAUSED` → exit.
8. **Pre-flight.** The local model endpoint answers:
   `curl -m 5 http://127.0.0.1:8010/v1/models` → HTTP 200 (Gate 0
   verified; the server has no `/health` route — `/v1/models` is
   the check; model `qwen3.8-flash-next`, launchd `com.dstar.serve`
   loaded). The OpenCode CLI exists at `~/.opencode/bin/opencode`
   (v2.2.5; Gate 0 environment: macOS 27.2 arm64, Python 3.14.6,
   Node v26.13.0). Either fails → log, notify, exit — never spawn
   a builder that cannot run.
9. **Spawn.** Start one builder (§5), write the lease, log
   `SPAWN batch=<id> item=<first item> head=<sha>`, exit. The tick
   does not wait for the builder to finish.

## 5. Spawning the builder — DECIDED at Gate 0: A

**A. `opencode run` (headless CLI) — the spawn method.** Gate 0
evidence (Nov 9, `GATE0_REPORT.md`, commit `b5f85ea`): a headless
run with the configured default model (`ds4/qwen3.8-flash-next`,
agent `build`) exited 0 in 47 s and produced exactly the requested
file, with no model flag and no permission intervention. There is
no `--directory` flag — the project root is the process CWD, so
the supervisor spawns with CWD = the Mac repo. `--format json` is
available if structured logs are ever wanted.

**B. `opencode serve` — rejected.** On v2.2.5 the legacy routes
(`/global/health`, `/session`) fall through to the web-app
catch-all and return SPA HTML; the real API is under `/api/...`
and returns 401 without the server's auto-generated basic-auth
password (`/api/health` 404s even with auth). Workable with
password handling, but strictly worse than A for this job. This
also retroactively explains the "impaired" remote server path: the
routes the old bridge design probed no longer exist in v2.

Two spawn details Gate 0 surfaced:

- `opencode run` reuses the desktop app's background service
  (listening on an ephemeral localhost port), rather than starting
  its own. If Gate 2 shows a run failing when that service is
  absent, the fallback is the `--standalone` flag (private server
  per run) — test then, don't pre-build it.
- Start **without** `--auto`. Test A wrote a file with no
  permission prompt and no `--auto`; least privilege wins. Only if
  Gate 2's attended item blocks on a permission prompt does
  `--auto` come back to Khang as a decision.

The spawn shape:

- CWD = the Mac repo. Model/config untouched — the run uses
  OpenCode's configured default (Slotstream pool stays at its
  settled 24 GB; no config change of any kind).
- The prompt is generated from a file in the repo,
  `SUPERVISOR_PROMPT.md` — the current loop prompt **minus** the
  waiting/watch steps, **plus** three lines: work the queue in
  order; commit per §6; when the queue is empty or a stop condition
  in `LOOP.md` fires, checkpoint `LOOP_STATE.md` and **exit**.
- Stdout/stderr → `~/Library/Logs/gym-supervisor/builder-<batch>-
  <YYYYMMDD-HHMMSS>.log`, rotated at 10 files.
- Limits (defaults, Khang-adjustable): per-item inactivity timeout
  45 min (no log write and no new commit); batch wall-clock cap 4 h.
  On either: kill the builder process group, log `TIMEOUT` with the
  item ID, notify. A killed builder loses at most the current item —
  previous items are already committed (§6).

## 6. Commits and the lease — fixing the mid-edit race

Today gym-sync commits whatever is dirty at its tick, which is the
prime suspect for the red intermediate CI runs. Under supervision
there must be **exactly one committer at a time**:

- The lease is a Mac-local file, `~/.gym-supervisor/lease.json`:
  `{pid, batch, item, started_at, head_at_spawn}`. It exists only
  while a builder runs. It is **never committed** — per-minute
  heartbeat commits would churn the repo and trip the Planner/Reviewer's hook.
- **No sync-script edit is needed — Gate 0 found the mechanism
  already built in.** Corrections to what this design assumed:
  there is no `gym-sync.sh`. The real system is launchd job
  `com.khang.repo-sync` (60 s, RunAtLoad) running `sync-all.sh` →
  `project-sync.sh` once per repo in `sync.d/*.conf` (gym:
  `gym.conf`). It commits any dirty tree (`git add -A`) but only
  after a 12-second quiet window (`SYNC_QUIET`), pulls `--ff-only`
  only when clean, never forces, and has a credential-pattern
  commit guard. Crucially it already honours a **per-project pause
  flag: `~/.gym-sync-pause`** (and a global `~/.sync-pause`) —
  either one makes the pass exit before touching git.
- So the lease gate is: **the supervisor touches
  `~/.gym-sync-pause` when it spawns the builder, and removes it
  when the builder exits** (and when it reaps a stale lease). While
  paused, the *builder* commits and pushes itself at each item
  boundary, after its verification suite passes, and confirms the
  commit on `origin/main` before the next item — the behaviour the
  loop prompt already requires. Pause removed → repo-sync resumes
  exactly as today; Khang's manual edits are unaffected. The
  12-second quiet window explains why the mid-edit race is rare
  rather than constant — a builder thinking for >12 s between edits
  is exactly when repo-sync can snapshot half an item, which is
  what the pause flag eliminates.
- Repo-visible progress stays as today, at item granularity only:
  the `## WIP` claim in `TASK.md` at item start, and
  `BUILD_LOG.md` + `LOOP_STATE.md` at item finish.

## 7. Machine-readable status — additive first, never a flag day

The Planner/Reviewer's existing review hook (`gym-loop-watch.sh`, every 15 min)
wakes on string matches: `Status: ACTIVE` in `TASK.md` and
`queue empty` in `LOOP_STATE.md`. The supervisor must not break
that hook, so:

- **Phase 1:** the supervisor *reads the same strings* the hook
  reads, plus `QUEUE.md` being non-empty. Zero repo-format change.
  Ugly, proven, safe.
- **Phase 2 (separate, later approval):** add YAML frontmatter to
  `TASK.md` — `loop_status / batch / active_item / base_head` —
  written when queuing; OpenCode may transition
  `loop_status` only within an enumerated set
  (`active → idle | needs_design | needs_research | blocked`).
  The human `Status:` line stays as a mirror until both the
  supervisor and the Planner/Reviewer's hook read frontmatter, verified, in the
  same batch. No silent cutover.

## 8. Hardening — preserved, mapped

Every existing rule in `AGENTS.md` / `LOOP.md` maps to a supervisor
behaviour. None is weakened:

| Existing rule | Supervisor behaviour |
|---|---|
| Pull only `origin main`; never PRs, forks, patches | Supervisor fetches `origin main` only; spawn prompt says the same |
| Authors Khang only, else STOP | Tick step 5, enforced in code before pull |
| Never force-push / merge / rebase | Supervisor never pushes at all; builder rules unchanged |
| `TASK.md` is the only instruction source | Supervisor reads task files only; it takes no input from logs, issues, or the network |
| T3 = Khang only; program data read-only | Unchanged — the supervisor cannot queue work, only wake the builder for queued work |
| Queue pushes need Khang's approval | Unchanged, Planner/Reviewer side. Nothing here lets a batch be created without it |
| PAUSED stops the loop | Checked twice: local kill switch + `LOOP_STATE.md` |
| Stop on verification failure | Builder rule, unchanged; supervisor does not respawn a failed batch — a red gate ends the batch, and the Planner/Reviewer reviews it |

One deliberate addition: **the supervisor accepts no inbound
network connection of any kind.** It dials out to GitHub only.
That is the whole network surface.

## 9. Failure modes

| Failure | Behaviour |
|---|---|
| Mac asleep / off when a batch lands | Nothing is lost — git is durable. launchd ticks on wake, fetch sees the new HEAD, builder spawns then |
| Builder crashes / session hits length limit | Lease goes stale (§4.3); next tick respawns a fresh builder that resumes from `LOOP_STATE.md` |
| Builder hangs silently | Inactivity timeout (§5) kills it, logs the item, notifies Khang; no respawn of that batch without review |
| Push rejected / non-fast-forward | Builder stops per `LOOP.md`; supervisor alerts, never merges or forces |
| Foreign author / unexpected `TASK.md` change | Tick step 5 alert, no pull, no spawn |
| `program.js` diff without approval | Builder/CI guard as today; supervisor adds nothing and removes nothing |
| Model server down | Pre-flight (§4.8) refuses to spawn; logs and retries next tick |
| Duplicate tick / duplicate builder | Tick lock (§4.1) + live-lease check (§4.3) + the builder's existing WIP-claim check |
| Khang editing by hand while a batch is queued | Dirty-tree rule (§4.6): supervisor stands down and logs; it never competes with him |
| Supervisor itself misbehaves | Uninstall (§11) restores today's paste loop in under a minute |

## 10. Build gates — nothing goes live in one step

- **Gate 0 — Mac facts. ✅ COMPLETE Nov 9, run remotely by
  OpenCode** (Khang had no physical Mac access; nothing needed
  him — zero `NEEDS_KHANG_THURSDAY` items). Report:
  `GATE0_REPORT.md` on origin/main at `b5f85ea`, independently
  spot-verified (HEAD + redaction). Results: repo path
  `/Users/khang/gym` confirmed; spawn method **A** (§5); model
  pre-flight endpoint settled (§4.8); the sync system is
  repo-sync / `project-sync.sh`, not `gym-sync.sh`, and its
  built-in pause flag replaces the planned script edit (§6); the
  old queue watch was found alive but structurally unable to fire
  (§4.4). Remaining Gate 0 loose end, folded into Gate 2: whether
  `opencode run` works when the desktop background service is
  absent (`--standalone` fallback).
- **Gate 1 — Dry-run.** Install with a `DRY_RUN` flag: ticks log
  `WOULD_SPAWN batch=… item=…` and spawn nothing. Run it across at
  least one real queue push. The Planner/Reviewer compares the log against what
  actually happened.
- **Gate 2 — One item, attended.** Dry-run off, Khang present, one
  T1 item. Verify: spawn, lease behaviour, repo-sync pause flag
  set and cleared, item-boundary commit, clean exit, the
  background-service-absent question (§10, Gate 0 loose end), and
  the Planner/Reviewer's hook waking for the review.
- **Gate 3 — Unattended batch + fault drills.** One full batch
  unattended, plus three drills: kill the builder mid-item; sleep
  the Mac mid-batch; set PAUSED mid-batch. All three must end in
  the §9 behaviour, in the logs.
- **Only after Gate 3:** update `LOOP.md` (add the supervisor as
  the waker, delete "paste the prompt" as the resume path) and
  `OPENCODE_LOOP_PROMPT.md` (supervised variant), in one Planner/Reviewer batch, with Khang's approval. Until then the paste prompt remains
  the fallback and is not deleted.

Testing the supervisor itself: its OpenCode command is a config
value, so the test harness points it at a stub script in a scratch
git repo — ticks, locks, leases, and timeouts are all testable
without a real model, a real batch, or the real repo.

## 11. Install / uninstall footprint

New files, all on the Mac, none in the repo except this design and
(later) `SUPERVISOR_PROMPT.md`:

- `~/Library/LaunchAgents/com.khang.gym-supervisor.plist`
  (`StartInterval` 120, `RunAtLoad` true, logs to the path below)
- `~/.gym-supervisor/supervisor.py`, `state.json`, `tick.lock`
- `~/Library/Logs/gym-supervisor/` (tick log + builder logs)
- No sync-script changes at all: the supervisor creates/removes
  repo-sync's existing `~/.gym-sync-pause` flag around builder
  runs (§6)

Load: `launchctl load` on the plist. **Install note (Gate 1,
Nov 9):** a plist copied through the Planner/Reviewer's Mac file-write arrives
with `com.apple.quarantine` set, and `launchctl load` fails with
"Input/output error". Strip it first (`xattr -d
com.apple.quarantine <plist>`), then load (or use
`launchctl bootstrap gui/<uid>`). Verified working at Gate 1.
Uninstall:
`launchctl unload` + delete the plist — the loop is back to today's
behaviour immediately; remove `~/.gym-supervisor/` at leisure.

## 12. Open decisions for Khang (recommendation first)

1. **Tick interval: 2 min** (recommended) vs 5 min. Cost of 2 min is
   one `git fetch` — negligible; the builder's own former cadence
   was 5.
2. **Spawn mechanism: RESOLVED at Gate 0 — A (`opencode run`)**,
   no `--auto` unless Gate 2 proves a permission block (§5).
3. **Timeouts: 45 min per-item inactivity / 4 h per batch**
   (recommended defaults; Batch 3's longest stretch ran ~2 h).
4. **Sync lease gate: RESOLVED — no decision needed.** repo-sync's
   built-in `~/.gym-sync-pause` flag does it with zero script
   edits (§6).
5. **Failure notifications: macOS notification on the Mac**
   (recommended) vs silent log-only. The Planner/Reviewer's side already surfaces
   finished batches; failures are the gap.

## 13. What this design deliberately does not do

- It does not let the Planner/Reviewer start OpenCode directly, from anywhere.
- It does not let the supervisor create, edit, or prioritise work.
- It does not retire the paste prompt until Gate 3 passes.
- It does not generalise to other projects yet.
