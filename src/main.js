// main.js — bootstrap the Amaze maze game.
import { AudioEngine } from './game/audio.js';
import { createAdapter } from './platform/adapter.js';
import { buildLevels } from './levels/levels.js';
import { Hud } from './ui/hud.js';
import { MazeGame } from './game/mazegame.js';
import { attachInput } from './game/input.js';

async function boot() {
  const canvas = document.getElementById('game-canvas');
  const hudRoot = document.getElementById('hud');

  const audio = new AudioEngine();
  const hud = new Hud(hudRoot);

  const adapter = await createAdapter();
  adapter.loadingStart();
  adapter.onMuteChange((m) => audio.setMuted(m));

  const levels = buildLevels(60);
  const game = new MazeGame({ canvas, levels, audio, adapter, hud });
  hud.bindGame(game);
  attachInput(canvas, game, audio);

  game.start();
  adapter.loadingStop();
  hud.showMenu(() => { audio.resume(); game.loadLevel(0); });

  window.__amaze = { game, levels };
}

boot();
