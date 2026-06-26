// levels.js
// Produces the campaign. Levels are generated deterministically (seeded) so they
// are reproducible AND guaranteed solvable, then enriched with a "lives" budget
// scaled to difficulty. You can also hand-author levels by pushing plain defs.

import { generateCampaign } from '../core/levelgen.js';

export function buildLevels(count = 30) {
  const defs = generateCampaign(count);
  return defs.map((def, i) => ({
    ...def,
    // More forgiving early on; tighter later (min 3).
    lives: Math.max(3, 6 - Math.floor(i / 8)),
  }));
}

// Example of a hand-authored level (kept for reference / future tuning):
// {
//   name: 'Tutorial',
//   size: [3, 1, 1],
//   lives: 5,
//   blocks: [
//     { x: 0, y: 0, z: 0, dir: 'NX' },
//     { x: 1, y: 0, z: 0, dir: 'PX' },
//     { x: 2, y: 0, z: 0, dir: 'PX' },
//   ],
// }
