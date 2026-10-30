/* 80 · register: the dot field --------------------------------------------------------
 * A grid of dots behind "Bring your best team." Their size and brightness
 * follow a slow wave, so the field seems to breathe. Each dot keeps its own
 * colour, nothing blinks, and it only animates while it is on screen.
 */

function createDots(canvas) {
  const ctx = canvas && canvas.getContext ? canvas.getContext('2d') : null;
  if (!ctx) return null;
  const COLORS = [[255, 255, 255], [0, 217, 255], [0, 229, 195], [41, 121, 255]];
  const LEVELS = 10;
  const styles = COLORS.map((c) => Array.from({ length: LEVELS }, (_, l) => `rgba(${c[0]},${c[1]},${c[2]},${((l + 1) / LEVELS * 0.8).toFixed(2)})`));
  let W = 0, H = 0, dpr = 1, gap = 17, cols = 0, rows = 0;
  let raf = 0, running = false, visible = false, last = 0;
  const t0 = performance.now();

  function resize() {
    const r = canvas.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = Math.max(1, Math.round(r.width * dpr));
    H = Math.max(1, Math.round(r.height * dpr));
    canvas.width = W;
    canvas.height = H;
    gap = (isSmallScreen() ? 15 : 17) * dpr;
    cols = Math.ceil(W / gap) + 1;
    rows = Math.ceil(H / gap) + 1;
  }

  function draw(t) {
    ctx.clearRect(0, 0, W, H);
    for (let j = 0; j < rows; j++) {
      for (let i = 0; i < cols; i++) {
        const v = Math.sin(i * 0.21 + t * 0.55) * Math.cos(j * 0.27 - t * 0.42) + Math.sin((i + j) * 0.11 + t * 0.3) * 0.6;
        const k = (v + 1.6) / 3.2;
        if (k < 0.3) continue;
        const size = (0.6 + k * 1.8) * dpr;
        const level = Math.min(LEVELS - 1, Math.floor(k * LEVELS));
        ctx.fillStyle = styles[(i * 7 + j * 13) % COLORS.length][level];
        ctx.fillRect(i * gap - size / 2, j * gap - size / 2, size, size);
      }
    }
  }

  function loop(now) {
    if (!running) return;
    raf = requestAnimationFrame(loop);
    if (!visible || now - last < 33) return;
    last = now;
    draw((now - t0) / 1000);
  }
  new IntersectionObserver(([en]) => { visible = en.isIntersecting; }).observe(canvas);
  window.addEventListener('resize', () => { resize(); if (!running) draw(4); });
  resize();

  return {
    play() { if (running) return; running = true; raf = requestAnimationFrame(loop); },
    still() { running = false; cancelAnimationFrame(raf); draw(4); },
  };
}
