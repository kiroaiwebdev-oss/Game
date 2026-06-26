// dir2d.js — the 4 screen directions for the 2D board (y increases downward).
export const DIRS = ['U', 'D', 'L', 'R'];
export const VEC = {
  U: { x: 0, y: -1 },
  D: { x: 0, y: 1 },
  L: { x: -1, y: 0 },
  R: { x: 1, y: 0 },
};
export const OPPOSITE = { U: 'D', D: 'U', L: 'R', R: 'L' };

export function dirBetween(from, to) {
  const dx = to.x - from.x, dy = to.y - from.y;
  if (dx === 1 && dy === 0) return 'R';
  if (dx === -1 && dy === 0) return 'L';
  if (dx === 0 && dy === 1) return 'D';
  if (dx === 0 && dy === -1) return 'U';
  return null;
}
