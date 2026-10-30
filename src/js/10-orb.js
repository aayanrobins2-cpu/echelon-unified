/* 10 · WebGL particle orb ---------------------------------------------------
 * One full-screen canvas, thousands of points. Each point knows four shapes:
 * a single spark at the centre, a spiral galaxy, the letters of the word
 * "Echelon" and a globe coloured like the Earth. The intro blends between
 * them; after that the globe follows the hero's orb slot as the page scrolls.
 * As the hero leaves the screen the globe breaks apart. (With BIRDS on, two V
 * formations of birds also circle it, and some of its points fly off as flocks
 * crossing the sky. They're switched off for now; see birdRoles below.)
 */

const ORB_VERT = `
precision highp float;
attribute vec3 aSphere;
attribute vec3 aText;
attribute vec3 aSwirl;
attribute vec2 aRand;
attribute vec3 aEarth;
attribute vec4 aBird; // kind (0 none, 1 circles the globe, 2 flies off), formation, rank, side
uniform float uTime;
uniform vec2 uRes;
uniform vec2 uCenter;
uniform float uScale;
uniform float uBurst;
uniform float uMorph;
uniform float uSphere;
uniform float uSpread;
uniform float uFlockFade;
uniform vec2 uSky;
uniform float uSkyScale;
uniform vec2 uSkyBox;
uniform vec2 uTilt;
uniform float uPoint;
uniform float uAlpha;
varying vec3 vColor;
varying float vAlpha;
varying float vBird;
varying float vFlap;
varying float vSize;

float hash(vec3 p) {
  p = fract(p * 0.3183099 + 0.1);
  p *= 17.0;
  return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
}
float noise(vec3 x) {
  vec3 i = floor(x);
  vec3 f = fract(x);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(hash(i), hash(i + vec3(1.0, 0.0, 0.0)), f.x),
                 mix(hash(i + vec3(0.0, 1.0, 0.0)), hash(i + vec3(1.0, 1.0, 0.0)), f.x), f.y),
             mix(mix(hash(i + vec3(0.0, 0.0, 1.0)), hash(i + vec3(1.0, 0.0, 1.0)), f.x),
                 mix(hash(i + vec3(0.0, 1.0, 1.0)), hash(i + vec3(1.0, 1.0, 1.0)), f.x), f.y), f.z);
}
float hash1(float n) { return fract(sin(n * 12.9898) * 43758.5453); }
// Every stage uses the Echelon blue, green and white palette.
vec3 iris(float t) {
  float band = floor(fract(t) * 3.0);
  if (band < 1.0) return vec3(0.16, 0.47, 1.0);
  if (band < 2.0) return vec3(0.0, 0.90, 0.76);
  return vec3(1.0);
}
mat3 rotY(float a) { float c = cos(a); float s = sin(a); return mat3(c, 0.0, -s, 0.0, 1.0, 0.0, s, 0.0, c); }
mat3 rotX(float a) { float c = cos(a); float s = sin(a); return mat3(1.0, 0.0, 0.0, 0.0, c, s, 0.0, -s, c); }
mat3 rotZ(float a) { float c = cos(a); float s = sin(a); return mat3(c, s, 0.0, -s, c, 0.0, 0.0, 0.0, 1.0); }

void main() {
  float t = uTime;
  vec3 n = aSphere;
  float w = noise(n * 1.7 + vec3(0.0, t * 0.22, t * 0.15)) * 0.65 + noise(n * 3.4 - vec3(t * 0.3)) * 0.35;
  vec3 sph = n * (0.95 + 0.08 * w);
  sph *= 1.0 + uSpread * (0.5 + 2.4 * aRand.x);
  // -0.6 starts the spin with Africa, Europe and India facing the viewer.
  sph = rotY(t * 0.14 - 0.6 + uTilt.x * 0.5) * rotX(0.35 + uTilt.y * 0.35) * sph;

  float ang = t * (0.22 + 0.4 * (1.0 - clamp(length(aSwirl) / 2.2, 0.0, 1.0)));
  float ca = cos(ang);
  float sa = sin(ang);
  vec3 sw = vec3(aSwirl.x * ca - aSwirl.z * sa, aSwirl.y, aSwirl.x * sa + aSwirl.z * ca);
  sw = rotX(-1.05) * sw;

  float b = smoothstep(aRand.y * 0.4, aRand.y * 0.4 + 0.6, uBurst);
  vec3 p = sw * b;

  float order = aText.x / 3.6 + 0.5;
  float m = smoothstep(0.0, 1.0, clamp(uMorph * 1.7 - order * 0.55 - aRand.x * 0.15, 0.0, 1.0));
  p = mix(p, aText, m);

  float s = smoothstep(aRand.x * 0.35, aRand.x * 0.35 + 0.65, uSphere);
  p = mix(p, sph, s);

  // Birds circling the globe: each formation flies its own tilted orbit, the
  // trailing birds a little behind along it and stepped up or down, so the
  // formation reads as a sideways V.
  float orbit = aBird.x == 1.0 ? s * (1.0 - smoothstep(0.0, 0.35, uSpread)) : 0.0;
  if (orbit > 0.0) {
    float th = t * 0.32 + aBird.y * 3.14159 - aBird.z * 0.13;
    vec3 ob = vec3(cos(th), aBird.w * aBird.z * 0.07, sin(th)) * 1.34;
    ob += 0.012 * vec3(sin(t * 2.3 + aRand.x * 30.0), cos(t * 1.9 + aRand.y * 30.0), 0.0);
    ob = aBird.y == 0.0 ? rotX(0.22) * rotZ(0.18) * ob : rotX(-0.3) * rotZ(-0.5) * ob;
    p = mix(p, ob, orbit);
  }

  float persp = 3.2 / (3.2 - p.z);
  vec2 screen = uCenter + vec2(p.x, -p.y) * uScale * persp;

  // Birds leaving the globe: they fly to their place in a V formation and the
  // formations cross the screen left to right, wrapping round off screen.
  float flock = 0.0;
  if (aBird.x == 2.0) {
    flock = smoothstep(aRand.x * 0.4, aRand.x * 0.4 + 0.6, uSpread);
    float f = aBird.y;
    float span = uSkyBox.x * 2.0 + 1.8;
    float fx = mod(hash1(f + 7.0) * span + t * (0.08 + 0.06 * hash1(f + 3.0)), span) - uSkyBox.x - 0.9;
    float fy = (hash1(f) * 2.0 - 1.0) * uSkyBox.y * 0.8 + 0.05 * sin(t * 0.5 + f);
    vec2 bird = vec2(fx - aBird.z * 0.075, fy + aBird.w * aBird.z * 0.055);
    bird += 0.006 * vec2(sin(t * 2.1 + aRand.x * 30.0), cos(t * 1.7 + aRand.y * 30.0));
    screen = mix(screen, uSky + vec2(bird.x, -bird.y) * uSkyScale, flock);
  }

  vec2 clip = screen / uRes * 2.0 - 1.0;
  gl_Position = vec4(clip.x, -clip.y, 0.0, 1.0);
  vBird = max(orbit, flock);
  vSize = mix(1.0, aBird.x == 2.0 ? 10.0 : 5.5, vBird);
  // Flying birds are flat on the screen, so the burst's perspective must not blow them up.
  float birdPersp = aBird.x > 0.0 ? min(persp, 1.4) : persp;
  gl_PointSize = uPoint * mix(birdPersp, 1.0, flock) * (0.75 + aRand.y * 0.5) * vSize;
  vFlap = 0.3 + 0.6 * sin(t * 9.0 + aRand.x * 6.283);

  vec3 cpos = mix(vec3(aText.x * 0.45, aText.y * 0.8, 0.0), sph, s);
  float hue = noise(cpos * 0.9 + vec3(t * 0.05)) * 1.35 + cpos.y * 0.12 + t * 0.015;
  vColor = mix(mix(iris(hue), aEarth, s), vec3(1.0), vBird);
  float facing = smoothstep(-0.2, 0.45, p.z);
  float hidden = aBird.x == 1.0 && p.z < 0.0 && length(p.xy) < 1.0 ? 0.12 : 1.0;
  float globe = uAlpha * mix(1.0, 0.04 + 0.96 * facing, s) * (1.0 - uSpread) * (0.5 + 0.5 * b);
  vAlpha = aBird.x == 2.0 ? mix(globe, uAlpha * 0.75 * (1.0 - uFlockFade), flock) : mix(globe, uAlpha * hidden * (1.0 - uSpread), orbit);
}`;

const ORB_FRAG = `
precision mediump float;
varying vec3 vColor;
varying float vAlpha;
varying float vBird;
varying float vFlap;
varying float vSize;
void main() {
  vec2 c = gl_PointCoord - 0.5;
  // A round dot that keeps its size while the point grows into a bird.
  vec2 cd = c * vSize;
  float dotA = smoothstep(0.25, 0.03, dot(cd, cd));
  // A bird seen from far away: two wings rising from the body, tips drooping, flapping.
  float x = c.x * 2.0;
  float y = 0.18 - c.y * 2.0;
  float ax = abs(x);
  float wing = vFlap * (ax * 1.25 - ax * ax * 0.95);
  float th = mix(0.15, 0.04, ax);
  float birdA = smoothstep(th, th * 0.35, abs(y - wing)) * (1.0 - smoothstep(0.85, 0.95, ax));
  birdA = max(birdA, smoothstep(0.05, 0.0, x * x * 0.7 + y * y * 1.6));
  float a = mix(dotA, birdA, smoothstep(0.35, 0.75, vBird)) * vAlpha;
  gl_FragColor = vec4(vColor * a, a);
}`;

const ORB_ATTRS = { alpha: true, antialias: false, premultipliedAlpha: true, depth: false, stencil: false, powerPreference: 'high-performance' };

// The first WebGL context in a browser session waits for the GPU process to
// start: 150 ms or more of frozen page on a fast laptop, several times that on a
// cheap phone. A throwaway context in a worker takes that wait off the page, and
// compiling the orb's shaders there fills the GPU's shader cache, so the real
// context below starts in a few milliseconds. Resolves either way.
function warmGpu() {
  return new Promise((resolve) => {
    let worker = null, url = '', timer = 0;
    const done = () => {
      clearTimeout(timer);
      if (worker) worker.terminate();
      if (url) URL.revokeObjectURL(url);
      resolve();
    };
    if (!window.Worker || !window.OffscreenCanvas) { done(); return; }
    const src = `onmessage = (e) => {
      let ok = false;
      try {
        const gl = new OffscreenCanvas(1, 1).getContext('webgl', e.data.attrs);
        if (gl) {
          const prog = gl.createProgram();
          [[gl.VERTEX_SHADER, e.data.vert], [gl.FRAGMENT_SHADER, e.data.frag]].forEach(([type, text]) => {
            const sh = gl.createShader(type);
            gl.shaderSource(sh, text);
            gl.compileShader(sh);
            gl.attachShader(prog, sh);
          });
          gl.linkProgram(prog);
          ok = !!gl.getProgramParameter(prog, gl.LINK_STATUS);
          const lose = gl.getExtension('WEBGL_lose_context');
          if (lose) lose.loseContext();
        }
      } catch (err) {}
      postMessage(ok);
    };`;
    try {
      url = URL.createObjectURL(new Blob([src], { type: 'text/javascript' }));
      worker = new Worker(url);
      worker.onmessage = done;
      worker.onerror = done;
      worker.postMessage({ attrs: ORB_ATTRS, vert: ORB_VERT, frag: ORB_FRAG });
      timer = setTimeout(done, 3000); // never hold the orb back for longer than this
    } catch { done(); }
  });
}

// Rough outlines of the continents as [longitude, latitude] pairs. They only
// need to read as the Earth on a few thousand dots, not be a real map.
const LAND = [
  [-168,66,-162,70,-140,70,-125,72,-95,72,-80,73,-62,60,-55,52,-66,45,-70,42,-76,35,-81,31,-80,25,-82,28,-84,30,-90,29,-97,27,-97,22,-92,18,-87,21,-88,15,-83,9,-79,9,-85,11,-92,14,-105,20,-110,24,-112,30,-115,32,-117,33,-122,37,-124,42,-124,48,-130,55,-140,60,-150,60,-158,57,-165,60],
  [-79,9,-72,12,-62,10,-50,0,-35,-6,-39,-15,-41,-22,-48,-26,-53,-34,-58,-38,-65,-42,-68,-50,-70,-55,-74,-50,-74,-40,-71,-30,-70,-18,-76,-14,-81,-5,-80,0,-78,7],
  [-10,36,-9,43,-2,44,-5,48,2,51,8,54,10,58,5,62,15,69,25,71,40,68,60,70,80,73,100,77,115,74,140,72,160,70,180,68,180,65,170,60,160,58,155,52,143,50,140,45,132,43,128,38,126,35,122,40,121,31,117,24,108,21,106,17,109,12,105,9,103,12,100,13,101,4,104,1,98,8,98,16,94,17,90,22,86,20,80,15,77,8,73,18,72,22,67,25,57,25,56,27,52,28,48,30,50,26,52,24,56,24,59,22,55,17,44,12,43,15,35,28,33,31,35,36,27,36,26,40,23,38,22,36,19,40,13,45,17,40,16,38,12,42,9,44,3,43,3,42,-1,37,-6,36],
  [-17,15,-17,21,-13,28,-6,36,10,37,11,33,20,31,32,31,34,28,43,12,51,12,51,2,40,-5,40,-15,35,-24,33,-28,27,-34,20,-35,18,-30,12,-17,13,-6,9,-1,9,4,4,6,-8,4,-13,8,-17,13],
  [44,-25,47,-25,50,-15,49,-12,44,-17],
  [114,-22,122,-18,130,-12,136,-12,137,-16,141,-11,146,-19,153,-26,150,-37,141,-38,135,-35,129,-32,115,-34,113,-26],
  [-5,50,1,51,2,53,-2,57,-5,58,-6,56,-3,54,-5,52],
  [130,31,136,34,140,35,142,40,141,45,144,44,140,40,135,35,130,34],
  [95,5,106,-6,103,-5,98,2],
  [109,1,117,7,119,1,116,-4,110,-3],
  [131,-1,141,-3,150,-10,141,-9,135,-4],
  [172,-34,178,-38,174,-41,171,-44,167,-46,172,-41],
  [-24,64,-14,64,-14,66,-22,66],
];
const ICE = [[-50,60,-42,60,-20,70,-18,80,-35,83,-60,82,-72,78,-58,70]];

// The big deserts: Sahara, Arabia and Iran, the Thar, Central Asia, Australia, Mexico.
function isDry(lat, lon) {
  const a = Math.abs(lat);
  if (a > 14 && a < 33 && lon > -18 && lon < 69) return true;
  if (lat > 24 && lat < 30.5 && lon >= 69 && lon < 75.5) return true;
  if (lat > 36 && lat < 48 && lon > 55 && lon < 110) return true;
  if (lat < -18 && lat > -33 && lon > 115 && lon < 150) return true;
  return lat > 18 && lat < 33 && lon > -117 && lon < -100;
}

// An Earth colour for every point on the sphere: ocean, forest, desert or ice.
function earthColours(sphere, N, rnd) {
  const W = 360, H = 180;
  const c = d.createElement('canvas');
  c.width = W; c.height = H;
  const x = c.getContext('2d', { willReadFrequently: true });
  const fill = (polys, colour) => {
    x.fillStyle = colour;
    polys.forEach((pts) => {
      x.beginPath();
      for (let i = 0; i < pts.length; i += 2) x.lineTo(pts[i] + 180, 90 - pts[i + 1]);
      x.fill();
    });
  };
  fill(LAND, '#f00');
  fill(ICE, '#00f');
  const px = x.getImageData(0, 0, W, H).data;
  const out = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) {
    const [sx, sy, sz] = [sphere[i * 3], sphere[i * 3 + 1], sphere[i * 3 + 2]];
    const lat = (Math.asin(sy) * 180) / Math.PI;
    const lon = (Math.atan2(sx, sz) * 180) / Math.PI;
    const k = (Math.min(H - 1, Math.floor(90 - lat)) * W + Math.min(W - 1, Math.floor(lon + 180))) * 4;
    const v = 0.85 + rnd() * 0.3;
    let col;
    if (px[k + 2] > 128 || lat < -64 || lat > 80) col = [1.0, 1.0, 1.0];
    else if (px[k] > 128) {
      col = [0.0, 0.90, 0.76];
    } else col = [0.16, 0.47, 1.0];
    out.set(col.map((ch) => Math.min(1, ch * v)), i * 3);
  }
  return out;
}

// Which points are birds. Every 60th or 120th point, so the adaptive quality cut (which
// draws only the first part of the buffer) keeps birds spread through it.
// 14 of them circle the globe in two V formations of 7; the rest are flocks of
// 9 that fly off when the globe breaks apart.
// Set BIRDS to true to bring them back (switched off in October 2026, see DECISIONS.md).
const BIRDS = true;
function birdRoles(N) {
  const out = new Float32Array(N * 4);
  if (!BIRDS) return out;
  let orbiters = 0, flyers = 0;
  for (let i = 0; i < N; i++) {
    let kind = 0, j = 0, size = 0, f = 0;
    if (i % 60 === 37 && orbiters < 14) { kind = 1; size = 7; f = Math.floor(orbiters / size); j = orbiters % size; orbiters += 1; }
    else if (i % 120 === 7) { kind = 2; size = 9; f = Math.floor(flyers / size); j = flyers % size; flyers += 1; }
    if (!kind) continue;
    const rank = Math.ceil(j / 2);
    out.set([kind, f, rank, j === 0 ? 0 : j % 2 ? 1 : -1], i * 4);
  }
  return out;
}

// Resolves to the orb, or null if WebGL isn't available. The shaders compile in
// the background (KHR_parallel_shader_compile) so the page never freezes while
// the GPU, or a software renderer on low-end machines, gets ready.
async function createOrb(canvas, slot) {
  await warmGpu();
  let gl = null;
  try {
    gl = canvas.getContext('webgl', ORB_ATTRS);
  } catch { gl = null; }
  if (!gl) return null;

  const parallel = gl.getExtension('KHR_parallel_shader_compile');
  const prog = gl.createProgram();
  const shaders = [[gl.VERTEX_SHADER, ORB_VERT], [gl.FRAGMENT_SHADER, ORB_FRAG]].map(([type, src]) => {
    const sh = gl.createShader(type);
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    gl.attachShader(prog, sh);
    return sh;
  });
  gl.linkProgram(prog);
  if (parallel) {
    await new Promise((resolve) => {
      const poll = () => (gl.getProgramParameter(prog, parallel.COMPLETION_STATUS_KHR) ? resolve() : setTimeout(poll, 16));
      poll();
    });
  } else {
    await new Promise((r) => setTimeout(r, 0));
  }
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    console.warn('[echelon] orb disabled:', gl.getProgramInfoLog(prog) || shaders.map((s) => gl.getShaderInfoLog(s)).join(' '));
    return null;
  }
  gl.useProgram(prog);

  const N = lowPower() || isSmallScreen() ? 9000 : 18000;
  let drawCount = N;
  const rnd = (() => { let a = 20271; return () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; })();

  // Fibonacci sphere: an even lattice of points, like the dots on a golf ball.
  const sphere = new Float32Array(N * 3);
  const golden = Math.PI * (3 - Math.sqrt(5));
  // Points are stored in a scrambled order (k steps through the spiral by a prime), so
  // the adaptive quality cut, which draws only the first part of the buffer, thins the
  // whole globe evenly instead of dropping its bottom half.
  for (let i = 0; i < N; i++) {
    const k = (i * 7919) % N;
    const y = 1 - (k / (N - 1)) * 2;
    const r = Math.sqrt(1 - y * y);
    const th = golden * k;
    sphere.set([Math.cos(th) * r, y, Math.sin(th) * r], i * 3);
  }
  // Spiral galaxy with three arms.
  const swirl = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) {
    const rr = 0.12 + Math.pow(rnd(), 0.7) * 2.0;
    const a = rr * 2.4 + (i % 3) * ((2 * Math.PI) / 3) + (rnd() - 0.5) * 0.55;
    swirl.set([Math.cos(a) * rr, (rnd() - 0.5) * 0.14 * (1.7 - rr * 0.5), Math.sin(a) * rr], i * 3);
  }
  const rand = new Float32Array(N * 2);
  for (let i = 0; i < N * 2; i++) rand[i] = rnd();

  const buffer = (data, name, size) => {
    const loc = gl.getAttribLocation(prog, name);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, size, gl.FLOAT, false, 0, 0);
    return buf;
  };
  buffer(sphere, 'aSphere', 3);
  const textBuf = buffer(sphere, 'aText', 3); // replaced by the word once the font is ready
  buffer(swirl, 'aSwirl', 3);
  buffer(rand, 'aRand', 2);
  buffer(earthColours(sphere, N, rnd), 'aEarth', 3);
  buffer(birdRoles(N), 'aBird', 4);

  const U = {};
  ['uTime', 'uRes', 'uCenter', 'uScale', 'uBurst', 'uMorph', 'uSphere', 'uSpread', 'uFlockFade', 'uSky', 'uSkyScale', 'uSkyBox', 'uTilt', 'uPoint', 'uAlpha'].forEach((n) => { U[n] = gl.getUniformLocation(prog, n); });

  gl.disable(gl.DEPTH_TEST);
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.ONE, gl.ONE);
  gl.clearColor(0, 0, 0, 0);

  // Lay the word out as dots: draw it on a hidden canvas and keep the lit pixels.
  function setWord(word) {
    const W = 1400, H = 380;
    const c = d.createElement('canvas');
    c.width = W; c.height = H;
    const x = c.getContext('2d', { willReadFrequently: true });
    let size = 300;
    x.font = `500 ${size}px "Cabinet Grotesk", sans-serif`;
    const mw = x.measureText(word).width;
    if (mw > W * 0.92) { size = Math.floor((size * W * 0.92) / mw); x.font = `500 ${size}px "Cabinet Grotesk", sans-serif`; }
    x.fillStyle = '#fff';
    x.textAlign = 'center';
    x.textBaseline = 'middle';
    x.fillText(word, W / 2, H / 2);
    const px = x.getImageData(0, 0, W, H).data;
    const pts = [];
    const step = 3;
    let minX = W, maxX = 0;
    for (let yy = 0; yy < H; yy += step) {
      for (let xx = 0; xx < W; xx += step) {
        if (px[(yy * W + xx) * 4 + 3] > 140) { pts.push(xx, yy); if (xx < minX) minX = xx; if (xx > maxX) maxX = xx; }
      }
    }
    const count = pts.length / 2;
    if (!count) return false;
    const unit = 3.4 / (maxX - minX || 1);
    const cx = (minX + maxX) / 2;
    const out = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      const k = (i < count ? i : Math.floor(rnd() * count)) * 2;
      const jitter = i < count ? 0 : step * 0.5;
      out[i * 3] = (pts[k] - cx + (rnd() - 0.5) * jitter) * unit;
      out[i * 3 + 1] = -(pts[k + 1] - H / 2 + (rnd() - 0.5) * jitter) * unit;
      out[i * 3 + 2] = (rnd() - 0.5) * 0.04;
    }
    gl.bindBuffer(gl.ARRAY_BUFFER, textBuf);
    gl.bufferData(gl.ARRAY_BUFFER, out, gl.STATIC_DRAW);
    return true;
  }

  const state = { burst: 1, morph: 1, sphere: 1, spread: 0, alpha: 1, intro: 0 };
  const tilt = { x: 0, y: 0, tx: 0, ty: 0 };
  let dpr = Math.min(window.devicePixelRatio || 1, lowPower() ? 1.5 : 2);
  let raf = 0;
  let running = false;
  let t0 = performance.now();
  let frozenTime = null;
  let slow = 0, frames = 0, last = 0;
  let firstFrame = true;
  const hero = slot.closest('.hero');

  function resize() {
    const w = Math.round(window.innerWidth * dpr);
    const h = Math.round(window.innerHeight * dpr);
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
      gl.viewport(0, 0, w, h);
    }
  }

  function draw(now) {
    resize();
    const t = frozenTime !== null ? frozenTime : (now - t0) / 1000;
    const vw = window.innerWidth, vh = window.innerHeight;
    const r = slot.getBoundingClientRect();
    const slotCx = r.left + r.width / 2;
    const slotCy = r.top + r.height / 2;
    const slotScale = r.width * 0.3;
    const introScale = Math.min(vw * 0.235, vh * 0.42);
    const cx = lerp(slotCx, vw / 2, state.intro);
    const cy = lerp(slotCy, vh / 2, state.intro);
    const sc = lerp(slotScale, introScale, state.intro);

    // Scroll moment 1: the globe breaks apart as the hero leaves the screen.
    // Scroll moment 2: the birds that flew off cross the sky, then fade out.
    let spread = state.spread;
    let flockFade = 0;
    if (state.intro === 0 && hero && fxOn()) {
      const hr = hero.getBoundingClientRect();
      spread = Math.max(spread, ease.inOutSine(seg(-hr.top, hr.height * 0.12, hr.height * 0.8)));
      flockFade = ease.inOutSine(seg(-hr.top, hr.height * 0.9, hr.height * 1.6));
    }
    const sky = Math.min(vw, vh) * 0.5;

    tilt.x += (tilt.tx - tilt.x) * 0.05;
    tilt.y += (tilt.ty - tilt.y) * 0.05;

    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.uniform1f(U.uTime, t);
    gl.uniform2f(U.uRes, canvas.width, canvas.height);
    gl.uniform2f(U.uCenter, cx * dpr, cy * dpr);
    gl.uniform1f(U.uScale, sc * dpr);
    gl.uniform1f(U.uBurst, state.burst);
    gl.uniform1f(U.uMorph, state.morph);
    gl.uniform1f(U.uSphere, state.sphere);
    gl.uniform1f(U.uSpread, spread);
    gl.uniform1f(U.uFlockFade, flockFade);
    gl.uniform2f(U.uSky, (vw / 2) * dpr, (vh / 2) * dpr);
    gl.uniform1f(U.uSkyScale, sky * dpr);
    gl.uniform2f(U.uSkyBox, vw / 2 / sky, vh / 2 / sky);
    gl.uniform2f(U.uTilt, tilt.x, tilt.y);
    gl.uniform1f(U.uPoint, (isSmallScreen() ? 2.1 : 2.4) * dpr);
    gl.uniform1f(U.uAlpha, state.alpha * 0.9);
    gl.drawArrays(gl.POINTS, 0, drawCount);

    if (firstFrame) { firstFrame = false; html.classList.add('has-orb'); }
    return { offscreen: state.intro === 0 && flockFade >= 0.999 && r.bottom < 0 };
  }

  function loop(now) {
    if (!running) return;
    const { offscreen } = draw(now);
    // Adaptive quality: if frames are slow, draw fewer points at lower resolution.
    if (last) {
      frames += 1;
      if (now - last > 24) slow += 1;
      if (frames === 90 && slow > 45 && drawCount === N) { drawCount = Math.round(N * 0.55); dpr = 1; }
    }
    last = now;
    if (offscreen) { running = false; canvas.style.visibility = 'hidden'; return; }
    raf = requestAnimationFrame(loop);
  }

  function start() {
    if (running) return;
    frozenTime = null;
    running = true;
    canvas.style.visibility = '';
    raf = requestAnimationFrame(loop);
  }
  function stop() { running = false; cancelAnimationFrame(raf); }
  // Freeze the current particle frame without changing its colours.
  function hold() {
    const now = performance.now();
    stop();
    frozenTime = (now - t0) / 1000;
    canvas.style.visibility = '';
    draw(now);
  }
  // A single still frame (reduced motion / effects off).
  function still() {
    stop();
    frozenTime = 14;
    canvas.style.visibility = '';
    draw(performance.now());
  }

  // Wake the loop when the hero scrolls back into view.
  window.addEventListener('scroll', () => {
    if (!running && fxOn() && slot.getBoundingClientRect().bottom > -50) start();
  }, { passive: true });
  window.addEventListener('resize', () => { if (!running) draw(performance.now()); });
  d.addEventListener('visibilitychange', () => { if (d.hidden) stop(); else if (fxOn()) start(); });
  if (finePointer()) {
    window.addEventListener('pointermove', (e) => {
      tilt.tx = (e.clientX / window.innerWidth - 0.5) * 2;
      tilt.ty = (e.clientY / window.innerHeight - 0.5) * 2;
    }, { passive: true });
  }
  canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); stop(); html.classList.remove('has-orb'); });

  // Lay the word out once the font is in, in an idle moment.
  const idle = () => new Promise((r) => (window.requestIdleCallback ? requestIdleCallback(r, { timeout: 600 }) : setTimeout(r, 50)));
  const textReady = (d.fonts ? d.fonts.load('500 300px "Cabinet Grotesk"') : Promise.resolve())
    .catch(() => {})
    .then(idle)
    .then(() => setWord($('#hero-title')?.textContent.trim() || 'Echelon'));

  return { state, start, stop, hold, still, textReady, get running() { return running; }, resetClock() { t0 = performance.now(); } };
}
