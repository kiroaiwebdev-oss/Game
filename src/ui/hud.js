// hud.js — premium minimal white UI matching the reference layout.
// Top: level (left) · 3 hearts (center) · difficulty badge (right) · divider.
// Bottom: floating hint bulb (left) and grid/reset button (right).

const HEART = `<svg viewBox="0 0 24 24" class="hsvg"><path d="M12 21s-7.4-4.6-9.9-9.2C.5 8.3 2 4.9 5.2 4.9c2 0 3.3 1.2 4.8 3 1.5-1.8 2.8-3 4.8-3 3.2 0 4.7 3.4 3.1 6.9C19.4 16.4 12 21 12 21z" fill="#ff3b4e"/></svg>`;
const HEART_OFF = `<svg viewBox="0 0 24 24" class="hsvg"><path d="M12 21s-7.4-4.6-9.9-9.2C.5 8.3 2 4.9 5.2 4.9c2 0 3.3 1.2 4.8 3 1.5-1.8 2.8-3 4.8-3 3.2 0 4.7 3.4 3.1 6.9C19.4 16.4 12 21 12 21z" fill="#e6e8ee"/></svg>`;
const BULB = `<svg viewBox="0 0 24 24" class="bsvg"><path d="M9 21h6v-1H9v1zm3-19a7 7 0 0 0-4 12.7c.6.5 1 1.1 1 1.8v.5h6v-.5c0-.7.4-1.3 1-1.8A7 7 0 0 0 12 2z" fill="none" stroke="#3a86ff" stroke-width="1.7" stroke-linejoin="round"/></svg>`;
const GRID = `<svg viewBox="0 0 24 24" class="bsvg"><g fill="none" stroke="#3a86ff" stroke-width="1.7"><rect x="4" y="4" width="6" height="6" rx="1.4"/><rect x="14" y="4" width="6" height="6" rx="1.4"/><rect x="4" y="14" width="6" height="6" rx="1.4"/><rect x="14" y="14" width="6" height="6" rx="1.4"/></g></svg>`;

// Visible build version (cache check).
export const BUILD_VERSION = 'v24';

export class Hud {
  constructor(root) { this.root = root; this.game = null; this._build(); }
  bindGame(g) { this.game = g; }

  _el(t, c, p, html) {
    const e = document.createElement(t);
    if (c) e.className = c;
    if (html != null) e.innerHTML = html;
    if (p) p.appendChild(e);
    return e;
  }

  _build() {
    this.top = this._el('div', 'topbar', this.root);
    this.levelEl = this._el('div', 'level', this.top, '');
    this.hearts = this._el('div', 'hearts', this.top);
    this.badge = this._el('div', 'badge', this.top, 'Normal');
    this.divider = this._el('div', 'divider', this.root);

    this.bottom = this._el('div', 'bottombar', this.root);
    this.hintBtn = this._el('button', 'fab', this.bottom, BULB);
    this._el('span', 'ad-tag', this.hintBtn, 'Ad');
    this.gridBtn = this._el('button', 'fab', this.bottom, GRID);
    this.hintBtn.addEventListener('click', () => this.game && this.game.requestHint());
    this.gridBtn.addEventListener('click', () => this.game && this.game.resetPath());

    this.overlay = this._el('div', 'overlay hidden', this.root);
    this.card = this._el('div', 'card', this.overlay);
    this.cardTitle = this._el('h1', 'card-title', this.card, 'Amaze');
    this.cardMsg = this._el('p', 'card-msg', this.card, '');
    this.cardBtns = this._el('div', 'card-btns', this.card);

    this._el('div', 'build-ver', this.root, BUILD_VERSION);
  }

  _chrome(show) {
    [this.top, this.divider, this.bottom].forEach((e) => e.classList.toggle('hidden', !show));
  }

  _overlay(title, msg, btns) {
    this.cardTitle.textContent = title;
    this.cardMsg.textContent = msg;
    this.cardBtns.innerHTML = '';
    for (const b of btns) {
      const el = this._el('button', `btn ${b.primary ? 'btn-primary' : ''}`, this.cardBtns);
      el.textContent = b.label;
      el.addEventListener('click', b.onClick);
    }
    this.overlay.classList.remove('hidden');
  }
  hideOverlay() { this.overlay.classList.add('hidden'); }

  updateHearts(g) {
    this.hearts.innerHTML = '';
    for (let i = 0; i < 3; i++) this._el('span', 'heart', this.hearts, i < g.lives ? HEART : HEART_OFF);
  }

  _fmt(ms) {
    const s = Math.round(ms / 1000), m = Math.floor(s / 60);
    return m > 0 ? `${m}:${String(s % 60).padStart(2, '0')}` : `${s}s`;
  }

  showMenu(onStart) {
    this._chrome(false);
    this._overlay('Amaze',
      'Drag your finger through the maze corridors to reach the exit. Calm, minimal, one clean line at a time.',
      [{ label: 'Play', primary: true, onClick: () => { this.hideOverlay(); onStart(); } }]);
  }

  onLevelStart(g) {
    this.levelEl.innerHTML = `<span class="lvl-glyph">&#9638;</span> ${g.levelIndex + 1}`;
    this.badge.textContent = g.levels[g.levelIndex].difficulty || 'Normal';
    this.updateHearts(g);
    this._chrome(true);
    this.hideOverlay();
  }

  showWin(g) {
    this._chrome(false);
    const last = g.levelIndex + 1 >= g.levels.length;
    this._overlay('Solved!', `Time  ${this._fmt(g.solveMs)}`,
      [{ label: last ? 'Finish' : 'Next Maze', primary: true,
         onClick: () => { this.hideOverlay(); g.nextLevel(); } }]);
  }

  showAllComplete(g) {
    this._chrome(false);
    this._overlay('All Mazes Complete!', 'A calm, clear mind. Beautifully done.',
      [{ label: 'Play Again', primary: true, onClick: () => { this.hideOverlay(); g.loadLevel(0); } }]);
  }
}
