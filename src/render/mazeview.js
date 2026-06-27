// mazeview.js
// Canvas 2D renderer for the maze: thin black walls on white, an organic shape
// border, start (green) and exit (red) markers, and the player's drawn path.

export const COLORS = {
  bg: '#ffffff',
  wall: '#111418',
  path: '#3a86ff',
  start: '#21c08b',
  exit: '#ff4d5e',
  solution: 'rgba(58,134,255,0.28)',
};

const parse = (k) => k.split(',').map(Number);

export class MazeView {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.maze = null;
    this.cell = 12;
    this.ox = 0; this.oy = 0;
    this.dpr = 1;
  }

  setMaze(maze) { this.maze = maze; this._layout(); }

  _layout() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.dpr = dpr;
    const cssW = this.canvas.clientWidth || 360;
    const cssH = this.canvas.clientHeight || 640;
    const w = Math.max(1, Math.round(cssW * dpr));
    const h = Math.max(1, Math.round(cssH * dpr));
    if (this.canvas.width !== w || this.canvas.height !== h) {
      this.canvas.width = w; this.canvas.height = h;
    }
    if (!this.maze) return;
    const { minX, minY, maxX, maxY } = this.maze.bounds;
    const gw = maxX - minX + 1, gh = maxY - minY + 1;
    const padTop = 96 * dpr, padBot = 120 * dpr, padSide = 22 * dpr;
    const availW = w - padSide * 2;
    const availH = h - padTop - padBot;
    this.cell = Math.max(4, Math.min(availW / gw, availH / gh));
    this.ox = (w - this.cell * gw) / 2 - minX * this.cell;
    this.oy = padTop + (availH - this.cell * gh) / 2 - minY * this.cell;
  }

  cellCenter(k) {
    const [x, y] = parse(k);
    return [this.ox + (x + 0.5) * this.cell, this.oy + (y + 0.5) * this.cell];
  }

  // Nearest maze cell key for a CSS pixel (or null if outside the shape).
  pointToCell(cssX, cssY) {
    if (!this.maze) return null;
    const px = cssX * this.dpr, py = cssY * this.dpr;
    const x = Math.floor((px - this.ox) / this.cell);
    const y = Math.floor((py - this.oy) / this.cell);
    const k = `${x},${y}`;
    return this.maze.cells.has(k) ? k : null;
  }

  render(state) {
    this._layout();
    const ctx = this.ctx, m = this.maze;
    ctx.fillStyle = COLORS.bg;
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    if (!m) return;
    const s = this.cell;

    // Optional faint solution (hint).
    if (state && state.showSolution && m.solution.length) {
      this._strokePath(m.solution, COLORS.solution, s * 0.5);
    }

    // Player path.
    if (state && state.path && state.path.length) {
      this._strokePath(state.path, COLORS.path, s * 0.46);
    }

    // Walls — batched into one stroke for performance.
    ctx.strokeStyle = COLORS.wall;
    ctx.lineWidth = Math.max(1.2, s * 0.11);
    ctx.lineCap = 'square';
    ctx.beginPath();
    for (const k of m.cells) {
      const [x, y] = parse(k);
      const X = this.ox + x * s, Y = this.oy + y * s;
      const wl = m.walls.get(k);
      if (wl.N) { ctx.moveTo(X, Y); ctx.lineTo(X + s, Y); }
      if (wl.S) { ctx.moveTo(X, Y + s); ctx.lineTo(X + s, Y + s); }
      if (wl.W) { ctx.moveTo(X, Y); ctx.lineTo(X, Y + s); }
      if (wl.E) { ctx.moveTo(X + s, Y); ctx.lineTo(X + s, Y + s); }
    }
    ctx.stroke();

    // Start & exit markers.
    this._dot(m.entrance.k, COLORS.start, s * 0.3);
    this._dot(m.exit.k, COLORS.exit, s * 0.3);

    // Arrowheads at dead-ends -> the maze reads as a field of winding arrows.
    this._deadEndArrows();

    // Current head marker.
    if (state && state.path && state.path.length) {
      this._dot(state.path[state.path.length - 1], COLORS.path, s * 0.26);
    }
  }

  // Draw a small chevron pointing INTO each dead-end (a cell with one opening),
  // giving the classic "winding arrows" look without revealing the solution.
  _deadEndArrows() {
    const ctx = this.ctx, m = this.maze, s = this.cell;
    const OPP = { N: 'S', S: 'N', E: 'W', W: 'E' };
    const VEC = { N: [0, -1], S: [0, 1], E: [1, 0], W: [-1, 0] };
    ctx.strokeStyle = COLORS.wall;
    ctx.lineWidth = Math.max(1.2, s * 0.11);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    const hl = s * 0.24;
    for (const k of m.cells) {
      if (k === m.entrance.k || k === m.exit.k) continue;
      const wl = m.walls.get(k);
      const opens = ['N', 'S', 'E', 'W'].filter((d) => wl[d] === false);
      if (opens.length !== 1) continue; // dead-end = exactly one opening
      const dir = OPP[opens[0]];        // point toward the closed end
      const [ux, uy] = VEC[dir];
      const [cx, cy] = this.cellCenter(k);
      const tipX = cx + ux * s * 0.18, tipY = cy + uy * s * 0.18;
      const bx = tipX - ux * hl, by = tipY - uy * hl;
      const px = -uy, py = ux;
      ctx.beginPath();
      ctx.moveTo(bx + px * hl, by + py * hl);
      ctx.lineTo(tipX, tipY);
      ctx.lineTo(bx - px * hl, by - py * hl);
      ctx.stroke();
    }
  }

  _strokePath(keys, color, width) {
    if (keys.length < 1) return;
    const ctx = this.ctx;
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    keys.forEach((k, i) => {
      const [cx, cy] = this.cellCenter(k);
      if (i === 0) ctx.moveTo(cx, cy); else ctx.lineTo(cx, cy);
    });
    ctx.stroke();
  }

  _dot(k, color, r) {
    const ctx = this.ctx;
    const [cx, cy] = this.cellCenter(k);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(cx, cy, Math.max(2.5, r), 0, Math.PI * 2);
    ctx.fill();
  }
}
