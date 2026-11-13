# GATE0_REPORT.md — supervisor pre-flight investigation

Run: 2026-11-09 19:14–19:22 local (CST) / 2026-11-10 01:14–01:22 UTC.
Scope: investigation only. No supervisor installed, no OpenCode model/config
changed, no gym app code, `TASK.md`, `QUEUE.md`, or program data touched.
Nothing was installed. Nothing required sudo.

Legend: every item below is factual, with the exact command and output.
`NEEDS_KHANG_THURSDAY` marks an item that could not be answered without a
permission, an install, or a config change.

---

## 0. Pre-flight sync check (required before any work)

```
git fetch origin
git status -sb
```

```
## main...origin/main
```

- No fetch output (no new objects on origin).
- Working tree: **clean** (0 entries from `git status --porcelain`).
- No changes made by anyone other than Khang were present before I started.
- `git log --oneline -5`:

```
1267995 auto-sync: 2026-11-09 19:13 — LOOP_STATE.md TASK.md
fe10135 auto-sync: 2026-11-09 19:10 — BUILD_LOG.md TASK.md
e810dc9 auto-sync: 2026-11-09 19:00 — e2e/pass3.spec.js sw.js test/store.test.js version.js
e4d5550 auto-sync: 2026-11-09 18:58 — app.js index.html store.js style.css
bae10f6 auto-sync: 2026-11-09 18:52 — BUILD_LOG.md LOOP_STATE.md TASK.md
```

- Authors of those 5 commits: all `Khang <kmnace00@gmail.com>`. No third-party
  author. Check passed.

---

## 1. Environment

| Command | Output |
|---|---|
| `sw_vers` | `ProductName: macOS` / `ProductVersion: 27.2` / `BuildVersion: 26B123` |
| `uname -m` | `arm64` |
| `python3 --version` | `Python 3.14.6` |
| `which python3` | `/Library/Frameworks/Python.framework/Versions/3.14/bin/python3` |
| `node --version` | `v26.13.0` |
| `date` | `Mon Nov  9 19:14:42 CST 2026` |
| `date +%Z` | `CST` (America/Chicago, UTC−6 at this date) |

---

## 2. Repo

| Item | Value |
|---|---|
| Working path | `/Users/khang/gym` (confirmed by `pwd`) |
| `git remote get-url origin` | `git@github.com:kmnace00/gym.git` |
| Branch | `main` |
| HEAD sha | `1267995329938b4a5aca1d8b000eb5f55b084a62` |
| `origin/main` sha | `1267995329938b4a5aca1d8b000eb5f55b084a62` (identical — in sync) |
| Status | clean (0 dirty entries) |

---

## 3. OpenCode CLI

```
which opencode      -> /Users/khang/.opencode/bin/opencode
opencode --version  -> opencode v2.2.5
```

### `opencode run --help` — flags that matter for headless use

Prompt/command input:
- `opencode run [flags] [<message...>]` — the message is positional; it can
  also be omitted.
- `--file, -f string` — attach a file to the message.

Session / model:
- `--model, -m string` — `provider/model#variant`.
- `--agent string` — which agent to run (the default ran `build`).
- `--session, -s string` — session ID to continue or create.
- `--continue, -c` — continue the last session.
- `--fork` — fork before continuing.
- `--title string` — session title.

Output / permissions:
- `--format choice` — `default` or `json`.
- `--thinking` — show thinking blocks.
- `--auto` — auto-approve permissions that are not explicitly denied.

Directory: there is **no `--directory`/`--cwd` flag** on `run`; the project
root is the process working directory.

Server connection (global flags):
- `--standalone` — run with a private server instead of the background service.
- `--server string` — connect to a given server URL instead of the background
  service.
- `--log-level`, `--print-logs` (logs need `--standalone`).

### `opencode serve --help`

```
opencode serve [flags]
  --hostname string
  --port integer
  --cors string      (repeatable)
  --service
  --stdio
```

No output-format flag; the server is the HTTP API + web app.

---

## 4. TEST A — headless `opencode run` (default model, no model flag)

Exact command (run from a scratch dir outside the repo):

```
cd /tmp/gate0-run-test
timeout 600 opencode run "Create a file named hello.txt in the current directory containing exactly the text GATE0_OK, then stop."
```

- Directory before: `/tmp/gate0-run-test` (empty).
- **Exit code: 0**
- **Duration: 47 s** (well under the 10-minute cap; no timeout triggered)
- No `--model` flag was passed. The run used the configured default
  (`ds4/qwen3.8-flash-next`, agent `build`) — see the model line in the output.

Result file check:

```
ls -la /tmp/gate0-run-test
-rw-r--r-- 1 khang wheel  8 Nov  9 19:15 hello.txt

wc -c hello.txt  -> 8
cat hello.txt    -> GATE0_OK
od -c hello.txt  -> G A T E 0 _ O K \n
```

`hello.txt` exists with exactly `GATE0_OK` plus one trailing newline.

Last lines of stdout (ANSI escape sequences stripped; 10 lines total):

```
> build · qwen3.8-flash-next
← Write hello.txt
Created file successfully: hello.txt
> build · qwen3.8-flash-next
→ Read hello.txt
> build · qwen3.8-flash-next
`hello.txt` created at `/private/tmp/gate0-run-test/hello.txt` with a single line: `GATE0_OK`.

Done. Stopping here.
```

Notes:
- No permission prompt blocked the run; the write was allowed without `--auto`.
- `opencode run` attached to the existing background service rather than
  spawning its own server (`--standalone` was not needed).

---

## 5. TEST B — server on localhost

### Step 1: is a server already running?

```
lsof -nP -iTCP:4096 -sTCP:LISTEN   -> no output, exit 1   (nothing on 4096)
ps -ax -o pid,command | grep -i opencode
```

There is **no** OpenCode server on 4096. There *is* a background service
started by the desktop app:

```
74680 /Users/khang/Library/Application Support/ai.opencode.desktop/cli/2.2.6-arm64/opencode-cli serve --service
lsof -nP -iTCP -sTCP:LISTEN -a -p 74680
  -> TCP 127.0.0.1:49374 (LISTEN)
```

Per the instructions I did **not** restart it. Read-only probe of that
existing service for context:

```
curl -m 5 http://127.0.0.1:49374/global/health  -> HTTP 200, body is SPA HTML
curl -m 5 http://127.0.0.1:49374/session        -> HTTP 200, body is SPA HTML
```

### Step 2: start `opencode serve` on 4097 from the scratch dir

```
cd /tmp/gate0-run-test
opencode serve --port 4097 --hostname 127.0.0.1
  pid 44460; serve.log:
    server listening on http://127.0.0.1:4097
    server password <REDACTED>
```

The process started and the port bound:

```
lsof -nP -iTCP:4097 -sTCP:LISTEN
  opencode 44460 khang 7u IPv4 ... TCP 127.0.0.1:4097 (LISTEN)
```

### Step 3: the two endpoints

```
curl -m 5 -D - http://127.0.0.1:4097/global/health   -> HTTP 200
curl -m 5      http://127.0.0.1:4097/session         -> HTTP 200
```

First 500 chars of each body (identical for both):

```
<!doctype html>
<html lang="en" style="background-color: var(--v2-background-bg-deep, #fafafa)">
  <head>
    <meta charset="utf-8" />
    <meta
      name="viewport"
      content="width=device-width, initial-scale=1, interactive-widget=resizes-content, viewport-fit=cover"
    />
    <!-- data-sm lets the MetaProvider replace this pre-load title with the app's <Title> tags. -->
    <title data-sm>OpenCode</title>
    <link rel="icon" type="image/x-icon" href="/icons/prod/favicon.ico" />
    <li
```

Response headers for `/global/health`:

```
HTTP/1.1 200 OK
content-type: text/html
cache-control: no-cache
content-security-policy: default-src 'self'; script-src 'self' 'wasm-unsafe-eval' ...
x-content-type-options: nosniff
vary: Origin, Accept-Encoding
```

**So `/global/health` and `/session` are not API routes in v2.2.5** — they
fall through to the web-app catch-all (a nonexistent path such as `/zzz`
also returns HTTP 200 HTML). `POST /session` returns `405 Method Not Allowed`.

### Step 4: what the real API looks like (read-only probe, same server)

The v2 SDK shipped with this install (`~/.opencode/node_modules/@opencode-ai/sdk`)
lists the routes under `/api/...`:

```
curl -m 5 http://127.0.0.1:4097/api/health         -> HTTP 401 {"_tag":"UnauthorizedError","message":"Authentication required"}
curl -m 5 http://127.0.0.1:4097/api/session        -> HTTP 401 {"_tag":"UnauthorizedError","message":"Authentication required"}
```

With HTTP basic auth using the password the server printed at startup:

```
curl -m 5 -u "opencode:<REDACTED>" http://127.0.0.1:4097/api/session
  -> HTTP 200
  {"data":[{"id":"ses_...","projectID":"...","agent":"build","model":{"id":"qwen3.8-flash-next","providerID":"ds4","variant":"default"},"cost":0,"tokens":{"input":0,"output":9148,"reasoning":0,"cache":{"read":569738,"write":30433}},"time":{"c...
curl -m 5 -u "opencode:<REDACTED>" http://127.0.0.1:4097/api/health
  -> HTTP 404 (empty body)
```

`/api/session` works and returns JSON; `/api/health` is not served on this
build. The legacy `/global/health` still returns the SPA HTML even with auth.

### Step 5: terminate and confirm the port is closed

```
kill 44460
ps -p 44460            -> no such process
lsof -nP -iTCP:4097 -sTCP:LISTEN  -> no output, exit 1   (port closed)
```

Only the process I started (pid 44460, and the later probe pids 45117 /
45239) was killed; the desktop background service was left untouched.

---

## 6. Local model

From OpenCode's own config (`~/.config/opencode/opencode.jsonc`, no credential
files opened):

- Default model: `ds4/qwen3.8-flash-next`
- Provider `ds4` — name `DwarfStar (local)`, package
  `aisdk:@ai-sdk/openai-compatible`
- Base URL: `http://127.0.0.1:8010/v1`
- `apiKey`: `REDACTED` (placeholder value in config, not a real key)
- Model declared: `qwen3.8-flash-next` — "Qwen3.8 Flash Next Q2",
  context 131072, output 32768
- Agent pins: `build` → `ds4/qwen3.8-flash-next`; `compaction` →
  `deepseek/deepseek-flash`; `plan` → `opencode/deepseek-v4.1-flash-free`;
  `explore` → `deepseek/deepseek-flash`; `general` → disabled.

Live probe of the local endpoint (read-only, no settings changed):

```
curl -m 5 http://127.0.0.1:8010/v1/models  -> HTTP 200
  {"object":"list","data":[{"id":"qwen3.8-flash-next","object":"model",...
   "name":"Qwen3.8 Flash Next","context_length":131072,...
   "supported_parameters":["tools","tool_choice","max_tokens","temp...

curl -m 5 http://127.0.0.1:8010/health     -> HTTP 404
  {"error":{"message":"unknown endpoint","type":"invalid_request_error"}}
```

The model server is up and serving the model; it has no `/health` route.
`launchctl list | grep dstar` shows `com.dstar.serve` loaded (pid 1658) and
`com.dstar.slothealth` loaded (last exit 0). No pool size or server setting
was touched.

---

## 7. gym-sync

```
launchctl list | grep gym-sync   -> no output, exit 1
```

**There is no `gym-sync` launchd job and no
`~/.config/opencode/scripts/gym-sync.sh`** — that file does not exist.
`grep -rl "gym-sync"` over `~/.config/opencode`, the repo, and
`~/Library/LaunchAgents` only hits two repo docs
(`OPENCODE_LOOP_PROMPT.md`, `LOOP_STATE.md`), not a script.

The thing that actually syncs gym is:

- plist: `/Users/khang/Library/LaunchAgents/com.khang.repo-sync.plist`
- `launchctl list | grep repo-sync` → `-  0  com.khang.repo-sync`
  (loaded, not currently running, last exit status 0)
- `StartInterval`: **60** (also `RunAtLoad: true`, `ProcessType: Background`,
  `LowPriorityIO: true`, stdout → `~/Library/Logs/repo-sync.out.log`,
  stderr → `~/Library/Logs/repo-sync.err.log`)
- Program: `/bin/bash /Users/khang/.config/opencode/scripts/sync-all.sh`
- `sync-all.sh` loops over `~/.config/opencode/sync.d/*.conf` and runs
  `project-sync.sh` once per repo, sequentially. The gym config is
  `~/.config/opencode/sync.d/gym.conf`.

Answers against the real script (`project-sync.sh` + `gym.conf`):

**(a) What triggers a commit?** Any dirty working tree, not an allowlist.
It reads `git status --porcelain -z` and, if anything changed, commits
`git add -A` — but only after the newest changed file has been untouched for
`SYNC_QUIET` seconds (default 12; gym does not override it, so 12 s).
Deletions are tracked by a "first seen" timestamp so they age through the
quiet window. A `SYNC_CHECK_CMD` gate can block the commit: for gym it is
`node --check app.js`, run only when `app.js` is among the changed files.

**(b) How does it pull/push?** Pull: `git pull -q --ff-only origin main`,
only when the tree is clean and a fetch is due (fetches are throttled to
`SYNC_FETCH_EVERY`, default 300 s). Push: `git push -q origin main`.
**No force flags anywhere.** If origin is behind-HEAD and there are local
edits it refuses to act ("origin moved and you have local edits. Nothing
merged or pushed — check by hand"). If the push is rejected it logs a
problem and merges nothing. After a push it verifies origin shows HEAD with
`git ls-remote` (5 tries, 2 s apart).

**(c) Locks / flags / env checked before committing?** Yes, several:
- Per-project lock: directory `$TMPDIR/<name>-sync.lock` created with `mkdir`;
  holds `pid`. If it exists and the pid is alive and the lock is younger than
  `SYNC_LOCK_MAX` (default 1200 s), the pass exits 0 immediately. A stale lock
  is reclaimed. `trap 'rm -rf "$LOCK"' EXIT INT TERM`.
- Pause flags: `~/.sync-pause` (global) and `~/.<name>-sync-pause` (per
  project) — either one exits 0 before touching git.
- Marker flag: `~/.<name>-ship` — only used when `SYNC_PUSH_MODE=marker`
  (File Butler uses it; **gym does not**, gym's push mode is the default
  `always`). The marker is deleted after a successful push.
- Git busy guard: if `<gitdir>/index.lock` exists, the pass exits.
- Branch guard: if HEAD is not `main`, it logs a problem and exits.
- Secret guard: untracked files matching credential patterns
  (`.env`, `.pem`, `.key`, `.p12`, `.pfx`, `keystore`, `id_rsa`/`id_ed25519`/
  `id_ecdsa`, `credentials`, `secrets`, `.netrc`, `.npmrc`, `.pypirc`,
  `*token*.json`) abort the commit with a logged problem.
- Env: `GIT_TERMINAL_PROMPT=0`, and `GIT_SSH_COMMAND` with
  `BatchMode=yes ConnectTimeout=10 ServerAliveInterval=15 ServerAliveCountMax=3`
  if not already set; the `SYNC_*` variables from `sync.d/*.conf`;
  `SYNC_NOTIFY` (default 1) controls macOS notifications.

**(d) Commit author + message format.** Author is whatever the repo's git
identity is (the script never sets an author or committer) — observed
`Khang <kmnace00@gmail.com>`. Message:
`auto-sync: YYYY-MM-DD HH:MM — <space-separated list of changed files>`,
e.g. `auto-sync: 2026-11-09 19:13 — LOOP_STATE.md TASK.md`.

**(e) Excluded files.** No explicit exclusion list: `git add -A` stages
everything, subject to the repo's `.gitignore` (`node_modules/`,
`test-results/`, `playwright-report/`, `.DS_Store`) plus the credential
pattern guard in (c).

**(f) Confirmed interval.** 60 seconds (`StartInterval: 60` in
`com.khang.repo-sync.plist`), verified live in
`~/Library/Logs/gym-sync.log`, e.g. commits at 19:10:57 and 19:13:09 with
pushes confirmed seconds later.

### Full script (redacted)

`~/.config/opencode/scripts/sync-all.sh`:

```bash
#!/bin/bash
# sync-all.sh — one sync pass for every repo configured in sync.d/*.conf.
#
# Run by ~/Library/LaunchAgents/com.khang.repo-sync.plist every ~60 s.
# Each pass is sequential and cheap: the per-repo script only touches the
# network when something changed, when a deferred check is due, or when its
# idle fetch interval (SYNC_FETCH_EVERY, default 5 min) expires.
#
# Add a project: drop a <name>.conf into sync.d/ (see the existing files).

set -u
DIR="${SYNC_CONF_DIR:-$HOME/.config/opencode/sync.d}"
SCRIPT="$(cd "$(dirname "$0")" && pwd)/project-sync.sh"
[ -d "$DIR" ] || exit 0

rc=0
for conf in "$DIR"/*.conf; do
  [ -f "$conf" ] || continue
  ( set -a; . "$conf"; set +a; /bin/bash "$SCRIPT" ) || rc=1
done
exit $rc
```

`~/.config/opencode/sync.d/gym.conf` (no secrets; the live URL and slug are
public repo identifiers):

```bash
# gym — static Pages site; live verification via the Pages build API + CDN bytes
SYNC_NAME=gym
SYNC_REPO=/Users/khang/gym
SYNC_BRANCH=main
SYNC_LIVE=https://kmnace00.github.io/gym
SYNC_PAGES_SLUG=kmnace00/gym
SYNC_CHECK_CMD='node --check app.js'
SYNC_CHECK_FILES=app.js
```

`~/.config/opencode/scripts/project-sync.sh` (full; no secret values present
in this file — the only credential-ish line is the SSH option string, which
contains no key material):

```bash
#!/bin/bash
# project-sync.sh — hands-off git sync for ONE repo, configured by SYNC_* env vars.
#
# Normally invoked by sync-all.sh, once per repo, every ~60 s. Each pass:
#   guards: pause / global pause / wrong branch / a git operation in progress
#   local edits, quiet for QUIET s -> optional check command, commit, push
#                                     (push mode: always | marker | never)
#   clean tree, origin moved       -> fast-forward pull only, when a fetch is due
#   after a push                   -> confirm origin has HEAD, then resolve the
#                                     deploy/CI checks; unfinished checks are
#                                     retried on later passes so a pass stays short
#
# Honors every repo's rule: never stash / reset / checkout / force / merge.
# A non-fast-forward is the human's call, never this script's.
#
# Env (only SYNC_REPO is required):
#   SYNC_NAME          short name: lock, log, state, notification title
#   SYNC_REPO          repo path
#   SYNC_BRANCH        default main
#   SYNC_REMOTE        default origin
#   SYNC_PUSH_MODE     always (default) | marker | never
#                      marker = publish only when ~/.<name>-ship exists
#                      (the marker is removed after a successful push)
#   SYNC_SHIP          marker path override
#   SYNC_LIVE          static site base URL; deploy check skipped when empty
#   SYNC_PAGES_SLUG    owner/repo whose Pages build should match HEAD
#   SYNC_CI            "1" polls the latest GitHub Actions run for the pushed sha
#   SYNC_SLUG          owner/repo for the CI check
#   SYNC_CHECK_CMD     shell command gating the commit, e.g. "node --check app.js"
#   SYNC_CHECK_FILES   space-separated files; run the check only if one changed
#   SYNC_QUIET         seconds a change must sit untouched (default 12)
#   SYNC_FETCH_EVERY   idle seconds between origin polls (default 300, 0 = always)
#   SYNC_LIVE_TRIES    in-pass deploy probes (default 6 x 8 s, then deferred)
#   SYNC_CI_ATTEMPTS_MAX  deferred CI/failed-run checks before giving up (20)
#   SYNC_LOG / SYNC_STATE / SYNC_PAUSE override the derived paths
#
# Pause one project:  touch ~/.<name>-sync-pause
# Pause everything:   touch ~/.sync-pause

set -u

NAME="${SYNC_NAME:-$(basename "${SYNC_REPO:-$PWD}")}"
REPO="${SYNC_REPO:-$HOME/$NAME}"
BRANCH="${SYNC_BRANCH:-main}"
REMOTE="${SYNC_REMOTE:-origin}"
LIVE="${SYNC_LIVE:-}"
PAGES_SLUG="${SYNC_PAGES_SLUG:-}"
CI="${SYNC_CI:-0}"
SLUG="${SYNC_SLUG:-}"
CHECK_CMD="${SYNC_CHECK_CMD:-}"
CHECK_FILES="${SYNC_CHECK_FILES:-}"
QUIET="${SYNC_QUIET:-12}"
FETCH_EVERY="${SYNC_FETCH_EVERY:-300}"
PUSH_MODE="${SYNC_PUSH_MODE:-}"
[ -z "$PUSH_MODE" ] && { [ "${SYNC_PUSH:-1}" = 0 ] && PUSH_MODE=never || PUSH_MODE=always; }
LIVE_TRIES="${SYNC_LIVE_TRIES:-6}"
LIVE_WAIT="${SYNC_LIVE_WAIT:-8}"
LIVE_ATTEMPTS_MAX="${SYNC_LIVE_ATTEMPTS_MAX:-30}"
CI_ATTEMPTS_MAX="${SYNC_CI_ATTEMPTS_MAX:-20}"
LOCK_MAX="${SYNC_LOCK_MAX:-1200}"

LOG="${SYNC_LOG:-$HOME/Library/Logs/$NAME-sync.log}"
STATE="${SYNC_STATE:-$HOME/Library/Logs/$NAME-sync.state}"
STATE_DIR=$(dirname "$STATE")
PEND_LIVE="$STATE_DIR/$NAME.live-pending"
PEND_CI="$STATE_DIR/$NAME.ci-pending"
STAMP="$STATE_DIR/$NAME.last-fetch"
DELSEEN="$STATE_DIR/$NAME.del-seen"
PAUSE="${SYNC_PAUSE:-$HOME/.$NAME-sync-pause}"
SHIP="${SYNC_SHIP:-$HOME/.$NAME-ship}"
ALL_PAUSE="${SYNC_ALL_PAUSE:-$HOME/.sync-pause}"

# A wedged network must never hold the lock forever.
export GIT_TERMINAL_PROMPT=0
if [ -z "${GIT_SSH_COMMAND:-}" ]; then
  export GIT_SSH_COMMAND="ssh -o BatchMode=yes -o ConnectTimeout=10 -o ServerAliveInterval=15 -o ServerAliveCountMax=3"
fi

mkdir -p "$STATE_DIR" 2>/dev/null

log() { printf '%s %s\n' "$(date '+%F %T')" "$*" >>"$LOG" }
short() { printf '%.7s' "$1" }

if [ -f "$LOG" ] && [ "$(wc -c <"$LOG" | tr -d ' ')" -gt 1000000 ]; then
  tail -c 200000 "$LOG" >"$LOG.tmp" 2>/dev/null && mv "$LOG.tmp" "$LOG"
fi

NOTIFY="${SYNC_NOTIFY:-1}"

notify() {
  [ "$NOTIFY" = 1 ] || return 0
  [ "$(uname)" = Darwin ] || return 0
  if ! /usr/bin/osascript -e "display notification \"$(printf '%s' "$1" | sed 's/"/\\"/g')\" with title \"$NAME-sync\"" \
      >/dev/null 2>&1; then
    log "notify failed (check Notification permissions for the launching app)"
  }
}

prev_state() { [ -f "$STATE" ] && cat "$STATE" 2>/dev/null || true }

# Log + notify a problem once, until it clears and happens again.
problem() {
  local token="$1" msg="$2"
  [ "$(prev_state)" = "$token" ] && return 0
  printf '%s' "$token" >"$STATE"
  log "PROBLEM $token: $msg"
  notify "$msg"
}

# Record a state without notifying (for "waiting" conditions).
note() {
  [ "$(prev_state)" = "$1" ] && return 0
  printf '%s' "$1" >"$STATE"
  log "PENDING $1: $2"
}

ok() {
  local prev; prev=$(prev_state)
  [ -z "$prev" ] && return 0
  : >"$STATE"
  log "RECOVERED from $prev"
}

# One instance per project; a stale or wedged lock is reclaimed.
LOCK="${TMPDIR:-/tmp}/$NAME-sync.lock"
if ! mkdir "$LOCK" 2>/dev/null; then
  pid=$(cat "$LOCK/pid" 2>/dev/null || true)
  age=$(( $(date +%s) - $(stat -f %m "$LOCK" 2>/dev/null || echo 0) ))
  if [ -n "$pid" ] && kill -0 "$pid" 2>/dev/null && [ "$age" -lt "$LOCK_MAX" ]; then exit 0; fi
  log "reclaiming stale lock (pid=${pid:-?}, age=${age}s)"
  rm -rf "$LOCK" 2>/dev/null
  mkdir "$LOCK" 2>/dev/null || exit 0
fi
echo $$ >"$LOCK/pid"
trap 'rm -rf "$LOCK"' EXIT INT TERM

[ -e "$ALL_PAUSE" ] && exit 0
[ -e "$PAUSE" ] && exit 0
cd "$REPO" 2>/dev/null || { problem no-repo "$NAME: repo missing at $REPO"; exit 0; }

gitdir=$(git rev-parse --git-dir 2>/dev/null) || { problem no-repo "$NAME: not a git repo at $REPO"; exit 0; }
if [ -e "$gitdir/index.lock" ]; then
  note git-busy "$NAME: a git command is in progress — leaving it alone"
  exit 0
fi

cur=$(git symbolic-ref --short HEAD 2>/dev/null || echo "detached")
if [ "$cur" != "$BRANCH" ]; then
  problem off-branch "$NAME: on branch '$cur', not $BRANCH — sync idle"
  exit 0
fi

# --- deploy / CI checks -------------------------------------------------------
bytes_match() {   # bytes_match <sha> -> 0 when every served html/css/js == sha
  [ -n "$LIVE" ] || return 0
  local files f want got
  files=$(git ls-tree --name-only "$1" 2>/dev/null | grep -E '\.(html|css|js)$' || true)
  [ -n "$files" ] || return 0
  for f in $files; do
    want=$(git show "$1:$f" 2>/dev/null | shasum | cut -d' ' -f1)
    got=$(curl -fsS -m 10 "$LIVE/$f" 2>/dev/null | shasum | cut -d' ' -f1)
    [ "$want" = "$got" ] || return 1
  done
  return 0
}

probe_live() {   # 0 = live, 1 = not yet, 2 = failed
  local sha="$1" st status commit
  [ -n "$sha" ] || return 2
  if [ -n "$PAGES_SLUG" ] && command -v gh >/dev/null 2>&1; then
    st=$(gh api "repos/$PAGES_SLUG/pages/builds/latest" --jq '"\(.status)|\(.commit)"' 2>/dev/null)
    if [ -n "$st" ]; then
      status=${st%%|*}; commit=${st#*|}
      [ "$status" = "errored" ] && return 2
      if [ "$status" = "built" ]; then
        if [ "$commit" = "$sha" ]; then
          bytes_match "$sha" || log "live: build for $(short "$sha") is live but CDN bytes still differ"
          return 0
        fi
        # a newer commit may already carry our change
        if git cat-file -e "$commit" 2>/dev/null && \
           git merge-base --is-ancestor "$sha" "$commit" 2>/dev/null; then
          log "live: $(short "$sha") included in live build $(short "$commit")"
          return 0
        fi
      fi
    fi
    # build API lagging or unreachable: bytes on the CDN are still proof
    if [ -n "$LIVE" ] && bytes_match "$sha"; then
      log "live: $(short "$sha") already serving (bytes match)"
      return 0
    fi
    return 1
  fi
  [ -n "$LIVE" ] || return 0
  bytes_match "$sha" && return 0
  return 1
}

resolve_live() {  # resolve_live <sha> <tries> [attempts]
  local sha="$1" tries="$2" attempts="${3:-0}" i=0 rc
  if [ -z "$LIVE$PAGES_SLUG" ] || [ -z "$sha" ]; then rm -f "$PEND_LIVE"; return 0; fi
  while :; do
    probe_live "$sha"; rc=$?
    case "$rc" in
      0) log "live: $(short "$sha") is serving"; rm -f "$PEND_LIVE"; return 0 ;;
      2) problem live-stale "$NAME: deploy for $(short "$sha") failed"; rm -f "$PEND_LIVE"; return 2 ;;
    esac
    i=$((i + 1))
    [ "$i" -ge "$tries" ] && break
    sleep "$LIVE_WAIT"
  done
  attempts=$((attempts + 1))
  if [ "$attempts" -ge "$LIVE_ATTEMPTS_MAX" ]; then
    problem live-stale "$NAME: deploy for $(short "$sha") never went live after $attempts checks"
    rm -f "$PEND_LIVE"
  else
    printf '%s %s\n' "$sha" "$attempts" >"$PEND_LIVE"
    note live-pending "$NAME: deploy still building for $(short "$sha") — will re-check"
  fi
  return 1
}

ci_state() {   # ci_state <sha> -> "none" | "status|conclusion|workflow"
  gh run list -R "$SLUG" -c "$1" -L 1 --json status,conclusion,name \
    --jq 'if length == 0 then "none" else "\(.[0].status)|\(.[0].conclusion // "")|\(.[0].name)" end' 2>/dev/null
}

resolve_ci() {  # one cheap probe; pending state survives for the next pass
  local sha="$1" attempts="$2" st status rest conclusion wf
  [ "$CI" = 1 ] && [ -n "$SLUG" ] || { rm -f "$PEND_CI"; return 0; }
  if ! command -v gh >/dev/null 2>&1; then
    log "ci: gh not on PATH — skipping the workflow check"
    rm -f "$PEND_CI"; return 0
  fi
  st=$(ci_state "$sha")
  if [ -z "$st" ] || [ "$st" = "none" ]; then
    attempts=$((attempts + 1))
    if [ "$attempts" -ge "$CI_ATTEMPTS_MAX" ]; then
      log "ci: no workflow run for $(short "$sha") — nothing to check"
      rm -f "$PEND_CI"
    else
      printf '%s %s\n' "$sha" "$attempts" >"$PEND_CI"
    fi
    return 0
  fi
  status=${st%%|*}; rest=${st#*|}; conclusion=${rest%%|*}; wf=${rest#*|}
  if [ "$status" = "completed" ]; then
    if [ "$conclusion" = "success" ]; then
      log "ci: '$wf' passed for $(short "$sha")"
      rm -f "$PEND_CI"
      ok
    else
      problem "ci-${conclusion:-unknown}" "$NAME: CI '$wf' ${conclusion:-finished without a conclusion} for $(short "$sha")"
      rm -f "$PEND_CI"
    fi
    return 0
  fi
  attempts=$((attempts + 1))
  if [ "$attempts" -ge "$CI_ATTEMPTS_MAX" ]; then
    log "ci: '$wf' still $status after $attempts checks — giving up"
    rm -f "$PEND_CI"
  else
    printf '%s %s\n' "$sha" "$attempts" >"$PEND_CI"
  fi
  return 0
}

verify_remote() {
  local want i=0 got
  want=$(git rev-parse HEAD)
  while [ "$i" -lt 5 ]; do
    got=$(git ls-remote --exit-code "$REMOTE" "refs/heads/$BRANCH" 2>/dev/null | cut -f1)
    if [ "$got" = "$want" ]; then log "origin: $BRANCH at $(short "$want")"; return 0; fi
    i=$((i + 1)); [ "$i" -lt 5 ] && sleep 2
  done
  problem push-not-visible "$NAME: origin does not show HEAD after push"
}

run_check() {
  [ -n "$CHECK_CMD" ] || return 0
  if [ -n "$CHECK_FILES" ]; then
    local hit=0 f
    for f in $CHECK_FILES; do
      printf '%s\n' "$changed" | grep -qxF "$f" && hit=1
    done
    [ "$hit" = 1 ] || return 0
  fi
  if ! /bin/bash -c "$CHECK_CMD" >>"$LOG" 2>&1; then
    problem check-failed "$NAME: '$CHECK_CMD' failed — not committing or pushing"
    return 1
  fi
}

# --- working tree -------------------------------------------------------------
changed=""; newest=0; now=$(date +%s); has_del=0
while IFS= read -r -d '' entry; do
  path="${entry:3}"
  [ -n "$path" ] || continue
  changed="$changed$path
"
  if [ -e "$path" ]; then
    m=$(stat -f %m "$path" 2>/dev/null || echo 0)
  else
    has_del=1
    m=0
  fi
  [ "$m" -gt "$newest" ] && newest=$m
done < <(git status --porcelain -z 2>/dev/null)
changed=$(printf '%s' "$changed" | sed '/^$/d')

# A deletion has no mtime, so remember when we first saw it and let it age
# through the quiet window instead of stalling (or firing instantly).
if [ "$has_del" = 1 ]; then
  if [ -f "$DELSEEN" ]; then
    seen=$(cat "$DELSEEN" 2>/dev/null || echo 0)
  else
    seen=$now
    printf '%s' "$now" >"$DELSEEN"
  fi
  [ "$seen" -gt "$newest" ] && newest=$seen
else
  rm -f "$DELSEEN" 2>/dev/null
fi

# --- 1. local edits: commit + push once quiet ---------------------------------
if [ -n "$changed" ]; then
  if [ "$((now - newest))" -lt "$QUIET" ]; then exit 0; fi   # still being written

  fetch_ok=1
  if git fetch -q "$REMOTE" "$BRANCH" 2>/dev/null; then date +%s >"$STAMP"; else fetch_ok=0; fi
  if [ "$fetch_ok" -eq 0 ]; then
    problem offline "$NAME: offline, local edits held (not pushed)"
    exit 0
  fi
  behind=$(git rev-list --count "HEAD..$REMOTE/$BRANCH" 2>/dev/null || echo 0)
  if [ "$behind" -gt 0 ]; then
    problem divergence "$NAME: origin moved and you have local edits. Nothing merged or pushed — check by hand"
    exit 0
  fi

  # Never stage something that looks like a credential.
  secrets=$(git ls-files -o --exclude-standard 2>/dev/null | \
    grep -E '(^|/)\.env($|\.)|\.(pem|key|p12|pfx|keystore)$|(^|/)id_(rsa|ed25519|ecdsa)[^/]*$|(^|/)(credentials|secrets|\.netrc|\.npmrc|\.pypirc)(\.[^/]*)?$|(^|/)[^/]*token[^/]*\.json$' | head -5)
  if [ -n "$secrets" ]; then
    problem secret "$NAME: refusing to commit possible secret: $(printf '%s' "$secrets" | tr '\n' ' ')"
    exit 0
  fi

  run_check || exit 0

  count=$(printf '%s\n' "$changed" | grep -c . | tr -d ' ')
  if [ "$PUSH_MODE" = "never" ]; then
    note change-held "$NAME: $count changed file(s) held (push mode never)"
    exit 0
  fi
  if [ "$PUSH_MODE" = "marker" ] && [ ! -e "$SHIP" ]; then
    problem holding "$NAME: $count changed file(s) waiting — touch $SHIP to publish"
    exit 0
  fi

  git add -A 2>/dev/null
  if ! git diff --cached --quiet 2>/dev/null; then
    stamp=$(date '+%F %H:%M')
    summary=$(printf '%s' "$changed" | tr '\n' ' ' | sed 's/ $//')
    if git commit -q -m "auto-sync: $stamp — $summary" 2>>"$LOG"; then
      log "committed: $summary"
      if git push -q "$REMOTE" "$BRANCH" 2>>"$LOG"; then
        rm -f "$SHIP"
        ok
        log "pushed HEAD $(git rev-parse --short HEAD)"
        verify_remote
        sha=$(git rev-parse HEAD)
        rm -f "$PEND_LIVE" "$PEND_CI"
        [ -n "$LIVE$PAGES_SLUG" ] && resolve_live "$sha" "$LIVE_TRIES"
        [ "$CI" = 1 ] && [ -n "$SLUG" ] && { printf '%s 0\n' "$sha" >"$PEND_CI"; resolve_ci "$sha" 0; }
      else
        problem conflict "$NAME: push rejected — origin moved. Nothing merged; resolve by hand"
      fi
    else
      problem commit-failed "$NAME: commit failed (pre-commit hook?) — see $LOG"
    fi
  fi
  exit 0
fi

# --- 2. clean tree: clear deferred checks first (cheap, never throttled) ------
if [ -f "$PEND_LIVE" ]; then
  lsha=""; lattempts=0; read -r lsha lattempts <"$PEND_LIVE" 2>/dev/null || true
  resolve_live "$lsha" 1 "${lattempts:-0}"
fi
if [ -f "$PEND_CI" ]; then
  psha=""; pattempts=0; read -r psha pattempts <"$PEND_CI" 2>/dev/null || true
  [ -n "$psha" ] && resolve_ci "$psha" "${pattempts:-0}"
fi

# --- 3. pull when origin moved, at most every FETCH_EVERY seconds -------------
due=1
if [ "$FETCH_EVERY" -gt 0 ] && [ -f "$STAMP" ]; then
  age=$(( now - $(cat "$STAMP" 2>/dev/null || echo 0) ))
  [ "$age" -lt "$FETCH_EVERY" ] && due=0
fi
[ "$due" -eq 0 ] && exit 0

if ! git fetch -q "$REMOTE" "$BRANCH" 2>/dev/null; then
  problem offline "$NAME: offline, cannot reach $REMOTE"
  exit 0
fi
date +%s >"$STAMP"
behind=$(git rev-list --count "HEAD..$REMOTE/$BRANCH" 2>/dev/null || echo 0)
if [ "$behind" -gt 0 ]; then
  if git pull -q --ff-only "$REMOTE" "$BRANCH" 2>>"$LOG"; then
    ok
    log "pulled $behind commit(s); HEAD $(git rev-parse --short HEAD)"
    if [ -f "$PEND_LIVE" ]; then
      lsha=""; lattempts=0; read -r lsha lattempts <"$PEND_LIVE" 2>/dev/null || true
      resolve_live "$lsha" "$LIVE_TRIES" "${lattempts:-0}"
    fi
  else
    problem diverge "$NAME: origin moved but the pull is not fast-forward. Nothing changed — check by hand"
  fi
fi
exit 0
```

---

## 8. Existing state

**Supervisor plist:** `ls ~/Library/LaunchAgents` contains
`ai.heyrover.daemon.plist`, `com.dstar.serve.plist`,
`com.dstar.slothealth.plist`, `com.filebutler.*` (5),
`com.google.*` (3), and `com.khang.repo-sync.plist`.
**No `com.khang.gym-supervisor.plist`** — as expected.

**Schedules/watches.** Schedules are per-session: this session has none
(`schedule_list` → `count: 0`). The global schedule table
(`~/.local/share/opencode/opencode.db`, read-only query) shows two, both
active:

| id | name | session | cadence | status | checks | runs | last outcome | next due (UTC) |
|---|---|---|---|---|---|---|---|---|
| `sch_1c22d75f8001brE544zgavnnP9` | queue watch | `ses_e3e44975dffeMbTj6Vf9sEVkqN` | every 5 min (America/Chicago) | **active** | 48 | 0 | `checked` | 2026-11-10 01:23:41 |
| `sch_1c2eb52d3001DJiXW9ipS5cDzS` | gym-loop-queue-watch | `ses_e3d182e4effeaXELEBrkFfiH76` | every 5 min | active | 8 | 0 | `checked` | 2026-11-10 01:26:04 |

The watch you asked about, `sch_1c22d75f8001brE544zgavnnP9`, is **alive and
active**, not dead or absent: it is still scheduled every 5 minutes, has run
its condition check 48 times, and its condition is

```
git fetch origin -q && git diff HEAD..origin/main -- QUEUE.md | wc -l   matches [1-9]
```

i.e. it fires the prompt only when QUEUE.md actually changed on origin. It has
never fired a prompt (`run_count: 0`) because QUEUE.md has not changed.
`failures: 0`.

---

## 9. Verdict

**A (`opencode run`) — clean. B (`opencode serve` on localhost) — reachable
but not clean as specified.**

- A: `opencode run "…"` exited 0 in 47 s and produced `/tmp/gate0-run-test/hello.txt`
  containing exactly `GATE0_OK\n`, with no model flag and no permission
  intervention.
- B: `opencode serve --port 4097` bound the port and answered HTTP 200, but
  `/global/health` and `/session` returned the SPA HTML shell, not JSON; the
  real v2 routes (`/api/session`) return 401 without the auto-generated
  basic-auth password, and `/api/health` 404s. The process was killed cleanly
  and the port closed.

Practical consequence for a supervisor: spawn with `opencode run` from the
repo directory (it reuses the existing background service, no port/auth
handling needed). If a server-based spawn is wanted, it must read the printed
`server password` from the process output or set `OPENCODE_SERVER_PASSWORD`,
and use `/api/...` paths.

Nothing here needs Khang's approval — every item above was answerable with
read-only commands. No item is marked `NEEDS_KHANG_THURSDAY`.
