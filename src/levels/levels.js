// levels.js
// Builds the campaign as lightweight SPECS instantly, then generates each
// level's arrows lazily on first load. Difficulty rises with the level:
// early levels are small with few, large, very clear arrows; later levels grow
// into big, dense, winding mazes and richer shapes.

import { makeMask } from '../core/masks.js';
import { generateShapeLevel } from '../core/snakegen.js';

// Shape rotation: Level 1 is a full rectangular grid (matches the reference);
// later levels rotate through silhouettes for variety.
const SHAPES = ['full', 'heart', 'spade', 'star', 'diamond', 'butterfly', 'circle', 'arrow', 'ring', 'cross', 'triangle', 'square'];

function difficultyFor(i) {
  if (i < 8) return 'Normal';
  if (i < 20) return 'Hard';
  return 'Challenge';
}

export function buildLevels(count = 50) {
  const specs = [];
  for (let i = 0; i < count; i++) {
    // Dense, winding from the start; grows bigger/harder with level.
    const size = Math.min(18, 11 + Math.floor(i / 3));
    const maxLen = Math.min(14, 4 + Math.floor(i * 0.6)); // long winding snakes
    // Bent from level 1 (looks complex), rising further with level.
    const bendChance = Math.min(0.9, 0.5 + i * 0.02);
    const shape = SHAPES[i % SHAPES.length];
    specs.push({
      level: i + 1,
      shape,
      cols: size,
      rows: size + 2,
      maxLen,
      bendChance,
      merge: bendChance > 0.25, // weave singles into corridors on harder levels
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
      bendChance: spec.bendChance || 0, merge: !!spec.merge,
    });
    spec.arrows = def.arrows;
    spec.coverage = def.coverage;
  }
  return spec;
}
