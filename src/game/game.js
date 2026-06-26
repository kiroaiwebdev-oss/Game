// game.js
// The game controller. Wires the model (grid/rules), the renderer (scene/camera),
// animations, audio, the HUD, and the platform adapter into one playable loop.

import { gridFromLevel } from '../core/grid.js';
import { canEscape, findHint } from '../core/rules.js';
import { dirAxis } from '../core/direction.js';
import { OrbitCamera } from '../render/camera.js';
import { Scene, AXIS_COLORS, PICK_HALF } from '../render/scene.js';
import { pickBlock } from '../render/picker.js';
import { Animator } from './animator.js';

const SHAKE_RED = [0.95, 0.3, 0.3];

export const GameState = Object.freeze({
  MENU: 'menu',
  PLAYING: 'playing',
  WON: 'won',
  LOST: 'lost',
});

export class Game {
  constructor({ gl, canvas, levels, audio, adapter, hud }) {
    this.canvas = canvas;
    this.levels = levels;
    this.audio = audio;
    this.adapter = adapter;
    this.hud = hud;

    this.scene = new Scene(gl, canvas);
    this.camera = new OrbitCamera([0, 0, 0]);
    this.animator = new Animator();

    this.state = GameState.MENU;
    this.levelIndex = 0;
    this.grid = null;
    this.lives = 0;
    this.maxLives = 3;
    this.busy = false; // blocks input during transitions

    this._running = false;
  }

  // ---- Lifecycle ----
  start() {
    if (!this._running) {
      this._running = true;
      this._loop();
    }
  }

  loadLevel(index) {
    this.levelIndex = Math.max(0, Math.min(this.levels.length - 1, index));
    const def = this.levels[this.levelIndex];
    this.grid = gridFromLevel(def);
    this.maxLives = def.lives || 3;
    this.lives = this.maxLives;
    this.scene.setGridSize(def.size[0], def.size[1], def.size[2]);
    // Fit the camera radius to the level size.
    const maxDim = Math.max(...def.size);
    this.camera.radius = Math.min(this.camera.maxRadius, 5 + maxDim * 1.4);
    this.camera.azimuth = Math.PI * 0.25;
    this.camera.elevation = Math.PI * 0.22;
    this.animator.reset();
    this.animator.spawnAll(this.grid.allBlocks());
    this.state = GameState.PLAYING;
    this.busy = false;
    this.adapter.gameplayStart();
    this.hud.onLevelStart(this);
  }

  // ---- Helpers ----
  colorFor(block) {
    return AXIS_COLORS[dirAxis(block.dir)];
  }

  _pickItems() {
    return this.grid.allBlocks().map((b) => ({
      block: b,
      worldCenter: this.scene.worldCenter(b.x, b.y, b.z),
    }));
  }

  // ---- Input handlers (called by input.js) ----
  handleOrbit(dAz, dEl) { this.camera.orbit(dAz, dEl); }
  handleZoom(factor) { this.camera.zoom(factor); }

  handleTap(ndcX, ndcY) {
    if (this.state !== GameState.PLAYING || this.busy) return;
    const aspect = this.canvas.width / this.canvas.height;
    const { origin, dir } = this.camera.screenRay(ndcX, ndcY, aspect);
    const block = pickBlock(this._pickItems(), origin, dir, PICK_HALF);
    if (!block) return;
    this.audio.tap();
    this.animator.clearHint();

    if (canEscape(this.grid, block)) {
      const color = this.colorFor(block);
      this.grid.removeBlock(block);
      this.animator.escape(block, color);
      this.audio.escape();
      if (this.grid.isCleared) this._win();
    } else {
      this.animator.shake(block.id);
      this.audio.blocked();
      this.lives -= 1;
      this.hud.updateLives(this);
      if (this.lives <= 0) this._lose();
    }
  }

  // ---- Hint (gated by a rewarded ad on real platforms) ----
  async requestHint() {
    if (this.state !== GameState.PLAYING || this.busy) return;
    const hint = findHint(this.grid);
    if (!hint) return; // nothing escapable (shouldn't happen on solvable boards)
    this.busy = true;
    this.hud.setHintPending(true);
    let granted = true;
    try {
      granted = await this.adapter.showRewarded();
    } catch (_) {
      granted = true;
    }
    this.hud.setHintPending(false);
    this.busy = false;
    if (granted) {
      // Re-evaluate after the ad in case the board changed (it can't here, but safe).
      const fresh = findHint(this.grid);
      if (fresh) {
        this.animator.setHint(fresh.id);
        this.audio.hint();
      }
    }
  }

  // ---- Win / Lose ----
  async _win() {
    this.state = GameState.WON;
    this.busy = true;
    this.audio.win();
    this.adapter.gameplayStop();
    this.adapter.happyTime();
    saveProgress(this.levelIndex + 1);
    setTimeout(() => this.hud.showWin(this), 700);
  }

  _lose() {
    this.state = GameState.LOST;
    this.busy = true;
    this.audio.lose();
    this.adapter.gameplayStop();
    setTimeout(() => this.hud.showLose(this), 500);
  }

  async nextLevel() {
    const next = this.levelIndex + 1;
    if (next >= this.levels.length) {
      this.hud.showAllComplete(this);
      return;
    }
    try { await this.adapter.showInterstitial(); } catch (_) {}
    this.loadLevel(next);
  }

  retryLevel() { this.loadLevel(this.levelIndex); }

  // ---- Render loop ----
  buildDrawList() {
    const list = [];
    if (this.grid) {
      for (const b of this.grid.allBlocks()) {
        const v = this.animator.visualFor(b.id);
        let color = this.colorFor(b);
        if (v.shaking) color = SHAKE_RED;
        list.push({
          x: b.x, y: b.y, z: b.z, dir: b.dir,
          color,
          extra: v.extra,
          scale: v.scale,
          emissive: v.emissive,
          alpha: 1,
        });
      }
    }
    // Add flying-off ghosts.
    for (const g of this.animator.ghostDraws()) list.push(g);
    return list;
  }

  _loop() {
    const frame = () => {
      if (!this._running) return;
      this.animator.update();
      const list = this.grid ? this.buildDrawList() : [];
      this.scene.render(this.camera, list);
      requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  }
}

// ---- Progress persistence ----
const PROGRESS_KEY = 'arrowpuzzle.progress';
export function loadProgress() {
  try {
    const v = parseInt(localStorage.getItem(PROGRESS_KEY) || '0', 10);
    return Number.isFinite(v) ? v : 0;
  } catch (_) { return 0; }
}
export function saveProgress(unlockedUpTo) {
  try {
    const cur = loadProgress();
    if (unlockedUpTo > cur) localStorage.setItem(PROGRESS_KEY, String(unlockedUpTo));
  } catch (_) {}
}
