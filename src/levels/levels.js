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
    // Grid grows gradually: small & clear early, big & complex later.
    const size = Math.min(18, 6 + Math.floor(i / 2));
    // Snakes start short (clear, simple ordering) and lengthen (more tangled).
    const maxLen = Math.min(8, 3 + Math.floor(i / 4));
    // Pick a shape appropriate to the current resolution.
    const shape = size < 11
      ? SIMPLE_SHAPES[i % SIMPLE_SHAPES.length]
      : RICH_SHAPES[i % RICH_SHAPES.length];
    specs.push({
      level: i + 1,
      shape,
      cols: size,
      rows: size + 1,
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
