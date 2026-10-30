/* The presenter types once, with the complete sentence reserved underneath. */
function typePresenter(root, duration = 1450, token = {}) {
  const el = root?.querySelector('[data-typewriter]');
  if (!el) return;
  const output = el.querySelector('.typewriter__text');
  const text = el.querySelector('.typewriter__sizer').textContent;
  if (!fxOn() || media('(prefers-reduced-motion: reduce)').matches) return;
  el.classList.add('is-typing');
  output.textContent = '';
  const started = performance.now();
  const step = (now) => {
    if (token.cancelled || !el.isConnected || !fxOn()) {
      output.textContent = text;
      el.classList.remove('is-typing');
      return;
    }
    const progress = Math.min(1, (now - started) / duration);
    output.textContent = text.slice(0, Math.floor(progress * text.length));
    if (progress < 1) requestAnimationFrame(step);
    else el.classList.remove('is-typing');
  };
  requestAnimationFrame(step);
}
