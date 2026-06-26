// board2d.js
// A clean, minimalist 2D board renderer using the Canvas 2D API (crisp vector
// line-art — perfect for the calm "Arrow Puzzle" look). No WebGL, no assets.
//
// It draws: a soft dotted grid, navy chevron arrows pointing in 4 directions,
// a light-blue "free path" trail when an arrow escapes, and supports per-arrow
// offset / fade / scale / glow for animations.

export const COLORS = {
  bg: '#ffffff',
  dot: '#e4e9f2',
  arrow: '#16244d',   // calm navy
  accent: '#3f8efc',  // friendly blue (selected / escaping / hint)
  danger: '#ef5d6b',  // soft red (blocked)
  trail: 'rgba(63, 142, 252, 0.30)',
};

// Screen-space unit vector per direction (y increases downward = row index).
export const DIR_SCREEN = {
  PX: [1, 0],   // right
  NX: [-1, 0],  // left
  PY: [0, 1],   // down
  NY: [0, -1],  // up
};

export class Board2D {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.cols = 1;
    this.rows = 1;
    this.cell = 40;
    this.originX = 0;
    this.originY = 0;
    this.dpr = 1;
  }

  setGrid(cols, rows) {
    this.cols = cols;
    this.rows = rows;
    this._layout();
  }

  _layout() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.dpr = dpr;
    const cssW = this.canvas.clientWidth || 360;
    const cssH = this.canvas.clientHeight || 480;
    const w = Math.max(1, Math.round(cssW * dpr));
    const h = Math.max(1, Math.round(cssH * dpr));
    if (this.canvas.width !== w || this.canvas.height !== h) {
      this.canvas.width = w;
      this.canvas.height = h;
    }
    // Reserve room for the top bars (level/hearts) and bottom buttons so the
    // grid never sits underneath the UI. Values are in CSS px.
    const topCss = 116, botCss = 110, sideCss = 18;
    const padTop = topCss * dpr, padBot = botCss * dpr, padSide = sideCss * dpr;
    const availW = w - padSide * 2;
    const availH = h - padTop - padBot;
    this.cell = Math.max(8, Math.min(availW / this.cols, availH / this.rows));
    const gridW = this.cell * this.cols;
    const gridH = this.cell * this.rows;
    this.originX = (w - gridW) / 2;
    this.originY = padTop + (availH - gridH) / 2;
  }

  cellToScreen(x, y) {
    return [
      this.originX + (x + 0.5) * this.cell,
      this.originY + (y + 0.5) * this.cell,
    ];
  }

  // Convert a CSS pixel coordinate (from a pointer event) to a grid cell.
  screenToCell(cssX, cssY) {
    const px = cssX * this.dpr;
    const py = cssY * this.dpr;
    const x = Math.floor((px - this.originX) / this.cell);
    const y = Math.floor((py - this.originY) / this.cell);
    if (x < 0 || x >= this.cols || y < 0 || y >= this.rows) return null;
    return { x, y };
  }

  _drawDots() {
    const ctx = this.ctx;
    ctx.fillStyle = COLORS.dot;
    const r = Math.max(1.4, this.cell * 0.045);
    for (let y = 0; y < this.rows; y++) {
      for (let x = 0; x < this.cols; x++) {
        const [sx, sy] = this.cellToScreen(x, y);
        ctx.beginPath();
        ctx.arc(sx, sy, r, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  _drawTrail(item) {
    const ctx = this.ctx;
    const [ux, uy] = DIR_SCREEN[item.dir];
    const [cx, cy] = this.cellToScreen(item.x, item.y);
    const len = (item.trailLen || 0) * this.cell;
    ctx.save();
    ctx.globalAlpha = item.trailAlpha ?? 0.3;
    ctx.strokeStyle = COLORS.accent;
    ctx.lineWidth = this.cell * 0.5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + ux * len, cy + uy * len);
    ctx.stroke();
    ctx.restore();
  }

  // Draw a single chevron arrow.
  _drawArrow(item) {
    const ctx = this.ctx;
    const [ux, uy] = DIR_SCREEN[item.dir];
    let [cx, cy] = this.cellToScreen(item.x, item.y);
    cx += (item.dxCells || 0) * this.cell;
    cy += (item.dyCells || 0) * this.cell;

    const scale = item.scale ?? 1;
    const size = this.cell * 0.62 * scale;        // shaft length
    const head = size * 0.42;                      // arrowhead size
    const lineW = Math.max(2, this.cell * 0.12 * scale);
    const half = size / 2;

    // perpendicular
    const px = -uy, py = ux;

    const tailX = cx - ux * half, tailY = cy - uy * half;
    const headX = cx + ux * half, headY = cy + uy * half;
    const backX = headX - ux * head, backY = headY - uy * head;

    ctx.save();
    ctx.globalAlpha = item.alpha ?? 1;
    ctx.strokeStyle = item.color || COLORS.arrow;
    ctx.lineWidth = lineW;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    if (item.glow) {
      ctx.shadowColor = item.color || COLORS.accent;
      ctx.shadowBlur = item.glow * 22;
    }
    // shaft
    ctx.beginPath();
    ctx.moveTo(tailX, tailY);
    ctx.lineTo(headX, headY);
    ctx.stroke();
    // chevron head (two wings)
    ctx.beginPath();
    ctx.moveTo(headX, headY);
    ctx.lineTo(backX + px * head * 0.85, backY + py * head * 0.85);
    ctx.moveTo(headX, headY);
    ctx.lineTo(backX - px * head * 0.85, backY - py * head * 0.85);
    ctx.stroke();
    ctx.restore();
  }

  // items: array of arrow draw descriptors (live arrows + escaping ghosts).
  // Each: { x, y, dir, color, dxCells, dyCells, alpha, scale, glow,
  //         trail, trailLen, trailAlpha }
  render(items) {
    this._layout();
    const ctx = this.ctx;
    ctx.fillStyle = COLORS.bg;
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    this._drawDots();

    // Trails first (under arrows).
    for (const it of items) if (it.trail) this._drawTrail(it);
    // Arrows on top.
    for (const it of items) this._drawArrow(it);
  }
}
