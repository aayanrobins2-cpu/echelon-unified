/* 00 · core helpers --------------------------------------------------------
 * Shared by every module below. build.js joins src/js/*.js in order, inside
 * one function, so everything here is private to the page script.
 */
'use strict';

const d = document;
const html = d.documentElement;
const $ = (sel, root = d) => root.querySelector(sel);
const $$ = (sel, root = d) => Array.from(root.querySelectorAll(sel));
const media = (q) => window.matchMedia(q);

const SITE = {
  effects: html.dataset.fx !== 'off',
  cursor: html.dataset.cursor !== 'off',
  scroll: html.dataset.scroll !== 'off',
};
const VENDOR = 'js/vendor/';
const GSAP_VERSION = '3.15.0';

const storage = (kind) => ({
  get(key) { try { return window[kind].getItem(key); } catch { return null; } },
  set(key, value) { try { window[kind].setItem(key, value); } catch { /* private mode */ } },
});
const local = storage('localStorage');

const fxOn = () => !html.classList.contains('fx-off');
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;
const seg = (x, a, b) => clamp((x - a) / (b - a));
const ease = {
  outCubic: (t) => 1 - Math.pow(1 - t, 3),
  inOutCubic: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  outExpo: (t) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t)),
  inOutSine: (t) => -(Math.cos(Math.PI * t) - 1) / 2,
};

const finePointer = () => media('(hover: hover) and (pointer: fine)').matches;
const isSmallScreen = () => media('(max-width: 55.99rem)').matches;
const lowPower = () => (navigator.deviceMemory && navigator.deviceMemory <= 4) || (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4);
const isChromium = () => Boolean(navigator.userAgentData && navigator.userAgentData.brands.some((b) => /Chromium/.test(b.brand)));

// The three canvases; created in 99-start.js, used by the Effects switch.
let orb = null;
let well = null;
let dots = null;

const pageLoaded = new Promise((resolve) => {
  if (d.readyState === 'complete') resolve();
  else window.addEventListener('load', resolve, { once: true });
});

// requestAnimationFrame-based tween. Resolves when finished; `token.cancelled`
// stops it early (used by "Skip intro").
function tween(duration, onUpdate, easing = ease.inOutCubic, token = {}) {
  return new Promise((resolve) => {
    const start = performance.now();
    const step = (now) => {
      if (token.cancelled) { resolve(); return; }
      const t = clamp((now - start) / duration);
      onUpdate(easing(t), t);
      if (t < 1) requestAnimationFrame(step);
      else resolve();
    };
    requestAnimationFrame(step);
  });
}
const wait = (ms, token = {}) => new Promise((resolve) => {
  const id = setTimeout(resolve, ms);
  token.onCancel = () => { clearTimeout(id); resolve(); };
});
