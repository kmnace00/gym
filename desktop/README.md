# Gym — desktop (macOS, Electron)

A phone-shaped window (400 px of content) around the **live** gym app
(`https://kmnace00.github.io/gym/`). One codebase: nothing is forked, so the
desktop always shows the current release. Its local storage is its own copy;
there is no sync.

## Open it

- Double-click **`Start Gym.command`** in this folder (first run installs
  Electron once), or
- from the repo root: `npm run desktop` (installs this folder's Electron on
  first run, then starts it), or
- from this folder: `npm install && npm start`.

Set `GYM_DESKTOP_URL` to point the window somewhere else (e.g. a local
`file://.../index.html` while developing):

```sh
GYM_DESKTOP_URL="file://$HOME/gym/index.html" npm start
```

## Launch check

`GYM_DESKTOP_SMOKE=/tmp/gym-desktop.png npm start` loads the page once, prints
what the renderer sees (phone width, day title, lift count, version), saves a
screenshot, and quits.

The repo's root gates (`npm run check`, `typecheck`, `e2e`) do not cover this
folder; it is a thin shell with no app logic.
