// animator.js
// Drives arrow animations and produces the fractional point lists the Board2D
// renderer draws. Handles: spawn fade-in, blocked shake, hint glow, and the
// "drain off" escape where the snake slithers head-first out of the board.

import { VEC } from '../core/dir2d.js';

const lerp = (a, b, t) => a + (b - a) * t;
const easeIn = (t) => t * t;
const easeOutBack = (t) => {
  const c1 = 1.70158, c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
};

const SPAWN_DUR = 0.4;
const SHAKE_DUR = 0.34;

export class Animator {
  constructor() {
    this.ghosts = [];        // escaping arrows draining off
    this.shakes = new Map(); // arrowId -> start
    this.spawns = new Map(); // arrowId -> { start, delay }
    this.hintId = null;
  }

  reset() {
    this.ghosts.length = 0;
    this.shakes.clear();
    this.spawns.clear();
    this.hintId = null;
  }

  now() { return performance.now() / 1000; }

  spawnAll(arrows) {
    const t = this.now();
    this.spawns.clear();
    arrows.forEach((a, i) => this.spawns.set(a.id, { start: t, delay: Math.min(0.4, i * 0.006) }));
  }

  // arrow already removed; cellsToEdge = ray steps until head leaves the board.
  escape(arrow, cellsToEdge) {
    const n = arrow.cells.length;
    const totalA = (n - 1) + cellsToEdge + 2; // advance needed to fully exit
    const dur = 0.32 + 0.035 * totalA;
    this.ghosts.push({
      cells: arrow.cells.map((c) => ({ x: c.x, y: c.y })),
      dir: arrow.dir, totalA, start: this.now(), dur,
    });
    this.shakes.delete(arrow.id);
    if (this.hintId === arrow.id) this.hintId = null;
  }

  shake(id) { this.shakes.set(id, this.now()); }
  setHint(id) { this.hintId = id; }
  clearHint() { this.hintId = null; }
  get busy() { return this.ghosts.length > 0; }

  update() {
    const t = this.now();
    this.ghosts = this.ghosts.filter((g) => t - g.start < g.dur);
    for (const [id, s] of this.shakes) if (t - s > SHAKE_DUR) this.shakes.delete(id);
    for (const [id, s] of this.spawns) if (t - (s.start + s.delay) > SPAWN_DUR) this.spawns.delete(id);
  }

  // Visual modifiers for a LIVE arrow: { alpha, glow, offset:[dx,dy], shaking }.
  visualFor(id, dir) {
    const t = this.now();
    let alpha = 1, glow = 0, ox = 0, oy = 0, shaking = false;

    const sp = this.spawns.get(id);
    if (sp) {
      const p = Math.max(0, Math.min(1, (t - sp.start - sp.delay) / SPAWN_DUR));
      alpha = p;
    }

    const sh = this.shakes.get(id);
    if (sh !== undefined) {
      shaking = true;
      const p = Math.min(1, (t - sh) / SHAKE_DUR);
      const v = VEC[dir];
      const amp = (1 - p) * 0.22 * Math.sin(p * Math.PI * 7);
      ox = v.x * amp; oy = v.y * amp;
    }

    if (this.hintId === id) glow = 0.5 + 0.5 * Math.sin(t * 7);

    return { alpha, glow, offset: [ox, oy], shaking };
  }

  // Master track for a draining snake: body cells then the head exit ray.
  _track(g) {
    const n = g.cells.length;
    const head = g.cells[n - 1];
    const v = VEC[g.dir];
    const T = g.cells.slice();
    const extra = g.totalA + 3;
    for (let k = 1; k <= extra; k++) T.push({ x: head.x + v.x * k, y: head.y + v.y * k });
    return T;
  }

  // Draw descriptors for draining arrows.
  ghostDraws() {
    const t = this.now();
    const out = [];
    for (const g of this.ghosts) {
      const p = Math.min(1, (t - g.start) / g.dur);
      const a = g.totalA * easeIn(p);          // cells advanced
      const T = this._track(g);
      const n = g.cells.length;
      const points = [];
      for (let j = 0; j < n; j++) {
        const idx = j + a;
        const lo = Math.floor(idx);
        const hi = Math.min(T.length - 1, lo + 1);
        const f = idx - lo;
        const A = T[Math.min(lo, T.length - 1)], B = T[hi];
        points.push({ x: lerp(A.x, B.x, f), y: lerp(A.y, B.y, f) });
      }
      out.push({
        points, dir: g.dir,
        color: '#3f7fcf',
        alpha: p > 0.65 ? Math.max(0, 1 - (p - 0.65) / 0.35) : 1,
        glow: 0.4 * (1 - p),
      });
    }
    return out;
  }
}
