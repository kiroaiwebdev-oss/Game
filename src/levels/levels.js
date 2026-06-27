// levels.js
// Campaign of Arrow-Puzzle levels. Difficulty rises MONOTONICALLY with level:
// - target arrow count: ~55 for levels 1-10, then ramps 55 -> 80
// - arrows bend more (more confusing) at higher levels
// The grid size is auto-searched per shape so the arrow count lands near the
// target regardless of how "full" the silhouette is.

import { makeMask } from '../core/masks.js';
import { generateShapeLevel } from '../core/snakegen.js';

const SHAPES = ['full', 'heart', 'spade', 'star', 'diamond', 'butterfly', 'circle', 'arrow', 'ring', 'cross', 'triangle', 'square'];

function difficultyFor(i) {
  if (i < 10) return 'Normal';
  if (i < 25) return 'Hard';
  return 'Expert';
}

// Levels 1-10 => ~55 arrows; from level 11 ramp up to 80.
function targetArrows(i) {
  return i < 10 ? 55 : Math.min(80, 55 + (i - 9) * 2);
}

export function buildLevels(count = 60) {
  const specs = [];
  for (let i = 0; i < count; i++) {
    specs.push({
      level: i + 1,
      shape: SHAPES[i % SHAPES.length],
      maxLen: 5, // short-ish snakes (dense board) but bend whenever possible
      bendChance: 0.95, // turn at almost every step => maximally winding
      merge: false, // keep many distinct arrows (predictable count)
      seed: 7000 + i * 131,
      lives: 3,
      difficulty: difficultyFor(i),
      target: targetArrows(i),
      arrows: null, // generated lazily
    });
  }
  return specs;
}

// Estimate the grid size from the shape's fill-ratio so the arrow count lands
// near the target in just 1-2 generations (fast). generateShapeLevel still
// picks the hardest candidate per size.
export function ensureLevel(spec) {
  if (spec.arrows) return spec;
  const target = spec.target;
  const AVG = 2.6; // avg cells per arrow (short bent snakes, maxLen 5)

  const ref = makeMask(spec.shape, 24, 29);
  const ratio = Math.max(0.2, ref.cells.size / (24 * 29)); // fraction of bbox filled
  const cellsNeeded = target * AVG;

  const gen = (cols) => {
    const rows = Math.round(cols * 1.2);
    const mask = makeMask(spec.shape, cols, rows);
    return generateShapeLevel({
      shape: spec.shape, cols, rows, mask,
      maxLen: spec.maxLen, seed: spec.seed,
      bendChance: spec.bendChance, merge: spec.merge, attempts: 3,
    });
  };

  const clamp = (v) => Math.max(8, Math.min(30, v));
  let cols = clamp(Math.round(Math.sqrt(cellsNeeded / (ratio * 1.2))));
  let def = gen(cols);

  // Converge toward the target arrow count (each gen ~50ms).
  for (let c = 0; c < 3; c++) {
    const n = def.arrows.length;
    if (n >= target * 0.9 && n <= target * 1.15) break;
    const next = clamp(n < target ? cols + 2 : cols - 2);
    if (next === cols) break;
    cols = next;
    def = gen(cols);
  }

  spec.cols = def.cols;
  spec.rows = def.rows;
  spec.arrows = def.arrows;
  spec.coverage = def.coverage;
  return spec;
}
