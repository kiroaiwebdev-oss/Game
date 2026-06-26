// direction.js
// The 6 axis-aligned directions an arrow block can point in 3D space.
// Pure data + helpers, no rendering / DOM dependencies (so it is unit-testable in Node).

export const DIRECTIONS = Object.freeze({
  PX: 'PX', // +X (right)
  NX: 'NX', // -X (left)
  PY: 'PY', // +Y (up)
  NY: 'NY', // -Y (down)
  PZ: 'PZ', // +Z (front / toward camera default)
  NZ: 'NZ', // -Z (back)
});

// Unit step vector for each direction. Used to walk a cell path toward the grid edge.
export const DIR_VECTORS = Object.freeze({
  PX: { x: 1, y: 0, z: 0 },
  NX: { x: -1, y: 0, z: 0 },
  PY: { x: 0, y: 1, z: 0 },
  NY: { x: 0, y: -1, z: 0 },
  PZ: { x: 0, y: 0, z: 1 },
  NZ: { x: 0, y: 0, z: -1 },
});

export const ALL_DIRECTIONS = Object.freeze([
  DIRECTIONS.PX, DIRECTIONS.NX,
  DIRECTIONS.PY, DIRECTIONS.NY,
  DIRECTIONS.PZ, DIRECTIONS.NZ,
]);

export function dirVector(dir) {
  const v = DIR_VECTORS[dir];
  if (!v) throw new Error(`Unknown direction: ${dir}`);
  return v;
}

// "Axis group" is handy for coloring blocks consistently by the axis they travel on.
export function dirAxis(dir) {
  switch (dir) {
    case DIRECTIONS.PX:
    case DIRECTIONS.NX:
      return 'X';
    case DIRECTIONS.PY:
    case DIRECTIONS.NY:
      return 'Y';
    case DIRECTIONS.PZ:
    case DIRECTIONS.NZ:
      return 'Z';
    default:
      throw new Error(`Unknown direction: ${dir}`);
  }
}
