// levelgen.js
// Guaranteed-solvable 3D level generator. Pure, testable in Node.
//
// METHOD ("reverse construction" / peeling):
//   Build the board by placing blocks one at a time into empty cells. For each
//   new block we choose a direction whose straight path to the edge is currently
//   clear of all already-placed blocks. The removal order is then simply the
//   REVERSE of the placement order, which is provably a valid solution:
//   when a block is removed, every block that was in its path was placed AFTER
//   it (removed BEFORE it), so the path is clear at removal time.
//
//   Result: every generated level is solvable by construction. We additionally
//   verify with the solver as a safety net.

import { ALL_DIRECTIONS, DIRECTIONS, dirVector } from './direction.js';
import { Grid, makeBlock, gridFromLevel } from './grid.js';
import { isSolvable } from './rules.js';
import { makeRng, randInt, shuffle } from './rng.js';

// Cells whose ray (toward edge) is currently clear of placed blocks.
// `allowed` restricts which directions are considered (e.g. 4 dirs for 2D).
function clearDirections(grid, x, y, z, allowed) {
  const result = [];
  for (const dir of allowed) {
    const v = dirVector(dir);
    let cx = x + v.x, cy = y + v.y, cz = z + v.z;
    let clear = true;
    while (grid.inBounds(cx, cy, cz)) {
      if (grid.at(cx, cy, cz) !== null) { clear = false; break; }
      cx += v.x; cy += v.y; cz += v.z;
    }
    if (clear) result.push(dir);
  }
  return result;
}

// Generate a solvable level.
//   opts = { size:[sx,sy,sz], targetCount, seed, name, fillRatio, directions }
// `directions` limits the allowed arrow directions (default: all 6).
// Either targetCount or fillRatio may be given; targetCount wins if present.
export function generateLevel(opts) {
  const { size, seed = 1 } = opts;
  const allowed = opts.directions || ALL_DIRECTIONS;
  const [sx, sy, sz] = size;
  const total = sx * sy * sz;
  const targetCount = opts.targetCount != null
    ? Math.min(opts.targetCount, total)
    : Math.max(1, Math.round(total * (opts.fillRatio ?? 0.6)));

  const rng = makeRng(seed);
  const grid = new Grid(sx, sy, sz);

  // Candidate cells in shuffled order; we try to fill up to targetCount.
  const allCells = [];
  for (let z = 0; z < sz; z++)
    for (let y = 0; y < sy; y++)
      for (let x = 0; x < sx; x++)
        allCells.push({ x, y, z });

  let placed = 0;
  // Multiple passes: each pass walks a fresh shuffle of still-empty cells and
  // places a block where a clear direction exists. As the board fills, fewer
  // cells qualify, so we stop when a full pass adds nothing.
  let progress = true;
  while (placed < targetCount && progress) {
    progress = false;
    const order = shuffle(rng, allCells);
    for (const c of order) {
      if (placed >= targetCount) break;
      if (!grid.isEmpty(c.x, c.y, c.z)) continue;
      const dirs = clearDirections(grid, c.x, c.y, c.z, allowed);
      if (dirs.length === 0) continue;
      const dir = dirs[randInt(rng, 0, dirs.length)];
      grid.addBlock(makeBlock(c.x, c.y, c.z, dir));
      placed++;
      progress = true;
    }
  }

  const def = {
    name: opts.name || `Level ${seed}`,
    size: [sx, sy, sz],
    seed,
    blocks: grid.allBlocks().map((b) => ({ x: b.x, y: b.y, z: b.z, dir: b.dir })),
  };

  // Safety net: verify solvable (should always pass by construction).
  if (!isSolvable(gridFromLevel(def))) {
    throw new Error(`Generator produced an unsolvable level (seed=${seed})`);
  }
  return def;
}

// Build a progression of levels with rising difficulty.
export function generateCampaign(count = 30) {
  const levels = [];
  for (let i = 0; i < count; i++) {
    // Gradually grow the volume and the number of blocks.
    const tier = Math.floor(i / 6); // 0..
    const sx = 3 + Math.min(tier, 3);
    const sy = 3 + Math.min(tier, 3);
    const sz = 2 + Math.min(tier, 3);
    const fillRatio = 0.45 + Math.min(0.35, i * 0.012);
    levels.push(generateLevel({
      size: [sx, sy, sz],
      fillRatio,
      seed: 1000 + i * 7919, // distinct primes-ish seeds
      name: `Level ${i + 1}`,
    }));
  }
  return levels;
}

// 2D campaign: a flat board (depth 1) using only the 4 screen directions.
// Grid grows and fills denser as levels progress. Every level is solvable.
export function generateCampaign2D(count = 40) {
  const FOUR = [
    DIRECTIONS.PX, DIRECTIONS.NX, // right, left
    DIRECTIONS.PY, DIRECTIONS.NY, // down, up (y is the row, 0 at top)
  ];
  const levels = [];
  for (let i = 0; i < count; i++) {
    // Board grows from 4x5 up to ~8x10 over the campaign.
    const cols = Math.min(8, 4 + Math.floor(i / 6));
    const rows = Math.min(10, 5 + Math.floor(i / 5));
    const fillRatio = 0.30 + Math.min(0.40, i * 0.012);
    levels.push(generateLevel({
      size: [cols, rows, 1],
      directions: FOUR,
      fillRatio,
      seed: 50000 + i * 6151,
      name: `Level ${i + 1}`,
    }));
  }
  return levels;
}
