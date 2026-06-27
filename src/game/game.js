// game.js (2D snake-arrow Arrow Puzzle controller)

import { boardFromLevel, resetArrowId } from '../core/board.js';
import { canEscape, findHint } from '../core/escape2.js';
import { VEC } from '../core/dir2d.js';
import { Board2D, COLORS } from '../render/board2d.js';
import { Animator } from './animator.js';
import { ensureLevel } from '../levels/levels.js';

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

    this.view = new Board2D(canvas);
    this.animator = new Animator();

    this.state = GameState.MENU;
    this.levelIndex = 0;
    this.board = null;
    this.lives = 0; this.maxLives = 3; this.hints = 1;
    this.busy = false; this._running = false;
    this.onboardCell = null; // visual "tap here" hint on the very first level
  }

  start() { if (!this._running) { this._running = true; this._loop(); } }

  loadLevel(index) {
    this.levelIndex = Math.max(0, Math.min(this.levels.length - 1, index));
    const def = ensureLevel(this.levels[this.levelIndex]);
    resetArrowId();
    this.board = boardFromLevel(def);
    this.maxLives = def.lives || 3;
    this.lives = this.maxLives;
    this.hints = 1;
    this.armed = new Set(); // arrows tapped while blocked -> shown red, auto-exit when free
    this.startTime = performance.now();
    this.solveMs = 0;
    this.view.setGrid(def.cols, def.rows);
    this.animator.reset();
    this.animator.spawnAll(this.board.allArrows());
    this.state = GameState.PLAYING;
    this.busy = false;
    // First-ever level: show a visual "tap here" hint on a free arrow (skippable
    // — it disappears on the first tap). Shown only once, then never again.
    this.onboardCell = null;
    if (this.levelIndex === 0 && !isOnboarded()) {
      const a = findHint(this.board);
      if (a) { const h = this.board.head(a); this.onboardCell = { x: h.x, y: h.y }; }
    }
    this.adapter.gameplayStart();
    this.adapter.setContext?.({ level: this.levelIndex + 1, arrows: this.board.remaining });
    this.hud.onLevelStart(this);
  }

  _cellsToEdge(arrow) {
    const v = VEC[arrow.dir];
    const head = this.board.head(arrow);
    let n = 0, x = head.x + v.x, y = head.y + v.y;
    while (this.board.inBounds(x, y)) { n++; x += v.x; y += v.y; }
    return n;
  }

  handleTap(cssX, cssY) {
    if (this.state !== GameState.PLAYING || this.busy) return;
    // First tap dismisses the onboarding hint (skippable).
    if (this.onboardCell) { this.onboardCell = null; setOnboarded(); }
    const cell = this.view.screenToCell(cssX, cssY);
    if (!cell) return;
    const id = this.board.occupant(cell.x, cell.y);
    if (id === undefined) return;
    const arrow = this.board.arrows.get(id);
    if (!arrow) return;

    this.audio.tap();
    this.animator.clearHint();

    if (canEscape(this.board, arrow)) {
      this._release(arrow);
      this._autoRelease();           // freed-up red arrows leave automatically
    } else if (!this.armed.has(arrow.id)) {
      // Blocked: mark it red (it will auto-exit once its path clears) and the
      // wrong tap costs a life.
      this.armed.add(arrow.id);
      this.animator.shake(arrow.id);
      this.audio.blocked();
      this.lives -= 1;
      this.hud.updateLives(this);
      if (this.lives <= 0) this._lose();
    }
  }

  // Slide one arrow off the board.
  _release(arrow) {
    const toEdge = this._cellsToEdge(arrow);
    this.board.removeArrow(arrow);
    this.armed.delete(arrow.id);
    this.animator.escape(arrow, toEdge);
    this.audio.escape();
    this.hud.updateRemaining(this);
  }

  // Any RED (armed) arrow whose path is now clear leaves automatically; this
  // can cascade as each exit frees the next.
  _autoRelease() {
    let changed = true;
    while (changed) {
      changed = false;
      for (const id of Array.from(this.armed)) {
        const a = this.board.arrows.get(id);
        if (a && canEscape(this.board, a)) { this._release(a); changed = true; }
      }
    }
    if (this.board.isCleared && this.state === GameState.PLAYING) this._win();
  }

  async requestHint() {
    if (this.state !== GameState.PLAYING || this.busy) return;
    if (!findHint(this.board)) return;
    // Free hint while the player still has one banked.
    if (this.hints > 0) {
      this.hints -= 1;
      this.hud.updateHints(this);
      this._giveHint();
      return;
    }
    // Out of free hints. On platforms with no ads (itch.io/local) just grant it.
    if (!this.adapter.hasAds) { this._giveHint(); return; }
    // Ad platforms: show a themed rewarded popup ("Watch Ad / No Thanks") first.
    this.hud.showRewardedPrompt(
      'Free Hint',
      'Watch a short video to reveal an arrow you can safely clear.',
      async () => {
        this.busy = true;
        this.hud.setHintPending(true);
        let granted = true;
        try { granted = await this.adapter.showRewarded(); } catch (_) { granted = true; }
        this.hud.setHintPending(false);
        this.busy = false;
        if (granted) this._giveHint();
      }
    );
  }

  _giveHint() {
    const fresh = findHint(this.board);
    if (fresh) { this.animator.setHint(fresh.id); this.audio.hint(); }
  }

  _win() {
    this.state = GameState.WON; this.busy = true;
    this.solveMs = performance.now() - this.startTime;
    this.audio.win(); this.adapter.gameplayStop();
    if ((this.levelIndex + 1) % 5 === 0) this.adapter.happyTime(); // sparingly, per docs
    saveProgress(this.levelIndex + 1);
    setTimeout(() => this.hud.showWin(this), 650);
  }

  _lose() {
    this.state = GameState.LOST; this.busy = true;
    this.audio.lose(); this.adapter.gameplayStop();
    setTimeout(() => this.hud.showLose(this), 450);
  }

  // Watch a rewarded ad to refill lives and CONTINUE the same board (progress kept).
  async continueWithAd() {
    this.busy = true;
    this.hud.setContinuePending(true);
    let granted = true;
    try { granted = await this.adapter.showRewarded(); } catch (_) { granted = true; }
    this.hud.setContinuePending(false);
    if (granted) {
      this.lives = this.maxLives;
      this.hud.updateLives(this);
      this.hud.hideOverlay();
      this.state = GameState.PLAYING;
      this.busy = false;
      this.adapter.gameplayStart();
    } else {
      this.busy = false; // ad skipped/failed -> stay on lose screen
    }
  }

  async nextLevel() {
    const next = this.levelIndex + 1;
    if (next >= this.levels.length) { this.hud.showAllComplete(this); return; }
    // Mid-roll ad on the Next button (the portal throttles frequency).
    try { await this.adapter.showInterstitial(); } catch (_) {}
    this.loadLevel(next);
  }

  retryLevel() { this.loadLevel(this.levelIndex); }

  buildDrawList() {
    const list = [];
    const t = performance.now() / 1000;
    for (const a of this.board.allArrows()) {
      const v = this.animator.visualFor(a.id, a.dir);
      let color = COLORS.arrow;
      let glow = v.glow;
      if (this.armed.has(a.id)) {
        color = COLORS.danger;                 // persistent red while blocked
        glow = Math.max(glow, 0.25 + 0.2 * Math.sin(t * 5));
      } else if (this.animator.hintId === a.id) {
        color = COLORS.hint;
      }
      const [ox, oy] = v.offset;
      list.push({
        points: a.cells.map((c) => ({ x: c.x + ox, y: c.y + oy })),
        dir: a.dir,
        color, alpha: v.alpha, glow,
      });
    }
    for (const g of this.animator.ghostDraws()) list.push(g);
    return list;
  }

  _loop() {
    const frame = () => {
      if (!this._running) return;
      this.animator.update();
      if (this.board) this.view.render(this.buildDrawList(), this.onboardCell);
      requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  }
}

const PROGRESS_KEY = 'arrowpuzzle.progress';
export function loadProgress() {
  try { const v = parseInt(localStorage.getItem(PROGRESS_KEY) || '0', 10); return Number.isFinite(v) ? v : 0; }
  catch (_) { return 0; }
}
export function saveProgress(unlockedUpTo) {
  try { const cur = loadProgress(); if (unlockedUpTo > cur) localStorage.setItem(PROGRESS_KEY, String(unlockedUpTo)); }
  catch (_) {}
}

const ONBOARD_KEY = 'arrowzen.onboarded';
export function isOnboarded() {
  try { return localStorage.getItem(ONBOARD_KEY) === '1'; } catch (_) { return false; }
}
export function setOnboarded() {
  try { localStorage.setItem(ONBOARD_KEY, '1'); } catch (_) {}
}
