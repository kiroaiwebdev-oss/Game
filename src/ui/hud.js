// hud.js
// Builds and controls the DOM overlay: top bar (level + lives), hint button,
// and the modal used for the main menu, win, lose and "all complete" screens.
// Pure DOM — no framework. The Game calls these methods; the HUD calls back
// into the Game for actions (hint / next / retry / start).

export class Hud {
  constructor(root) {
    this.root = root;
    this.game = null;
    this.onStart = null;
    this._build();
  }

  bindGame(game) { this.game = game; }

  _el(tag, cls, parent, text) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    if (parent) parent.appendChild(e);
    return e;
  }

  _build() {
    // Top bar
    this.topBar = this._el('div', 'hud-topbar', this.root);
    this.levelLabel = this._el('div', 'hud-level', this.topBar, 'Level 1');
    this.lives = this._el('div', 'hud-lives', this.topBar);

    // Hint button (bottom)
    this.hintBtn = this._el('button', 'btn hint-btn', this.root, '💡 Hint');
    this.hintBtn.addEventListener('click', () => this.game && this.game.requestHint());

    // Modal overlay
    this.overlay = this._el('div', 'overlay hidden', this.root);
    this.card = this._el('div', 'card', this.overlay);
    this.cardTitle = this._el('h1', 'card-title', this.card, 'Arrow Puzzle');
    this.cardMsg = this._el('p', 'card-msg', this.card, '');
    this.cardButtons = this._el('div', 'card-buttons', this.card);
  }

  // ----- helpers -----
  _showOverlay(title, msg, buttons) {
    this.cardTitle.textContent = title;
    this.cardMsg.textContent = msg;
    this.cardButtons.innerHTML = '';
    for (const b of buttons) {
      const btn = this._el('button', `btn ${b.primary ? 'btn-primary' : ''}`, this.cardButtons, b.label);
      btn.addEventListener('click', b.onClick);
    }
    this.overlay.classList.remove('hidden');
  }

  hideOverlay() { this.overlay.classList.add('hidden'); }

  updateLives(game) {
    this.lives.innerHTML = '';
    for (let i = 0; i < game.maxLives; i++) {
      const heart = this._el('span', 'heart', this.lives, i < game.lives ? '❤️' : '🤍');
    }
  }

  setHintPending(pending) {
    this.hintBtn.disabled = pending;
    this.hintBtn.textContent = pending ? '… loading' : '💡 Hint';
  }

  // ----- screens -----
  showMenu(onStart) {
    this.onStart = onStart;
    this.hintBtn.classList.add('hidden');
    this._showOverlay(
      'Arrow Puzzle',
      'Tap arrows to clear the board. An arrow leaves only when its path to the edge is free. Drag to rotate, pinch/scroll to zoom. Relax and enjoy the flow.',
      [{ label: '▶ Play', primary: true, onClick: () => { this.hideOverlay(); onStart(); } }]
    );
  }

  onLevelStart(game) {
    this.levelLabel.textContent = `Level ${game.levelIndex + 1}`;
    this.updateLives(game);
    this.hintBtn.classList.remove('hidden');
    this.setHintPending(false);
    this.hideOverlay();
  }

  showWin(game) {
    this.hintBtn.classList.add('hidden');
    const last = game.levelIndex + 1 >= game.levels.length;
    this._showOverlay(
      'Cleared! 🎉',
      last ? 'Beautiful — the board is empty.' : 'Nicely solved. Ready for the next one?',
      [{ label: last ? '🏁 Finish' : '➡ Next Level', primary: true, onClick: () => { this.hideOverlay(); game.nextLevel(); } }]
    );
  }

  showLose(game) {
    this.hintBtn.classList.add('hidden');
    this._showOverlay(
      'Out of lives',
      'No worries — take a breath and rethink your order.',
      [{ label: '↺ Try Again', primary: true, onClick: () => { this.hideOverlay(); game.retryLevel(); } }]
    );
  }

  showAllComplete(game) {
    this.hintBtn.classList.add('hidden');
    this._showOverlay(
      'All Levels Complete! 🏆',
      'You cleared every board. A calm, focused mind — well done.',
      [{ label: '↺ Play Again', primary: true, onClick: () => { this.hideOverlay(); game.loadLevel(0); } }]
    );
  }
}
