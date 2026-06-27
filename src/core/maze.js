// maze.js
// Generates a "perfect maze" (spanning tree -> exactly one path between any two
// cells) ONLY inside a custom shape silhouette. No rectangle-and-crop: we carve
// passages directly within the shape's cells, so the outer border is organic and
// every cell is reachable (guaranteed solvable, no isolated sections).
//
// Pure logic, no DOM. Unit-testable.

import { makeMask } from './masks.js';
import { makeRng, randInt } from './rng.js';

const KEY = (x, y) => `${x},${y}`;
const parse = (k) => k.split(',').map(Number);

// side, delta, opposite side
const NEI = [
  { d: 'N', dx: 0, dy: -1, opp: 'S' },
  { d: 'S', dx: 0, dy: 1, opp: 'N' },
  { d: 'E', dx: 1, dy: 0, opp: 'W' },
  { d: 'W', dx: -1, dy: 0, opp: 'E' },
];

// Largest 4-connected component of a cell set (ensures one solid maze region).
function largestComponent(cellSet) {
  const seen = new Set();
  let best = [];
  for (const k of cellSet) {
    if (seen.has(k)) continue;
    const comp = [];
    const stack = [k];
    seen.add(k);
    while (stack.length) {
      const cur = stack.pop();
      comp.push(cur);
      const [x, y] = parse(cur);
      for (const n of NEI) {
        const nk = KEY(x + n.dx, y + n.dy);
        if (cellSet.has(nk) && !seen.has(nk)) { seen.add(nk); stack.push(nk); }
      }
    }
    if (comp.length > best.length) best = comp;
  }
  return new Set(best);
}

function openOuter(walls, cells, cell) {
  // Open one wall facing outside the shape (creates the entrance/exit gap).
  const { x, y, k } = cell;
  for (const n of NEI) {
    if (!cells.has(KEY(x + n.dx, y + n.dy))) { walls.get(k)[n.d] = false; return n.d; }
  }
  return null;
}

// Shortest path through carved passages (a tree -> the unique path). For hints.
function bfsPath(cells, walls, startK, goalK) {
  const prev = new Map([[startK, null]]);
  const q = [startK];
  let qi = 0;
  while (qi < q.length) {
    const cur = q[qi++];
    if (cur === goalK) break;
    const [x, y] = parse(cur);
    for (const n of NEI) {
      const nk = KEY(x + n.dx, y + n.dy);
      if (cells.has(nk) && !prev.has(nk) && walls.get(cur)[n.d] === false) {
        prev.set(nk, cur); q.push(nk);
      }
    }
  }
  if (!prev.has(goalK)) return [];
  const path = [];
  let c = goalK;
  while (c) { path.unshift(c); c = prev.get(c); }
  return path;
}

export function makeMaze({ shape, cols, rows, seed = 1 }) {
  const mask = makeMask(shape, cols, rows);
  const cells = largestComponent(mask.cells);
  const rng = makeRng(seed);

  // Bounding box (for centered rendering later).
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const k of cells) {
    const [x, y] = parse(k);
    if (x < minX) minX = x; if (x > maxX) maxX = x;
    if (y < minY) minY = y; if (y > maxY) maxY = y;
  }

  // All walls start closed.
  const walls = new Map();
  for (const k of cells) walls.set(k, { N: true, E: true, S: true, W: true });

  // Randomized DFS (iterative) carves a spanning tree.
  const start = cells.values().next().value;
  const visited = new Set([start]);
  const stack = [start];
  while (stack.length) {
    const cur = stack[stack.length - 1];
    const [x, y] = parse(cur);
    const opts = [];
    for (const n of NEI) {
      const nk = KEY(x + n.dx, y + n.dy);
      if (cells.has(nk) && !visited.has(nk)) opts.push({ n, nk });
    }
    if (opts.length) {
      const { n, nk } = opts[randInt(rng, 0, opts.length)];
      walls.get(cur)[n.d] = false;
      walls.get(nk)[n.opp] = false;
      visited.add(nk);
      stack.push(nk);
    } else {
      stack.pop();
    }
  }

  // Entrance = topmost cell, Exit = bottommost cell (both on the boundary).
  let ent = null, ex = null;
  for (const k of cells) {
    const [x, y] = parse(k);
    if (!ent || y < ent.y || (y === ent.y && x < ent.x)) ent = { x, y, k };
    if (!ex || y > ex.y || (y === ex.y && x > ex.x)) ex = { x, y, k };
  }
  openOuter(walls, cells, ent);
  openOuter(walls, cells, ex);

  const solution = bfsPath(cells, walls, ent.k, ex.k);

  return {
    cols, rows, cells, walls,
    bounds: { minX, minY, maxX, maxY },
    entrance: ent, exit: ex, solution,
  };
}

// Is there an open passage from cell key a to adjacent cell key b?
export function passageOpen(walls, a, b) {
  const [ax, ay] = parse(a);
  const [bx, by] = parse(b);
  const dx = bx - ax, dy = by - ay;
  let d;
  if (dx === 1 && dy === 0) d = 'E';
  else if (dx === -1 && dy === 0) d = 'W';
  else if (dx === 0 && dy === 1) d = 'S';
  else if (dx === 0 && dy === -1) d = 'N';
  else return false;
  const wa = walls.get(a);
  return !!wa && wa[d] === false;
}

export { KEY as cellKey };
