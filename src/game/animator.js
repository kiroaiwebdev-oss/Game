// animator.js (2D)
// Drives per-arrow animations and reports per-frame visual offsets the Board2D
// renderer consumes. Time in seconds. No drawing here.

import { DIR_SCREEN } from '../render/board2d.js';

const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);
const easeOutBack = (t) => {
  const c1 = 1.70158, c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
};

const ESCAPE_DUR = 0.42;
const SHAKE_DUR = 0.38;
const SPAWN_DUR = 0.4;

export class Animator {
  constructor() {
    this.ghosts = [];        // escaping arrows flying off
    this.shakes = new Map(); // blockId -> startTime
    this.spawns = new Map(); // blockId -> { start, delay }
    this.hintId = null;
  }

  reset() {
    this.ghosts.length = 0;
    this.shakes.clear();
    this.spawns.clear();
    this.hintId = null;
  }

  now() { return performance.now() / 1000; }

  spawnAll(blocks) {
    const t = this.now();
    this.spawns.clear();
    blocks.forEach((b, i) => {
      this.spawns.set(b.id, { start: t, delay: Math.min(0.45, i * 0.01) });
    });
  }

  // block already removed from grid; cellsToEdge = how many cells until it exits.
  escape(block, cellsToEdge) {
    this.ghosts.push({ block: { ...block }, cellsToEdge, start: this.now() });
    this.shakes.delete(block.id);
    if (this.hintId === block.id) this.hintId = null;
  }

  shake(blockId) { this.shakes.set(blockId, this.now()); }
  setHint(blockId) { this.hintId = blockId; }
  clearHint() { this.hintId = null; }

  get busy() { return this.ghosts.length > 0; }

  update() {
    const t = this.now();
    this.ghosts = this.ghosts.filter((g) => t - g.start < ESCAPE_DUR);
    for (const [id, s] of this.shakes) if (t - s > SHAKE_DUR) this.shakes.delete(id);
    for (const [id, s] of this.spawns) if (t - (s.start + s.delay) > SPAWN_DUR) this.spawns.delete(id);
  }

  // Visual state for a LIVE arrow.
  visualFor(blockId) {
    const t = this.now();
    let dxCells = 0, dyCells = 0, scale = 1, glow = 0;

    const spawn = this.spawns.get(blockId);
    if (spawn) {
      const p = Math.max(0, Math.min(1, (t - spawn.start - spawn.delay) / SPAWN_DUR));
      scale = p <= 0 ? 0.0001 : easeOutBack(p);
    }

    const sh = this.shakes.get(blockId);
    const shaking = sh !== undefined;
    if (shaking) {
      const p = Math.min(1, (t - sh) / SHAKE_DUR);
      const amp = (1 - p) * 0.16;
      dxCells = Math.sin(p * Math.PI * 9) * amp;
    }

    if (this.hintId === blockId) {
      glow = 0.5 + 0.5 * Math.sin(t * 7);
    }

    return { dxCells, dyCells, scale, glow, shaking };
  }

  // Draw descriptors for escaping arrows (offset in cell units + fading trail).
  ghostDraws() {
    const t = this.now();
    const out = [];
    for (const g of this.ghosts) {
      const p = Math.min(1, (t - g.start) / ESCAPE_DUR);
      const e = easeOutCubic(p);
      const [ux, uy] = DIR_SCREEN[g.block.dir];
      const travel = (g.cellsToEdge + 1.5) * e; // slide past the edge
      out.push({
        x: g.block.x, y: g.block.y, dir: g.block.dir,
        color: '#3f8efc',
        dxCells: ux * travel,
        dyCells: uy * travel,
        alpha: 1 - e * 0.9,
        scale: 1,
        glow: 0.4 * (1 - e),
        trail: true,
        trailLen: g.cellsToEdge + 0.5,
        trailAlpha: 0.32 * (1 - e),
      });
    }
    return out;
  }
}
