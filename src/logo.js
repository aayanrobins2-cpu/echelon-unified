// The Echelon 4.0 logo, redrawn from the official artwork (October 2026): the
// word ECHELON in squared, rounded letters on an arch, over a circuit-board tree
// growing out of a plug. Drawn here as SVG so it's sharp at every size and the
// page, the favicon and the standalone files in assets/logos/ all share it.
//
// One even line weight, blue-to-green letters, white circuit traces,
// green nodes and a blue plug, matching the site palette.

// Letters in a 10 x 14 box, drawn as strokes.
const LETTERS = {
  E: 'M9 1H3.2A1.7 1.7 0 0 0 1.5 2.7V11.3A1.7 1.7 0 0 0 3.2 13H9M1.5 7H7.5',
  C: 'M9 1H3.2A1.7 1.7 0 0 0 1.5 2.7V11.3A1.7 1.7 0 0 0 3.2 13H9',
  H: 'M1.5 1V13M8.5 1V13M1.5 7H8.5',
  L: 'M1.5 1V11.3A1.7 1.7 0 0 0 3.2 13H9',
  O: 'M3.2 1H6.8A1.7 1.7 0 0 1 8.5 2.7V11.3A1.7 1.7 0 0 1 6.8 13H3.2A1.7 1.7 0 0 1 1.5 11.3V2.7A1.7 1.7 0 0 1 3.2 1Z',
  N: 'M1.5 13V1L8.5 13V1',
};

// Blue and green variants for dark and light backgrounds.
export const INK = { dark: ['#89D8FF', '#00E5C3'], light: ['#175BB8', '#00756C'] };

// The word on an arch around (0, 0): each letter stands on a circle of radius `r`,
// `h` tall, `step` degrees apart, upright to the circle like the original.
// Returns SVG markup for use inside an <svg> whose user space has (0, 0) at the centre.
// The words the letters stand for, as on the original artwork.
export const WORDS = ['Embrace', 'Cultural', 'Harmony', 'Equality', 'Languages', 'Openness', 'Nuances'];

// `words`: also set each letter's word just outside it, along the arch, `size` tall
// `wordGap` above the letters (pass a colour; the page hides them on small screens, where they'd be too small to read).
export function arch({ r, h, step, id = 'echelon', ink = INK.dark, glow = true, offset = false, weight = 2.9, words = null, size = 7, wordGap = size * 0.9 }) {
  const word = 'ECHELON';
  const s = h / 14;
  const w = 10 * s;
  // Each letter gets its own shade, from the first colour on the left to the second on the
  // right. (One gradient across the word doesn't work: each letter is scaled and turned, and
  // a gradient follows its letter's own coordinates.)
  const mix = (t) => {
    const [a, b] = ink.map((c) => [1, 3, 5].map((k) => parseInt(c.slice(k, k + 2), 16)));
    return `#${a.map((v, k) => Math.round(v + (b[k] - v) * t).toString(16).padStart(2, '0')).join('')}`;
  };
  const letters = (colour, dx = 0, opacity = 1) => [...word].map((ch, i) => {
    const a = (i - (word.length - 1) / 2) * step;
    const stroke = colour || mix(i / (word.length - 1));
    return `<path d="${LETTERS[ch]}" transform="rotate(${a.toFixed(2)}) translate(${(-w / 2 + dx).toFixed(2)} ${(-(r + h)).toFixed(2)}) scale(${s.toFixed(4)})" stroke="${stroke}"${opacity < 1 ? ` opacity="${opacity}"` : ''}/>`;
  }).join('');
  return (glow ? `<defs><filter id="${id}-glow" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="${(h * 0.14).toFixed(2)}"/></filter></defs>` : '')
    + `<g fill="none" stroke-width="${weight}" stroke-linecap="round" stroke-linejoin="round">`
    + (glow ? `<g filter="url(#${id}-glow)" opacity=".5">${letters()}</g>` : '')
    + (offset ? letters('#00E5C3', -0.55 * s, 0.85) + letters('#00D9FF', 0.55 * s, 0.85) : '')
    + letters()
    + '</g>'
    + (words ? `<g class="arch-words" fill="${words}" font-size="${size}" font-family="Satoshi, Inter, system-ui, sans-serif" font-weight="500" letter-spacing="${(size * 0.22).toFixed(2)}" text-anchor="middle">`
      + WORDS.map((wd, i) => {
        const a = (i - (WORDS.length - 1) / 2) * step;
        return `<text transform="rotate(${a.toFixed(2)}) translate(0 ${(-(r + h + wordGap)).toFixed(2)})">${wd.toUpperCase()}</text>`;
      }).join('')
      + '</g>' : '');
}

// The circuit tree in a plug, in a 64 x 64 box. `trace` is the colour of the
// lines (currentColor follows the text colour).
export function emblem({ id = 'emblem', trace = 'currentColor', weight = 2.2 } = {}) {
  // Branches rise from the trunk at 45 degrees, then run straight, like circuit traces.
  const nodes = [[32, 4.5], [11.5, 27], [52.5, 21], [24, 8.5], [40, 9.5], [10.5, 37.5], [53.5, 33]];
  return `<defs><radialGradient id="${id}-node" cx=".35" cy=".35" r=".75"><stop offset="0" stop-color="#CCFFF8"/><stop offset=".55" stop-color="#00E5C3"/><stop offset="1" stop-color="#008F84"/></radialGradient>`
    + `<linearGradient id="${id}-plug" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#89D8FF"/><stop offset="1" stop-color="#2979FF"/></linearGradient></defs>`
    + `<g fill="none" stroke="${trace}" stroke-width="${weight}" stroke-linecap="round" stroke-linejoin="round">`
    + '<path d="M30 43V38L32 36L34 38V43M32 36V7"/>' // two lines from the plug join into the trunk
    + '<path d="M32 33L26 27H14M32 25L26 19V11M32 40H16L12.7 36.7"/>' // left branches
    + '<path d="M32 29L38 23H50M32 21L40 13V12M32 37H47L51.7 34.6"/>' // right branches
    + '</g>'
    + nodes.map(([x, y]) => `<circle cx="${x}" cy="${y}" r="2.8" fill="url(#${id}-node)"/>`).join('')
    + `<path d="M27.5 43H36.5V47H27.5Z" fill="url(#${id}-plug)"/>`
    + `<path d="M21 47H43V52A6 6 0 0 1 37 58H27A6 6 0 0 1 21 52Z" fill="url(#${id}-plug)"/>`
    + `<rect x="25.4" y="57" width="3.4" height="6" rx="1.4" fill="url(#${id}-plug)"/><rect x="35.2" y="57" width="3.4" height="6" rx="1.4" fill="url(#${id}-plug)"/>`;
}

// The full logo, as in the original artwork: the arched word over the tree.
// Standalone SVG files (assets/logos/) use this.
export function fullLogo({ trace = '#FFFFFF', ink = INK.dark, id = 'logo', words = '#DDF8FF' } = {}) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-150 -150 300 230" role="img" aria-label="Echelon: Embrace, Cultural, Harmony, Equality, Languages, Openness, Nuances">`
    + arch({ r: 62, h: 40, step: 28, id: `${id}-a`, ink, words, size: 6.5, wordGap: 14 })
    + `<g transform="translate(-46 -50) scale(1.44)">${emblem({ id: `${id}-e`, trace })}</g>`
    + '</svg>';
}
