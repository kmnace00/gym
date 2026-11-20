# Gym — plain-repo auto fast-forward

Gym has no installed app, service, or bound port. `scripts/autodeploy.sh` is a
thin wrapper around the shared engine `~/.local/lib/fleet-deploy/deploy.sh`,
configured here by `deploy.conf` with `MODE=plain`.

Every 10 min + at login the LaunchAgent `com.khang.gym-autodeploy`:

- fetches `origin/main` and fast-forwards only a clean, non-diverged tree;
- skips and logs dirty/diverged states — it never overwrites local work;
- does **not** restart anything and does not push (publishing stays with
  `~/.local/bin/git-autosync`).

Log: `~/Library/Logs/gym-autodeploy.log`.
State: `~/.local/state/fleet-deploy/gym/`.
