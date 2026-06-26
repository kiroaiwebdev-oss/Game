// board2d.js
// Minimalist Canvas 2D renderer for the warm "paper" Arrow Puzzle look:
// a beige background and thin dark-brown bent arrows (polylines) with a chevron
// head. Supports per-arrow color / alpha / glow and fractional points so the
// drain ("slither off") animation is smooth. No assets, no WebGL.

export const COLORS = {
  paper: '#e7d8bb',     // warm eye-comfort paper
  paperEdge: '#dccba8',
  arrow: '#3f3220',     // bold dark brown (reads almost black on paper)
  escape: '#3f7fcf',    // calm blue (selected / escaping = free path)
  danger: '#cf5648',    // soft red (blocked)
  hint: '#3f7fcf',
};

const DIR_UNIT = {
  U: [0, -1], D: [0, 1], L: [-1, 0], R: [1, 0],
};

export class Board2D {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.cols = 1; this.rows = 1;
    this.cell = 40; this.originX = 0; this.originY = 0; this.dpr = 1;
  }

  setGrid(cols, rows) { this.cols = cols; this.rows = rows; this._layout(); }

  _layout() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.dpr = dpr;
    const cssW = this.canvas.clientWidth || 360;
    const cssH = this.canvas.clientHeight || 480;
    const w = Math.max(1, Math.round(cssW * dpr));
    const h = Math.max(1, Math.round(cssH * dpr));
    if (this.canvas.width !== w || this.canvas.height !== h) {
      this.canvas.width = w; this.canvas.height = h;
    }
    const topCss = 112, botCss = 108, sideCss = 18;
    const padTop = topCss * dpr, padBot = botCss * dpr, padSide = sideCss * dpr;
    const availW = w - padSide * 2;
    const availH = h - padTop - padBot;
    // Cap the cell size so the board (and arrows) stay compact on big desktop
    // screens, and centre it. On phones the fit-to-width path wins.
    const maxCell = 40 * dpr;
    this.cell = Math.max(6, Math.min(availW / this.cols, availH / this.rows, maxCell));
    const gridW = this.cell * this.cols, gridH = this.cell * this.rows;
    this.originX = (w - gridW) / 2;
    this.originY = padTop + Math.max(0, (availH - gridH) / 2);
  }

  cellToScreen(x, y) {
    return [this.originX + (x + 0.5) * this.cell, this.originY + (y + 0.5) * this.cell];
  }

  screenToCell(cssX, cssY) {
    const px = cssX * this.dpr, py = cssY * this.dpr;
    const x = Math.floor((px - this.originX) / this.cell);
    const y = Math.floor((py - this.originY) / this.cell);
    if (x < 0 || x >= this.cols || y < 0 || y >= this.rows) return null;
    return { x, y };
  }

  // item: { points:[{x,y}...], dir, color, alpha, glow }
  _drawArrow(item) {
    const ctx = this.ctx;
    const pts = item.points.map((p) => this.cellToScreen(p.x, p.y));
    const [ux, uy] = DIR_UNIT[item.dir];
    const lineW = Math.max(1.5, this.cell * 0.085);   // thin lines

    // Head triangle dimensions (clear but compact, suits thin lines).
    const hl = Math.max(6, this.cell * 0.42);  // length (tip to base)
    const hw = Math.max(4, this.cell * 0.24);  // half base width

    const color = item.color || COLORS.arrow;
    ctx.save();
    ctx.globalAlpha = item.alpha ?? 1;
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = lineW;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    if (item.glow) { ctx.shadowColor = color; ctx.shadowBlur = item.glow * 18; }

    // Body polyline up to the head cell. The body stops a touch before the tip
    // so the solid arrowhead sits cleanly at the front.
    let hc; // head cell centre
    if (pts.length >= 2) {
      ctx.beginPath();
      ctx.moveTo(pts[0][0], pts[0][1]);
      for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
      ctx.stroke();
      hc = pts[pts.length - 1];
    } else {
      const c = pts[0];
      ctx.beginPath();
      ctx.moveTo(c[0] - ux * this.cell * 0.36, c[1] - uy * this.cell * 0.36);
      ctx.lineTo(c[0], c[1]);
      ctx.stroke();
      hc = c;
    }

    // Solid triangle arrowhead — unmistakable direction.
    const px = -uy, py = ux;
    const tip = [hc[0] + ux * hl * 0.62, hc[1] + uy * hl * 0.62];
    const base = [hc[0] - ux * hl * 0.38, hc[1] - uy * hl * 0.38];
    const b1 = [base[0] + px * hw, base[1] + py * hw];
    const b2 = [base[0] - px * hw, base[1] - py * hw];
    ctx.shadowBlur = item.glow ? item.glow * 18 : 0;
    ctx.beginPath();
    ctx.moveTo(tip[0], tip[1]);
    ctx.lineTo(b1[0], b1[1]);
    ctx.lineTo(b2[0], b2[1]);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  render(items) {
    this._layout();
    const ctx = this.ctx;
    ctx.fillStyle = COLORS.paper;
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    for (const it of items) this._drawArrow(it);
  }
}
