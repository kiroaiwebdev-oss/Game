// masks.js
// A library of shape silhouettes. Each mask is the set of grid cells that make
// up a picture (heart, butterfly, star, ...). Arrows are generated to fill the
// mask so every level draws a different shape. Pure, testable.

const key = (x, y) => `${x},${y}`;

// Normalized predicates: input (x,y) in roughly [-1,1], y pointing UP.
const SHAPES = {
  full: () => true,
  diamond: (x, y) => Math.abs(x) + Math.abs(y) <= 1,
  circle: (x, y) => x * x + y * y <= 1,
  ring: (x, y) => { const r = x * x + y * y; return r <= 1 && r >= 0.38; },
  cross: (x, y) => Math.abs(x) <= 0.34 || Math.abs(y) <= 0.34,
  square: (x, y) => Math.abs(x) <= 0.92 && Math.abs(y) <= 0.92,
  triangle: (x, y) => y <= 0.9 && y >= -0.9 && Math.abs(x) <= (0.9 - y) / 1.8,
  heart: (x, y) => {
    const X = x * 1.25, Y = y * 1.25 - 0.25;
    const a = X * X + Y * Y - 0.62;
    return a * a * a - X * X * Y * Y * Y <= 0;
  },
  star: (x, y) => {
    // Star of David (two overlaid triangles) — reads clearly as a star.
    const up = y <= 0.55 && y >= -0.85 && Math.abs(x) <= (0.85 + y) / 1.6;
    const dn = y >= -0.55 && y <= 0.85 && Math.abs(x) <= (0.85 - y) / 1.6;
    return up || dn;
  },
  butterfly: (x, y) => {
    const wing = (cx) => ((Math.abs(x) - cx) / 0.52) ** 2 + (y / 0.78) ** 2 <= 1;
    const body = Math.abs(x) <= 0.09 && Math.abs(y) <= 0.9;
    return wing(0.46) || body;
  },
  arrow: (x, y) => {
    const shaft = Math.abs(x) <= 0.2 && y >= -0.95 && y <= 0.25;
    const head = y >= 0.2 && y <= 0.95 && Math.abs(x) <= (0.95 - y) * 1.15;
    return shaft || head;
  },
};

export const MASK_NAMES = Object.keys(SHAPES);

// Sample a shape into a set of grid cells. Returns { cols, rows, cells:Set, name }.
export function makeMask(name, cols, rows) {
  const fn = SHAPES[name] || SHAPES.diamond;
  const cells = new Set();
  for (let cy = 0; cy < rows; cy++) {
    for (let cx = 0; cx < cols; cx++) {
      const nx = ((cx + 0.5) / cols * 2 - 1) * 1.06;
      const ny = (1 - (cy + 0.5) / rows * 2) * 1.06; // y up
      if (fn(nx, ny)) cells.add(key(cx, cy));
    }
  }
  return { cols, rows, cells, name };
}

export function maskHas(mask, x, y) { return mask.cells.has(key(x, y)); }
