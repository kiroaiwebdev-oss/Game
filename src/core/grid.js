// grid.js
// The pure data model for the 3D board. No rendering. Unit-testable in Node.
//
// A Grid holds a fixed 3D volume of size (sizeX, sizeY, sizeZ).
// Each occupied cell contains a Block { id, x, y, z, dir }.
// Empty cells are null. Blocks "escape" by traveling along their direction
// until they leave the volume (see rules.js).

import { ALL_DIRECTIONS } from './direction.js';

let _nextId = 1;
export function resetIdCounter(value = 1) {
  _nextId = value;
}

export function makeBlock(x, y, z, dir) {
  if (!ALL_DIRECTIONS.includes(dir)) {
    throw new Error(`Invalid direction "${dir}" for block at (${x},${y},${z})`);
  }
  return { id: _nextId++, x, y, z, dir };
}

export class Grid {
  constructor(sizeX, sizeY, sizeZ) {
    this.sizeX = sizeX;
    this.sizeY = sizeY;
    this.sizeZ = sizeZ;
    // Flat array index = x + y*sizeX + z*sizeX*sizeY
    this.cells = new Array(sizeX * sizeY * sizeZ).fill(null);
    this.blocks = new Map(); // id -> block
  }

  _index(x, y, z) {
    return x + y * this.sizeX + z * this.sizeX * this.sizeY;
  }

  inBounds(x, y, z) {
    return (
      x >= 0 && x < this.sizeX &&
      y >= 0 && y < this.sizeY &&
      z >= 0 && z < this.sizeZ
    );
  }

  at(x, y, z) {
    if (!this.inBounds(x, y, z)) return undefined; // outside volume
    return this.cells[this._index(x, y, z)];
  }

  isEmpty(x, y, z) {
    return this.at(x, y, z) === null;
  }

  addBlock(block) {
    if (!this.inBounds(block.x, block.y, block.z)) {
      throw new Error(`Block out of bounds at (${block.x},${block.y},${block.z})`);
    }
    const idx = this._index(block.x, block.y, block.z);
    if (this.cells[idx] !== null) {
      throw new Error(`Cell (${block.x},${block.y},${block.z}) already occupied`);
    }
    this.cells[idx] = block;
    this.blocks.set(block.id, block);
    return block;
  }

  removeBlock(block) {
    const idx = this._index(block.x, block.y, block.z);
    if (this.cells[idx] === block) this.cells[idx] = null;
    this.blocks.delete(block.id);
  }

  get remaining() {
    return this.blocks.size;
  }

  get isCleared() {
    return this.blocks.size === 0;
  }

  // Returns a deep-ish copy useful for solvers / what-if simulation.
  clone() {
    const g = new Grid(this.sizeX, this.sizeY, this.sizeZ);
    for (const b of this.blocks.values()) {
      const copy = { id: b.id, x: b.x, y: b.y, z: b.z, dir: b.dir };
      g.cells[g._index(b.x, b.y, b.z)] = copy;
      g.blocks.set(copy.id, copy);
    }
    return g;
  }

  allBlocks() {
    return Array.from(this.blocks.values());
  }
}

// Build a Grid from a plain level definition (JSON-friendly).
// def = { size: [sx,sy,sz], blocks: [{x,y,z,dir}, ...] }
export function gridFromLevel(def) {
  const [sx, sy, sz] = def.size;
  const grid = new Grid(sx, sy, sz);
  for (const b of def.blocks) {
    grid.addBlock(makeBlock(b.x, b.y, b.z, b.dir));
  }
  return grid;
}
