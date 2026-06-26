// main.js
// Bootstraps everything: WebGL context, audio, platform adapter, levels, HUD,
// the Game controller and input. Then shows the menu.

import { createContext } from './render/webgl.js';
import { AudioEngine } from './game/audio.js';
import { createAdapter } from './platform/adapter.js';
import { buildLevels } from './levels/levels.js';
import { Hud } from './ui/hud.js';
import { Game } from './game/game.js';
import { attachInput } from './game/input.js';

async function boot() {
  const canvas = document.getElementById('game-canvas');
  const hudRoot = document.getElementById('hud');

  let gl;
  try {
    gl = createContext(canvas);
  } catch (err) {
    hudRoot.innerHTML = `<div class="overlay"><div class="card"><h1 class="card-title">WebGL needed</h1><p class="card-msg">${err.message}</p></div></div>`;
    return;
  }

  const audio = new AudioEngine();
  const hud = new Hud(hudRoot);

  // Platform adapter (selected via ?platform= or window.ARROW_PUZZLE_PLATFORM).
  const adapter = await createAdapter();
  adapter.loadingStart();

  // Portal-driven mute (e.g., CrazyGames/GD pause events).
  adapter.onMuteChange((muted) => audio.setMuted(muted));

  const levels = buildLevels(30);

  const game = new Game({ gl, canvas, levels, audio, adapter, hud });
  hud.bindGame(game);
  attachInput(canvas, game, audio);

  game.start(); // start render loop (renders empty bg until a level loads)
  adapter.loadingStop();

  hud.showMenu(() => {
    audio.resume();
    game.loadLevel(0);
  });

  // Expose for debugging in the console.
  window.__arrowPuzzle = { game, adapter, levels };
}

boot();
