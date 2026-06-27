// input.js — finger/mouse drag to steer through the maze corridors.

export function attachInput(canvas, game, audio) {
  let dragging = false;

  function pt(e) {
    const t = e.touches ? e.touches[0] : e;
    const rect = canvas.getBoundingClientRect();
    return [t.clientX - rect.left, t.clientY - rect.top];
  }

  function down(e) {
    dragging = true;
    audio && audio.resume && audio.resume();
    const [x, y] = pt(e);
    game.handlePoint(x, y);
  }
  function move(e) {
    if (!dragging) return;
    const [x, y] = pt(e);
    game.handlePoint(x, y);
    if (e.cancelable) e.preventDefault();
  }
  function up() { dragging = false; }

  canvas.addEventListener('mousedown', down);
  window.addEventListener('mousemove', move);
  window.addEventListener('mouseup', up);
  canvas.addEventListener('touchstart', down, { passive: true });
  canvas.addEventListener('touchmove', move, { passive: false });
  canvas.addEventListener('touchend', up, { passive: true });
}
