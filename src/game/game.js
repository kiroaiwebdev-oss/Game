// game.js (2D Arrow Puzzle controller)
// Wires the model (grid/rules), the 2D board renderer, animations, audio,
// the HUD and the platform adapter into one playable loop.

import { gridFromLevel } from '../core/grid.js';
import { canEscape, findHint } from '../core/rules.js';
import { dirVector } from '../core/direction.js';
import { Board2D, COLORS } from '../render/board2d.js';
import { Animator } from './animator.js';

export const GameState = Object.freeze({
  MENU: 'menu', PLAYING: 'playing', WON: 'won', LOST: 'lost',
});

export class Game {
  constructor({ canvas, levels, audio, adapter, hud }) {
    this.canvas = canvas;
    this.levels = levels;
    this.audio = audio;
    this.adapter = adapter;
    this.hud = hud;

    this.board = new Board2D(canvas);
    this.animator = new Animator();

    this.state = GameState.MENU;
    this.levelIndex = 0;
    this.grid = null;
    this.lives = 0;
    this.maxLives = 3;
    this.busy = false;
    this._running = false;
  }

  start() {
    if (!this._running) { this._running = true; this._loop(); }
  }

  loadLevel(index) {
    this.levelIndex = Math.max(0, Math.min(this.levels.length - 1, index));
    const def = this.levels[this.levelIndex];
    this.grid = gridFromLevel(def);
    this.maxLives = def.lives || 3;
    this.lives = this.maxLives;
    this.hints = 1; // free hints this level; more via rewarded ad
    this.board.setGrid(def.size[0], def.size[1]);
    this.animator.reset();
    this.animator.spawnAll(this.grid.allBlocks());
    this.state = GameState.PLAYING;
    this.busy = false;
    this.adapter.gameplayStart();
    this.hud.onLevelStart(this);
  }

  // Cells from a block to where it leaves the board (used for the exit trail).
  _cellsToEdge(block) {
    const v = dirVector(block.dir);
    let n = 0;
    let x = block.x + v.x, y = block.y + v.y, z = block.z + v.z;
    while (this.grid.inBounds(x, y, z)) { n++; x += v.x; y += v.y; z += v.z; }
    return n;
  }

  // ---- input ----
  handleTap(cssX, cssY) {
    if (this.state !== GameState.PLAYING || this.busy) return;
    const cell = this.board.screenToCell(cssX, cssY);
    if (!cell) return;
    const block = this.grid.at(cell.x, cell.y, 0);
    if (!block) return;

    this.audio.tap();
    this.animator.clearHint();

    if (canEscape(this.grid, block)) {
      const toEdge = this._cellsToEdge(block);
      this.grid.removeBlock(block);
      this.animator.escape(block, toEdge);
      this.audio.escape();
      this.hud.updateRemaining(this);
      if (this.grid.isCleared) this._win();
    } else {
      this.animator.shake(block.id);
      this.audio.blocked();
      this.lives -= 1;
      this.hud.updateLives(this);
      if (this.lives <= 0) this._lose();
    }
  }

  // ---- hint (free hint first, then rewarded-ad gated on ad platforms) ----
  async requestHint() {
    if (this.state !== GameState.PLAYING || this.busy) return;
    if (!findHint(this.grid)) return;

    // Free hint available -> use it directly.
    if (this.hints > 0) {
      this.hints -= 1;
      this.hud.updateHints(this);
      this._giveHint();
      return;
    }

    // Otherwise offer a rewarded ad to earn one.
    this.busy = true;
    this.hud.setHintPending(true);
    let granted = true;
    try { granted = await this.adapter.showRewarded(); } catch (_) { granted = true; }
    this.hud.setHintPending(false);
    this.busy = false;
    if (granted) this._giveHint();
  }

  _giveHint() {
    const fresh = findHint(this.grid);
    if (fresh) { this.animator.setHint(fresh.id); this.audio.hint(); }
  }

  // ---- win / lose / flow ----
  _win() {
    this.state = GameState.WON;
    this.busy = true;
    this.audio.win();
    this.adapter.gameplayStop();
    this.adapter.happyTime();
    saveProgress(this.levelIndex + 1);
    setTimeout(() => this.hud.showWin(this), 650);
  }

  _lose() {
    this.state = GameState.LOST;
    this.busy = true;
    this.audio.lose();
    this.adapter.gameplayStop();
    setTimeout(() => this.hud.showLose(this), 450);
  }

  async nextLevel() {
    const next = this.levelIndex + 1;
    if (next >= this.levels.length) { this.hud.showAllComplete(this); return; }
    try { await this.adapter.showInterstitial(); } catch (_) {}
    this.loadLevel(next);
  }

  retryLevel() { this.loadLevel(this.levelIndex); }

  // ---- render ----
  buildDrawList() {
    const list = [];
    for (const b of this.grid.allBlocks()) {
      const v = this.animator.visualFor(b.id);
      let color = COLORS.arrow;
      if (v.shaking) color = COLORS.danger;
      else if (this.animator.hintId === b.id) color = COLORS.accent;
      list.push({
        x: b.x, y: b.y, dir: b.dir,
        color,
        dxCells: v.dxCells, dyCells: v.dyCells,
        scale: v.scale, glow: v.glow, alpha: 1,
      });
    }
    for (const g of this.animator.ghostDraws()) list.push(g);
    return list;
  }

  _loop() {
    const frame = () => {
      if (!this._running) return;
      this.animator.update();
      if (this.grid) this.board.render(this.buildDrawList());
      requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  }
}

// ---- progress persistence ----
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
