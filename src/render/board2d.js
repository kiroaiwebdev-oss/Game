// board2d.js
// Minimalist Canvas 2D renderer for the warm "paper" Arrow Puzzle look:
// a beige background and thin dark-brown bent arrows (polylines) with a chevron
// head. Supports per-arrow color / alpha / glow and fractional points so the
// drain ("slither off") animation is smooth. No assets, no WebGL.

export const COLORS = {
  paper: '#e7d8bb',     // warm eye-comfort paper
  paperEdge: '#dccba8',
  arrow: '#5b4a33',     // dark brown
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
    const lineW = Math.max(1.6, this.cell * 0.1);
    const headLen = Math.max(5, this.cell * 0.42); // bigger, clearer head

    ctx.save();
    ctx.globalAlpha = item.alpha ?? 1;
    ctx.strokeStyle = item.color || COLORS.arrow;
    ctx.lineWidth = lineW;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    if (item.glow) { ctx.shadowColor = item.color || COLORS.hint; ctx.shadowBlur = item.glow * 18; }

    // Body polyline. The head end stops one head-length short so the arrowhead
    // sits cleanly at the tip. For a single cell we synthesize a short shaft.
    let headCenter;
    if (pts.length >= 2) {
      ctx.beginPath();
      ctx.moveTo(pts[0][0], pts[0][1]);
      for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
      ctx.stroke();
      headCenter = pts[pts.length - 1];
    } else {
      const c = pts[0];
      const back = [c[0] - ux * this.cell * 0.34, c[1] - uy * this.cell * 0.34];
      ctx.beginPath();
      ctx.moveTo(back[0], back[1]);
      ctx.lineTo(c[0], c[1]);
      ctx.stroke();
      headCenter = c;
    }

    // Arrowhead: tip pushed forward (toward the exit), bold chevron, so the
    // exit direction is unmistakable.
    const tip = [headCenter[0] + ux * headLen * 0.55, headCenter[1] + uy * headLen * 0.55];
    const baseX = tip[0] - ux * headLen, baseY = tip[1] - uy * headLen;
    const px = -uy, py = ux;
    ctx.lineWidth = lineW * 1.25;
    ctx.beginPath();
    ctx.moveTo(tip[0], tip[1]);
    ctx.lineTo(baseX + px * headLen * 0.62, baseY + py * headLen * 0.62);
    ctx.moveTo(tip[0], tip[1]);
    ctx.lineTo(baseX - px * headLen * 0.62, baseY - py * headLen * 0.62);
    ctx.stroke();
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
