/* 20 · intro ---------------------------------------------------------------
 * About fourteen seconds, on every page load, never with reduced motion:
 *   0 s     the Earth from space; the camera falls through real satellite
 *           images: India, South India, Bengaluru, then the streets around
 *           the school (15-journey.js), turning to face the way the
 *           school's drone photos face; then a dive into the straight-down
 *           photo of the campus and a cross-fade to the angled hero shot,
 *           under the caption (everything after this moves about 5 s later)
 *   7.6 s   the streets fade into the dark under
 *           "Bangalore International School presents"
 *   9 s     a spark bursts into a spiral galaxy of particles
 *  10.2 s   the particles form the word "Echelon"
 *  11.6 s   the tagline
 *  12.6 s   the word collapses into the Earth-coloured orb, which glides
 *           into the hero while the black veil lifts.
 * The bar at the bottom shows real loading (the satellite images, fonts, the
 * word layout, the page); the word only forms once those are in, with a 4.5 s
 * cap. If the images are slow the camera waits for them, for 4 s at most.
 * Skip intro (or Esc) jumps straight to the end.
 */

async function runIntro(orbReady) {
  let orb = null;
  const el = $('#intro');
  if (!el || !html.classList.contains('intro-on')) {
    if (el) el.remove();
    return;
  }
  clearTimeout(window.__echelonFailsafe);

  const app = $('#app');
  app.inert = true;
  html.classList.add('hero-enter');
  const caption = $('.intro__caption', el);
  const word = $('.intro__word', el);
  const tagline = $('.intro__tagline', el);
  const fill = $('[data-intro-fill]', el);
  const token = { cancelled: false };
  const showCaption = () => { show(caption); typePresenter(caption, 1000, token); };
  let finished = false;
  const journey = createJourney($('.intro__map', el));

  const tasks = [
    journey ? journey.ready : null,
    d.fonts ? d.fonts.load('500 1em "Cabinet Grotesk"') : null,
    d.fonts ? d.fonts.load('400 1em Satoshi') : null,
    d.fonts ? d.fonts.load('700 1em DSEG7') : null,
    orbReady ? orbReady.then((o) => o && o.textReady) : null,
    pageLoaded,
  ].map((p) => Promise.resolve(p).catch(() => {}));
  let done = 0;
  tasks.forEach((p) => p.then(() => { done += 1; fill.style.setProperty('--p', (done / tasks.length).toFixed(3)); }));
  const started = performance.now();
  const ready = Promise.race([Promise.all(tasks), new Promise((r) => setTimeout(r, Math.max(0, 4500 - (performance.now() - started))))]);

  const show = (n) => { n.classList.remove('is-gone'); n.classList.add('is-show'); };
  const hide = (n) => { n.classList.remove('is-show'); n.classList.add('is-gone'); };

  const cleanup = () => {
    if (journey) journey.dispose();
    html.classList.remove('intro-on', 'intro-orb', 'hero-enter', 'hero-entering');
    el.remove();
  };
  const reveal = () => {
    app.inert = false;
    if (!html.classList.contains('hero-entering')) typePresenter($('.hero__presenter'));
    el.classList.add('is-revealing');
    html.classList.add('hero-entering');
  };
  const finish = (skipped) => {
    if (finished) return;
    finished = true;
    if (orb) Object.assign(orb.state, { burst: 1, morph: 1, sphere: 1, intro: 0 });
    html.classList.add('intro-orb');
    reveal();
    setTimeout(cleanup, skipped ? 700 : 300);
  };
  const skip = () => { token.cancelled = true; token.onCancel?.(); finish(true); };
  $('[data-skip-intro]', el).addEventListener('click', skip);
  d.addEventListener('keydown', function onKey(e) {
    if (e.key === 'Escape') { d.removeEventListener('keydown', onKey); skip(); }
  });

  // The fall from space. If even the first image can't load, the intro starts at the caption.
  const place = $('.intro__place', el);
  const names = (place.dataset.places || '').split('|');
  let want = '';
  const flew = journey && await journey.play(token, (i) => {
    want = i;
    place.classList.remove('is-show');
    if (i === '') return;
    setTimeout(() => { if (want === i) { place.textContent = names[i] || ''; place.classList.add('is-show'); } }, 250);
  });
  want = '';
  if (token.cancelled) return;
  if (flew) {
    place.classList.remove('is-show');
    // The campus: the school's aerial photos (the caption comes in over the last one), or the
    // Earth Studio clip if that's there instead.
    const campus = await journey.playCampus(token, showCaption);
    if (token.cancelled) return;
    if (!campus) {
      await journey.playClip(token);
      if (token.cancelled) return;
      showCaption();
    }
    await journey.fadeOut(token);
    if (token.cancelled) return;
    await wait(300, token);
  } else {
    await wait(250, token);
    if (token.cancelled) return;
    showCaption();
    await wait(1400, token);
  }
  if (token.cancelled) return;
  hide(caption);

  // The particles take over if the orb is ready by now; otherwise the text-only version plays.
  if (orbReady) orb = await Promise.race([orbReady, new Promise((r) => setTimeout(() => r(null), 900))]);
  if (token.cancelled) return;
  if (orb) {
    Object.assign(orb.state, { burst: 0, morph: 0, sphere: 0, intro: 1, alpha: 1 });
    orb.resetClock();
    orb.start();
    html.classList.add('intro-orb'); // the orb has been hidden until now (see .intro-on .orb-canvas)
  }

  if (orb) {
    await tween(1200, (v) => { orb.state.burst = v; }, ease.outCubic, token);
    if (token.cancelled) return;
    await ready;
    if (token.cancelled) return;
    await tween(1400, (v) => { orb.state.morph = v; }, ease.inOutCubic, token);
  } else {
    await ready;
    if (token.cancelled) return;
    show(word);
    await wait(1400, token);
  }
  if (token.cancelled) return;
  show(tagline);
  await wait(1000, token);
  if (token.cancelled) return;
  hide(tagline);
  if (!orb) hide(word);

  reveal();
  if (orb) {
    await tween(1300, (v) => { orb.state.sphere = v; orb.state.intro = 1 - v; }, ease.inOutCubic, token);
  } else {
    await wait(900, token);
  }
  finish(false);
}
