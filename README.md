# Arrow Puzzle — 2D Tap-Away Game

A relaxing 2D logic puzzle. Tap arrows to clear the board: an arrow can only leave
when its straight path to the edge of the grid is free. Built as a **fully
self-contained, zero-dependency** HTML5 + JavaScript game (crisp Canvas 2D vector
art) so it is accepted by every web game portal (no external CDN, no build step
required, tiny size, instant load).

## How to play
- **Tap** an arrow to send it off the board in its direction.
- It leaves only if nothing blocks its path to the edge — otherwise you lose a life.
- **Hint** (💡) highlights an arrow that can safely escape right now (free hint first, then a rewarded ad on ad-enabled portals).
- Clear every arrow to win. Levels rise in difficulty (Normal → Hard → Expert) and are **guaranteed solvable**.

## Run locally
```bash
npm run serve      # static server at http://localhost:8080
# or: node tools/serve.mjs 8080
```
Open the URL in a browser. Append `?platform=NAME` to test a specific adapter
(`local`, `crazygames`, `gamedistribution`, `y8`, `playhoop`, `itchio`).

## Run tests (core logic)
```bash
npm test           # escape rule, solver, hint, guaranteed-solvable 2D generator
```

## Project structure
```
src/
  core/      pure game logic (no DOM) — direction, grid, escape rules, solver, level generator
  render/    board2d.js — clean Canvas 2D renderer (dotted grid + chevron arrows + exit trails)
  game/      controller, animations, audio, input
  ui/        DOM HUD (level, lives, hint, difficulty, menus, win/lose)
  levels/    campaign builder
  platform/  SDK ADAPTER LAYER (one file per portal)
tools/       dev server + per-platform build script
tests/       core logic tests (Node, no framework)
```

## The SDK Adapter Layer (multi-platform publishing)
The game core only ever calls the common `PlatformAdapter` interface
(`init`, `gameplayStart/Stop`, `showRewarded`, `showInterstitial`, `happyTime`, …).
To ship on a portal you just **select an adapter** — the game code never changes.

Select an adapter in one of three ways:
1. Build per platform (recommended) — see below.
2. Set `window.ARROW_PUZZLE_PLATFORM = 'crazygames'` before the module script in `index.html`.
3. Add `?platform=crazygames` to the URL (handy for testing).

### Build a self-contained folder per platform
```bash
node tools/build.mjs                 # builds ALL platforms into dist/<platform>/
node tools/build.mjs crazygames      # build just one
```
Each `dist/<platform>/` folder is self-contained — **zip it and upload**.

### Per-platform notes
| Platform | Adapter | Needs ID? | Notes |
|----------|---------|-----------|-------|
| itch.io | `itchio` | No | Plain HTML5, no ad SDK. Zip `dist/itchio/` and upload. |
| CrazyGames | `crazygames` | No | Loads SDK v3 (`sdk.crazygames.com`). Rewarded gates the Hint. |
| GameDistribution | `gamedistribution` | **Yes** — set `ARROW_PUZZLE_GD_ID` | Edit the GD game id in `tools/build.mjs` or `index.html`. |
| Y8 | `y8` | **Yes** — set `ARROW_PUZZLE_Y8_APPID` | Targets the Y8 `ID` ad API; degrades gracefully. |
| Play Hoop | `playhoop` | No (bridge auto-detected) | Fill in the official SDK URL/methods when you receive them. |
| local | `local` | No | Development; rewarded ads granted instantly. |

> Each adapter degrades gracefully: if a portal's SDK is missing or fails, the game
> still runs and rewarded actions are granted, so a build is never "broken".

## Why this stack is never rejected
- **Plain HTML5 + JS + Canvas 2D** — the universal standard every portal accepts.
- **No external dependencies** — no CDN/npm at runtime; works offline; passes strict size/load checks.
- **Single folder** (`index.html` + `styles.css` + `src/`) — exactly the format portals expect.
