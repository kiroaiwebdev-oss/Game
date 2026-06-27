// main.js
// Bootstraps the 2D Arrow Puzzle: canvas, audio, platform adapter, levels, HUD,
// the Game controller and input. Then shows the menu.

import { AudioEngine } from './game/audio.js';
import { createAdapter } from './platform/adapter.js';
import { buildLevels } from './levels/levels.js';
import { Hud } from './ui/hud.js';
import { Game } from './game/game.js';
import { attachInput } from './game/input.js';
import * as storage from './game/storage.js';
import { setLang } from './ui/i18n.js';

async function boot() {
  const canvas = document.getElementById('game-canvas');
  const hudRoot = document.getElementById('hud');

  const audio = new AudioEngine();
  const hud = new Hud(hudRoot);

  const adapter = await createAdapter();
  adapter.loadingStart();
  adapter.onMuteChange((muted) => audio.setSdkMuted(muted));

  // Automatic language detection at launch (Yandex req. 2.14) + safe storage
  // backend (avoids the "Service storage URL detected" warning on Yandex).
  setLang(adapter.lang);
  try { storage.setBackend(await adapter.getStorage()); } catch (_) {}

  const levels = buildLevels(40);

  const game = new Game({ canvas, levels, audio, adapter, hud });
  hud.bindGame(game);
  attachInput(canvas, game, audio);

  game.start();
  adapter.loadingStop();

  // Yandex/general: pause audio when the tab/window loses focus (req. 1.3).
  document.addEventListener('visibilitychange', () => {
    audio.setPageHidden(document.hidden);
  });
  window.addEventListener('blur', () => audio.setPageHidden(true));
  window.addEventListener('focus', () => audio.setPageHidden(false));

  // Disable the browser context menu inside the game area (Yandex req. 1.6.1.8):
  // right-click / long-press must not pop the system menu over the canvas.
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());

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
