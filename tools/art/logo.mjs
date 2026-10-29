// Echelon art generator (v3): every image the site needs that isn't drawn live on
// the page, all from the logo in src/logo.js.
//
//   assets/logos/echelon-logo.svg        full logo for dark backgrounds
//   assets/logos/echelon-logo-light.svg  full logo for white backgrounds (print, letters)
//   assets/logos/echelon-emblem.svg      the tree on its own
//   assets/favicon.svg, assets/favicon-32.png, assets/apple-touch-icon.png
//   assets/art/og-image.jpg              link preview for WhatsApp, Instagram, etc.
//   assets/art/manifest.json             read by build.js
//
// Usage: CHROME_PATH=/path/to/chromium node tools/art/logo.mjs   (then: node build.js)
// The PNG and JPG files are screenshots of SVG in Chromium; the text uses Inter,
// which must be installed on the computer (it's in Ubuntu's fonts-inter package).

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { emblem, fullLogo, INK } from '../../src/logo.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const require = createRequire(import.meta.url);
const { chromium } = require('playwright-core');
const content = JSON.parse(fs.readFileSync(path.join(root, 'content.json'), 'utf8'));
const write = (rel, data) => { fs.mkdirSync(path.dirname(path.join(root, rel)), { recursive: true }); fs.writeFileSync(path.join(root, rel), data); };

// --- SVG files ---
write('assets/logos/echelon-logo.svg', fullLogo({ id: 'd' }) + '\n');
write('assets/logos/echelon-logo-light.svg', fullLogo({ id: 'l', trace: '#1D2140', ink: INK.light, words: '#4B4F7A' }) + '\n');
write('assets/logos/echelon-emblem.svg', `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" role="img" aria-label="Echelon">${emblem({ id: 'e', trace: '#FFFFFF' })}</svg>\n`);
// The favicon: the tree on a black tile, a little heavier so it reads at 16 px.
const icon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="#000"/><g transform="translate(5 4) scale(.84)">${emblem({ id: 'f', trace: '#FFFFFF', weight: 3.2 })}</g></svg>`;
write('assets/favicon.svg', icon + '\n');

// --- link preview: the full logo on the left, the details on the right ---
const e = content.event;
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
const og = `<!doctype html><meta charset="utf-8"><style>
html,body{margin:0;width:1200px;height:630px;background:#000;overflow:hidden}
body{display:flex;align-items:center;gap:56px;padding:0 72px;box-sizing:border-box;font-family:Inter,sans-serif;color:#F5F5F7;
background:radial-gradient(600px 420px at 290px 330px,rgba(122,108,255,.22),transparent 70%),radial-gradient(500px 380px at 1100px 640px,rgba(255,42,157,.12),transparent 70%),#000}
svg{width:440px;flex:none}
.k{font-size:18px;white-space:nowrap;letter-spacing:.12em;text-transform:uppercase;color:#9AA6FF;margin:0 0 18px}
h1{font-family:'Inter Display',Inter,sans-serif;font-weight:600;font-size:76px;line-height:1;margin:0 0 22px;letter-spacing:-.02em}
p{font-size:28px;line-height:1.4;margin:0;color:#C7C7CC}
.d{margin-top:30px;font-size:30px;color:#fff;font-weight:500}
.s{margin-top:8px;font-size:24px;color:#A1A1A6}
</style>
<body>${fullLogo({ id: 'o' }).replace('<svg ', '<svg width="440" ')}
<div><p class="k">${esc(e.presenter)}</p><h1>Echelon 4.0</h1>
<p>Interschool tech fest for ${esc(e.grades)}</p>
<p class="d">${esc(e.dateText)}</p>
<p class="s">In collaboration with Vidyashilp University</p></div></body>`;

const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined });
const shot = async (html, w, h, type) => {
  const page = await browser.newPage({ viewport: { width: w, height: h } });
  await page.setContent(html);
  await page.evaluate(() => document.fonts.ready);
  const buf = await page.screenshot({ type, quality: type === 'jpeg' ? 88 : undefined, omitBackground: false });
  await page.close();
  return buf;
};
const iconPage = (s) => `<!doctype html><style>html,body{margin:0;background:#000}svg{display:block;width:${s}px;height:${s}px}</style>${icon.replace('<rect width="64" height="64" rx="14"', '<rect width="64" height="64"')}`;
const files = [];
for (const [rel, buf, w, h] of [
  ['assets/art/og-image.jpg', await shot(og, 1200, 630, 'jpeg'), 1200, 630],
  ['assets/favicon-32.png', await shot(iconPage(32), 32, 32, 'png'), 32, 32],
  ['assets/apple-touch-icon.png', await shot(iconPage(180), 180, 180, 'png'), 180, 180],
]) {
  write(rel, buf);
  files.push({ path: rel, bytes: buf.length, width: w, height: h });
  console.log(`${rel}  ${w}x${h}  ${(buf.length / 1024).toFixed(1)} KB`);
}
await browser.close();
write('assets/art/manifest.json', JSON.stringify({
  generated: new Date().toISOString(),
  og: { src: 'assets/art/og-image.jpg', width: 1200, height: 630 },
  files,
}, null, 2) + '\n');
