/* 30 · liquid-glass cursor ---------------------------------------------------
 * The pointer becomes a small lens of glass: it blurs and brightens what is
 * under it, and in Chromium it also bends it (an SVG displacement map). It
 * stretches a little in the direction you move, and over a button or link it
 * flows into that element's shape, like the iPad pointer. Only with a real
 * mouse, never on touch screens, with reduced motion or in high-contrast mode.
 */

let lens = null;

// Displacement map: pixels near the rim are pushed towards the centre, so the
// edge of the lens magnifies and curves what is behind it.
function lensMap(size = 96) {
  const c = d.createElement('canvas');
  c.width = c.height = size;
  const x = c.getContext('2d');
  const img = x.createImageData(size, size);
  for (let j = 0; j < size; j++) {
    for (let i = 0; i < size; i++) {
      const u = ((i + 0.5) / size) * 2 - 1;
      const v = ((j + 0.5) / size) * 2 - 1;
      const dist = Math.min(1, Math.hypot(u, v));
      const k = Math.pow(dist, 3);
      const o = (j * size + i) * 4;
      img.data[o] = 128 - u * k * 127;
      img.data[o + 1] = 128 - v * k * 127;
      img.data[o + 2] = 128;
      img.data[o + 3] = 255;
    }
  }
  x.putImageData(img, 0, 0);
  return c.toDataURL();
}

function initLens() {
  if (lens || !SITE.cursor || !fxOn() || !finePointer() || media('(forced-colors: active)').matches) return;

  const el = d.createElement('div');
  el.className = 'lens';
  el.setAttribute('aria-hidden', 'true');
  d.body.appendChild(el);
  const map = $('#lg-map');
  const refract = isChromium() && map;
  if (refract) {
    map.setAttribute('href', lensMap());
    el.classList.add('lens--refract');
  }

  const BASE = 34;
  const s = { x: -100, y: -100, cx: -100, cy: -100, px: -100, py: -100, vx: 0, vy: 0, snap: 1, w: BASE, h: BASE, r: BASE / 2, press: 1, pressT: 1, visible: false };
  let target = null;
  let raf = 0;
  let mapW = 0, mapH = 0;
  const clickable = 'a[href], button:not([disabled]), summary, label, [data-lens]';

  const release = (t) => { if (t) { t.style.removeProperty('--mx'); t.style.removeProperty('--my'); } };

  function frame() {
    let tx = s.x, ty = s.y, tw = BASE, th = BASE, tr = BASE / 2;
    let free = true;
    if (target && target.isConnected) {
      const r = target.getBoundingClientRect();
      if (r.width <= 420 && r.height <= 140) {
        free = false;
        const pad = 6;
        const radius = parseFloat(getComputedStyle(target).borderTopLeftRadius) || 10;
        const mx = s.x - (r.left + r.width / 2);
        const my = s.y - (r.top + r.height / 2);
        tw = r.width + pad * 2;
        th = r.height + pad * 2;
        tr = Math.min(radius + pad, th / 2);
        tx = r.left + r.width / 2 + mx * 0.1;
        ty = r.top + r.height / 2 + my * 0.14;
        target.style.setProperty('--mx', `${(mx * 0.08).toFixed(2)}px`);
        target.style.setProperty('--my', `${(my * 0.12).toFixed(2)}px`);
      } else {
        tw = th = 58;
        tr = 29;
      }
    }
    // Moving freely, the lens sits exactly on the pointer, so it never trails
    // behind it. Over a button it glides into place like the iPad pointer, and
    // after leaving one it catches up again within four frames.
    s.snap = free ? Math.min(1, s.snap + 0.2) : 0.24;
    s.cx += (tx - s.cx) * s.snap;
    s.cy += (ty - s.cy) * s.snap;
    s.w += (tw - s.w) * 0.26;
    s.h += (th - s.h) * 0.26;
    s.r += (tr - s.r) * 0.26;
    s.press += (s.pressT - s.press) * 0.3;

    // Liquid stretch along the direction of travel, from the pointer's speed.
    s.vx += (s.x - s.px - s.vx) * 0.35;
    s.vy += (s.y - s.py - s.vy) * 0.35;
    s.px = s.x;
    s.py = s.y;
    const stretch = free ? Math.min(Math.hypot(s.vx, s.vy) / 40, 0.32) : 0;
    const angle = free ? Math.atan2(s.vy, s.vx) : 0;
    el.style.width = `${s.w.toFixed(1)}px`;
    el.style.height = `${s.h.toFixed(1)}px`;
    el.style.borderRadius = `${s.r.toFixed(1)}px`;
    el.style.transform = `translate3d(${(s.cx - s.w / 2).toFixed(1)}px, ${(s.cy - s.h / 2).toFixed(1)}px, 0) rotate(${angle.toFixed(3)}rad) scale(${((1 + stretch) * s.press).toFixed(3)}, ${((1 - stretch * 0.45) * s.press).toFixed(3)})`;
    if (refract) {
      const w = Math.round(s.w), h = Math.round(s.h);
      if (w !== mapW || h !== mapH) { map.setAttribute('width', w); map.setAttribute('height', h); mapW = w; mapH = h; }
    }
    raf = s.visible ? requestAnimationFrame(frame) : 0;
  }

  const show = () => {
    s.visible = true;
    s.cx = s.px = s.x;
    s.cy = s.py = s.y;
    s.vx = s.vy = 0;
    s.snap = 1;
    el.classList.add('is-visible');
    html.classList.add('has-lens');
    if (!raf) raf = requestAnimationFrame(frame);
  };
  const hide = () => {
    s.visible = false;
    el.classList.remove('is-visible');
    html.classList.remove('has-lens'); // the normal cursor comes back
    release(target);
    target = null;
  };
  const onMove = (e) => {
    if (e.pointerType && e.pointerType !== 'mouse') { if (s.visible) hide(); return; }
    s.x = e.clientX; s.y = e.clientY;
    if (!s.visible) show();
  };
  const onOver = (e) => {
    const t = e.target instanceof Element ? e.target.closest(clickable) : null;
    if (t !== target) {
      release(target);
      target = t;
      el.classList.toggle('is-target', Boolean(t));
    }
  };
  const onDown = () => { s.pressT = 0.88; };
  const onUp = () => { s.pressT = 1; };
  const onLeave = () => hide();

  // A modal dialog sits in the browser's top layer, so the lens moves in with it.
  const dialogs = $$('dialog');
  const toDialog = (e) => { if (e.detail && e.detail.open) e.detail.append(el); };
  const back = () => d.body.appendChild(el);
  d.addEventListener('echelon:modal', toDialog);
  dialogs.forEach((dl) => dl.addEventListener('close', back));

  d.addEventListener('pointermove', onMove, { passive: true });
  d.addEventListener('pointerover', onOver, { passive: true });
  d.addEventListener('pointerdown', onDown, { passive: true });
  d.addEventListener('pointerup', onUp, { passive: true });
  html.addEventListener('pointerleave', onLeave);
  window.addEventListener('blur', onLeave);

  lens = {
    destroy() {
      d.removeEventListener('pointermove', onMove);
      d.removeEventListener('pointerover', onOver);
      d.removeEventListener('pointerdown', onDown);
      d.removeEventListener('pointerup', onUp);
      html.removeEventListener('pointerleave', onLeave);
      window.removeEventListener('blur', onLeave);
      d.removeEventListener('echelon:modal', toDialog);
      dialogs.forEach((dl) => dl.removeEventListener('close', back));
      cancelAnimationFrame(raf);
      hide();
      el.remove();
      lens = null;
    },
  };
}
