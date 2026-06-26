// hud.js (2D, light theme)
// Builds and controls the clean DOM overlay matching the reference design:
// a top bar (back · "Level N" · settings), a status row (remaining · hearts ·
// difficulty), bottom round buttons (hint · restart), and a modal card for
// menu / win / lose screens. Pure DOM, no framework.

const HEART_FULL = `<svg viewBox="0 0 24 24" class="hsvg"><path d="M12 21s-7.5-4.6-10-9.2C.4 8.3 2 4.8 5.3 4.8c2 0 3.3 1.2 4.7 3 1.4-1.8 2.7-3 4.7-3 3.3 0 4.9 3.5 3.3 7C19.5 16.4 12 21 12 21z" fill="#ff5a6e"/></svg>`;
const HEART_EMPTY = `<svg viewBox="0 0 24 24" class="hsvg"><path d="M12 21s-7.5-4.6-10-9.2C.4 8.3 2 4.8 5.3 4.8c2 0 3.3 1.2 4.7 3 1.4-1.8 2.7-3 4.7-3 3.3 0 4.9 3.5 3.3 7C19.5 16.4 12 21 12 21z" fill="none" stroke="#d4dbe8" stroke-width="1.6"/></svg>`;

export class Hud {
  constructor(root) {
    this.root = root;
    this.game = null;
    this._build();
  }

  bindGame(game) { this.game = game; }

  _el(tag, cls, parent, html) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html != null) e.innerHTML = html;
    if (parent) parent.appendChild(e);
    return e;
  }

  _build() {
    // Top bar
    this.topbar = this._el('div', 'topbar', this.root);
    this.backBtn = this._el('button', 'icon-btn', this.topbar, '&#8249;');
    this.levelTitle = this._el('div', 'level-title', this.topbar, 'Level 1');
    this.gearBtn = this._el('button', 'icon-btn', this.topbar, '&#9881;');
    this.backBtn.addEventListener('click', () => this.game && this.game.hud.showMenuFor(this.game));
    this.gearBtn.addEventListener('click', () => this._toggleMute());

    // Status row
    this.statusbar = this._el('div', 'statusbar', this.root);
    this.remainChip = this._el('div', 'chip', this.statusbar, '');
    this.hearts = this._el('div', 'hearts', this.statusbar);
    this.diffBadge = this._el('div', 'badge', this.statusbar, 'Normal');

    // Bottom controls
    this.bottombar = this._el('div', 'bottombar', this.root);
    this.hintBtn = this._el('button', 'round-btn', this.bottombar,
      `<span class="bulb">&#128161;</span><span class="round-badge">1</span>`);
    this.restartBtn = this._el('button', 'round-btn', this.bottombar, '&#8635;');
    this.hintBtn.addEventListener('click', () => this.game && this.game.requestHint());
    this.restartBtn.addEventListener('click', () => this.game && this.game.retryLevel());

    // Modal
    this.overlay = this._el('div', 'overlay hidden', this.root);
    this.card = this._el('div', 'card', this.overlay);
    this.cardTitle = this._el('h1', 'card-title', this.card, 'Arrow Puzzle');
    this.cardMsg = this._el('p', 'card-msg', this.card, '');
    this.cardButtons = this._el('div', 'card-buttons', this.card);
  }

  _toggleMute() {
    if (!this.game) return;
    const a = this.game.audio;
    a.setMuted(!a.muted);
    this.gearBtn.classList.toggle('muted', a.muted);
  }

  _showControls(show) {
    [this.topbar, this.statusbar, this.bottombar].forEach((e) =>
      e.classList.toggle('hidden', !show));
  }

  _showOverlay(title, msg, buttons) {
    this.cardTitle.textContent = title;
    this.cardMsg.textContent = msg;
    this.cardButtons.innerHTML = '';
    for (const b of buttons) {
      const btn = this._el('button', `btn ${b.primary ? 'btn-primary' : ''}`, this.cardButtons);
      btn.textContent = b.label;
      btn.addEventListener('click', b.onClick);
    }
    this.overlay.classList.remove('hidden');
  }
  hideOverlay() { this.overlay.classList.add('hidden'); }

  // ---- updates ----
  updateLives(game) {
    this.hearts.innerHTML = '';
    for (let i = 0; i < game.maxLives; i++) {
      this._el('span', 'heart', this.hearts, i < game.lives ? HEART_FULL : HEART_EMPTY);
    }
  }
  updateRemaining(game) {
    this.remainChip.innerHTML = `<span class="grid-glyph">&#9638;</span> ${game.grid.remaining}`;
  }
  updateHints(game) {
    const badge = this.hintBtn.querySelector('.round-badge');
    if (badge) badge.textContent = String(game.hints);
  }
  setHintPending(pending) {
    this.hintBtn.disabled = pending;
    this.hintBtn.classList.toggle('loading', pending);
  }

  // ---- screens ----
  showMenuFor(game) { this.showMenu(() => { game.audio.resume(); game.loadLevel(0); }); }

  showMenu(onStart) {
    this._showControls(false);
    this._showOverlay(
      'Arrow Puzzle',
      'Tap an arrow to send it off the board. An arrow can leave only when its path to the edge is free. Clear every arrow to win. Relax and find the flow.',
      [{ label: 'Play', primary: true, onClick: () => { this.hideOverlay(); onStart(); } }]
    );
  }

  onLevelStart(game) {
    this.levelTitle.textContent = `Level ${game.levelIndex + 1}`;
    this.diffBadge.textContent = game.levels[game.levelIndex].difficulty || 'Normal';
    this.updateLives(game);
    this.updateRemaining(game);
    this.updateHints(game);
    this.setHintPending(false);
    this._showControls(true);
    this.hideOverlay();
  }

  showWin(game) {
    this._showControls(false);
    const last = game.levelIndex + 1 >= game.levels.length;
    this._showOverlay(
      'Cleared!',
      last ? 'Beautiful — the board is empty.' : 'Nicely solved. Ready for the next one?',
      [{ label: last ? 'Finish' : 'Next Level', primary: true,
         onClick: () => { this.hideOverlay(); game.nextLevel(); } }]
    );
  }

  showLose(game) {
    this._showControls(false);
    this._showOverlay(
      'Out of lives',
      'No worries — take a breath and rethink your order.',
      [{ label: 'Try Again', primary: true, onClick: () => { this.hideOverlay(); game.retryLevel(); } }]
    );
  }

  showAllComplete(game) {
    this._showControls(false);
    this._showOverlay(
      'All Levels Complete!',
      'You cleared every board. A calm, focused mind — well done.',
      [{ label: 'Play Again', primary: true, onClick: () => { this.hideOverlay(); game.loadLevel(0); } }]
    );
  }
}
