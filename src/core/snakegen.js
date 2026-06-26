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

    // Grow a long space-filling body backward from the head. We pick the next
    // cell with the FEWEST free neighbours (Warnsdorff-style) so the snake eats
    // dead-ends first, leaving very few orphan single cells -> dense maze look.
    const chain = [{ x: best.x, y: best.y }]; // head first; reverse later
    const inChain = new Set([key(best.x, best.y)]);
    let cur = best;
    let lastDir = null;
    const freeNeighbors = (cx, cy) => {
      let n = 0;
      for (const d of DIRS) {
        const nx = cx + VEC[d].x, ny = cy + VEC[d].y, k = key(nx, ny);
        if (cells.has(k) && !placed.has(k) && !inChain.has(k) && !rayCells.has(k)) n++;
      }
      return n;
    };
    while (chain.length < maxLen) {
      const cand = DIRS
        .map((d) => ({ d, n: { x: cur.x + VEC[d].x, y: cur.y + VEC[d].y } }))
        .filter((o) =>
          cells.has(key(o.n.x, o.n.y)) &&
          !placed.has(key(o.n.x, o.n.y)) &&
          !inChain.has(key(o.n.x, o.n.y)) &&
          !rayCells.has(key(o.n.x, o.n.y)));
      if (cand.length === 0) break;
      // Score: fewest onward free neighbours first; nudge toward straight runs.
      for (const o of cand) {
        o.score = freeNeighbors(o.n.x, o.n.y) * 2 + (o.d === lastDir ? -1 : 0) + rng() * 0.5;
      }
      cand.sort((a, b) => a.score - b.score);
      const pick = cand[0];
      cur = pick.n; lastDir = pick.d;
      chain.push(cur);
      inChain.add(key(cur.x, cur.y));
    }

    const cellsTailToHead = chain.slice().reverse(); // tail .. head
    for (const c of chain) placed.add(key(c.x, c.y));
    arrows.push(makeArrow(cellsTailToHead, bestDir));
  }

  // Raw arrows here are ALWAYS solvable (reverse construction). Merging happens
  // later, guarded by a solvability re-check.
  return {
    arrows: arrows.map((a) => ({ cells: a.cells, dir: a.dir })),
    covered: placed.size, total: cells.size,
  };
}

// Absorb leftover single-cell arrows into a neighbouring arrow's TAIL so the
// board reads as long connected corridors. Returns a NEW arrow list (the input
// is untouched) so the caller can revert if the merge ever hurts solvability.
function mergeSingles(arrows) {
  const out = arrows.map((a) => ({ cells: a.cells.map((c) => ({ x: c.x, y: c.y })), dir: a.dir }));
  const cellArrow = new Map();
  for (const a of out) for (const c of a.cells) cellArrow.set(key(c.x, c.y), a);
  let merged = true;
  while (merged) {
    merged = false;
    for (let i = out.length - 1; i >= 0; i--) {
      const a = out[i];
      if (a.cells.length !== 1) continue;
      const c = a.cells[0];
      let attached = false;
      for (const d of DIRS) {
        const n = { x: c.x + VEC[d].x, y: c.y + VEC[d].y };
        const A = cellArrow.get(key(n.x, n.y));
        if (A && A !== a) {
          const tail = A.cells[0];
          if (tail.x === n.x && tail.y === n.y) {
            A.cells.unshift({ x: c.x, y: c.y });
            cellArrow.set(key(c.x, c.y), A);
            attached = true; break;
          }
        }
      }
      if (attached) { out.splice(i, 1); merged = true; }
    }
  }
  return out;
}

function boardOf(cols, rows, arrows) {
  const b = new Board(cols, rows);
  for (const a of arrows) b.addArrow(makeArrow(a.cells, a.dir));
  return b;
}

// Generate a solvable, mostly-complete shape level.
// Returns a level def: { name, cols, rows, arrows:[{cells,dir}], shape }.
export function generateShapeLevel({ shape, cols, rows, seed = 1, maxLen = 6, mask }) {
  const m = mask;
  let bestRaw = null, bestCover = -1, bestTotal = 1;
  for (let attempt = 0; attempt < 6; attempt++) {
    const { arrows, covered, total } = fillAttempt(m, seed + attempt * 101, maxLen);
    if (!isSolvable(boardOf(cols, rows, arrows))) continue; // safety (always true)
    if (covered > bestCover) {
      bestCover = covered; bestTotal = total; bestRaw = arrows;
      if (covered / total >= 0.985) break;
    }
  }
  if (!bestRaw) return { name: shape, shape, cols, rows, arrows: [], coverage: 0 };

  // Try to merge single cells into corridors; keep only if still solvable.
  const merged = mergeSingles(bestRaw);
  const finalArrows = isSolvable(boardOf(cols, rows, merged)) ? merged : bestRaw;

  return {
    name: shape, shape, cols, rows,
    arrows: finalArrows.map((a) => ({ cells: a.cells, dir: a.dir })),
    coverage: bestCover / bestTotal,
  };
}
