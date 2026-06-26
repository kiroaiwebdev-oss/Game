// levels.js
// Builds the campaign as lightweight SPECS instantly, then generates each
// level's arrows lazily on first load (keeps startup instant). Each level is a
// different shape silhouette filled with bent snake arrows; all are solvable.

import { makeMask } from '../core/masks.js';
import { generateShapeLevel } from '../core/snakegen.js';

const SHAPE_ORDER = [
  'heart', 'diamond', 'star', 'butterfly', 'arrow', 'circle',
  'cross', 'triangle', 'ring', 'square', 'star', 'heart', 'full',
];

function difficultyFor(i) {
  if (i < 10) return 'Normal';
  if (i < 24) return 'Hard';
  return 'Challenge';
}

// Instant: just metadata, no arrow generation yet.
export function buildLevels(count = 30) {
  const specs = [];
  for (let i = 0; i < count; i++) {
    const shape = SHAPE_ORDER[i % SHAPE_ORDER.length];
    // Denser grid -> smaller, more numerous arrows (maze-like look).
    const size = Math.min(18, 12 + Math.floor(i / 3));
    specs.push({
      level: i + 1,
      shape,
      cols: size,
      rows: size + 1,
      // Long winding corridors -> connected maze look (scales with board).
      maxLen: Math.min(16, Math.round(size * 0.9)),
      seed: 7000 + i * 131,
      lives: 3,
      difficulty: difficultyFor(i),
      arrows: null, // filled lazily
    });
  }
  return specs;
}

// Generate (once) the arrows for a level spec; returns the same spec enriched.
export function ensureLevel(spec) {
  if (!spec.arrows) {
    const mask = makeMask(spec.shape, spec.cols, spec.rows);
    const def = generateShapeLevel({
      shape: spec.shape, cols: spec.cols, rows: spec.rows, mask,
      maxLen: spec.maxLen, seed: spec.seed,
    });
    spec.arrows = def.arrows;
    spec.coverage = def.coverage;
  }
  return spec;
}
