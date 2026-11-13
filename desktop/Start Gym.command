#!/bin/zsh
# Gym — double-click launcher (macOS). First run installs Electron once.
cd "$(dirname "$0")" || exit 1
if [ ! -d node_modules ]; then
  echo "First run: installing Gym desktop (downloads Electron, one time only)…"
  npm install || { echo "npm install failed — is Node.js installed? Get it from https://nodejs.org"; read -k 1 "?Press any key to close…"; exit 1; }
fi
echo "Starting Gym…"
npm start
