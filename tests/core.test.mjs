// Core logic tests, runnable with: node tests/core.test.mjs
// No test framework needed — a tiny assert harness keeps it dependency-free.

import { DIRECTIONS } from '../src/core/direction.js';
import { Grid, makeBlock, gridFromLevel, resetIdCounter } from '../src/core/grid.js';
import { canEscape, solve, isSolvable, findHint, escapableBlocks } from '../src/core/rules.js';
import { generateLevel, generateCampaign, generateCampaign2D } from '../src/core/levelgen.js';

let pass = 0, fail = 0;
function check(name, cond) {
  if (cond) { pass++; console.log(`  ok  - ${name}`); }
  else { fail++; console.error(`  FAIL- ${name}`); }
}

console.log('== Escape rule ==');
{
  resetIdCounter();
  // 3x1x1 row. Block at x=0 pointing +X is blocked by x=1; x=1 pointing +X can escape.
  const g = new Grid(3, 1, 1);
  const a = g.addBlock(makeBlock(0, 0, 0, DIRECTIONS.PX));
  const b = g.addBlock(makeBlock(1, 0, 0, DIRECTIONS.PX));
  check('blocked block cannot escape', canEscape(g, a) === false);
  check('clear block can escape', canEscape(g, b) === true);
  // Block a pointing -X (toward edge, nothing behind) can escape.
  const c = makeBlock(0, 0, 0, DIRECTIONS.NX);
  const g2 = new Grid(3, 1, 1);
  g2.addBlock(c);
  g2.addBlock(makeBlock(2, 0, 0, DIRECTIONS.PX));
  check('block escaping toward open edge works', canEscape(g2, c) === true);
}

console.log('== Solver: solvable chain ==');
{
  resetIdCounter();
  // A solvable line: tap b (escapes +X), then a (escapes +X).
  const def = { size: [3, 1, 1], blocks: [
    { x: 0, y: 0, z: 0, dir: DIRECTIONS.PX },
    { x: 1, y: 0, z: 0, dir: DIRECTIONS.PX },
  ]};
  const g = gridFromLevel(def);
  const res = solve(g);
  check('chain is solvable', res.solvable === true);
  check('solve does not mutate original grid', g.remaining === 2);
}

console.log('== Solver: unsolvable deadlock ==');
{
  resetIdCounter();
  // Two blocks pointing INTO each other across a 2x1x1: each blocks the other.
  const def = { size: [2, 1, 1], blocks: [
    { x: 0, y: 0, z: 0, dir: DIRECTIONS.PX }, // wants to go right, blocked by other
    { x: 1, y: 0, z: 0, dir: DIRECTIONS.NX }, // wants to go left, blocked by other
  ]};
  const g = gridFromLevel(def);
  const res = solve(g);
  check('mutual block is UNsolvable', res.solvable === false);
  check('unsolvable leaves blocks remaining', res.remaining === 2);
}

console.log('== Hint ==');
{
  resetIdCounter();
  const def = { size: [3, 1, 1], blocks: [
    { x: 0, y: 0, z: 0, dir: DIRECTIONS.PX },
    { x: 1, y: 0, z: 0, dir: DIRECTIONS.PX },
  ]};
  const g = gridFromLevel(def);
  const hint = findHint(g);
  check('hint returns an escapable block', hint !== null && canEscape(g, hint));
}

console.log('== Generator: guaranteed solvable ==');
{
  let allSolvable = true;
  let allHavePlay = true;
  for (let seed = 1; seed <= 60; seed++) {
    const def = generateLevel({ size: [4, 4, 3], fillRatio: 0.7, seed });
    const g = gridFromLevel(def);
    if (!isSolvable(g)) allSolvable = false;
    if (def.blocks.length === 0 || escapableBlocks(g).length === 0) allHavePlay = false;
  }
  check('60 generated levels are all solvable', allSolvable);
  check('generated levels are non-empty and playable', allHavePlay);
}

console.log('== Campaign ==');
{
  const camp = generateCampaign(30);
  check('campaign has 30 levels', camp.length === 30);
  let ok = true;
  for (const def of camp) if (!isSolvable(gridFromLevel(def))) ok = false;
  check('all campaign levels solvable', ok);
  check('difficulty rises (last >= first blocks)',
    camp[camp.length - 1].blocks.length >= camp[0].blocks.length);
}

console.log('== 2D Campaign ==');
{
  const camp = generateCampaign2D(40);
  check('2D campaign has 40 levels', camp.length === 40);
  let solvable = true;
  let flat = true;
  let onlyFourDirs = true;
  const FOUR = new Set([DIRECTIONS.PX, DIRECTIONS.NX, DIRECTIONS.PY, DIRECTIONS.NY]);
  for (const def of camp) {
    if (!isSolvable(gridFromLevel(def))) solvable = false;
    if (def.size[2] !== 1) flat = false;
    for (const b of def.blocks) {
      if (!FOUR.has(b.dir)) onlyFourDirs = false;
      if (b.z !== 0) flat = false;
    }
  }
  check('all 2D levels solvable', solvable);
  check('all 2D levels are flat (depth 1)', flat);
  check('2D levels use only 4 directions', onlyFourDirs);
}

console.log(`\nRESULT: ${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
