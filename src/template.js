// Renders index.html from content.json. Called by build.js.
//
// The logo (the arched ECHELON and the circuit-tree emblem) is drawn in logo.js.
//
// Everything visible on the page passes through txt() or plain(), which escape
// HTML and turn "[PLACEHOLDER: hint]" into a highlighted <mark class="ph">.

import { arch, emblem } from './logo.js';

const PH_RE = /\[PLACEHOLDER(?::\s*([^\]]*))?\]/g;

export function esc(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function hasPlaceholder(value) {
  return typeof value === 'string' && /\[PLACEHOLDER/.test(value);
}

// Visible text: escaped, placeholders highlighted.
function txt(value) {
  const s = String(value ?? '');
  let out = '';
  let last = 0;
  for (const m of s.matchAll(PH_RE)) {
    out += esc(s.slice(last, m.index));
    const hint = (m[1] || 'to be confirmed').trim();
    out += `<mark class="ph" title="Placeholder: update content.json"><span class="ph__tag">Placeholder</span> ${esc(hint)}</mark>`;
    last = m.index + m[0].length;
  }
  return out + esc(s.slice(last));
}

// Attribute / metadata text: placeholders become "to be confirmed".
function plain(value) {
  return esc(String(value ?? '').replace(PH_RE, 'to be confirmed'));
}

// Wraps the trailing `highlight` part of `text` in the brand gradient.
function highlight(text, part) {
  const s = String(text ?? '');
  if (part && s.endsWith(part)) {
    return `${txt(s.slice(0, s.length - part.length))}<span class="grad">${txt(part)}</span>`;
  }
  return txt(s);
}

const isUrl = (u) => typeof u === 'string' && /^https?:\/\/[^\s]+$/i.test(u) && !hasPlaceholder(u);
const isEmail = (e) => typeof e === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e) && !hasPlaceholder(e);

function formatDate(iso) {
  const d = new Date(iso);
  const date = d.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Kolkata' });
  const time = d.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Kolkata' });
  return { date, time };
}

const icon = (name, cls = 'icon') => `<svg class="${cls}" aria-hidden="true" focusable="false"><use href="#i-${name}"/></svg>`;

/* ---------- sprite: emblem + line icons ------------------------------------- */

const sprite = `
<svg class="sprite" width="0" height="0" aria-hidden="true" focusable="false">
  <symbol id="emblem" viewBox="0 0 64 64">${emblem({ id: 'emblem', weight: 3 })}</symbol>
  <g fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
    <symbol id="i-key" viewBox="0 0 24 24"><circle cx="7.5" cy="15.5" r="4" fill="none" stroke="currentColor" stroke-width="1.6"/><path fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" d="M10.5 12.5 20 3M16.5 6.5 19 9M14 9l2 2"/></symbol>
    <symbol id="i-gamepad" viewBox="0 0 24 24"><path fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" d="M7 8h10a5 5 0 0 1 4.8 6.3l-.7 2.6a2.3 2.3 0 0 1-4 .8L15.4 16H8.6l-1.7 1.7a2.3 2.3 0 0 1-4-.8l-.7-2.6A5 5 0 0 1 7 8Z"/><path fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" d="M8 10.5v3.5M6.25 12.25h3.5"/><circle cx="15.5" cy="11.2" r="1" fill="currentColor"/><circle cx="17.7" cy="13.4" r="1" fill="currentColor"/></symbol>
    <symbol id="i-compass" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="1.6"/><path fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" d="m15.8 8.2-2.2 5.4-5.4 2.2 2.2-5.4 5.4-2.2Z"/></symbol>
    <symbol id="i-fin" viewBox="0 0 24 24"><path fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" d="M4.5 15.5C8 14 9 8.5 13.5 4c0 4.5 1.3 8.7 6 11.5"/><path fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" d="M2 19.5c2 0 2-1.5 4-1.5s2 1.5 4 1.5 2-1.5 4-1.5 2 1.5 4 1.5 2-1.5 4-1.5"/></symbol>
    <symbol id="i-recycle" viewBox="0 0 24 24"><path fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" d="M19.5 12a7.5 7.5 0 0 1-13.2 4.9M4.5 12a7.5 7.5 0 0 1 13.2-4.9"/><path fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" d="M18 3.5v3.9h-3.9M6 20.5v-3.9h3.9"/></symbol>
    <symbol id="i-drone" viewBox="0 0 24 24"><rect x="9.5" y="10" width="5" height="4" rx="1.2" fill="none" stroke="currentColor" stroke-width="1.6"/><path fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" d="M9.5 11 6.2 8.2M14.5 11l3.3-2.8M9.5 13l-3.3 2.8M14.5 13l3.3 2.8"/><path fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" d="M2.5 7h6M15.5 7h6M2.5 17h6M15.5 17h6"/></symbol>
    <symbol id="i-browser" viewBox="0 0 24 24"><rect x="3" y="4.5" width="18" height="15" rx="2.5" fill="none" stroke="currentColor" stroke-width="1.6"/><path fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" d="M3 8.5h18M10 12l-2.5 2.25L10 16.5M14 12l2.5 2.25L14 16.5"/></symbol>
    <symbol id="i-logic" viewBox="0 0 24 24"><circle cx="12" cy="5" r="2.2" fill="none" stroke="currentColor" stroke-width="1.6"/><circle cx="5.5" cy="18.5" r="2.2" fill="none" stroke="currentColor" stroke-width="1.6"/><circle cx="12" cy="18.5" r="2.2" fill="none" stroke="currentColor" stroke-width="1.6"/><circle cx="18.5" cy="18.5" r="2.2" fill="none" stroke="currentColor" stroke-width="1.6"/><path fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" d="M12 7.2v9.1M10.4 6.6 6.6 16.5M13.6 6.6l3.8 9.9"/></symbol>
    <symbol id="i-spark" viewBox="0 0 24 24"><path fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" d="M12 3.5 13.9 9 19.5 11 13.9 13 12 18.5 10.1 13 4.5 11 10.1 9Z"/></symbol>
    <symbol id="i-team" viewBox="0 0 24 24"><circle cx="9" cy="8" r="3.2" fill="none" stroke="currentColor" stroke-width="1.6"/><path fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" d="M3.2 19.5a5.8 5.8 0 0 1 11.6 0M15.8 5.2a3 3 0 0 1 0 5.6M17.6 14a5 5 0 0 1 3.2 5.5"/></symbol>
    <symbol id="i-campus" viewBox="0 0 24 24"><path fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" d="M3 20.5h18M5 20.5V10l7-5 7 5v10.5M9.5 20.5v-5h5v5"/></symbol>
    <symbol id="i-clock" viewBox="0 0 24 24"><circle cx="12" cy="12" r="8.5" fill="none" stroke="currentColor" stroke-width="1.6"/><path fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" d="M12 7.5V12l3 2"/></symbol>
    <symbol id="i-pin" viewBox="0 0 24 24"><path fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" d="M12 21s7-6.2 7-11.5a7 7 0 1 0-14 0C5 14.8 12 21 12 21Z"/><circle cx="12" cy="9.5" r="2.4" fill="none" stroke="currentColor" stroke-width="1.6"/></symbol>
    <symbol id="i-down" viewBox="0 0 24 24"><path fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" d="M12 5v14M6.5 13.5 12 19l5.5-5.5"/></symbol>
    <symbol id="i-external" viewBox="0 0 24 24"><path fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" d="M7 17 17 7M9 7h8v8"/></symbol>
    <symbol id="i-plus" viewBox="0 0 24 24"><path fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" d="M12 6v12M6 12h12"/></symbol>
    <symbol id="i-close" viewBox="0 0 24 24"><path fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" d="M6.5 6.5l11 11M17.5 6.5l-11 11"/></symbol>
    <symbol id="i-sparkles" viewBox="0 0 24 24"><path fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" d="M9.5 4.5 11 9l4.5 1.5L11 12l-1.5 4.5L8 12l-4.5-1.5L8 9Z"/><path fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" d="m18 13.5.8 2.2 2.2.8-2.2.8L18 19.5l-.8-2.2-2.2-.8 2.2-.8Z"/></symbol>
  </g>
</svg>`;

// Liquid-glass lens for the custom cursor. main.js fills in the displacement
// map; browsers that can't use SVG filters on backdrops just get frosted glass.
const glassFilter = `
<svg class="sprite" width="0" height="0" aria-hidden="true" focusable="false">
  <filter id="lg-lens" x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB">
    <feImage id="lg-map" x="0" y="0" width="100%" height="100%" preserveAspectRatio="none" result="map"/>
    <feDisplacementMap in="SourceGraphic" in2="map" scale="28" xChannelSelector="R" yChannelSelector="G"/>
  </filter>
</svg>`;

// Full text remains available to assistive technology and reserves the final layout.
function presenterTyping(text) {
  return `<span class="typewriter" data-typewriter><span class="sr-only">${esc(text)}</span><span class="typewriter__sizer" aria-hidden="true">${esc(text)}</span><span class="typewriter__text" aria-hidden="true">${esc(text)}</span></span>`;
}
function bisLogo(className = '') {
  return `<span class="bis-logo ${className}"><img src="assets/logos/bis-logo.png" alt="Bangalore International School logo" width="332" height="312" decoding="async"></span>`;
}

/* ---------- intro ------------------------------------------------------------- */

function intro(c) {
  return `
<div class="intro" id="intro" data-intro>
  <div class="intro__veil"></div>
  <div class="intro__map" aria-hidden="true" data-levels="${esc(JSON.stringify(c._introLevels || []))}"${c._introClip ? ` data-clip="${esc(JSON.stringify(c._introClip))}"` : ''}${c._introPhotos ? ` data-photos="${esc(JSON.stringify(c._introPhotos))}"` : ''}></div>
  <div class="intro__stage" aria-hidden="true">
    <p class="intro__place" data-places="${esc(c.ui.introPlaces.join('|'))}"></p>
    <p class="intro__caption">${presenterTyping(c.ui.introLines.join(' '))}</p>
    <p class="intro__word">${esc(c.event.name)}</p>
    <p class="intro__tagline">${esc(c.event.tagline)}</p>
  </div>
  <div class="intro__progress" aria-hidden="true"><span data-intro-fill></span></div>
  <button class="btn btn--glass btn--small intro__skip" type="button" data-skip-intro>${esc(c.ui.skipIntro)}</button>
</div>`;
}

/* ---------- header ------------------------------------------------------------- */

function header(c) {
  const links = c.nav.map((n) => `<li><a href="${esc(n.href)}">${txt(n.label)}</a></li>`).join('');
  return `
  <header class="site-header" data-header>
    <div class="site-header__inner">
      <a class="brand" href="#top" aria-label="${esc(c.event.name)}, back to top">
        <svg class="brand__mark" aria-hidden="true" focusable="false"><use href="#emblem"/></svg>
        <span class="brand__word">${esc(c.event.name)}</span>
      </a>
      <nav class="nav" aria-label="Main">
        <button class="btn btn--glass btn--small nav__toggle" type="button" aria-expanded="false" aria-controls="nav-list" hidden>
          <span class="nav__toggle-icon" aria-hidden="true"></span>${esc(c.ui.menu)}
        </button>
        <ul class="nav__list glass" id="nav-list">${links}<li class="nav__pill" aria-hidden="true"></li></ul>
      </nav>
      <div class="site-header__actions">
        <a class="btn btn--white btn--small halo" href="#register">${esc(c.ui.register)}</a>
      </div>
    </div>
  </header>`;
}

/* ---------- hero ---------------------------------------------------------------- */

function countdown(c) {
  const e = c.event;
  const units = c.ui.countdownUnits
    .map((u, i) => `${i ? '<span class="lcd__colon">:</span>' : ''}<span class="lcd__group"><span class="lcd__digits" data-cd="${['d', 'h', 'm', 's'][i]}" data-ghost="88">--</span><span class="lcd__unit">${esc(u)}</span></span>`)
    .join('');
  let status;
  if (e.date) {
    const { date, time } = formatDate(e.date);
    status = esc(c.ui.countdownStarts.replace('{name}', e.name).replace('{date}', date).replace('{time}', time));
  } else {
    status = txt(e.dateText || c.ui.countdownTba);
  }
  return `
          <div class="lcd" data-countdown data-date="${esc(e.date || '')}" data-live="${esc(c.ui.countdownLive)}">
            <p class="lcd__label">${esc(c.ui.countdownLabel)}</p>
            <div class="lcd__screen" aria-hidden="true">${units}</div>
            <p class="lcd__status" data-cd-status>${status}</p>
          </div>`;
}

function hero(c) {
  const e = c.event;
  return `
    <section class="hero" id="top" aria-labelledby="hero-title">
      <div class="hero__ambient" aria-hidden="true"></div>
      <div class="container hero__grid">
        <div class="hero__copy">
          <p class="hero__presenter">${bisLogo('hero__school-logo')}${presenterTyping(e.presenter)}</p>
          <div class="hero__heading">
            <h1 class="hero__title" id="hero-title">${esc(e.name)}</h1>
            <img class="hero__heading-logo" src="assets/logos/echelon-logo.svg?v=circuit-1" alt="Echelon circuit-tree logo" width="300" height="230" fetchpriority="high">
          </div>
          <p class="hero__tagline">${highlight(e.tagline, e.taglineHighlight)}</p>
          <p class="hero__summary">${txt(e.summary)}</p>
          <div class="hero__actions">
            <a class="btn btn--white halo" href="#register">${esc(c.ui.registerTeam)}</a>
            <a class="btn btn--glass" href="#events">${esc(c.ui.seeEvents)}</a>
            <a class="btn btn--glass" href="${esc(c.ui.historyUrl)}">${esc(c.ui.history)}</a>
          </div>
          <div class="hero__info">
            ${countdown(c)}
            <ul class="chips">
              <li class="chip">${icon('clock')}${txt(e.timeText)}</li>
              <li class="chip">${icon('pin')}${txt(e.venue)}</li>
            </ul>
          </div>
        </div>
        <div class="hero__visual" data-orb-slot>
          <div class="hero__glow" aria-hidden="true"></div>
          <div class="hero__ring" aria-hidden="true"></div>
          <svg class="hero__logo" viewBox="-200 -200 400 400" aria-hidden="true" focusable="false">${arch({ r: 133, h: 36, step: 21, id: 'hero-arch', words: 'currentColor', size: 7.5 })}</svg>
          <div class="hero__poster" aria-hidden="true"></div>
        </div>
      </div>
      <a class="scroll-hint" href="#glance">${icon('down')}<span>${esc(c.ui.scrollHint)}</span></a>
    </section>`;
}

/* ---------- at a glance ------------------------------------------------------------ */

function glance(c) {
  const g = c.glance;
  const stats = g.stats
    .map((s) => `<div class="stat"><dt class="stat__value"><span class="stat__num" data-odometer="${esc(s.value)}">${esc(s.value)}</span></dt><dd class="stat__label">${txt(s.label)}</dd></div>`)
    .join('');
  const tiles = c.events.items
    .map((ev) => `<li class="tile" style="${paletteStyle(ev)}"><span class="tile__art art">${icon(ev.icon, 'tile__icon')}</span><span class="tile__name">${esc(ev.name)}</span><span class="tile__text">${esc(ev.summary)}</span></li>`)
    .join('');
  return `
    <section class="glance" id="glance" aria-label="${esc(g.label)}">
      <div class="glance__stats">
        <h2 class="sr-only">${esc(g.label)}</h2>
        <dl class="stats">${stats}</dl>
      </div>
      <div class="glance__marquee" aria-hidden="true">
        <ul class="marquee">${tiles}${tiles}</ul>
      </div>
    </section>`;
}

/* ---------- about ------------------------------------------------------------------- */

function about(c) {
  const a = c.about;
  const cards = a.cards
    .map((k) => `<li class="feature">${icon(k.icon, 'feature__icon')}<div><h3 class="feature__title">${txt(k.title)}</h3><p class="feature__text">${txt(k.text)}</p></div></li>`)
    .join('');
  return `
    <section class="section about" id="about" aria-labelledby="about-title">
      <div class="container">
        <p class="statement">${highlight(a.statement, a.statementHighlight)}</p>
        <div class="about__grid">
          <div class="about__media">
            <img src="${esc(a.image.src)}" srcset="${esc(a.image.srcSmall)} 960w, ${esc(a.image.src)} 1600w" sizes="(min-width: 64rem) 50vw, 100vw" alt="${plain(a.image.alt)}" width="${a.image.width}" height="${a.image.height}" loading="lazy" decoding="async">
            <div class="about__copy">
              <h2 class="h2" id="about-title">${txt(a.heading)}</h2>
              ${a.paragraphs.map((p) => `<p>${txt(p)}</p>`).join('')}
            </div>
          </div>
          <ul class="features">${cards}</ul>
        </div>
        <div class="acrostic">
          <h3 class="acrostic__title">${txt(a.name.heading)}</h3>
          <ul class="acrostic__list" aria-label="${plain(c.event.name)}">${a.name.words.map((w) => `<li><span class="acrostic__letter" aria-hidden="true">${esc(w[0])}</span><span class="acrostic__word">${esc(w)}</span></li>`).join('')}</ul>
        </div>
      </div>
    </section>`;
}

/* ---------- how it works ------------------------------------------------------------- */

function how(c) {
  const h = c.howItWorks;
  const steps = h.steps
    .map(
      (s, i) => `
            <li class="step" data-step="${i}">
              <span class="step__num" aria-hidden="true">${String(i + 1).padStart(2, '0')}</span>
              <div>
                <h3 class="step__title">${txt(s.title)}</h3>
                <p class="step__text">${txt(s.text)}</p>
              </div>
            </li>`,
    )
    .join('');
  const chips = c.events.items.map((ev) => ({ name: ev.name, icon: ev.icon }));
  return `
    <section class="how" id="how" aria-labelledby="how-title" data-how>
      <div class="how__sticky">
        <div class="container how__grid">
          <div class="how__text">
            <h2 class="h2" id="how-title">${txt(h.heading)}</h2>
            <ol class="steps">${steps}
            </ol>
          </div>
          <div class="how__visual">
            <canvas class="how__canvas" aria-hidden="true" data-chips='${esc(JSON.stringify(chips))}'></canvas>
            <div class="how__still" aria-hidden="true"></div>
          </div>
        </div>
      </div>
    </section>`;
}

/* ---------- events -------------------------------------------------------------------- */

function paletteStyle(ev) {
  const [a, b, d] = ev.palette || ['#00D9FF', '#2979FF', '#041C32'];
  return `--c1:${esc(a)};--c2:${esc(b)};--c3:${esc(d)}`;
}

function eventCard(ev, L, ui) {
  const row = (key) => (ev[key] ? `<div><dt>${esc(L[key])}</dt><dd>${txt(ev[key])}</dd></div>` : '');
  // On the card itself: when and where. Team size and the rest are in the details.
  const facts = [[ev.time, 'clock'], [ev.venue, 'pin']].filter(([f]) => f).map(([f, i]) => `<li>${icon(i, 'icon')}${txt(f)}</li>`).join('');
  const rules = ev.rules && ev.rules.length ? `<h4>${esc(L.rules)}</h4><ul class="rules">${ev.rules.map((r) => `<li>${txt(r)}</li>`).join('')}</ul>` : '';
  const artwork = ev.artwork?.length
    ? `<div class="event-artwork${ev.artwork.length > 1 ? ' event-artwork--combined' : ''}">${ev.artwork.map((image) => `<img src="${esc(image.src)}" width="${Number(image.width)}" height="${Number(image.height)}" alt="" loading="lazy" decoding="async">`).join('')}</div>`
    : icon(ev.icon, 'ev__icon');
  return `
          <li class="ev" id="${esc(ev.id)}" style="${paletteStyle(ev)}">
            <article class="ev__card" aria-labelledby="${esc(ev.id)}-title">
              <div class="ev__art art${ev.artwork?.length ? ' art--event-logo' : ''}" aria-hidden="true">${artwork}</div>
              <div class="ev__body">
                <p class="ev__grades"><span class="sr-only">${esc(L.grades)}: </span>Grades ${txt(ev.grades)}</p>
                <h3 class="ev__title" id="${esc(ev.id)}-title">${txt(ev.name)}</h3>
                <p class="ev__summary">${txt(ev.summary)}</p>
                <ul class="ev__facts">${facts}</ul>
                <button class="btn btn--glass btn--small ev__open" type="button" data-open-event="${esc(ev.id)}" hidden>${esc(ui.details)}<span class="sr-only"> for ${plain(ev.name)}</span></button>
                <details class="ev__details">
                  <summary class="btn btn--glass btn--small">${esc(ui.details)}<span class="sr-only"> for ${plain(ev.name)}</span></summary>
                  <div class="ev__full" data-event-full>
                    <dl class="facts-grid">${row('grades')}${row('time')}${row('venue')}${row('teamSize')}${row('teamsPerSchool')}${row('duration')}${row('priorKnowledge')}${row('resources')}</dl>
                    <h4>${esc(L.about)}</h4>
                    <ol class="how-list">${ev.about.map((p) => `<li>${txt(p)}</li>`).join('')}</ol>
                    ${rules}
                  </div>
                </details>
              </div>
            </article>
          </li>`;
}

function events(c) {
  const E = c.events;
  return `
    <section class="section events" id="events" aria-labelledby="events-title">
      <div class="container">
        <div class="section-head">
          <h2 class="h2" id="events-title">${txt(E.heading)}</h2>
          <p class="lede">${txt(E.intro)}</p>
        </div>
        <ul class="bento">${E.items.map((ev) => eventCard(ev, E.labels, c.ui)).join('')}
        </ul>
      </div>
    </section>`;
}

/* ---------- schedule --------------------------------------------------------------------- */

function schedule(c) {
  const S = c.schedule;
  const before = S.before.map((b) => `<li class="card-mini"><h3>${txt(b.title)}</h3><p>${txt(b.text)}</p></li>`).join('');
  const day = S.day
    .map(
      (d) => `
            <li class="day__item" data-day-item data-time="${esc(d.time)}">
              <span class="day__node" aria-hidden="true"></span>
              <p class="day__time">${d.time ? `<time>${esc(d.time)}</time>` : txt(d.timeLabel)}</p>
              <h3 class="day__title">${txt(d.title)}</h3>
              <p class="day__text">${txt(d.text)}</p>
            </li>`,
    )
    .join('');
  return `
    <section class="section schedule" id="schedule" aria-labelledby="schedule-title" data-schedule data-start="${esc(c.event.startTime)}" data-end="${esc(c.event.endTime)}">
      <div class="container">
        <div class="section-head">
          <h2 class="h2" id="schedule-title">${txt(S.heading)}</h2>
          <p class="lede">${txt(S.intro)}</p>
        </div>
        <div class="schedule__before">
          <p class="kicker">${txt(S.beforeLabel)}</p>
          <ul class="cards-mini">${before}</ul>
        </div>
        <div class="schedule__day">
          <div class="schedule__clock">
            <p class="kicker">${txt(S.dayLabel)}</p>
            <div class="clock" aria-hidden="true"><span class="clock__digits" data-clock data-ghost="88:88">${esc(c.event.startTime)}</span></div>
            <p class="clock__range">${esc(c.event.startTime)} to ${esc(c.event.endTime)}</p>
          </div>
          <ol class="day" data-day>${day}
          </ol>
        </div>
      </div>
    </section>`;
}

/* ---------- partners --------------------------------------------------------------------------- */

function partners(c) {
  const P = c.partners;
  const items = P.items
    .map((p) => {
      const name = isUrl(p.url)
        ? `<a href="${esc(p.url)}" target="_blank" rel="noopener noreferrer">${txt(p.name)}<span class="sr-only"> ${esc(c.ui.opensInNewTab)}</span>${icon('external', 'icon icon--ext')}</a>`
        : txt(p.name);
      return `
          <li class="partner">
            <div class="partner__plate${p.logo === 'assets/logos/bis-logo.png' ? ' partner__plate--bis' : ''}">${p.logo === 'assets/logos/bis-logo.png' ? bisLogo('partner__school-logo') : `<img src="${esc(p.logo)}" alt="${plain(p.logoAlt)}" width="${Number(p.width)}" height="${Number(p.height)}" loading="lazy" decoding="async">`}</div>
            <div><p class="partner__role">${txt(p.role)}</p><p class="partner__name">${name}</p></div>
          </li>`;
    })
    .join('');
  return `
    <section class="section partners" id="partners" aria-labelledby="partners-title">
      <div class="container partners__grid">
        <h2 class="h2" id="partners-title">${txt(P.heading)}</h2>
        <ul class="partners__list">${items}
        </ul>
      </div>
    </section>`;
}

/* ---------- faq -------------------------------------------------------------------------------- */

function faq(c) {
  const F = c.faq;
  const cols = F.columns
    .map((label, ci) => {
      const qs = F.items
        .filter((it) => (it.column || 0) === ci)
        .map(
          (it) => `
            <details class="qa">
              <summary class="qa__q"><span>${txt(it.q)}</span><span class="qa__btn" aria-hidden="true">${icon('plus')}</span></summary>
              <div class="qa__a"><p>${txt(it.a)}</p></div>
            </details>`,
        )
        .join('');
      return `<div class="faq__col"><p class="kicker">${txt(label)}</p>${qs}</div>`;
    })
    .join('');
  return `
    <section class="section faq" id="faq" aria-labelledby="faq-title">
      <div class="container">
        <div class="section-head section-head--center">
          <h2 class="h2" id="faq-title">${txt(F.heading)}</h2>
        </div>
        <div class="faq__cols">${cols}</div>
      </div>
    </section>`;
}

/* ---------- register --------------------------------------------------------------------------- */

function register(c) {
  const R = c.register;
  const url = c.event.registrationUrl;
  const cta = isUrl(url)
    ? `<a class="btn btn--white btn--big halo" href="${esc(url)}" target="_blank" rel="noopener noreferrer">${esc(R.button)}<span class="sr-only"> ${esc(c.ui.opensInNewTab)}</span>${icon('external', 'icon icon--ext')}</a>`
    : `<p class="btn btn--glass btn--big is-pending">${esc(R.pendingButton)}</p><p class="register__pending">${txt(url)}</p>`;
  return `
    <section class="register" id="register" aria-labelledby="register-title">
      <canvas class="register__dots" aria-hidden="true"></canvas>
      <div class="container register__inner">
        <h2 class="register__title" id="register-title">${highlight(R.heading, R.headingHighlight)}</h2>
        <p class="register__text">${txt(R.text)}</p>
        <div class="register__cta">${cta}</div>
        <p class="register__privacy">${txt(R.privacy)}</p>
      </div>
    </section>`;
}

/* ---------- footer ------------------------------------------------------------------------------ */

function footer(c, year) {
  const K = c.contact;
  const email = isEmail(K.email) ? `<a href="mailto:${esc(K.email)}">${esc(K.email)}</a>` : txt(K.email);
  return `
  <footer class="site-footer">
    <div class="container site-footer__grid">
      <div class="site-footer__brand">
        <a class="brand" href="#top" aria-label="${esc(c.event.name)}, back to top">
          <svg class="brand__mark" aria-hidden="true" focusable="false"><use href="#emblem"/></svg>
          <span class="brand__word">${esc(c.event.name)}</span>
        </a>
        <div class="site-footer__school">${bisLogo('footer__school-logo')}<p class="site-footer__note">${txt(c.footer.note)}</p></div>
      </div>
      <div class="site-footer__contact">
        <h2 class="site-footer__heading">${txt(K.heading)}</h2>
        <p>${txt(K.text)} ${txt(K.name)}: ${email}</p>
      </div>
      <div class="site-footer__bottom">
        <p>© <span data-year>${year}</span> ${txt(c.footer.copyright)}</p>
        ${c.footer.credit ? `<p>${txt(c.footer.credit)}</p>` : ''}
      </div>
    </div>
  </footer>`;
}

/* ---------- dialog --------------------------------------------------------------------------------- */

function dialog(c) {
  return `
<dialog class="dialog" id="event-dialog" aria-labelledby="event-dialog-title">
  <div class="dialog__panel">
    <div class="dialog__art art" aria-hidden="true"></div>
    <div class="dialog__head">
      <h2 class="dialog__title" id="event-dialog-title" tabindex="-1"></h2>
      <button class="icon-btn dialog__close" type="button" data-dialog-close>${icon('close')}<span class="sr-only">${esc(c.ui.close)}</span></button>
    </div>
    <div class="dialog__body" data-dialog-body></div>
    <div class="dialog__foot">
      <a class="btn btn--white halo" href="#register" data-dialog-register>${esc(c.ui.registerTeam)}</a>
      <button class="btn btn--glass" type="button" data-dialog-close>${esc(c.ui.close)}</button>
    </div>
  </div>
</dialog>`;
}

/* ---------- page ------------------------------------------------------------------------------------ */

// Runs before first paint: marks JS as on, decides whether the intro plays,
// and applies the visitor's saved effects choice. A failsafe hides the intro
// after 9 s even if main.js never loads.
// Runs first thing in <head>: sets the js / fx-off / intro-on classes, and when the
// intro will play, starts downloading its first two satellite images straight away
// (the same files 15-journey.js picks), so the zoom isn't left waiting for main.js.
const headScript = (levels = []) => `(function(d){var h=d.documentElement,c=h.classList,fx=h.getAttribute('data-fx')!=='off',rm=!1;c.remove('no-js');c.add('js');try{rm=matchMedia('(prefers-reduced-motion: reduce)').matches}catch(e){}try{localStorage.removeItem('echelon-fx')}catch(e){}if(rm)fx=!1;if(!fx)c.add('fx-off');if(fx&&h.getAttribute('data-intro')==='on'){c.add('intro-on');window.__echelonFailsafe=setTimeout(function(){c.remove('intro-on')},20000);var n=Math.max(innerWidth,innerHeight)*Math.min(devicePixelRatio||1,2);if(navigator.deviceMemory&&navigator.deviceMemory<=2)n=0;${JSON.stringify(levels.slice(0, 2).map((l) => l.sizes))}.forEach(function(s,i){var z=s.filter(function(x){return x>=n*0.9})[0]||s[s.length-1],l=d.createElement('link');l.rel='preload';l.as='image';l.type='image/avif';l.href='assets/intro/earth-'+i+'-'+z+'.avif';d.head.appendChild(l)})}})(document);`;

export function render(c, { art, inlineCss, jsHref, year }) {
  const s = c.settings;
  const onOff = (v) => (v ? 'on' : 'off');
  const ogImage = `${c.site.url.replace(/\/$/, '')}/${art.og.src}`;
  return `<!doctype html>
<html lang="${esc(c.site.language)}" class="no-js" data-intro="${onOff(s.intro && s.effects)}" data-fx="${onOff(s.effects)}" data-cursor="${onOff(s.customCursor)}" data-scroll="${onOff(s.scrollAnimations)}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${plain(c.site.title)}</title>
<meta name="description" content="${plain(c.site.description)}">
<link rel="canonical" href="${esc(c.site.url)}/">
<meta name="theme-color" content="#000000">
<meta name="color-scheme" content="dark">
<meta property="og:type" content="website">
<meta property="og:title" content="${plain(c.site.title)}">
<meta property="og:description" content="${plain(c.site.description)}">
<meta property="og:url" content="${esc(c.site.url)}/">
<meta property="og:image" content="${esc(ogImage)}">
<meta property="og:image:width" content="${art.og.width}">
<meta property="og:image:height" content="${art.og.height}">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="assets/favicon.svg?v=circuit-1" type="image/svg+xml">
<link rel="icon" href="assets/favicon-32.png?v=circuit-1" sizes="32x32" type="image/png">
<link rel="apple-touch-icon" href="assets/apple-touch-icon.png?v=circuit-1">
<style>${inlineCss}</style>
<script>${headScript(c._introLevels)}</script>
<script src="${jsHref}" defer></script>
</head>
<body>
${sprite}
${glassFilter}
<canvas class="orb-canvas" aria-hidden="true"></canvas>
${s.intro && s.effects ? intro(c) : ''}
<div class="app" id="app">
  <a class="skip-link" href="#main">${esc(c.ui.skipToContent)}</a>
  ${header(c)}
  <main id="main" tabindex="-1">
${hero(c)}
    <div class="hatch" aria-hidden="true"></div>
${glance(c)}
${about(c)}
    <div class="hatch" aria-hidden="true"></div>
${how(c)}
${events(c)}
${schedule(c)}
${partners(c)}
    <div class="hatch" aria-hidden="true"></div>
${faq(c)}
${register(c)}
  </main>
${footer(c, year)}
</div>
${dialog(c)}
</body>
</html>
`;
}
