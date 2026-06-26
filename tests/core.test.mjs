// Core logic tests for the snake-arrow model. Run: node tests/core.test.mjs
import { Board, makeArrow, boardFromLevel, resetArrowId } from '../src/core/board.js';
import { canEscape, solve, isSolvable, findHint } from '../src/core/escape2.js';
import { makeMask, MASK_NAMES } from '../src/core/masks.js';
import { generateShapeLevel } from '../src/core/snakegen.js';

let pass = 0, fail = 0;
const check = (n, v) => { v ? (pass++, console.log(`  ok  - ${n}`)) : (fail++, console.error(`  FAIL- ${n}`)); };

console.log('== Escape rule (snake) ==');
{
  resetArrowId();
  // Board 4x1. Arrow A occupies cell (1) head facing R; arrow B at (2) facing R.
  const b = new Board(4, 1);
  const A = b.addArrow(makeArrow([{ x: 0, y: 0 }, { x: 1, y: 0 }], 'R')); // head at (1)
  const B = b.addArrow(makeArrow([{ x: 2, y: 0 }], 'R'));                  // head at (2)
  check('A blocked by B ahead', canEscape(b, A) === false);
  check('B has clear path right', canEscape(b, B) === true);
}

console.log('== Solver: solvable ==');
{
  resetArrowId();
  const def = { cols: 4, rows: 1, arrows: [
    { cells: [{ x: 0, y: 0 }, { x: 1, y: 0 }], dir: 'R' },
    { cells: [{ x: 2, y: 0 }], dir: 'R' },
  ]};
  const b = boardFromLevel(def);
  const res = solve(b);
  check('chain solvable', res.solvable === true);
  check('solve does not mutate original', b.remaining === 2);
}

console.log('== Solver: deadlock ==');
{
  resetArrowId();
  const def = { cols: 2, rows: 1, arrows: [
    { cells: [{ x: 0, y: 0 }], dir: 'R' }, // blocked by other
    { cells: [{ x: 1, y: 0 }], dir: 'L' }, // blocked by other
  ]};
  const res = solve(boardFromLevel(def));
  check('mutual block UNsolvable', res.solvable === false);
}

console.log('== Hint ==');
{
  resetArrowId();
  const b = boardFromLevel({ cols: 3, rows: 1, arrows: [
    { cells: [{ x: 0, y: 0 }], dir: 'R' }, { cells: [{ x: 1, y: 0 }], dir: 'R' },
  ]});
  const h = findHint(b);
  check('hint is escapable', h !== null && canEscape(b, h));
}

console.log('== Masks ==');
{
  const heart = makeMask('heart', 13, 14);
  check('heart mask non-empty', heart.cells.size > 20);
  const all = makeMask('full', 10, 10);
  check('full mask fills grid', all.cells.size === 100);
}

console.log('== Shape generation: solvable + good coverage ==');
{
  let allSolvable = true, lowCover = 0, total = 0, sumCover = 0;
  for (const shape of MASK_NAMES) {
    for (let s = 0; s < 4; s++) {
      const cols = 13, rows = 14;
      const mask = makeMask(shape, cols, rows);
      const def = generateShapeLevel({ shape, cols, rows, mask, maxLen: 4, seed: 100 + s * 17 });
      const b = boardFromLevel(def);
      if (!isSolvable(b)) allSolvable = false;
      total++; sumCover += def.coverage;
      if (def.coverage < 0.9) lowCover++;
    }
  }
  check('all generated shapes solvable', allSolvable);
  check('avg coverage >= 0.97', (sumCover / total) >= 0.97);
  check('few low-coverage levels', lowCover <= 1);
}

console.log(`\nRESULT: ${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
