/* 99 · start ------------------------------------------------------------------------------- */

$$('[data-year]').forEach((el) => { el.textContent = String(new Date().getFullYear()); });

const orbCanvas = $('.orb-canvas');
const orbSlot = $('[data-orb-slot]');
let orbReady = null;
const makeOrb = () => {
  if (!orbReady && orbCanvas && orbSlot) orbReady = createOrb(orbCanvas, orbSlot).then((o) => { orb = o; return o; });
  return orbReady || Promise.resolve(null);
};
const wakeOrb = (o) => {
  if (!o) return;
  if (fxOn()) o.start();
  else o.still(); // reduced motion / effects off: one still frame
};

if (html.classList.contains('intro-on')) {
  // The intro wants the orb straight away; it carries on into the hero afterwards.
  const ready = makeOrb();
  runIntro(ready).then(() => ready.then(wakeOrb));
} else {
  runIntro(null); // just removes the intro markup
  pageLoaded.then(makeOrb).then(wakeOrb);
}

initHeader();
initDialog();
initCountdown();
initOdometer();
initMotionPreference();
initLens();

pageLoaded.then(() => {
  well = howSection ? createWell(howSection) : null;
  dots = createDots($('.register__dots'));
  if (fxOn() && SITE.scroll) {
    initScroll();
  } else if (well) {
    well.still();
  }
  if (dots) {
    if (fxOn()) dots.play();
    else dots.still();
  }
});
