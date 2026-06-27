// Maze engine tests. Run: node tests/core.test.mjs
import { makeMaze, passageOpen, cellKey } from '../src/core/maze.js';
import { makeMask } from '../src/core/masks.js';

let pass = 0, fail = 0;
const check = (n, v) => { v ? (pass++, console.log(`  ok  - ${n}`)) : (fail++, console.error(`  FAIL- ${n}`)); };
const parse = (k) => k.split(',').map(Number);

function floodReach(maze) {
  const seen = new Set([maze.entrance.k]);
  const stack = [maze.entrance.k];
  while (stack.length) {
    const cur = stack.pop();
    const [x, y] = parse(cur);
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nk = cellKey(x + dx, y + dy);
      if (maze.cells.has(nk) && !seen.has(nk) && passageOpen(maze.walls, cur, nk)) {
        seen.add(nk); stack.push(nk);
      }
    }
  }
  return seen.size;
}

function internalEdges(maze) {
  let e = 0;
  for (const k of maze.cells) {
    const [x, y] = parse(k);
    for (const [dx, dy] of [[1, 0], [0, 1]]) { // count each undirected edge once
      const nk = cellKey(x + dx, y + dy);
      if (maze.cells.has(nk) && passageOpen(maze.walls, k, nk)) e++;
    }
  }
  return e;
}

console.log('== Maze generation across shapes/seeds ==');
{
  let connected = true, perfect = true, solvable = true, distinct = true, inMask = true;
  const shapes = ['spade', 'heart', 'diamond', 'star', 'circle', 'triangle', 'cross', 'ring', 'arrow', 'butterfly'];
  for (const shape of shapes) {
    for (let s = 0; s < 3; s++) {
      const cols = 22, rows = 26;
      const maze = makeMaze({ shape, cols, rows, seed: 10 + s * 7 });
      // connected: every cell reachable from entrance
      if (floodReach(maze) !== maze.cells.size) connected = false;
      // perfect maze: spanning tree => edges == cells - 1
      if (internalEdges(maze) !== maze.cells.size - 1) perfect = false;
      // solvable: solution path from entrance to exit
      const sol = maze.solution;
      if (!(sol.length && sol[0] === maze.entrance.k && sol[sol.length - 1] === maze.exit.k)) solvable = false;
      if (maze.entrance.k === maze.exit.k) distinct = false;
      // cells are inside the shape mask
      const mask = makeMask(shape, cols, rows);
      for (const k of maze.cells) if (!mask.cells.has(k)) inMask = false;
    }
  }
  check('every cell reachable (no isolated sections)', connected);
  check('perfect maze (spanning tree: edges == cells-1)', perfect);
  check('solution path links entrance to exit', solvable);
  check('entrance and exit are distinct', distinct);
  check('maze stays inside the shape silhouette', inMask);
}

console.log('== passageOpen sanity ==');
{
  const maze = makeMaze({ shape: 'circle', cols: 16, rows: 16, seed: 1 });
  // The first solution step must be an open passage.
  const ok = maze.solution.length < 2 || passageOpen(maze.walls, maze.solution[0], maze.solution[1]);
  check('solution steps are open passages', ok);
}

console.log('== Performance ==');
{
  const t0 = Date.now();
  for (let s = 0; s < 10; s++) makeMaze({ shape: 'spade', cols: 34, rows: 39, seed: s });
  const ms = Date.now() - t0;
  check(`10 large mazes generated quickly (${ms}ms)`, ms < 2000);
}

console.log(`\nRESULT: ${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
