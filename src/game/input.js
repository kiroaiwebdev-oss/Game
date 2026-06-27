// input.js (2D)
// Simple tap input: a press-and-release without much movement counts as a tap
// on a grid cell. Works for both mouse and touch.

export function attachInput(canvas, game, audio) {
  let downX = 0, downY = 0, down = false;
  const TAP_SLOP = 12; // px of movement still counts as a tap

  function start(x, y) { down = true; downX = x; downY = y; audio.resume(); }
  function end(x, y) {
    if (!down) return;
    down = false;
    if (Math.hypot(x - downX, y - downY) <= TAP_SLOP) {
      const rect = canvas.getBoundingClientRect();
      game.handleTap(x - rect.left, y - rect.top);
    }
  }

  canvas.addEventListener('mousedown', (e) => start(e.clientX, e.clientY));
  window.addEventListener('mouseup', (e) => end(e.clientX, e.clientY));

  canvas.addEventListener('touchstart', (e) => {
    const t = e.touches[0];
    if (t) start(t.clientX, t.clientY);
  }, { passive: true });
  canvas.addEventListener('touchend', (e) => {
    const t = e.changedTouches[0];
    if (t) end(t.clientX, t.clientY);
  }, { passive: true });
}
