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

import { DIRS, VEC, OPPOSITE, dirBetween } from './dir2d.js';
import { makeArrow, Board } from './board.js';
import { isSolvable, escapableArrows } from './escape2.js';
import { makeRng, randInt, shuffle } from './rng.js';

const key = (x, y) => `${x},${y}`;

// Perpendicular directions (used to introduce bends at higher levels).
const PERP = { U: ['L', 'R'], D: ['L', 'R'], L: ['U', 'D'], R: ['U', 'D'] };

// Difficulty proxies in a SINGLE solve: solvable?, how many arrows are free at
// the start (fewer = harder), and how many sequential waves (more = deeper).
function difficultyStats(board) {
  const initFree = escapableArrows(board).length;
  const work = board.clone();
  let passes = 0;
  while (true) {
    const esc = escapableArrows(work);
    if (!esc.length) break;
    passes++;
    for (const a of esc) work.removeArrow(a);
  }
  return { solvable: work.isCleared, initFree, passes };
}

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
// bendChance (0..1) controls how often the body turns -> harder, winding arrows
// at higher levels. The head segment is always kept straight (clean "muh").
function fillAttempt(mask, seed, maxLen, bendChance = 0) {
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

    // Grow the body backward from the head. The FIRST step is always straight
    // back so the arrowhead stays clean and aligned. Later steps may bend
    // (probability rises with level) to make winding, confusing arrows.
    const chain = [{ x: best.x, y: best.y }]; // head first; reverse later
    const inChain = new Set([key(best.x, best.y)]);
    const isFree = (x, y) => {
      const k = key(x, y);
      return cells.has(k) && !placed.has(k) && !inChain.has(k) && !rayCells.has(k);
    };
    {
      const bv = VEC[OPPOSITE[bestDir]];
      const nx = best.x + bv.x, ny = best.y + bv.y;
      if (isFree(nx, ny)) { chain.push({ x: nx, y: ny }); inChain.add(key(nx, ny)); }
    }
    let cur = chain[chain.length - 1];
    while (chain.length >= 2 && chain.length < maxLen) {
      const prev = chain[chain.length - 2];
      const travel = dirBetween(prev, cur);
      // Strongly prefer turning (bend) so arrows wind as much as their length
      // allows; fall back to straight only if no turn is possible.
      const order = (rng() < bendChance)
        ? [...PERP[travel], travel]
        : [travel, ...PERP[travel]];
      let next = null;
      for (const d of order) {
        const nx = cur.x + VEC[d].x, ny = cur.y + VEC[d].y;
        if (isFree(nx, ny)) { next = { x: nx, y: ny }; break; }
      }
      if (!next) break;
      chain.push(next); inChain.add(key(next.x, next.y)); cur = next;
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
        if (!A || A === a) continue;
        const tail = A.cells[0];
        if (!(tail.x === n.x && tail.y === n.y)) continue;
        const head = A.cells[A.cells.length - 1];
        const v = VEC[A.dir];
        // (1) If A is a single cell, the new cell must sit directly BEHIND the
        //     head (opposite the head dir) so the head stays clean/aligned.
        if (A.cells.length === 1 && !(head.x - c.x === v.x && head.y - c.y === v.y)) continue;
        // (2) The new cell must not lie on the head's forward exit ray (which
        //     would block the arrow with its own body).
        const dx = c.x - head.x, dy = c.y - head.y;
        const colinearFwd = (v.x !== 0) ? (dy === 0 && dx * v.x > 0) : (dx === 0 && dy * v.y > 0);
        if (colinearFwd) continue;
        A.cells.unshift({ x: c.x, y: c.y });
        cellArrow.set(key(c.x, c.y), A);
        attached = true; break;
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
export function generateShapeLevel({ shape, cols, rows, seed = 1, maxLen = 6, mask, bendChance = 0, merge = false, attempts = 6 }) {
  const m = mask;
  let best = null, bestScore = -Infinity;
  for (let attempt = 0; attempt < attempts; attempt++) {
    const { arrows, covered, total } = fillAttempt(m, seed + attempt * 101, maxLen, bendChance);
    const cov = covered / total;
    if (cov < 0.85) continue;

    // Prefer the merged (denser) version when it stays solvable; one solve gives
    // solvable?, initFree and passes.
    let finalArrows = arrows;
    let stats;
    if (merge) {
      const mg = mergeSingles(arrows);
      const ms = difficultyStats(boardOf(cols, rows, mg));
      if (ms.solvable) { finalArrows = mg; stats = ms; }
    }
    if (!stats) stats = difficultyStats(boardOf(cols, rows, finalArrows));
    if (!stats.solvable) continue;

    // Harder = more sequential passes + FEW arrows free at the start, so it is
    // genuinely confusing which arrow can leave next.
    const score = stats.passes * 2 - stats.initFree * 4 + cov * 2;
    if (score > bestScore) { bestScore = score; best = { arrows: finalArrows, coverage: cov }; }
  }
  if (!best) {
    const { arrows, covered, total } = fillAttempt(m, seed, maxLen, bendChance);
    best = { arrows, coverage: covered / total };
  }
  return {
    name: shape, shape, cols, rows,
    arrows: best.arrows.map((a) => ({ cells: a.cells, dir: a.dir })),
    coverage: best.coverage,
  };
}
