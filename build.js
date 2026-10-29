#!/usr/bin/env node
// Builds index.html from content.json.
//
//   node build.js
//
// Checks content.json for mistakes, writes index.html, then lists every
// [PLACEHOLDER] that still needs a real value. No dependencies.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { render, hasPlaceholder } from './src/template.js';

const root = path.dirname(fileURLToPath(import.meta.url));
const file = (p) => path.join(root, p);
const short = (p) => crypto.createHash('sha256').update(fs.readFileSync(file(p))).digest('hex').slice(0, 10);

function fail(msg) {
  console.error(`\n✗ Build failed\n  ${msg}\n`);
  process.exit(1);
}

let content;
try {
  content = JSON.parse(fs.readFileSync(file('content.json'), 'utf8'));
} catch (err) {
  fail(`content.json is not valid JSON: ${err.message}`);
}

// Where the page is published. content.json has the final address
// (bisechelon.in); the GitHub Pages deploy passes its own in SITE_URL so the
// canonical link and the link-preview image point at the copy people visit.
if (process.env.SITE_URL) {
  if (!/^https:\/\/\S+$/.test(process.env.SITE_URL)) fail(`SITE_URL "${process.env.SITE_URL}" should start with https://.`);
  content.site.url = process.env.SITE_URL.replace(/\/+$/, '');
}

if (!fs.existsSync(file('assets/art/manifest.json'))) {
  fail('assets/art/manifest.json is missing. Generate the artwork first (see README, "Regenerating the artwork").');
}
const art = JSON.parse(fs.readFileSync(file('assets/art/manifest.json'), 'utf8'));

// The satellite images for the intro zoom, made by tools/intro-imagery/make.py.
// Without them the intro skips the zoom and starts at the caption.
if (fs.existsSync(file('assets/intro/manifest.json'))) {
  content._introLevels = JSON.parse(fs.readFileSync(file('assets/intro/manifest.json'), 'utf8')).levels
    .map((l) => ({ km: l.km, sizes: l.sizes, feather: l.feather || 0 }));
} else {
  console.warn('  ! assets/intro/manifest.json is missing, so the intro has no zoom from space.');
}
// The school's aerial photos that end the intro, if they've been prepared (see README).
if (fs.existsSync(file('assets/intro/campus-photos.json'))) {
  const ph = JSON.parse(fs.readFileSync(file('assets/intro/campus-photos.json'), 'utf8'));
  const names = { top: 'campus-top', topTall: 'campus-top-tall', wide: 'campus-wide', tall: 'campus-tall' };
  const missing = Object.entries(names).flatMap(([k, n]) => (ph[k]?.sizes || [0]).flatMap((sz) => [`${n}-${sz}.avif`, `${n}-${sz}.webp`]))
    .filter((f) => !fs.existsSync(file(`assets/intro/${f}`)));
  if (typeof ph.heading !== 'number' || missing.length) fail(`assets/intro/campus-photos.json is incomplete or lists missing files: ${missing.join(', ')}`);
  content._introPhotos = { heading: ph.heading, top: { sizes: ph.top.sizes }, topTall: { sizes: ph.topTall.sizes }, wide: { sizes: ph.wide.sizes }, tall: { sizes: ph.tall.sizes } };
}
// The campus clip from Google Earth Studio, if it has been added (see README). Only used
// when every file it lists is there.
if (fs.existsSync(file('assets/intro/campus.json'))) {
  const clip = JSON.parse(fs.readFileSync(file('assets/intro/campus.json'), 'utf8'));
  const files = ['landscape', 'portrait'].flatMap((k) => (clip[k]?.files || []).map(([f]) => `assets/intro/${f}`));
  const missing = files.filter((f) => !fs.existsSync(file(f)));
  if (!clip.startKm || !clip.landscape || !clip.portrait) fail('assets/intro/campus.json needs "startKm", "landscape" and "portrait".');
  if (missing.length) fail(`assets/intro/campus.json lists files that aren't there: ${missing.join(', ')}`);
  content._introClip = { startKm: clip.startKm, landscape: clip.landscape, portrait: clip.portrait };
}

/* ---------- checks -------------------------------------------------------- */

const errors = [];
const ev = content.event || {};

if (ev.date) {
  const okShape = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?([+-]\d{2}:\d{2}|Z)$/.test(ev.date);
  if (!okShape || Number.isNaN(Date.parse(ev.date))) {
    errors.push(`event.date "${ev.date}" should look like 2027-01-16T08:30:00+05:30, or be "" for "to be announced".`);
  }
}
{
  const words = (content.about && content.about.name && content.about.name.words) || [];
  if (words.map((w) => w[0]).join('').toUpperCase() !== String(ev.name || '').toUpperCase()) {
    errors.push(`about.name.words should start with the letters of "${ev.name}", one word per letter, in order.`);
  }
}
if (ev.registrationUrl && !hasPlaceholder(ev.registrationUrl) && !/^https:\/\/\S+$/.test(ev.registrationUrl)) {
  errors.push('event.registrationUrl should start with https:// (or stay a [PLACEHOLDER]).');
}
const email = content.contact?.email;
if (email && !hasPlaceholder(email) && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
  errors.push(`contact.email "${email}" doesn't look like an email address.`);
}
const ids = new Set();
const ICONS = ['key', 'gamepad', 'compass', 'fin', 'recycle', 'drone', 'browser', 'logic'];
for (const e of content.events?.items || []) {
  if (!/^[a-z0-9-]+$/.test(e.id || '')) errors.push(`event id "${e.id}" should use only lowercase letters, numbers and dashes.`);
  if (ids.has(e.id)) errors.push(`event id "${e.id}" is used twice.`);
  ids.add(e.id);
  if (!ICONS.includes(e.icon)) errors.push(`event "${e.id}" needs an icon, one of: ${ICONS.join(', ')}.`);
  if (!Array.isArray(e.palette) || e.palette.length !== 3 || !e.palette.every((c) => /^#[0-9a-f]{6}$/i.test(c))) {
    errors.push(`event "${e.id}" needs a "palette" of three colours like ["#FF7A3D", "#FF4D8D", "#3A0F2E"].`);
  }
  for (const key of ['name', 'summary', 'grades', 'teamSize', 'teamsPerSchool', 'duration', 'priorKnowledge', 'resources']) {
    if (typeof e[key] !== 'string') errors.push(`event "${e.id}" is missing "${key}".`);
  }
  if (!Array.isArray(e.rules) || !Array.isArray(e.about)) errors.push(`event "${e.id}" needs "about" and "rules" lists.`);
}
for (const p of content.partners?.items || []) {
  if (!fs.existsSync(file(p.logo))) errors.push(`partner logo not found: ${p.logo}`);
}
if (errors.length) fail(errors.join('\n  '));

/* ---------- build ---------------------------------------------------------- */

// css/style.css is the file to edit. The build minifies it and puts it inside
// index.html, which saves a round trip before the first paint on slow Wi-Fi.
function minifyCss(css) {
  return css
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\s+/g, ' ')
    .replace(/\s*([{};,])\s*/g, '$1')
    .replace(/;}/g, '}')
    .replace(/url\("\.\.\//g, 'url("')
    .trim();
}
const css = minifyCss(fs.readFileSync(file('css/style.css'), 'utf8'));

// src/js/*.js are the files to edit. They are joined, in file-name order,
// inside one function and written to js/main.js.
const jsParts = fs.readdirSync(file('src/js')).filter((f) => f.endsWith('.js')).sort();
const js = [
  '/* ECHELON — generated by build.js from src/js/. Edit those files, not this one. */',
  '(() => {',
  ...jsParts.map((f) => `// ---- src/js/${f}\n${fs.readFileSync(file(`src/js/${f}`), 'utf8').trim()}\n`),
  '})();',
  '',
].join('\n');
fs.writeFileSync(file('js/main.js'), js);

for (const f of ['assets/fonts/fontshare/satoshi-variable.woff2', 'assets/fonts/fontshare/cabinet-grotesk-500.woff2']) {
  if (fs.existsSync(file(f))) continue;
  // On the deploy server (CI), a missing font must stop the build instead of
  // publishing a page that falls back to system fonts.
  if (process.env.CI) fail(`${f} is missing. The deploy runs "npm run fonts" first; check that step.`);
  console.warn(`  ! ${f} is missing. Run "npm run fonts" to download it from Fontshare.`);
}

const html = render(content, {
  art,
  inlineCss: css,
  jsHref: `js/main.js?v=${short('js/main.js')}`,
  year: new Date().getFullYear(),
});
fs.writeFileSync(file('index.html'), html);

/* ---------- placeholder report ----------------------------------------------- */

const found = [];
(function walk(value, at) {
  if (typeof value === 'string') {
    for (const m of value.matchAll(/\[PLACEHOLDER(?::\s*([^\]]*))?\]/g)) found.push([at, (m[1] || '').trim()]);
  } else if (Array.isArray(value)) {
    value.forEach((v, i) => walk(v, `${at}[${i}]`));
  } else if (value && typeof value === 'object') {
    for (const [k, v] of Object.entries(value)) if (!k.startsWith('_')) walk(v, at ? `${at}.${k}` : k);
  }
})(content, '');

console.log(`\n✓ Built index.html (${(Buffer.byteLength(html) / 1024).toFixed(1)} KB)`);
if (!ev.date) console.log('  • event.date is empty, so the countdown shows "Date to be announced".');
if (found.length) {
  // Group repeats, e.g. the same field in all six event cards, into one line.
  const groups = new Map();
  for (const [p, hint] of found) {
    const key = `${p.replace(/\[\d+\]/g, '[n]')}  ${hint}`;
    const g = groups.get(key) || { first: p, hint, n: 0 };
    g.n += 1;
    groups.set(key, g);
  }
  console.log(`\n  ${found.length} placeholders still need real values:`);
  const rows = [...groups].map(([key, g]) => [g.n > 1 ? key.split('  ')[0] : g.first, g.hint, g.n]);
  const width = Math.max(...rows.map(([p]) => p.length));
  for (const [p, hint, n] of rows) console.log(`    ${p.padEnd(width)}  ${hint}${n > 1 ? `  (x${n})` : ''}`);
} else {
  console.log('  No placeholders left.');
}
console.log('');
