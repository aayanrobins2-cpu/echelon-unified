/* 70 · How it works: the gravity well -------------------------------------------------
 * A wireframe funnel drawn in 3D on a 2D canvas. As you scroll through the
 * pinned section the camera tilts from a low angle to looking straight down,
 * the event chips spiral into the well, and at "Compete" an orb rises
 * out of it. Lines only, so it stays cheap enough for phones.
 */

// 24 x 24 line icons for the chips (same drawings as the page's SVG sprite).
const WELL_ICONS = {
  key: 'M11.5 15.5a4 4 0 1 1-8 0a4 4 0 1 1 8 0M10.5 12.5 20 3M16.5 6.5 19 9M14 9l2 2',
  gamepad: 'M7 8h10a5 5 0 0 1 4.8 6.3l-.7 2.6a2.3 2.3 0 0 1-4 .8L15.4 16H8.6l-1.7 1.7a2.3 2.3 0 0 1-4-.8l-.7-2.6A5 5 0 0 1 7 8ZM8 10.5v3.5M6.25 12.25h3.5',
  compass: 'M21 12a9 9 0 1 1-18 0a9 9 0 1 1 18 0M15.8 8.2l-2.2 5.4-5.4 2.2 2.2-5.4 5.4-2.2Z',
  fin: 'M4.5 15.5C8 14 9 8.5 13.5 4c0 4.5 1.3 8.7 6 11.5M2 19.5c2 0 2-1.5 4-1.5s2 1.5 4 1.5 2-1.5 4-1.5 2 1.5 4 1.5 2-1.5 4-1.5',
  recycle: 'M19.5 12a7.5 7.5 0 0 1-13.2 4.9M4.5 12a7.5 7.5 0 0 1 13.2-4.9M18 3.5v3.9h-3.9M6 20.5v-3.9h3.9',
  drone: 'M10.7 10h2.6a1.2 1.2 0 0 1 1.2 1.2v1.6a1.2 1.2 0 0 1-1.2 1.2h-2.6a1.2 1.2 0 0 1-1.2-1.2v-1.6a1.2 1.2 0 0 1 1.2-1.2ZM9.5 11 6.2 8.2M14.5 11l3.3-2.8M9.5 13l-3.3 2.8M14.5 13l3.3 2.8M2.5 7h6M15.5 7h6M2.5 17h6M15.5 17h6',
  browser: 'M5.5 4.5h13a2.5 2.5 0 0 1 2.5 2.5v10a2.5 2.5 0 0 1-2.5 2.5h-13A2.5 2.5 0 0 1 3 17V7a2.5 2.5 0 0 1 2.5-2.5ZM3 8.5h18M10 12l-2.5 2.25L10 16.5M14 12l2.5 2.25L14 16.5',
  logic: 'M14.2 5a2.2 2.2 0 1 1-4.4 0a2.2 2.2 0 1 1 4.4 0M7.7 18.5a2.2 2.2 0 1 1-4.4 0a2.2 2.2 0 1 1 4.4 0M14.2 18.5a2.2 2.2 0 1 1-4.4 0a2.2 2.2 0 1 1 4.4 0M20.7 18.5a2.2 2.2 0 1 1-4.4 0a2.2 2.2 0 1 1 4.4 0M12 7.2v9.1M10.4 6.6 6.6 16.5M13.6 6.6l3.8 9.9',
};

function createWell(section) {
  const canvas = $('.how__canvas', section);
  if (!canvas || !canvas.getContext) return null;
  const ctx = canvas.getContext('2d');
  let chips = [];
  try { chips = JSON.parse(canvas.dataset.chips || '[]'); } catch { chips = []; }
  const icons = {};
  for (const [k, v] of Object.entries(WELL_ICONS)) { try { icons[k] = new Path2D(v); } catch { /* old browser */ } }

  const small = isSmallScreen();
  const RINGS = small ? 16 : 21;
  const SEG = small ? 72 : 112;
  const SPOKES = small ? 30 : 42;
  const radii = Array.from({ length: RINGS }, (_, i) => 0.2 * Math.pow(1.19, i));
  const depth = (r) => -2.9 / (1 + Math.pow(r / 0.72, 2));

  const rnd = (() => { let a = 7; return () => { a = (a * 16807) % 2147483647; return (a - 1) / 2147483646; }; })();
  const dust = Array.from({ length: small ? 45 : 90 }, () => ({ a: rnd() * Math.PI * 2, r: 0.4 + rnd() * 6, s: 0.15 + rnd() * 0.5, z: rnd() }));
  const chipState = chips.map((c, k) => ({ ...c, a0: (k / chips.length) * Math.PI * 2 + 0.35, r0: 3.2 + (k % 3) * 0.6 }));
  const ORB_DOTS = small ? 420 : 700;
  const orbDots = Array.from({ length: ORB_DOTS }, (_, i) => {
    const y = 1 - (i / (ORB_DOTS - 1)) * 2;
    const rr = Math.sqrt(1 - y * y);
    const th = i * Math.PI * (3 - Math.sqrt(5));
    return [Math.cos(th) * rr, y, Math.sin(th) * rr];
  });
  const ORB_COLORS = ['#FFC266', '#FF8A4C', '#FF4D8D', '#A259FF', '#3D7BFF', '#33D1FF'];

  let W = 0, H = 0, dpr = 1;
  let progressOf = () => 0.35;
  let raf = 0, running = false, visible = false;

  function resize() {
    const rect = canvas.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.max(1, Math.round(rect.width * dpr));
    const h = Math.max(1, Math.round(rect.height * dpr));
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
    W = w; H = h;
  }

  function camera(p, time) {
    const elev = lerp(0.34, 1.45, ease.inOutSine(seg(p, 0.04, 0.9)));
    const az = time * 0.045 + p * 1.3;
    const dist = lerp(10.5, 6.8, ease.inOutSine(seg(p, 0.1, 1)));
    const ty = lerp(-0.7, -2.2, seg(p, 0.45, 1));
    const cam = [Math.cos(elev) * Math.sin(az) * dist, Math.sin(elev) * dist + ty * 0.25, Math.cos(elev) * Math.cos(az) * dist];
    const fw = norm([-cam[0], ty - cam[1], -cam[2]]);
    const rt = norm(cross(fw, [0, 1, 0]));
    const up = cross(rt, fw);
    const narrow = W < H * 1.05;
    return { cam, fw, rt, up, f: Math.min(W, H) * (narrow ? 1.5 : 1.05), cx: W * (narrow ? 0.5 : 0.63), cy: H * (narrow ? 0.34 : 0.52) };
  }
  function norm(v) { const l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; }
  function cross(a, b) { return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]; }
  function project(C, x, y, z) {
    const vx = x - C.cam[0], vy = y - C.cam[1], vz = z - C.cam[2];
    const zc = vx * C.fw[0] + vy * C.fw[1] + vz * C.fw[2];
    if (zc < 0.2) return null;
    const xc = vx * C.rt[0] + vy * C.rt[1] + vz * C.rt[2];
    const yc = vx * C.up[0] + vy * C.up[1] + vz * C.up[2];
    return [C.cx + (C.f * xc) / zc, C.cy - (C.f * yc) / zc, zc];
  }

  function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function draw(p, time) {
    if (!W) resize();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, W, H);
    const C = camera(p, time);
    ctx.lineWidth = 1.05 * dpr;

    // Rings: brighter towards the throat.
    for (let i = 0; i < RINGS; i++) {
      const r = radii[i];
      const y = depth(r);
      ctx.beginPath();
      let started = false;
      for (let k = 0; k <= SEG; k++) {
        const th = (k / SEG) * Math.PI * 2;
        const P = project(C, r * Math.cos(th), y, r * Math.sin(th));
        if (!P) { started = false; continue; }
        if (started) ctx.lineTo(P[0], P[1]); else { ctx.moveTo(P[0], P[1]); started = true; }
      }
      ctx.strokeStyle = `rgba(255,255,255,${(0.1 + 0.5 * (1 - i / RINGS)).toFixed(3)})`;
      ctx.stroke();
    }
    // Spokes.
    ctx.strokeStyle = 'rgba(255,255,255,0.22)';
    for (let j = 0; j < SPOKES; j++) {
      const th = (j / SPOKES) * Math.PI * 2;
      ctx.beginPath();
      let started = false;
      for (let k = 0; k < RINGS; k++) {
        const r = radii[k];
        const P = project(C, r * Math.cos(th), depth(r), r * Math.sin(th));
        if (!P) { started = false; continue; }
        if (started) ctx.lineTo(P[0], P[1]); else { ctx.moveTo(P[0], P[1]); started = true; }
      }
      ctx.stroke();
    }

    // Dust drifting down into the throat.
    for (const s of dust) {
      const r = ((s.r - time * s.s * 0.35) % 6.2 + 6.2) % 6.2 + 0.25;
      const a = s.a + 1.6 / r;
      const P = project(C, r * Math.cos(a), depth(r) + 0.05 + s.z * 0.2, r * Math.sin(a));
      if (!P) continue;
      ctx.fillStyle = `rgba(255,255,255,${(0.25 + s.z * 0.45).toFixed(2)})`;
      const sz = Math.max(1, (2.2 * dpr * 6) / P[2]);
      ctx.fillRect(P[0], P[1], sz, sz);
    }

    // Glow in the throat, stronger as you go.
    const T = project(C, 0, depth(0.15), 0);
    if (T) {
      const gr = Math.min(W, H) * (0.12 + 0.18 * p);
      const g = ctx.createRadialGradient(T[0], T[1], 0, T[0], T[1], gr);
      g.addColorStop(0, `rgba(255,255,255,${(0.25 + 0.35 * p).toFixed(3)})`);
      g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g;
      ctx.fillRect(T[0] - gr, T[1] - gr, gr * 2, gr * 2);
    }

    // Event chips spiralling in (Pick, Team, Register).
    const drawn = [];
    chipState.forEach((c, k) => {
      const u = ease.inOutCubic(seg(p, 0.2 + k * 0.035, 0.55 + k * 0.035));
      const r = lerp(c.r0, 0.3, u);
      const a = c.a0 + time * 0.06 + u * 2.6;
      const P = project(C, r * Math.cos(a), depth(r) + 0.22, r * Math.sin(a));
      if (!P) return;
      const alpha = 1 - seg(u, 0.78, 1);
      if (alpha <= 0) return;
      drawn.push({ c, P, alpha, scale: clamp((6.5 / P[2]) * lerp(1, 0.45, u), 0.35, 1.5) });
    });
    drawn.sort((a, b) => b.P[2] - a.P[2]);
    for (const { c, P, alpha, scale } of drawn) {
      const s = scale * dpr;
      ctx.font = `500 ${(12.5 * s).toFixed(1)}px Satoshi, system-ui, sans-serif`;
      const tw = ctx.measureText(c.name).width;
      const h = 30 * s, w = tw + 44 * s;
      const x = P[0] - w / 2, y = P[1] - h / 2;
      ctx.globalAlpha = alpha;
      roundRect(x, y, w, h, 9 * s);
      ctx.fillStyle = 'rgba(20,20,26,0.82)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.24)';
      ctx.lineWidth = 1 * dpr;
      ctx.stroke();
      const icon = icons[c.icon];
      if (icon) {
        ctx.save();
        ctx.translate(x + 9 * s, y + (h - 17 * s) / 2);
        ctx.scale((17 * s) / 24, (17 * s) / 24);
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1.7;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.stroke(icon);
        ctx.restore();
      }
      ctx.fillStyle = '#F5F5F7';
      ctx.textBaseline = 'middle';
      ctx.fillText(c.name, x + 33 * s, y + h / 2 + 0.5 * s);
      ctx.globalAlpha = 1;
    }

    // Compete: an orb rises out of the well.
    const q = ease.outCubic(seg(p, 0.72, 0.97));
    if (q > 0 && T) {
      const R = Math.min(W, H) * 0.16 * q;
      const cy = T[1] - R * 0.35 * q;
      const g = ctx.createRadialGradient(T[0], cy, 0, T[0], cy, R * 2.2);
      g.addColorStop(0, `rgba(255,170,90,${(0.55 * q).toFixed(3)})`);
      g.addColorStop(0.45, `rgba(255,77,141,${(0.3 * q).toFixed(3)})`);
      g.addColorStop(1, 'rgba(61,123,255,0)');
      ctx.fillStyle = g;
      ctx.fillRect(T[0] - R * 2.2, cy - R * 2.2, R * 4.4, R * 4.4);
      const rot = time * 0.4;
      const cr = Math.cos(rot), sr = Math.sin(rot);
      for (let i = 0; i < orbDots.length; i++) {
        const [x0, y0, z0] = orbDots[i];
        const x = x0 * cr - z0 * sr;
        const z = x0 * sr + z0 * cr;
        if (z < -0.15) continue;
        const col = ORB_COLORS[Math.floor(((y0 + 1) / 2 + x * 0.15 + 1) * 3) % ORB_COLORS.length];
        ctx.globalAlpha = q * (0.35 + 0.65 * (z + 0.15));
        ctx.fillStyle = col;
        const sz = 1.6 * dpr;
        ctx.fillRect(T[0] + x * R - sz / 2, cy - y0 * R - sz / 2, sz, sz);
      }
      ctx.globalAlpha = 1;
    }

    // Fade the far edges into the black page.
    ctx.globalCompositeOperation = 'destination-in';
    const fade = ctx.createRadialGradient(C.cx, C.cy, Math.min(W, H) * 0.25, C.cx, C.cy, Math.max(W, H) * 0.62);
    fade.addColorStop(0, 'rgba(0,0,0,1)');
    fade.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = fade;
    ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'source-over';
    section.classList.add('is-live');
  }

  const t0 = performance.now();
  let lastDraw = 0;
  function loop(now) {
    if (!running) return;
    raf = requestAnimationFrame(loop);
    if (!visible || now - lastDraw < 30) return; // ~30 fps is plenty for lines
    lastDraw = now;
    draw(progressOf(), (now - t0) / 1000);
  }
  const io = new IntersectionObserver(([en]) => { visible = en.isIntersecting; }, { rootMargin: '10% 0px' });
  io.observe(section);
  window.addEventListener('resize', () => { resize(); if (!running) draw(progressOf(), 6); });

  return {
    setProgressSource(fn) { progressOf = fn; },
    play() { if (running) return; running = true; resize(); raf = requestAnimationFrame(loop); },
    still(p = 0.38) { running = false; cancelAnimationFrame(raf); resize(); draw(p, 6); },
    resize,
  };
}
