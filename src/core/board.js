// board.js
// 2D board holding "snake" arrows. An arrow is an ordered chain of connected
// cells (tail .. head) plus a head facing direction. Multiple arrows tile a
// shape silhouette. Pure data, no DOM. Unit-testable.

let _id = 1;
export function resetArrowId(v = 1) { _id = v; }

// cells: ordered [{x,y}...] tail->head. dir: head facing ('U'|'D'|'L'|'R').
export function makeArrow(cells, dir) {
  return { id: _id++, cells: cells.map((c) => ({ x: c.x, y: c.y })), dir };
}

const key = (x, y) => `${x},${y}`;

export class Board {
  constructor(cols, rows) {
    this.cols = cols;
    this.rows = rows;
    this.occ = new Map();    // "x,y" -> arrowId
    this.arrows = new Map(); // id -> arrow
  }

  inBounds(x, y) { return x >= 0 && x < this.cols && y >= 0 && y < this.rows; }
  occupant(x, y) { return this.occ.get(key(x, y)); } // arrowId or undefined
  isFree(x, y) { return this.inBounds(x, y) && !this.occ.has(key(x, y)); }

  addArrow(arrow) {
    for (const c of arrow.cells) this.occ.set(key(c.x, c.y), arrow.id);
    this.arrows.set(arrow.id, arrow);
    return arrow;
  }

  removeArrow(arrow) {
    for (const c of arrow.cells) {
      if (this.occ.get(key(c.x, c.y)) === arrow.id) this.occ.delete(key(c.x, c.y));
    }
    this.arrows.delete(arrow.id);
  }

  head(arrow) { return arrow.cells[arrow.cells.length - 1]; }
  allArrows() { return Array.from(this.arrows.values()); }
  get remaining() { return this.arrows.size; }
  get isCleared() { return this.arrows.size === 0; }

  clone() {
    const b = new Board(this.cols, this.rows);
    for (const a of this.arrows.values()) {
      const copy = { id: a.id, dir: a.dir, cells: a.cells.map((c) => ({ x: c.x, y: c.y })) };
      b.arrows.set(copy.id, copy);
      for (const c of copy.cells) b.occ.set(key(c.x, c.y), copy.id);
    }
    return b;
  }
}

// Build a Board from a JSON-friendly level def.
// def = { cols, rows, arrows: [{ cells:[{x,y}...], dir }] }
export function boardFromLevel(def) {
  const b = new Board(def.cols, def.rows);
  for (const a of def.arrows) b.addArrow(makeArrow(a.cells, a.dir));
  return b;
}
