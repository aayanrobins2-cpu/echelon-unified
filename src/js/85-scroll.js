/* 85 · scroll moments (GSAP + ScrollTrigger) ------------------------------------------
 * Exactly three, and native scrolling is never taken over:
 *   1. hero: the orb breaks apart as you leave (handled inside the orb itself)
 *   2. How it works: pinned while the camera dives into the gravity well
 *   3. Schedule: the LCD clock runs from doors open to wrap-up
 * GSAP is only downloaded after the page has loaded, and never for visitors
 * with reduced motion or effects switched off.
 */

let gsapLoading = null;
function loadScript(src) {
  return new Promise((resolve, reject) => {
    const s = d.createElement('script');
    s.src = src;
    s.onload = resolve;
    s.onerror = () => reject(new Error(`could not load ${src}`));
    d.head.appendChild(s);
  });
}
function loadGsap() {
  if (window.gsap && window.ScrollTrigger) return Promise.resolve();
  if (!gsapLoading) {
    gsapLoading = loadScript(`${VENDOR}gsap.min.js?v=${GSAP_VERSION}`)
      .then(() => loadScript(`${VENDOR}ScrollTrigger.min.js?v=${GSAP_VERSION}`))
      .then(() => {
        window.gsap.registerPlugin(window.ScrollTrigger);
        window.ScrollTrigger.config({ ignoreMobileResize: true }); // don't recalculate when the address bar slides
      });
  }
  return gsapLoading;
}

let scrollCtx = null;
const howSection = $('[data-how]');

function howMoment(gsap) {
  if (!howSection || !well) return;
  howSection.classList.add('is-pinned');
  well.resize();
  const steps = $$('.step', howSection);
  let active = -1;
  const state = { p: 0 };
  const render = () => {
    const i = Math.min(steps.length - 1, Math.floor(state.p * steps.length * 0.999));
    if (i !== active) {
      active = i;
      steps.forEach((s, k) => s.classList.toggle('is-active', k === i));
    }
  };
  render();
  gsap.to(state, {
    p: 1,
    ease: 'none',
    onUpdate: render,
    scrollTrigger: { trigger: howSection, start: 'top top', end: 'bottom bottom', scrub: 0.6 },
  });
  well.setProgressSource(() => state.p);
  well.play();
}

const toMinutes = (t) => { const [h, m] = String(t).split(':').map(Number); return h * 60 + m; };
const asClock = (mins) => `${String(Math.floor(mins / 60)).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}`;

function scheduleMoment(gsap) {
  const sec = $('[data-schedule]');
  const list = sec && $('[data-day]', sec);
  const clock = sec && $('[data-clock]', sec);
  if (!list || !clock) return;
  const a = toMinutes(sec.dataset.start || '08:30');
  const b = toMinutes(sec.dataset.end || '13:30');
  const items = $$('[data-day-item]', list);
  const at = items.map((it, i) => (it.dataset.time ? (toMinutes(it.dataset.time) - a) / (b - a) : i / Math.max(1, items.length - 1)));
  list.classList.add('is-scrubbing');
  const state = { p: 0 };
  const render = () => {
    const mins = Math.round(lerp(a, b, state.p) / 5) * 5; // the display moves in 5-minute steps
    const text = asClock(mins);
    if (clock.textContent !== text) clock.textContent = text;
    list.style.setProperty('--fill', state.p.toFixed(3));
    items.forEach((it, i) => it.classList.toggle('is-lit', state.p >= at[i] - 0.001));
  };
  render();
  gsap.to(state, {
    p: 1,
    ease: 'none',
    onUpdate: render,
    scrollTrigger: { trigger: list, start: 'top 65%', end: 'bottom 75%', scrub: 0.4 },
  });
}

async function initScroll() {
  if (!SITE.scroll || !fxOn() || scrollCtx) return;
  try {
    await loadGsap();
  } catch {
    if (well) well.still();
    return; // the page simply stays still
  }
  if (!fxOn() || scrollCtx) return;
  const { gsap, ScrollTrigger } = window;
  scrollCtx = gsap.context(() => {
    howMoment(gsap);
    scheduleMoment(gsap);
  });
  ScrollTrigger.refresh();
  if (d.fonts) d.fonts.ready.then(() => ScrollTrigger.refresh());
}

function destroyScroll() {
  if (scrollCtx) {
    scrollCtx.revert();
    scrollCtx = null;
  }
  if (howSection) {
    howSection.classList.remove('is-pinned');
    $$('.step', howSection).forEach((s) => s.classList.remove('is-active'));
  }
  const list = $('[data-day]');
  if (list) {
    list.classList.remove('is-scrubbing');
    list.style.removeProperty('--fill');
    $$('[data-day-item]', list).forEach((i) => i.classList.remove('is-lit'));
    const sec = $('[data-schedule]');
    const clock = $('[data-clock]');
    if (sec && clock) clock.textContent = sec.dataset.start || '08:30';
  }
  window.ScrollTrigger?.refresh();
}
