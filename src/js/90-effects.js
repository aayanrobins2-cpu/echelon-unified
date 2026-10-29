/* 90 · effects and "reduce motion" ---------------------------------------------------------
 * Effects are off for visitors who have "reduce motion" set on their device
 * (decided in <head> before anything draws), and this follows that setting if
 * it changes while the page is open. There is no on/off button on the page.
 */

function setEffects(on) {
  html.classList.toggle('fx-off', !on);
  if (on) {
    initLens();
    initScroll();
    if (orb) orb.start();
    if (dots) dots.play();
  } else {
    if (lens) lens.destroy();
    destroyScroll();
    if (orb) orb.still();
    if (dots) dots.still();
    if (well) well.still();
  }
}

function initMotionPreference() {
  if (!SITE.effects) return;
  media('(prefers-reduced-motion: reduce)').addEventListener('change', (e) => setEffects(!e.matches));
}
