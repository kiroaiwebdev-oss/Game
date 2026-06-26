// input.js
// Pointer + touch input. Distinguishes a drag (orbit the camera) from a tap
// (select an arrow). Mouse wheel & pinch zoom the camera.

export function attachInput(canvas, game, audio) {
  let dragging = false;
  let moved = false;
  let lastX = 0, lastY = 0;
  let downX = 0, downY = 0;
  const DRAG_THRESHOLD = 6; // px before a press counts as a drag, not a tap

  // For pinch zoom.
  let pinchDist = null;

  function toNdc(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    const x = ((clientX - rect.left) / rect.width) * 2 - 1;
    const y = -(((clientY - rect.top) / rect.height) * 2 - 1);
    return [x, y];
  }

  function onDown(x, y) {
    audio.resume(); // unlock audio on first interaction
    dragging = true;
    moved = false;
    lastX = downX = x;
    lastY = downY = y;
  }

  function onMove(x, y) {
    if (!dragging) return;
    const dx = x - lastX;
    const dy = y - lastY;
    lastX = x; lastY = y;
    if (Math.hypot(x - downX, y - downY) > DRAG_THRESHOLD) moved = true;
    if (moved) {
      game.handleOrbit(-dx * 0.008, dy * 0.008);
    }
  }

  function onUp(x, y) {
    if (!dragging) return;
    dragging = false;
    if (!moved) {
      const [nx, ny] = toNdc(x, y);
      game.handleTap(nx, ny);
    }
  }

  // Mouse
  canvas.addEventListener('mousedown', (e) => onDown(e.clientX, e.clientY));
  window.addEventListener('mousemove', (e) => onMove(e.clientX, e.clientY));
  window.addEventListener('mouseup', (e) => onUp(e.clientX, e.clientY));
  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    game.handleZoom(e.deltaY > 0 ? 1.1 : 0.9);
  }, { passive: false });

  // Touch
  canvas.addEventListener('touchstart', (e) => {
    if (e.touches.length === 1) {
      onDown(e.touches[0].clientX, e.touches[0].clientY);
    } else if (e.touches.length === 2) {
      dragging = false;
      pinchDist = touchDist(e);
    }
  }, { passive: true });

  canvas.addEventListener('touchmove', (e) => {
    if (e.touches.length === 1) {
      onMove(e.touches[0].clientX, e.touches[0].clientY);
    } else if (e.touches.length === 2 && pinchDist != null) {
      const d = touchDist(e);
      game.handleZoom(pinchDist / d);
      pinchDist = d;
    }
    if (e.cancelable) e.preventDefault();
  }, { passive: false });

  canvas.addEventListener('touchend', (e) => {
    if (pinchDist != null && e.touches.length < 2) pinchDist = null;
    const t = e.changedTouches[0];
    if (t) onUp(t.clientX, t.clientY);
  }, { passive: true });

  function touchDist(e) {
    const a = e.touches[0], b = e.touches[1];
    return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
  }
}
