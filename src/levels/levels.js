// levels.js
// Builds the 2D campaign: deterministic (seeded), guaranteed solvable, with a
// lives budget and a difficulty label that scale with progression.

import { generateCampaign2D } from '../core/levelgen.js';

function difficultyFor(index) {
  if (index < 12) return 'Normal';
  if (index < 28) return 'Hard';
  return 'Expert';
}

export function buildLevels(count = 40) {
  const defs = generateCampaign2D(count);
  return defs.map((def, i) => ({
    ...def,
    lives: Math.max(3, 5 - Math.floor(i / 14)),
    difficulty: difficultyFor(i),
  }));
}
