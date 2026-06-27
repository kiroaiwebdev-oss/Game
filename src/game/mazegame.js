// mazegame.js
// Controller: builds the maze, lets the player steer a path with a finger drag
// through open corridors, and wins when the path reaches the exit.

import { makeMaze, passageOpen, cellKey } from '../core/maze.js';
import { MazeView } from '../render/mazeview.js';
import { ensureLevel } from '../levels/levels.js';

export const State = Object.freeze({ MENU: 'menu', PLAYING: 'playing', WON: 'won' });

const parse = (k) => k.split(',').map(Number);

export class MazeGame {
  constructor({ canvas, levels, audio, adapter, hud }) {
    this.canvas = canvas;
    this.levels = levels;
    this.audio = audio;
    this.adapter = adapter;
    this.hud = hud;
    this.view = new MazeView(canvas);

    this.state = State.MENU;
    this.levelIndex = 0;
    this.maze = null;
    this.path = [];
    this.pathSet = new Set();
    this.lives = 3;
    this.showSolution = false;
    this._running = false;
  }

  start() { if (!this._running) { this._running = true; this._loop(); } }

  loadLevel(index) {
    this.levelIndex = Math.max(0, Math.min(this.levels.length - 1, index));
    const spec = ensureLevel(this.levels[this.levelIndex]);
    this.maze = spec.maze;
    this.view.setMaze(this.maze);
    this.path = [this.maze.entrance.k];
    this.pathSet = new Set(this.path);
    this.lives = spec.lives || 3;
    this.showSolution = false;
    this.startTime = performance.now();
    this.solveMs = 0;
    this.state = State.PLAYING;
    this.adapter.gameplayStart();
    this.hud.onLevelStart(this);
  }

  // ---- input: steer the head toward the finger through open passages ----
  handlePoint(cssX, cssY) {
    if (this.state !== State.PLAYING) return;
    const target = this.view.pointToCell(cssX, cssY);
    if (!target) return;
    this._advanceToward(target);
  }

  _advanceToward(target) {
    // Step the head one cell at a time toward the target through open passages.
    let guard = 200;
    while (guard-- > 0) {
      const head = this.path[this.path.length - 1];
      if (head === target) break;
      const [hx, hy] = parse(head);
      const [tx, ty] = parse(target);
      const dx = tx - hx, dy = ty - hy;
      if (dx === 0 && dy === 0) break;

      // Preferred step: larger axis first, then the other.
      const order = Math.abs(dx) >= Math.abs(dy)
        ? [[Math.sign(dx), 0], [0, Math.sign(dy)]]
        : [[0, Math.sign(dy)], [Math.sign(dx), 0]];

      let moved = false;
      for (const [sx, sy] of order) {
        if (sx === 0 && sy === 0) continue;
        const nk = cellKey(hx + sx, hy + sy);
        if (!this.maze.cells.has(nk)) continue;
        if (!passageOpen(this.maze.walls, head, nk)) continue;
        // Backtrack if stepping onto the previous cell.
        if (this.path.length >= 2 && nk === this.path[this.path.length - 2]) {
          this.pathSet.delete(head);
          this.path.pop();
          moved = true;
          break;
        }
        if (!this.pathSet.has(nk)) {
          this.path.push(nk);
          this.pathSet.add(nk);
          moved = true;
          break;
        }
      }
      if (!moved) break; // blocked by a wall or already-visited cell
    }
    this.audio && this.audio.tap && this.audio.tap();
    if (this.path[this.path.length - 1] === this.maze.exit.k) this._win();
  }

  resetPath() {
    if (!this.maze) return;
    this.path = [this.maze.entrance.k];
    this.pathSet = new Set(this.path);
  }

  async requestHint() {
    if (this.state !== State.PLAYING) return;
    let granted = true;
    try { granted = await this.adapter.showRewarded(); } catch (_) { granted = true; }
    if (granted) {
      this.showSolution = true;
      this.audio && this.audio.hint && this.audio.hint();
      setTimeout(() => { this.showSolution = false; }, 2500);
    }
  }

  _win() {
    this.state = State.WON;
    this.solveMs = performance.now() - this.startTime;
    this.audio && this.audio.win && this.audio.win();
    this.adapter.gameplayStop();
    this.adapter.happyTime();
    saveProgress(this.levelIndex + 1);
    setTimeout(() => this.hud.showWin(this), 500);
  }

  async nextLevel() {
    const next = this.levelIndex + 1;
    if (next >= this.levels.length) { this.hud.showAllComplete(this); return; }
    try { await this.adapter.showInterstitial(); } catch (_) {}
    this.loadLevel(next);
  }

  retryLevel() { this.loadLevel(this.levelIndex); }

  _loop() {
    const frame = () => {
      if (!this._running) return;
      if (this.maze) {
        this.view.render({ path: this.path, showSolution: this.showSolution });
      }
      requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  }
}

const PROGRESS_KEY = 'amaze.progress';
export function loadProgress() {
  try { const v = parseInt(localStorage.getItem(PROGRESS_KEY) || '0', 10); return Number.isFinite(v) ? v : 0; }
  catch (_) { return 0; }
}
export function saveProgress(n) {
  try { if (n > loadProgress()) localStorage.setItem(PROGRESS_KEY, String(n)); } catch (_) {}
}
