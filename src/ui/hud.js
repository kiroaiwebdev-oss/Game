// hud.js (2D, light theme)
// Builds and controls the clean DOM overlay matching the reference design:
// a top bar (back · "Level N" · settings), a status row (remaining · hearts ·
// difficulty), bottom round buttons (hint · restart), and a modal card for
// menu / win / lose screens. Pure DOM, no framework.

const DROP_FULL = `<svg viewBox="0 0 24 24" class="hsvg"><path d="M12 2C12 2 5 10.2 5 14.3A7 7 0 0 0 19 14.3C19 10.2 12 2 12 2z" fill="#4a90d9"/></svg>`;
const DROP_EMPTY = `<svg viewBox="0 0 24 24" class="hsvg"><path d="M12 2C12 2 5 10.2 5 14.3A7 7 0 0 0 19 14.3C19 10.2 12 2 12 2z" fill="#d8c8a6"/></svg>`;

// Visible build version so it's obvious which build is loaded (cache check).
export const BUILD_VERSION = 'v29';

// "Support the developer" tip link (shown only on platforms that allow external
// links — itch.io/local; never on CrazyGames/GD/Y8 where external links are not allowed).
const SUPPORT_URL = 'https://razorpay.me/@devsarun';
const SUPPORT_KEY = 'arrowzen.supported';

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
    this.gearBtn = this._el('button', 'icon-btn', this.topbar, '&#128266;'); // 🔊
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

    // Tiny build-version label (bottom-right) so cache/stale builds are obvious.
    this._el('div', 'build-ver', this.root, BUILD_VERSION);
    this.hintBtn.addEventListener('click', () => this.game && this.game.requestHint());
    this.restartBtn.addEventListener('click', () => this.game && this.game.retryLevel());

    // Modal
    this.overlay = this._el('div', 'overlay hidden', this.root);
    this.card = this._el('div', 'card', this.overlay);
    this.cardTitle = this._el('h1', 'card-title', this.card, 'Arrowzen');
    this.cardMsg = this._el('p', 'card-msg', this.card, '');
    this.cardButtons = this._el('div', 'card-buttons', this.card);

    // Optional "support the developer" tip link (platform-gated, hidden by
    // default; the href is only set when actually shown — see showWin).
    this.supportLink = this._el('a', 'support-link hidden', this.card,
      '\u2615 Enjoying Arrowzen? Support the developer');
    this.supportLink.target = '_blank';
    this.supportLink.rel = 'noopener noreferrer';
    this.supportLink.addEventListener('click', () => {
      this._setSupported();                 // they supported -> never show again
      this.supportLink.classList.add('hidden');
    });
  }

  _isSupported() { try { return localStorage.getItem(SUPPORT_KEY) === '1'; } catch (_) { return false; } }
  _setSupported() { try { localStorage.setItem(SUPPORT_KEY, '1'); } catch (_) {} }

  _toggleMute() {
    if (!this.game) return;
    const a = this.game.audio;
    a.setMuted(!a.muted);
    this.gearBtn.classList.toggle('muted', a.muted);
    this.gearBtn.innerHTML = a.muted ? '&#128263;' : '&#128266;'; // 🔇 / 🔊
  }

  _showControls(show) {
    [this.topbar, this.statusbar, this.bottombar].forEach((e) =>
      e.classList.toggle('hidden', !show));
  }

  _showOverlay(title, msg, buttons) {
    this.cardTitle.textContent = title;
    this.cardMsg.textContent = msg;
    this.cardButtons.innerHTML = '';
    if (this.supportLink) this.supportLink.classList.add('hidden'); // default off
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
      this._el('span', 'heart', this.hearts, i < game.lives ? DROP_FULL : DROP_EMPTY);
    }
  }
  updateRemaining(game) {
    this.remainChip.innerHTML = `<span class="grid-glyph">&#9638;</span> ${game.board.remaining}`;
  }
  updateHints(game) {
    const badge = this.hintBtn.querySelector('.round-badge');
    if (badge) badge.textContent = String(game.hints);
  }
  setHintPending(pending) {
    this.hintBtn.disabled = pending;
    this.hintBtn.classList.toggle('loading', pending);
  }

  setContinuePending(pending) {
    // Disable overlay buttons while the rewarded ad is loading.
    this.cardButtons.querySelectorAll('button').forEach((b) => { b.disabled = pending; });
  }

  _fmtTime(ms) {
    const s = Math.round(ms / 1000);
    const m = Math.floor(s / 60);
    const ss = String(s % 60).padStart(2, '0');
    return m > 0 ? `${m}:${ss}` : `${s}s`;
  }

  // ---- screens ----
  showMenuFor(game) { this.showMenu(() => { game.audio.resume(); game.loadLevel(0); }); }

  showMenu(onStart) {
    this._showControls(false);
    this._showOverlay(
      'Arrowzen',
      'Tap arrows to clear the board. An arrow leaves when its path to the edge is free.',
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
    const stats = `Time  ${this._fmtTime(game.solveMs)}     ·     Lives left  ${game.lives}/${game.maxLives}`;
    this._showOverlay(
      'Cleared!',
      stats,
      [{ label: last ? 'Finish' : 'Next Level', primary: true,
         onClick: () => { this.hideOverlay(); game.nextLevel(); } }]
    );
    // Show the "support developer" tip on each clear, until the user supports —
    // only where external links are allowed (itch.io/local), never on ad portals.
    const canSupport = !!(game.adapter && game.adapter.allowsExternalLinks) && !this._isSupported();
    if (canSupport) {
      this.supportLink.href = SUPPORT_URL;     // set href ONLY when shown (never on ad portals)
      this.supportLink.classList.remove('hidden');
    } else {
      this.supportLink.removeAttribute('href');
      this.supportLink.classList.add('hidden');
    }
  }

  showLose(game) {
    this._showControls(false);
    this._showOverlay(
      'Out of lives',
      'Watch a short video to get 3 lives and keep your progress — or start the level over.',
      [
        { label: 'Watch Ad  ·  +3 Lives', primary: true, onClick: () => game.continueWithAd() },
        { label: 'Restart Level', onClick: () => { this.hideOverlay(); game.retryLevel(); } },
      ]
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
