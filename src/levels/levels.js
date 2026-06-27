// levels.js
// Campaign of maze levels. Each level is a different shape silhouette; size and
// density grow with the level (Normal -> Hard -> Expert). Mazes are generated
// lazily and cached. Every maze is a perfect maze => guaranteed solvable.

import { makeMaze } from '../core/maze.js';

// Shapes that read well as silhouettes for the maze border.
const SHAPES = [
  'spade', 'heart', 'diamond', 'star', 'circle', 'butterfly',
  'triangle', 'cross', 'arrow', 'ring',
];

function difficultyFor(i) {
  if (i < 8) return 'Normal';
  if (i < 20) return 'Hard';
  return 'Expert';
}

export function buildLevels(count = 60) {
  const specs = [];
  for (let i = 0; i < count; i++) {
    // Resolution grows -> denser maze, tinier corridors, harder.
    const size = Math.min(34, 16 + Math.floor(i * 0.7));
    specs.push({
      level: i + 1,
      shape: SHAPES[i % SHAPES.length],
      cols: size,
      rows: Math.round(size * 1.15),
      seed: 4000 + i * 277,
      lives: 3,
      difficulty: difficultyFor(i),
      maze: null, // generated lazily
    });
  }
  return specs;
}

export function ensureLevel(spec) {
  if (!spec.maze) {
    spec.maze = makeMaze({
      shape: spec.shape, cols: spec.cols, rows: spec.rows, seed: spec.seed,
    });
  }
  return spec;
}
