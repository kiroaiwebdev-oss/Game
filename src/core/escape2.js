// escape2.js
// Escape rule + solver + hint for snake arrows.
//
// RULE: an arrow leaves head-first, sliding straight along its head direction.
// It can escape iff the straight ray from the head cell along that direction is
// clear (no other arrow) all the way to the board edge. When it escapes, the
// body drains out following the head's track, so only the head ray must be free.
//
// MONOTONIC: removing an arrow only frees cells, so escapability never shrinks.
// => greedy "remove any escapable arrow" is a complete & correct solver.

import { VEC } from './dir2d.js';

export function canEscape(board, arrow) {
  const v = VEC[arrow.dir];
  const head = board.head(arrow);
  let x = head.x + v.x, y = head.y + v.y;
  while (board.inBounds(x, y)) {
    const occ = board.occupant(x, y);
    if (occ !== undefined && occ !== arrow.id) return false;
    x += v.x; y += v.y;
  }
  return true;
}

export function escapableArrows(board) {
  return board.allArrows().filter((a) => canEscape(board, a));
}

export function solve(board) {
  const work = board.clone();
  const order = [];
  while (true) {
    const esc = escapableArrows(work);
    if (esc.length === 0) break;
    for (const a of esc) { work.removeArrow(a); order.push(a.id); }
  }
  return { solvable: work.isCleared, order, remaining: work.remaining };
}

export function isSolvable(board) { return solve(board).solvable; }

export function findHint(board) {
  const opts = escapableArrows(board);
  return opts.length ? opts[0] : null;
}
