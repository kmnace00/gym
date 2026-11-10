#!/usr/bin/env python3
"""gym-supervisor — one tick. Run by launchd every 120 s.

Watches origin/main of the gym repo. When Muse has queued a batch
(TASK.md Status: ACTIVE) and no builder is running, spawns ONE fresh
`opencode run` builder, then exits. While a builder runs, repo-sync
is paused via its own ~/.gym-sync-pause flag and the builder commits
itself at item boundaries.

State lives in ~/.gym-supervisor/ (bookkeeping only — git is the
durable record). DRY_RUN is ON while ~/.gym-supervisor/DRY_RUN
exists: ticks log WOULD_SPAWN and never spawn, pause, or pull.

Design: SUPERVISOR_DESIGN.md in the gym repo. Stdlib only.
"""
import fcntl
import json
import os
import signal
import subprocess
import sys
import time
import urllib.request

HOME = os.path.expanduser("~")
REPO = os.environ.get("GYM_SUPERVISOR_REPO", os.path.join(HOME, "gym"))
STATE_DIR = os.environ.get(
    "GYM_SUPERVISOR_STATE_DIR", os.path.join(HOME, ".gym-supervisor"))
LOG_DIR = os.path.join(HOME, "Library", "Logs", "gym-supervisor")
LOG_FILE = os.path.join(LOG_DIR, "supervisor.log")
STATE_FILE = os.path.join(STATE_DIR, "state.json")
LEASE_FILE = os.path.join(STATE_DIR, "lease.json")
LOCK_FILE = os.path.join(STATE_DIR, "tick.lock")
KILL_FILE = os.path.join(STATE_DIR, "PAUSED")
DRYRUN_FILE = os.path.join(STATE_DIR, "DRY_RUN")
PAUSE_FLAG = os.path.join(HOME, ".gym-sync-pause")
OPENCODE = os.environ.get(
    "GYM_SUPERVISOR_OPENCODE", os.path.join(HOME, ".opencode", "bin", "opencode"))
PROMPT_FILE = os.path.join(REPO, "supervisor", "SUPERVISOR_PROMPT.md")
MODEL_URL = "http://127.0.0.1:8010/v1/models"
ITEM_INACTIVITY_S = 45 * 60
BATCH_MAX_S = 4 * 3600
ALLOWED_EMAILS = {"kmnace00@gmail.com"}
ALLOWED_NAMES = {"Khang", "Muse", "kmnace00"}


def log(msg):
    line = "%s %s" % (time.strftime("%F %T"), msg)
    try:
        with open(LOG_FILE, "a") as f:
            f.write(line + "\n")
    except OSError:
        pass
    # keep the log bounded (~1 MB, like project-sync)
    try:
        if os.path.getsize(LOG_FILE) > 1_000_000:
            with open(LOG_FILE, "rb") as f:
                tail = f.read()[-200_000:]
            with open(LOG_FILE, "wb") as f:
                f.write(tail)
    except OSError:
        pass


def notify(msg):
    try:
        safe = msg.replace('"', "'")
        subprocess.run(
            ["/usr/bin/osascript", "-e",
             'display notification "%s" with title "gym-supervisor"' % safe],
            timeout=10, capture_output=True)
    except Exception:
        pass


def git(*args, timeout=60):
    return subprocess.run(
        ["git", "-C", REPO] + list(args),
        capture_output=True, text=True, timeout=timeout)


def load_json(path, default):
    try:
        with open(path) as f:
            return json.load(f)
    except Exception:
        return default


def save_json(path, obj):
    tmp = path + ".tmp"
    with open(tmp, "w") as f:
        json.dump(obj, f)
    os.replace(tmp, path)


def pid_alive(pid):
    try:
        os.kill(pid, 0)
        return True
    except (OSError, TypeError):
        return False


def builder_log_fresh(lease, now):
    try:
        return now - os.path.getmtime(lease["log"]) < ITEM_INACTIVITY_S
    except Exception:
        return False


def clear_lease():
    for p in (LEASE_FILE,):
        try:
            os.remove(p)
        except OSError:
            pass
    try:
        os.remove(PAUSE_FLAG)
    except OSError:
        pass


def check_lease(state, now):
    """Returns True if a builder is healthy and running."""
    lease = load_json(LEASE_FILE, None)
    if not lease:
        return False
    pid = lease.get("pid")
    if pid_alive(pid) and builder_log_fresh(lease, now):
        if now - lease.get("started_at", now) > BATCH_MAX_S:
            log("TIMEOUT batch=%s pid=%s exceeded %ss — killing"
                % (lease.get("batch"), pid, BATCH_MAX_S))
            notify("gym builder timed out and was stopped")
            try:
                os.killpg(pid, signal.SIGTERM)
            except OSError:
                pass
            state["blocked_head"] = lease.get("head")
            clear_lease()
            return False
        return True
    # dead or silent builder
    if pid_alive(pid):
        try:
            os.killpg(pid, signal.SIGTERM)
        except OSError:
            pass
    log("BUILDER_LOST batch=%s item=%s pid=%s — lease cleared"
        % (lease.get("batch"), lease.get("item"), pid))
    notify("gym builder stopped mid-batch; will resume from checkpoint")
    state["blocked_head"] = None
    clear_lease()
    return False


def remote_file(head, name):
    r = git("show", "%s:%s" % (head, name))
    return r.stdout if r.returncode == 0 else ""


def main():
    os.makedirs(STATE_DIR, exist_ok=True)
    os.makedirs(LOG_DIR, exist_ok=True)
    lock = open(LOCK_FILE, "w")
    try:
        fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
    except OSError:
        return 0  # another tick is running
    if os.path.exists(KILL_FILE):
        return 0
    now = time.time()
    state = load_json(STATE_FILE, {})
    dry = os.path.exists(DRYRUN_FILE)

    if check_lease(state, now):
        save_json(STATE_FILE, state)
        return 0

    # --- fetch; capture origin head BEFORE any pull (watermark rule)
    if git("fetch", "origin", timeout=30).returncode != 0:
        log("FETCH_FAIL")
        save_json(STATE_FILE, state)
        return 0
    r = git("rev-parse", "origin/main")
    if r.returncode != 0:
        save_json(STATE_FILE, state)
        return 0
    remote_head = r.stdout.strip()
    watermark = state.get("last_seen_head", "")

    # --- safety: authors of new commits must be Khang or Muse
    if watermark and watermark != remote_head:
        r = git("log", "--format=%an|%ae", "%s..%s" % (watermark, remote_head))
        if r.returncode == 0:
            for line in r.stdout.splitlines():
                if not line.strip():
                    continue
                name, _, email = line.partition("|")
                if email.strip() not in ALLOWED_EMAILS and \
                        name.strip() not in ALLOWED_NAMES:
                    log("ALERT foreign author %s — not pulling/spawning" % line)
                    notify("gym loop: unexpected commit author — check the repo")
                    save_json(STATE_FILE, state)
                    return 0

    # --- dirty tree with no builder = Khang editing by hand; stand down
    dirty = git("status", "--porcelain").stdout.strip()
    if dirty:
        log("DIRTY_TREE — standing down")
        state["last_seen_head"] = remote_head
        save_json(STATE_FILE, state)
        return 0

    # --- pull fast-forward only (skipped in dry-run: observe only)
    local_head = git("rev-parse", "HEAD").stdout.strip()
    if local_head != remote_head and not dry:
        if git("pull", "--ff-only", "origin", "main").returncode != 0:
            log("PULL_FAIL head=%s" % remote_head)
            save_json(STATE_FILE, state)
            return 0

    # --- is there work? read the signal from origin, not the tree
    task = remote_file(remote_head, "TASK.md")
    loop_state = remote_file(remote_head, "LOOP_STATE.md")
    active = "Status: ACTIVE" in task
    paused = "Status: PAUSED" in loop_state
    if not active or paused:
        if remote_head != watermark:
            log("NO_WORK head=%s active=%s paused=%s"
                % (remote_head[:7], active, paused))
        state["last_seen_head"] = remote_head
        save_json(STATE_FILE, state)
        return 0
    if state.get("blocked_head") == remote_head:
        save_json(STATE_FILE, state)
        return 0  # this head already timed out once; wait for Muse

    batch = "unknown"
    for line in task.splitlines():
        if "Batch" in line:
            batch = line.strip().lstrip("# ").strip()
            break

    # --- pre-flight: model server + CLI must exist
    try:
        with urllib.request.urlopen(MODEL_URL, timeout=5) as resp:
            model_ok = resp.status == 200
    except Exception:
        model_ok = False
    if not model_ok or not os.access(OPENCODE, os.X_OK):
        log("PREFLIGHT_FAIL model_ok=%s opencode_ok=%s head=%s"
            % (model_ok, os.access(OPENCODE, os.X_OK), remote_head[:7]))
        save_json(STATE_FILE, state)
        return 0

    if dry:
        log("WOULD_SPAWN batch=%s head=%s" % (batch, remote_head[:7]))
        state["last_seen_head"] = remote_head
        save_json(STATE_FILE, state)
        return 0

    # --- spawn ONE fresh builder
    try:
        with open(PROMPT_FILE) as f:
            prompt = f.read()
    except OSError:
        log("PROMPT_MISSING %s" % PROMPT_FILE)
        save_json(STATE_FILE, state)
        return 0
    stamp = time.strftime("%Y%m%d-%H%M%S")
    blog = os.path.join(LOG_DIR, "builder-%s.log" % stamp)
    out = open(blog, "ab")
    open(PAUSE_FLAG, "a").close()  # repo-sync stands down while builder runs
    proc = subprocess.Popen(
        [OPENCODE, "run", prompt], cwd=REPO,
        stdout=out, stderr=subprocess.STDOUT, start_new_session=True)
    save_json(LEASE_FILE, {
        "pid": proc.pid, "batch": batch, "item": "queue",
        "started_at": now, "head": remote_head, "log": blog})
    log("SPAWN batch=%s head=%s pid=%s" % (batch, remote_head[:7], proc.pid))
    state["last_seen_head"] = remote_head
    state["blocked_head"] = None
    save_json(STATE_FILE, state)
    return 0


if __name__ == "__main__":
    sys.exit(main())
