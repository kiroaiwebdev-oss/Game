// snakegen.js
// Fills a shape mask with bent "snake" arrows, guaranteeing the result is
// solvable. Pure, testable.
//
// METHOD (reverse construction, interior-first):
//   We place arrows in reverse removal order. An arrow placed now will be the
//   LAST removed among those currently on the board, so at its removal time its
//   head's forward ray must be clear of the OTHER (later-removed = already
//   placed) arrows. We therefore only ever place a head whose forward ray is
//   currently clear of placed cells, then grow a bent body backwards into empty
//   mask cells. Removing in reverse-of-placement order is a valid solution, so
//   every generated level is solvable by construction (verified by the solver).

import { DIRS, VEC } from './dir2d.js';
import { makeArrow, Board } from './board.js';
import { isSolvable } from './escape2.js';
import { makeRng, randInt, shuffle } from './rng.js';

const key = (x, y) => `${x},${y}`;

function distanceToExterior(mask) {
  const { cols, rows, cells } = mask;
  const dist = new Map();
  const q = [];
  const inMask = (x, y) => cells.has(key(x, y));
  // Seed: mask cells touching the exterior (non-mask or out of bounds).
  for (const c of cells) {
    const [x, y] = c.split(',').map(Number);
    const touches =
      !inMask(x + 1, y) || !inMask(x - 1, y) ||
      !inMask(x, y + 1) || !inMask(x, y - 1);
    if (touches) { dist.set(c, 0); q.push([x, y]); }
  }
  let qi = 0;
  while (qi < q.length) {
    const [x, y] = q[qi++];
    const d = dist.get(key(x, y));
    for (const v of Object.values(VEC)) {
      const nx = x + v.x, ny = y + v.y, k = key(nx, ny);
      if (cells.has(k) && !dist.has(k)) { dist.set(k, d + 1); q.push([nx, ny]); }
    }
  }
  return dist;
}

// Is the forward ray from (hx,hy) along dir d clear of placed cells to the edge?
function rayClear(cols, rows, placed, hx, hy, d) {
  const v = VEC[d];
  let x = hx + v.x, y = hy + v.y;
  while (x >= 0 && x < cols && y >= 0 && y < rows) {
    if (placed.has(key(x, y))) return false;
    x += v.x; y += v.y;
  }
  return true;
}

function clearDirs(cols, rows, placed, x, y, rng) {
  const dirs = shuffle(rng, DIRS).filter((d) => rayClear(cols, rows, placed, x, y, d));
  return dirs;
}

// One attempt to fill the mask. Returns { arrows, covered }.
function fillAttempt(mask, seed, maxLen) {
  const { cols, rows, cells } = mask;
  const rng = makeRng(seed);
  const dist = distanceToExterior(mask);
  const placed = new Set();
  const arrows = [];

  const unplaced = () => {
    const list = [];
    for (const c of cells) if (!placed.has(c)) list.push(c);
    return list;
  };

  let guard = cells.size * 4 + 50;
  while (placed.size < cells.size && guard-- > 0) {
    // Candidates that currently have a clear head ray, most-interior first.
    let best = null, bestDir = null, bestDist = -1;
    const candidates = shuffle(rng, unplaced());
    for (const c of candidates) {
      const [x, y] = c.split(',').map(Number);
      const dirs = clearDirs(cols, rows, placed, x, y, rng);
      if (dirs.length === 0) continue;
      const d = dist.get(c) ?? 0;
      if (d > bestDist) { bestDist = d; best = { x, y }; bestDir = dirs[0]; }
    }
    if (!best) break; // nothing placeable

    // Forward-ray cells of this head (body must avoid them).
    const rayCells = new Set();
    {
      const v = VEC[bestDir];
      let x = best.x + v.x, y = best.y + v.y;
      while (x >= 0 && x < cols && y >= 0 && y < rows) { rayCells.add(key(x, y)); x += v.x; y += v.y; }
    }

    // Grow a bent body backward from the head into empty mask cells.
    const chain = [{ x: best.x, y: best.y }]; // head first; reverse later
    const inChain = new Set([key(best.x, best.y)]);
    let cur = best;
    const targetLen = 1 + randInt(rng, 0, maxLen); // 1..maxLen
    while (chain.length < targetLen) {
      const opts = shuffle(rng, DIRS)
        .map((d) => ({ x: cur.x + VEC[d].x, y: cur.y + VEC[d].y }))
        .filter((n) =>
          cells.has(key(n.x, n.y)) &&
          !placed.has(key(n.x, n.y)) &&
          !inChain.has(key(n.x, n.y)) &&
          !rayCells.has(key(n.x, n.y)));
      if (opts.length === 0) break;
      cur = opts[0];
      chain.push(cur);
      inChain.add(key(cur.x, cur.y));
    }

    const cellsTailToHead = chain.slice().reverse(); // tail .. head
    for (const c of chain) placed.add(key(c.x, c.y));
    arrows.push(makeArrow(cellsTailToHead, bestDir));
  }

  return { arrows, covered: placed.size, total: cells.size };
}

// Generate a solvable, mostly-complete shape level.
// Returns a level def: { name, cols, rows, arrows:[{cells,dir}], shape }.
export function generateShapeLevel({ shape, cols, rows, seed = 1, maxLen = 4, mask }) {
  const m = mask;
  let bestDef = null, bestCover = -1;
  for (let attempt = 0; attempt < 6; attempt++) {
    const { arrows, covered, total } = fillAttempt(m, seed + attempt * 101, maxLen);
    // Build a board to verify solvability.
    const b = new Board(cols, rows);
    for (const a of arrows) b.addArrow(a);
    if (!isSolvable(b)) continue;
    if (covered > bestCover) {
      bestCover = covered;
      bestDef = {
        name: shape,
        shape,
        cols, rows,
        arrows: arrows.map((a) => ({ cells: a.cells, dir: a.dir })),
        coverage: covered / total,
      };
      if (covered / total >= 0.97) break; // good enough — stop early
    }
  }
  if (!bestDef) {
    // Extremely unlikely fallback: a single 1-cell arrow.
    bestDef = { name: shape, shape, cols, rows, arrows: [], coverage: 0 };
  }
  return bestDef;
}
