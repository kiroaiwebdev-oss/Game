// rules.js
// The escape rule engine + solver. Pure logic, unit-testable in Node.
//
// ESCAPE RULE:
//   Tapping a block makes it try to fly along its direction. It escapes only if
//   every cell from the block to the edge of the volume (in that direction) is
//   empty. If any cell on that path is occupied, the tap is BLOCKED.
//
// IMPORTANT MONOTONICITY PROPERTY:
//   Removing a block only ever frees cells, never fills them. So a block that can
//   escape now can always escape later too; escapability only grows as blocks are
//   removed. This means a simple greedy solver is both correct and complete:
//   a level is solvable IFF repeatedly removing any currently-escapable block
//   eventually empties the grid.

import { dirVector } from './direction.js';

// Is this block's path to the edge clear right now?
export function canEscape(grid, block) {
  const v = dirVector(block.dir);
  let x = block.x + v.x;
  let y = block.y + v.y;
  let z = block.z + v.z;
  while (grid.inBounds(x, y, z)) {
    if (grid.at(x, y, z) !== null) return false; // something blocks the way
    x += v.x;
    y += v.y;
    z += v.z;
  }
  return true; // reached the edge with a clear path
}

// All blocks that can currently escape.
export function escapableBlocks(grid) {
  return grid.allBlocks().filter((b) => canEscape(grid, b));
}

// Greedy solve on a CLONE. Returns:
//   { solvable, order: [blockId,...], remaining }
// `order` is a valid tap sequence to clear the grid (when solvable).
export function solve(grid) {
  const work = grid.clone();
  const order = [];
  // Use a simple loop; each pass removes all currently-escapable blocks.
  // Removing the whole escapable set at once is safe due to monotonicity.
  while (true) {
    const escapable = escapableBlocks(work);
    if (escapable.length === 0) break;
    for (const b of escapable) {
      work.removeBlock(b);
      order.push(b.id);
    }
  }
  return {
    solvable: work.isCleared,
    order,
    remaining: work.remaining,
  };
}

export function isSolvable(grid) {
  return solve(grid).solvable;
}

// Find one block that can escape now (used by the Hint feature).
// Prefers a block that is part of a real solution path (here: any escapable
// block is valid, since escapability is monotonic).
export function findHint(grid) {
  const options = escapableBlocks(grid);
  if (options.length === 0) return null;
  return options[0];
}
