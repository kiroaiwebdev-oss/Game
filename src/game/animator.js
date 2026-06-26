// animator.js
// Drives all per-block visual animations and reports per-frame visual state.
// Time is in seconds (performance.now()/1000). No rendering here — it only
// computes offsets/scale/alpha/emissive that the scene consumes.

import { DIR_VECTORS } from '../core/direction.js';

const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);
const easeOutBack = (t) => {
  const c1 = 1.70158, c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
};

const ESCAPE_DUR = 0.55;
const SHAKE_DUR = 0.4;
const SPAWN_DUR = 0.45;

export class Animator {
  constructor() {
    this.ghosts = [];          // escaping blocks still flying off
    this.shakes = new Map();   // blockId -> startTime
    this.spawns = new Map();   // blockId -> { start, delay }
    this.hintId = null;
  }

  reset() {
    this.ghosts.length = 0;
    this.shakes.clear();
    this.spawns.clear();
    this.hintId = null;
  }

  now() { return performance.now() / 1000; }

  // Stagger a gentle scale-in intro for all blocks at level start.
  spawnAll(blocks) {
    const t = this.now();
    this.spawns.clear();
    blocks.forEach((b, i) => {
      this.spawns.set(b.id, { start: t, delay: Math.min(0.5, i * 0.012) });
    });
  }

  // Begin the fly-off animation for an escaped block (already removed from grid).
  escape(block, color) {
    this.ghosts.push({ block: { ...block }, color, start: this.now() });
    this.shakes.delete(block.id);
    if (this.hintId === block.id) this.hintId = null;
  }

  shake(blockId) { this.shakes.set(blockId, this.now()); }

  setHint(blockId) { this.hintId = blockId; }
  clearHint() { this.hintId = null; }

  get hasActiveGhosts() { return this.ghosts.length > 0; }

  // Prune finished animations.
  update() {
    const t = this.now();
    this.ghosts = this.ghosts.filter((g) => t - g.start < ESCAPE_DUR);
    for (const [id, s] of this.shakes) {
      if (t - s > SHAKE_DUR) this.shakes.delete(id);
    }
    for (const [id, s] of this.spawns) {
      if (t - (s.start + s.delay) > SPAWN_DUR) this.spawns.delete(id);
    }
  }

  // Visual state for a LIVE block (still in the grid).
  visualFor(blockId) {
    const t = this.now();
    let extra = [0, 0, 0];
    let scale = 1;
    let emissive = 0;

    const spawn = this.spawns.get(blockId);
    if (spawn) {
      const p = Math.max(0, Math.min(1, (t - spawn.start - spawn.delay) / SPAWN_DUR));
      scale = p <= 0 ? 0.0001 : easeOutBack(p);
    }

    const sh = this.shakes.get(blockId);
    if (sh !== undefined) {
      const p = Math.min(1, (t - sh) / SHAKE_DUR);
      const amp = (1 - p) * 0.07;
      const wobble = Math.sin(p * Math.PI * 8);
      extra = [wobble * amp, 0, wobble * amp * 0.5];
      emissive = Math.max(emissive, (1 - p) * 0.5); // red-ish flash handled via color in game
    }

    if (this.hintId === blockId) {
      emissive = Math.max(emissive, 0.35 + 0.25 * Math.sin(t * 6));
    }

    return { extra, scale, emissive, shaking: sh !== undefined };
  }

  // Draw entries for all flying-off ghosts.
  ghostDraws() {
    const t = this.now();
    const out = [];
    for (const g of this.ghosts) {
      const p = Math.min(1, (t - g.start) / ESCAPE_DUR);
      const e = easeOutCubic(p);
      const v = DIR_VECTORS[g.block.dir];
      const dist = e * 6.0;
      out.push({
        x: g.block.x, y: g.block.y, z: g.block.z,
        dir: g.block.dir,
        color: g.color || [0.8, 0.85, 0.95],
        extra: [v.x * dist, v.y * dist, v.z * dist],
        scale: 1 - 0.4 * e,
        alpha: 1 - e,
        arrowAlpha: 1 - e,
        emissive: 0.15,
      });
    }
    return out;
  }
}
