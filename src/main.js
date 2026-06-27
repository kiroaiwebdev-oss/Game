// main.js
// Bootstraps the 2D Arrow Puzzle: canvas, audio, platform adapter, levels, HUD,
// the Game controller and input. Then shows the menu.

import { AudioEngine } from './game/audio.js';
import { createAdapter } from './platform/adapter.js';
import { buildLevels } from './levels/levels.js';
import { Hud } from './ui/hud.js';
import { Game } from './game/game.js';
import { attachInput } from './game/input.js';

async function boot() {
  const canvas = document.getElementById('game-canvas');
  const hudRoot = document.getElementById('hud');

  const audio = new AudioEngine();
  const hud = new Hud(hudRoot);

  const adapter = await createAdapter();
  adapter.loadingStart();
  adapter.onMuteChange((muted) => audio.setSdkMuted(muted));

  const levels = buildLevels(40);

  const game = new Game({ canvas, levels, audio, adapter, hud });
  hud.bindGame(game);
  attachInput(canvas, game, audio);

  game.start();
  adapter.loadingStop();

  // Pre-roll ad on Play (GD best practice: ad on the splash/Play button), then
  // start. On itch.io/local this resolves instantly (no ad).
  hud.showMenu(async () => {
    audio.resume();
    try { await adapter.showInterstitial(); } catch (_) {}
    game.loadLevel(0);
  });

  window.__arrowPuzzle = { game, adapter, levels };
}

boot();
