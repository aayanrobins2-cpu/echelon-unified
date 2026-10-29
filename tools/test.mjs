// Browser checks for the Echelon site. Runs in your installed Google Chrome.
//
//   npm test            (or: node tools/test.mjs)
//
// Writes reports/TEST-REPORT.md, reports/test-results.json, reports/axe-*.json
// and screenshots in reports/screens/. Exits with code 1 if anything fails.
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { chromium } from 'playwright-core';

const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const reports = path.join(root, 'reports');
const screens = path.join(reports, 'screens');
fs.mkdirSync(screens, { recursive: true });
const AXE = require.resolve('axe-core/axe.min.js');
const PORT = 8790;
const BASE = `http://127.0.0.1:${PORT}/`;

/* ---------- tiny test harness ------------------------------------------------ */

const results = [];
let current = null;
function suite(name) { current = { name, checks: [] }; results.push(current); console.log(`\n${name}`); }
function check(label, pass, detail = '') {
  current.checks.push({ label, pass: Boolean(pass), detail: String(detail) });
  console.log(`  ${pass ? '✓' : '✗'} ${label}${detail ? `  (${detail})` : ''}`);
}

async function overflow(page) {
  return page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
}

async function runAxe(page, name) {
  await page.addScriptTag({ path: AXE });
  const res = await page.evaluate(() => window.axe.run(document, {
    runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'] },
    resultTypes: ['violations', 'incomplete'],
  }));
  const slim = {
    url: res.url,
    violations: res.violations.map((v) => ({ id: v.id, impact: v.impact, help: v.help, nodes: v.nodes.map((n) => ({ target: n.target, summary: n.failureSummary })) })),
    incomplete: res.incomplete.map((v) => ({ id: v.id, impact: v.impact, help: v.help, nodes: v.nodes.length })),
  };
  fs.writeFileSync(path.join(reports, `axe-${name}.json`), JSON.stringify(slim, null, 2));
  return slim;
}

// Real contrast for text that sits on top of the artwork, where axe can't tell
// what the background is. Hides all text, screenshots what is behind it, then
// compares each text colour against the brightest 10% of its background pixels.
async function contrastOverArt(page, selector) {
  const items = await page.evaluate((sel) => [...document.querySelectorAll(sel)]
    .filter((e) => {
      const r = e.getBoundingClientRect();
      return r.width > 0 && r.height > 0 && r.bottom > 0 && r.top < innerHeight && getComputedStyle(e).visibility !== 'hidden';
    })
    .map((e) => {
      const r = e.getBoundingClientRect();
      const cs = getComputedStyle(e);
      return { label: `${e.tagName.toLowerCase()}.${[...e.classList].join('.')} "${e.textContent.trim().replace(/\s+/g, ' ').slice(0, 28)}"`, x: r.x, y: r.y, w: r.width, h: r.height, color: cs.color, size: parseFloat(cs.fontSize), weight: Number(cs.fontWeight) };
    }), selector);
  // Placeholder chips are hidden too: they bring their own background (and their
  // own dark-on-yellow label), which would otherwise count as the text's background.
  const style = await page.addStyleTag({ content: '*, *::before, *::after { color: transparent !important; text-shadow: none !important; -webkit-text-stroke-color: transparent !important; } .grad, .hero__title, .hero__presenter { background: none !important; } .lens { display: none !important; } mark.ph { visibility: hidden !important; }' });
  await page.waitForTimeout(100);
  const shot = (await page.screenshot({ type: 'png' })).toString('base64');
  await style.evaluate((el) => el.remove());
  return page.evaluate(async ({ shot, items }) => {
    const img = new Image();
    img.src = `data:image/png;base64,${shot}`;
    await img.decode();
    const k = img.width / innerWidth;
    const cv = document.createElement('canvas');
    cv.width = img.width; cv.height = img.height;
    const ctx = cv.getContext('2d');
    ctx.drawImage(img, 0, 0);
    const lin = (c) => { c /= 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
    const lum = (r, g, b) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
    return items.map((it) => {
      const [r, g, b] = it.color.match(/\d+(\.\d+)?/g).map(Number);
      const x = Math.max(0, Math.floor(it.x * k)), y = Math.max(0, Math.floor(it.y * k));
      const w = Math.max(1, Math.min(cv.width - x, Math.floor(it.w * k))), h = Math.max(1, Math.min(cv.height - y, Math.floor(it.h * k)));
      const data = ctx.getImageData(x, y, w, h).data;
      const ls = [];
      for (let i = 0; i < data.length; i += 4) ls.push(lum(data[i], data[i + 1], data[i + 2]));
      ls.sort((a, b2) => a - b2);
      const bg = ls[Math.floor(ls.length * 0.9)];
      const ratio = (lum(r, g, b) + 0.05) / (bg + 0.05);
      const large = it.size >= 24 || (it.size >= 18.66 && it.weight >= 700);
      return { label: it.label, ratio: Math.round(ratio * 100) / 100, need: large ? 3 : 4.5 };
    });
  }, { shot, items });
}

// Text drawn with a gradient (the big title, the gold presenter line) is
// checked by its colour stops in DECISIONS.md instead; everything else here.
const ART_TEXT = '.hero__tagline, .hero__summary, .lcd__label, .lcd__status, .lcd__digits, .lcd__unit, .chip, .nav__list a, .brand__word, .nav__toggle, .scroll-hint';

// Total bytes the page has fetched so far (document + every resource).
async function bytesLoaded(page) {
  return page.evaluate(() => {
    const nav = performance.getEntriesByType('navigation')[0];
    const res = performance.getEntriesByType('resource');
    const size = (e) => e.transferSize || e.encodedBodySize || 0;
    const list = res.map((e) => ({ name: e.name.replace(location.origin + '/', ''), bytes: size(e) }));
    return { total: size(nav) + list.reduce((s, e) => s + e.bytes, 0), files: list.length + 1, list };
  });
}

// Records when the intro first appears / is removed, before any page script runs.
const INIT = () => {
  window.__probe = { skipVisibleAt: null, introGoneAt: null, maxProgress: 0 };
  const watch = () => {
    const skip = document.querySelector('[data-skip-intro]');
    if (skip && window.__probe.skipVisibleAt === null) {
      requestAnimationFrame(() => {
        const r = skip.getBoundingClientRect();
        const cs = getComputedStyle(skip);
        if (r.width > 0 && cs.visibility === 'visible' && cs.display !== 'none') window.__probe.skipVisibleAt = performance.now();
      });
    }
    const intro = document.getElementById('intro');
    if (window.__probe.sawIntro && !intro && window.__probe.introGoneAt === null) window.__probe.introGoneAt = performance.now();
    if (intro) window.__probe.sawIntro = true;
    const fill = document.querySelector('[data-intro-fill]');
    if (fill) window.__probe.maxProgress = Math.max(window.__probe.maxProgress, Math.round((parseFloat(fill.style.getPropertyValue('--p')) || 0) * 100));
  };
  new MutationObserver(watch).observe(document, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ['style', 'class'] });
};

/* ---------- server + browser ------------------------------------------------------ */

const server = spawn(process.execPath, [path.join(root, 'tools', 'serve.mjs'), root, String(PORT)], { stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 600));
// CHROME_PATH runs the tests in another Chrome or Chromium, e.g. where Google Chrome isn't installed.
const browser = await chromium.launch(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH, headless: true } : { channel: 'chrome', headless: true });

const errors = [];
function watchErrors(page, label) {
  page.on('pageerror', (e) => errors.push(`${label}: ${e.message}`));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(`${label}: ${m.text()}`); });
}

try {
  /* 1. JavaScript disabled ----------------------------------------------------------- */
  suite('1. JavaScript turned off (375 px)');
  {
    const ctx = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 375, height: 812 } });
    const page = await ctx.newPage();
    await page.goto(BASE, { waitUntil: 'load' });
    check('main heading renders', (await page.getByRole('heading', { level: 1, name: 'Echelon' }).count()) === 1);
    check('intro is not shown', !(await page.locator('#intro').isVisible()));
    const eventCount = JSON.parse(fs.readFileSync(path.join(root, 'content.json'), 'utf8')).events.items.length;
    check(`all ${eventCount} event cards render`, (await page.locator('.ev').count()) === eventCount);
    const summary = page.locator('.ev__details summary').first();
    check('rules use <details> (no JS needed)', await summary.isVisible());
    await summary.click();
    check('rules open in place', await page.locator('.ev__details').first().locator('.how-list').isVisible());
    check('8 FAQ questions render', (await page.locator('.qa').count()) === 8);
    await page.locator('.qa summary').first().click();
    await page.waitForTimeout(450); // the answer slides open
    check('FAQ answer opens', await page.locator('.qa__a').first().isVisible());
    check('nav links are reachable', (await page.locator('.nav__list a').count()) === 5 && (await page.locator('.nav__list a').first().isVisible()));
    check('countdown falls back to the date text', await page.locator('[data-cd-status]').isVisible());
    check('"How it works" shows the still illustration', await page.locator('.how__still').isVisible());
    check('the hero shows the still orb', await page.locator('.hero__poster').isVisible());
    check('no sideways scrolling', (await overflow(page)) <= 0, `${await overflow(page)}px`);
    await page.screenshot({ path: path.join(screens, 'nojs-375.png'), fullPage: true });
    await ctx.close();
  }

  /* 2. Reduced motion ------------------------------------------------------------------- */
  suite('2. prefers-reduced-motion: reduce (375 px and 1440 px)');
  for (const vp of [{ width: 375, height: 812 }, { width: 1440, height: 900 }]) {
    const ctx = await browser.newContext({ reducedMotion: 'reduce', viewport: vp });
    const page = await ctx.newPage();
    watchErrors(page, `reduced-${vp.width}`);
    await page.addInitScript(INIT);
    await page.goto(BASE, { waitUntil: 'load' });
    await page.waitForTimeout(800);
    const s = await page.evaluate(() => ({
      fxOff: document.documentElement.classList.contains('fx-off'),
      intro: !!document.getElementById('intro') && getComputedStyle(document.getElementById('intro')).display !== 'none',
      gsap: typeof window.gsap !== 'undefined',
      cursor: !!document.querySelector('.lens'),
      pinned: document.querySelector('#how').classList.contains('is-pinned'),
      marquee: getComputedStyle(document.querySelector('.marquee')).animationName,
      shimmer: getComputedStyle(document.querySelector('.hero__presenter')).animationName,
    }));
    check(`[${vp.width}] effects start switched off`, s.fxOff);
    check(`[${vp.width}] no intro`, !s.intro);
    check(`[${vp.width}] scroll library not even downloaded`, !s.gsap);
    check(`[${vp.width}] no custom cursor`, !s.cursor);
    check(`[${vp.width}] "How it works" is not pinned or scrubbed`, !s.pinned);
    check(`[${vp.width}] event marquee stands still`, s.marquee === 'none', s.marquee);
    check(`[${vp.width}] no shimmer on the gold line`, s.shimmer === 'none', s.shimmer);
    check(`[${vp.width}] no sideways scrolling`, (await overflow(page)) <= 0);
    if (vp.width === 375) {
      const axe = await runAxe(page, 'reduced-motion-375');
      check('[375] axe: no violations with reduced motion', axe.violations.length === 0, axe.violations.map((v) => `${v.id}(${v.nodes.length})`).join(', '));
    }
    await page.screenshot({ path: path.join(screens, `reduced-${vp.width}.png`) });
    await ctx.close();
  }

  /* 3. Phone with touch (375 px) ----------------------------------------------------------- */
  suite('3. Phone, touch screen, effects on (375 px)');
  {
    const ctx = await browser.newContext({ viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
    const page = await ctx.newPage();
    watchErrors(page, 'mobile');
    await page.addInitScript(INIT);
    await page.goto(BASE, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => window.__probe.skipVisibleAt !== null, null, { timeout: 3000 }).catch(() => {});
    const probe = await page.evaluate(() => window.__probe);
    check('intro shows with a Skip button from the first frame', probe.skipVisibleAt !== null, probe.skipVisibleAt ? `skip visible at ${Math.round(probe.skipVisibleAt)} ms` : 'never');
    await page.screenshot({ path: path.join(screens, 'mobile-intro.png') });
    await page.locator('[data-skip-intro]').tap();
    await page.waitForSelector('#intro', { state: 'detached', timeout: 2000 });
    check('Skip removes the intro', true);
    await page.reload({ waitUntil: 'domcontentloaded' });
    check('the intro plays again on every refresh', await page.evaluate(() => document.documentElement.classList.contains('intro-on')));
    await page.locator('[data-skip-intro]').tap();
    const skippedAgain = await page.waitForSelector('#intro', { state: 'detached', timeout: 2000 }).then(() => true).catch(() => false);
    check('Skip works again after a refresh', skippedAgain);
    await page.waitForLoadState('load');
    await page.waitForTimeout(600);
    check('no custom cursor on touch screens', !(await page.locator('.lens').count()));
    check('no sideways scrolling', (await overflow(page)) <= 0, `${await overflow(page)}px`);
    const weight = await bytesLoaded(page);
    check('page weight at load under 3 MB', weight.total < 3 * 1024 * 1024, `${(weight.total / 1024).toFixed(0)} KB in ${weight.files} files`);
    fs.writeFileSync(path.join(reports, 'weight-mobile.json'), JSON.stringify(weight, null, 2));
    check('"How it works" is pinned for scrubbing', await page.evaluate(() => document.querySelector('#how').classList.contains('is-pinned')));
    await page.screenshot({ path: path.join(screens, 'mobile-hero.png') });
    for (const y of [0, 520]) {
      await page.evaluate((top) => window.scrollTo({ top, behavior: 'instant' }), y);
      await page.waitForTimeout(500);
      const cr = await contrastOverArt(page, ART_TEXT);
      const low = cr.filter((c) => c.ratio < c.need);
      const min = cr.reduce((m, c) => (c.ratio < m.ratio ? c : m), { ratio: 99 });
      check(`text over the hero art meets WCAG AA (375 px, scrolled ${y}px)`, low.length === 0, low.length ? low.map((c) => `${c.label} ${c.ratio}:1`).join('; ') : `${cr.length} text blocks, lowest ${min.ratio}:1 (${min.label})`);
    }
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
    // menu
    await page.getByRole('button', { name: 'Menu' }).tap();
    check('menu opens', (await page.locator('.nav__toggle').getAttribute('aria-expanded')) === 'true' && (await page.locator('.nav__list a').first().isVisible()));
    await page.screenshot({ path: path.join(screens, 'mobile-menu.png') });
    await page.locator('.nav__list a', { hasText: 'Events' }).tap();
    await page.waitForTimeout(900);
    check('tapping a menu link closes the menu', (await page.locator('.nav__toggle').getAttribute('aria-expanded')) === 'false');
    // scroll through for frames + lazy weight
    const H = await page.evaluate(() => document.documentElement.scrollHeight);
    for (let y = 0; y < H; y += 700) {
      await page.evaluate((top) => window.scrollTo({ top, behavior: 'instant' }), y);
      await page.waitForTimeout(120);
    }
    await page.waitForTimeout(800);
    const how = await page.evaluate(() => { const s = document.querySelector('#how'); return s.getBoundingClientRect().top + scrollY + s.offsetHeight * 0.5; });
    await page.evaluate((top) => window.scrollTo({ top, behavior: 'instant' }), how);
    await page.waitForTimeout(700);
    check('a frame is drawn while scrolling the pinned section', await page.evaluate(() => document.querySelector('#how').classList.contains('is-live')));
    await page.screenshot({ path: path.join(screens, 'mobile-how.png') });
    const after = await bytesLoaded(page);
    check('page weight after scrolling everything', after.total < 3 * 1024 * 1024, `${(after.total / 1024).toFixed(0)} KB in ${after.files} files`);
    const axe = await runAxe(page, 'mobile-375');
    check('axe: no violations (375 px)', axe.violations.length === 0, axe.violations.map((v) => `${v.id}(${v.nodes.length})`).join(', '));
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
    await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(screens, 'mobile-full.png'), fullPage: true });
    await ctx.close();
  }

  /* 4. Desktop, keyboard, cursor, dialog ------------------------------------------------------ */
  suite('4. Desktop with mouse and keyboard (1440 px)');
  {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await ctx.newPage();
    watchErrors(page, 'desktop');
    await page.addInitScript(INIT);
    await page.goto(BASE, { waitUntil: 'domcontentloaded' });
    // About 14 s, plus about 6 s for the campus photos (assets/intro/campus-photos.json) or
    // 4 s for the Earth Studio clip (assets/intro/campus.json).
    const has = (f) => fs.existsSync(path.join(root, 'assets', 'intro', f));
    const extra = has('campus-photos.json') ? 6 : has('campus.json') ? 4 : 0;
    await page.waitForSelector('#intro', { state: 'detached', timeout: (22 + extra) * 1000 });
    const probe = await page.evaluate(() => window.__probe);
    check(`intro finishes by itself in about ${14 + extra} s`, probe.introGoneAt !== null && probe.introGoneAt <= (17 + extra) * 1000, `${Math.round(probe.introGoneAt)} ms after navigation`);
    check('intro progress reached 100%', probe.maxProgress === 100, `${probe.maxProgress}%`);
    await page.waitForLoadState('load');
    await page.waitForTimeout(500);

    // custom cursor
    await page.mouse.move(700, 450);
    await page.mouse.move(720, 460);
    check('glass cursor appears with a mouse', await page.evaluate(() => !!document.querySelector('.lens.is-visible') && document.documentElement.classList.contains('has-lens')));
    // Sweep fast across empty space and measure the gap after each frame: the
    // lens must sit on the pointer, not trail behind it.
    await page.mouse.move(700, 870);
    await page.evaluate(() => {
      window.__gaps = [];
      let ptr = { x: 700, y: 870 };
      document.addEventListener('pointermove', (e) => { ptr = { x: e.clientX, y: e.clientY }; }, { passive: true });
      const tick = () => requestAnimationFrame(() => setTimeout(() => {
        const l = document.querySelector('.lens');
        if (window.__gapsDone || !l) return;
        const m = l.style.transform.match(/translate3d\(([-\d.]+)px, ([-\d.]+)px/);
        if (m) window.__gaps.push(Math.hypot(+m[1] + parseFloat(l.style.width) / 2 - ptr.x, +m[2] + parseFloat(l.style.height) / 2 - ptr.y));
        tick();
      }, 0));
      tick();
    });
    for (let x = 700; x < 1300; x += 30) { await page.mouse.move(x, 870); await page.waitForTimeout(16); }
    const gaps = (await page.evaluate(() => { window.__gapsDone = true; return window.__gaps; })).slice(4);
    const maxGap = Math.max(...gaps);
    check('the lens stays on the pointer while moving fast', gaps.length > 10 && maxGap < 1, `largest gap ${maxGap.toFixed(1)} px over ${gaps.length} frames`);
    const reg = await page.locator('.hero__actions .btn--white').boundingBox();
    await page.mouse.move(reg.x + reg.width / 2, reg.y + reg.height / 2);
    await page.waitForTimeout(600);
    const morph = await page.evaluate(() => { const l = document.querySelector('.lens'); return { target: l.classList.contains('is-target'), w: parseFloat(l.style.width) }; });
    check('the lens flows into the shape of a button', morph.target && morph.w > reg.width, `lens ${Math.round(morph.w)}px wide over a ${Math.round(reg.width)}px button`);
    await page.evaluate(() => document.documentElement.dispatchEvent(new PointerEvent('pointerleave')));
    check('native cursor comes back when the pointer leaves', await page.evaluate(() => !document.documentElement.classList.contains('has-lens')));

    // keyboard: skip link
    await page.evaluate(() => { window.scrollTo({ top: 0, behavior: 'instant' }); document.activeElement?.blur(); });
    await page.keyboard.press('Tab');
    const first = await page.evaluate(() => ({ text: document.activeElement.textContent.trim(), outline: getComputedStyle(document.activeElement).outlineStyle }));
    check('first Tab lands on "Skip to content"', first.text === 'Skip to content', first.text);
    check('focus is visible', first.outline !== 'none', first.outline);
    await page.keyboard.press('Enter');
    check('skip link moves focus to the main content', await page.evaluate(() => document.activeElement.id === 'main'));

    // every focusable element shows a visible focus style
    const focusReport = await page.evaluate(() => {
      const els = [...document.querySelectorAll('#app a[href], #app button:not([hidden]), #app summary')].filter((e) => e.offsetParent !== null);
      const bad = [];
      for (const el of els) {
        el.focus({ preventScroll: true });
        if (document.activeElement !== el) continue;
        const cs = getComputedStyle(el);
        if (cs.outlineStyle === 'none' || parseFloat(cs.outlineWidth) === 0) bad.push(el.outerHTML.slice(0, 80));
      }
      return { total: els.length, bad };
    });
    check('every link and button shows a focus outline', focusReport.bad.length === 0, `${focusReport.total} checked${focusReport.bad.length ? ', missing: ' + focusReport.bad.join(' | ') : ''}`);

    // dialog by keyboard
    const opener = page.locator('[data-open-event]').first();
    await opener.focus();
    await page.keyboard.press('Enter');
    await page.waitForTimeout(450);
    const dlg = await page.evaluate(() => ({ open: document.querySelector('#event-dialog').open, focus: document.activeElement.id, title: document.querySelector('#event-dialog-title').textContent }));
    check('Enter on "View rules" opens the rules dialog', dlg.open, dlg.title);
    check('focus moves to the dialog title', dlg.focus === 'event-dialog-title');
    let trapped = true;
    for (let i = 0; i < 8; i++) {
      await page.keyboard.press('Tab');
      trapped = trapped && (await page.evaluate(() => !!document.activeElement.closest('dialog[open]') || document.activeElement === document.body));
    }
    check('Tab stays inside the open dialog', trapped);
    await page.screenshot({ path: path.join(screens, 'desktop-dialog.png') });
    const axeDlg = await runAxe(page, 'desktop-dialog-open');
    check('axe: no violations with the dialog open', axeDlg.violations.length === 0, axeDlg.violations.map((v) => `${v.id}(${v.nodes.length})`).join(', '));
    await page.keyboard.press('Escape');
    await page.waitForTimeout(200);
    const closed = await page.evaluate(() => ({ open: document.querySelector('#event-dialog').open, back: document.activeElement.matches('[data-open-event]') }));
    check('Esc closes the dialog', !closed.open);
    check('focus returns to the button that opened it', closed.back);

    // FAQ by keyboard
    await page.locator('.qa summary').first().focus();
    await page.keyboard.press('Enter');
    check('FAQ opens with the keyboard', await page.evaluate(() => document.querySelector('.qa').open));

    // there's no Effects switch: motion follows the device's "reduce motion" setting only
    const fx = await page.evaluate(() => ({ button: !!document.querySelector('[data-fx-toggle]'), fxOff: document.documentElement.classList.contains('fx-off') }));
    check('no Effects switch, and effects are on', !fx.button && !fx.fxOff, JSON.stringify(fx));
    const acro = await page.evaluate(() => [...document.querySelectorAll('.acrostic__word')].map((w) => w.textContent));
    check('"Every letter stands for something" lists a word for each letter of ECHELON', acro.map((w) => w[0]).join('') === 'ECHELON', acro.join(', '));

    const weight = await bytesLoaded(page);
    check('desktop page weight at load under 3 MB', weight.total < 3 * 1024 * 1024, `${(weight.total / 1024).toFixed(0)} KB in ${weight.files} files`);
    fs.writeFileSync(path.join(reports, 'weight-desktop.json'), JSON.stringify(weight, null, 2));

    await page.evaluate(() => { window.scrollTo({ top: 0, behavior: 'instant' }); document.querySelector('.qa').open = false; });
    await page.mouse.move(1, 1);
    await page.waitForTimeout(500);
    for (const vp of [{ width: 1440, height: 900 }, { width: 1024, height: 768 }]) {
      await page.setViewportSize(vp);
      await page.waitForTimeout(400);
      const cr = await contrastOverArt(page, ART_TEXT);
      const low = cr.filter((c) => c.ratio < c.need);
      const min = cr.reduce((m, c) => (c.ratio < m.ratio ? c : m), { ratio: 99 });
      check(`text over the hero art meets WCAG AA (${vp.width} px)`, low.length === 0, low.length ? low.map((c) => `${c.label} ${c.ratio}:1`).join('; ') : `${cr.length} text blocks, lowest ${min.ratio}:1 (${min.label})`);
    }
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.waitForTimeout(300);
    const axe = await runAxe(page, 'desktop-1440');
    check('axe: no violations (1440 px)', axe.violations.length === 0, axe.violations.map((v) => `${v.id}(${v.nodes.length})`).join(', '));
    await page.screenshot({ path: path.join(screens, 'desktop-hero.png') });
    await ctx.close();
  }

  /* 5. Countdown preview ------------------------------------------------------------------------- */
  suite('5. Countdown');
  {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, reducedMotion: 'reduce' });
    const page = await ctx.newPage();
    watchErrors(page, 'countdown');
    const future = new Date(Date.now() + 3 * 864e5 + 5 * 36e5).toISOString();
    await page.goto(`${BASE}?date=${encodeURIComponent(future)}`, { waitUntil: 'load' });
    const a = await page.evaluate(() => [...document.querySelectorAll('[data-cd]')].map((n) => n.textContent).join(':'));
    await page.waitForTimeout(1300);
    const b = await page.evaluate(() => [...document.querySelectorAll('[data-cd]')].map((n) => n.textContent).join(':'));
    check('counts down to a set date', !a.includes('--') && a.startsWith('03:'), a);
    check('ticks every second', a !== b, `${a} -> ${b}`);
    await page.goto(`${BASE}?date=${encodeURIComponent(new Date(Date.now() - 60000).toISOString())}`, { waitUntil: 'load' });
    check('shows the "happening now" message once the date has passed', await page.evaluate(() => document.querySelector('[data-countdown]').classList.contains('is-live')));
    // Without ?date= the page uses content.json, so check whichever state it's in.
    await page.goto(BASE, { waitUntil: 'load' });
    const eventDate = JSON.parse(fs.readFileSync(path.join(root, 'content.json'), 'utf8')).event.date;
    const status = await page.locator('[data-cd-status]').innerText();
    if (!eventDate) {
      check('without a date it says "to be announced"', status.includes('to be announced'), status);
    } else if (Date.parse(eventDate) > Date.now()) {
      const digits = await page.evaluate(() => [...document.querySelectorAll('[data-cd]')].map((n) => n.textContent).join(':'));
      check('counts down to the date in content.json', !digits.includes('--') && status.includes('starts on'), `${digits} · ${status}`);
    } else {
      check('says "happening now" once the content.json date has passed', await page.evaluate(() => document.querySelector('[data-countdown]').classList.contains('is-live')), status);
    }
    await ctx.close();
  }

  /* 6. The on/off switches in content.json "settings" ---------------------------------------- */
  // build.js turns each setting into a data- attribute on <html>; here the HTML is
  // edited on the way into the browser, which is the same as rebuilding with false.
  suite('6. Settings switches (content.json "settings")');
  async function withSetting(attr, fn) {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const page = await ctx.newPage();
    watchErrors(page, `setting-${attr}`);
    await page.route(BASE, async (route) => {
      const res = await route.fetch();
      const body = (await res.text()).replace(`data-${attr}="on"`, `data-${attr}="off"`);
      await route.fulfill({ response: res, body });
    });
    await page.goto(BASE, { waitUntil: 'load' });
    await page.waitForTimeout(1200);
    await page.mouse.move(600, 400);
    await page.mouse.move(620, 410);
    await fn(page);
    await ctx.close();
  }
  await withSetting('intro', async (page) => {
    check('"intro": false → no intro on a first visit', !(await page.evaluate(() => document.documentElement.classList.contains('intro-on'))) && !(await page.locator('#intro').count()));
  });
  await withSetting('fx', async (page) => {
    const s = await page.evaluate(() => ({ off: document.documentElement.classList.contains('fx-off'), gsap: typeof window.gsap !== 'undefined', cursor: !!document.querySelector('.lens') }));
    check('"effects": false → everything off', s.off && !s.gsap && !s.cursor, JSON.stringify(s));
  });
  {
    // A visitor who turned effects off with the old Effects switch gets them back: the
    // saved choice is ignored and cleared, since there's no switch left to undo it.
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const page = await ctx.newPage();
    watchErrors(page, 'old-fx-choice');
    await page.addInitScript(() => { try { localStorage.setItem('echelon-fx', 'off'); } catch (e) {} });
    await page.goto(BASE, { waitUntil: 'load' });
    const s = await page.evaluate(() => ({ off: document.documentElement.classList.contains('fx-off'), stored: localStorage.getItem('echelon-fx') }));
    check('an old saved "effects off" choice is ignored and cleared', !s.off && s.stored === null, JSON.stringify(s));
    await ctx.close();
  }
  await withSetting('scroll', async (page) => {
    const s = await page.evaluate(() => ({ gsap: typeof window.gsap !== 'undefined', pinned: document.querySelector('#how').classList.contains('is-pinned'), cursor: !!document.querySelector('.lens') }));
    check('"scrollAnimations": false → no scroll moments, other effects stay', !s.gsap && !s.pinned && s.cursor, JSON.stringify(s));
  });
  await withSetting('cursor', async (page) => {
    const s = await page.evaluate(() => ({ cursor: !!document.querySelector('.lens'), hidden: document.documentElement.classList.contains('has-lens') }));
    check('"customCursor": false → normal cursor', !s.cursor && !s.hidden, JSON.stringify(s));
  });

  suite('7. Console');
  check('no JavaScript errors in any run', errors.length === 0, errors.slice(0, 5).join(' | '));
} finally {
  await browser.close();
  server.kill();
}

/* ---------- report ----------------------------------------------------------------- */

const all = results.flatMap((s) => s.checks);
const failed = all.filter((c) => !c.pass);
const md = [
  '# Browser test report',
  '',
  `Run: ${new Date().toISOString()} · Chrome (installed) via playwright-core · \`npm test\``,
  '',
  `**${all.length - failed.length} of ${all.length} checks passed.**`,
  '',
  ...results.flatMap((s) => [
    `## ${s.name}`,
    '',
    '| | Check | Detail |',
    '|---|---|---|',
    ...s.checks.map((c) => `| ${c.pass ? '✅' : '❌'} | ${c.label} | ${c.detail.replace(/\|/g, '\\|')} |`),
    '',
  ]),
  'Screenshots are in `reports/screens/`. Full axe results are in `reports/axe-*.json`.',
  '',
].join('\n');
fs.writeFileSync(path.join(reports, 'TEST-REPORT.md'), md);
fs.writeFileSync(path.join(reports, 'test-results.json'), JSON.stringify(results, null, 2));
console.log(`\n${all.length - failed.length}/${all.length} checks passed. Report: reports/TEST-REPORT.md`);
process.exit(failed.length ? 1 : 0);
