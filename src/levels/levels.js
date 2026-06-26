// levels.js
// Builds the campaign as lightweight SPECS instantly, then generates each
// level's arrows lazily on first load. Difficulty rises with the level:
// early levels are small with few, large, very clear arrows; later levels grow
// into big, dense, winding mazes and richer shapes.

import { makeMask } from '../core/masks.js';
import { generateShapeLevel } from '../core/snakegen.js';

// Simple shapes read well at low resolution (early levels).
const SIMPLE_SHAPES = ['full', 'diamond', 'square', 'cross', 'triangle'];
// Detailed shapes need a bigger grid (later levels).
const RICH_SHAPES = ['heart', 'star', 'butterfly', 'circle', 'arrow', 'ring', 'full', 'diamond'];

function difficultyFor(i) {
  if (i < 8) return 'Normal';
  if (i < 20) return 'Hard';
  return 'Challenge';
}

export function buildLevels(count = 40) {
  const specs = [];
  for (let i = 0; i < count; i++) {
    // Dense maze from the start; grows bigger/denser with level.
    const size = Math.min(16, 9 + Math.floor(i / 3));
    // Short straight arrows -> many arrows, clean un-bent heads.
    const maxLen = Math.min(5, 3 + Math.floor(i / 10));
    const shape = size < 11
      ? SIMPLE_SHAPES[i % SIMPLE_SHAPES.length]
      : RICH_SHAPES[i % RICH_SHAPES.length];
    specs.push({
      level: i + 1,
      shape,
      cols: size,
      rows: size + 2,
      maxLen,
      seed: 7000 + i * 131,
      lives: 3,
      difficulty: difficultyFor(i),
      arrows: null, // generated lazily
    });
  }
  return specs;
}

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
