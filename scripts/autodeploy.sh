#!/usr/bin/env bash
# Thin per-repo wrapper. The deploy engine is the single shared helper at
# ~/.local/lib/fleet-deploy/deploy.sh; this repo's settings are in
# tools/autodeploy/deploy.conf (both travel with git).
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
HELPER="${FLEET_DEPLOY_HELPER:-$HOME/.local/lib/fleet-deploy/deploy.sh}"
[ -f "$HELPER" ] || { echo "fleet-deploy helper missing: $HELPER" >&2; exit 2; }
exec /bin/bash "$HELPER" "$ROOT" "$ROOT/tools/autodeploy/deploy.conf" "$@"
