/* 15 · intro journey ----------------------------------------------------------
 * Before the particle intro, the camera falls from space to the school: the
 * whole Earth, India, South India, Bengaluru, the streets around the campus
 * and then the campus itself. Down to the streets, every frame is a real
 * satellite image (Sentinel-2, see assets/CREDITS.md) made by
 * tools/intro-imagery/make.py. Closer than that, free satellite images are too
 * coarse, so the camera turns to face the way the school's own drone photos
 * face, dives into the straight-down one and ends on an angled hero shot
 * (assets/intro/campus-*, made by tools/intro-imagery/campus-photos.py).
 * Without the photos, the zoom ends on the streets.
 *
 * The eight images are the same map cropped tighter each time, all centred
 * on the school, so they line up exactly. Each frame scales them: a closer
 * image fades in, with soft edges, while it still covers only the middle of
 * the screen, before the one behind it gets blurry. The view never zooms past the closest image that has
 * loaded, so a slow connection holds the camera instead of showing a blurry
 * close-up.
 */

const AVIF_PROBE = 'data:image/avif;base64,AAAAIGZ0eXBhdmlmAAAAAGF2aWZtaWYxbWlhZk1BMUIAAADrbWV0YQAAAAAAAAAhaGRscgAAAAAAAAAAcGljdAAAAAAAAAAAAAAAAAAAAAAOcGl0bQAAAAAAAQAAAB5pbG9jAAAAAEQAAAEAAQAAAAEAAAETAAAAIQAAAChpaW5mAAAAAAABAAAAGmluZmUCAAAAAAEAAGF2MDFDb2xvcgAAAABqaXBycAAAAEtpcGNvAAAAFGlzcGUAAAAAAAAAAQAAAAEAAAAQcGl4aQAAAAADCAgIAAAADGF2MUOBAAwAAAAAE2NvbHJuY2x4AAEADQAGgAAAABdpcG1hAAAAAAAAAAEAAQQBAoMEAAAAKW1kYXQSAAoIGAAGiAhoNCAyExxHh4Xd0000wsAAAJA1jjx+iFA=';

const supportsAvif = () => new Promise((resolve) => {
  const img = new Image();
  img.onload = () => resolve(img.width > 0);
  img.onerror = () => resolve(false);
  img.src = AVIF_PROBE;
});

function createJourney(el) {
  let levels;
  try { levels = JSON.parse(el.dataset.levels || ''); } catch { return null; }
  if (!levels || !levels.length) return null;

  // One full-screen layer per level, its image drawn as a centred background
  // and resized each frame. The browser rasterises it off the main thread (on
  // the GPU on phones), so the page stays responsive. Canvas and WebGL versions
  // were measured too and blocked the main thread for seconds on machines
  // without a GPU; see DECISIONS.md, section 3.
  // The layers sit in one square that turns with the camera. It's the size of the screen's
  // diagonal when it turns, so its corners never show.
  const spin = d.createElement('div');
  spin.className = 'intro__spin';
  el.appendChild(spin);
  const layers = levels.map(() => {
    const div = d.createElement('div');
    div.className = 'intro__layer';
    spin.appendChild(div);
    return div;
  });

  // The school's aerial photos, if they're there. Portrait screens get the straight-down
  // photo turned upright, so the satellite view turns a quarter less to match it.
  let photos = null;
  try { photos = JSON.parse(el.dataset.photos || 'null'); } catch { photos = null; }
  const portrait = window.innerHeight > window.innerWidth;
  const turn = photos ? -(photos.heading - (portrait ? 90 : 0)) : 0; // degrees, at the end of the zoom

  // Pick one size for every level: the smallest that covers the screen's longer side.
  // Phones with 2 GB of memory or less get the smallest set.
  const tight = navigator.deviceMemory && navigator.deviceMemory <= 2;
  const need = tight ? 0 : Math.max(window.innerWidth, window.innerHeight) * Math.min(window.devicePixelRatio || 1, 2);
  const pick = (sizes) => sizes.find((s) => s >= need * 0.9) || sizes[sizes.length - 1];

  // Load in order, nearest-to-space first, so the camera can start straight away.
  // Browsers without AVIF (Safari before 16.4) get WebP, which stops at 1920 px.
  const loaded = levels.map(() => false);
  let deepest = -1;
  let gone = false;
  let firstReady;
  const first = new Promise((r) => { firstReady = r; });
  const images = supportsAvif().then(async (avif) => {
    for (let i = 0; i < levels.length && !gone; i++) {
      const sizes = avif ? levels[i].sizes : levels[i].sizes.filter((s) => s < 2560);
      const url = `assets/intro/earth-${i}-${pick(sizes)}.${avif ? 'avif' : 'webp'}`;
      const img = new Image();
      img.src = url;
      try { await img.decode(); } catch { break; } // a broken file stops the zoom at the last good level
      layers[i].style.backgroundImage = `url("${url}")`;
      loaded[i] = true;
      deepest = i;
      if (i === 0) firstReady();
    }
  }).finally(() => firstReady()); // even if the first image failed, don't wait forever

  // The campus clip: landscape or portrait to match the screen. It starts loading 1.5 s into
  // the zoom, once the satellite images are in, so it never competes with them, or with the
  // globe that is the page's largest paint (LCP), for bandwidth.
  let zoomStarted;
  const zooming = new Promise((r) => { zoomStarted = r; });
  let clip = null;
  // The photos replace the clip: it's north-up, and the photos come at the same moment.
  if (!photos) { try { clip = JSON.parse(el.dataset.clip || 'null'); } catch { clip = null; } }
  let video = null;
  let clipReady = false;
  if (clip) {
    clip.shape = clip[portrait ? 'portrait' : 'landscape'];
    video = d.createElement('video');
    video.className = 'intro__clip';
    video.muted = true;
    video.playsInline = true;
    video.preload = 'auto';
    video.setAttribute('aria-hidden', 'true');
    video.addEventListener('canplaythrough', () => { clipReady = true; }, { once: true });
    el.appendChild(video);
    Promise.all([images, zooming.then(() => new Promise((r) => setTimeout(r, 1500)))]).then(() => {
      if (gone) return;
      clip.shape.files.forEach(([src, type]) => {
        const source = d.createElement('source');
        source.src = `assets/intro/${src}`;
        source.type = type;
        video.appendChild(source);
      });
      video.load();
    });
  }
  // The photos load in the background too, 1.5 s into the zoom, the straight-down one first.
  const shots = [];
  const shotsReady = [];
  if (photos) {
    const later = Promise.all([images, zooming.then(() => new Promise((r) => setTimeout(r, 1500)))]);
    [[portrait ? 'topTall' : 'top', portrait ? 'campus-top-tall' : 'campus-top'], [portrait ? 'tall' : 'wide', portrait ? 'campus-tall' : 'campus-wide']]
      .forEach(([key, name], i) => {
        const div = d.createElement('div');
        div.className = i ? 'intro__photo intro__photo--hero' : 'intro__photo';
        el.appendChild(div);
        shots.push(div);
        shotsReady[i] = later.then(() => supportsAvif()).then(async (avif) => {
          if (gone) return false;
          const url = `assets/intro/${name}-${pick(photos[key].sizes)}.${avif ? 'avif' : 'webp'}`;
          const img = new Image();
          img.src = url;
          await img.decode();
          div.style.backgroundImage = `url("${url}")`;
          return true;
        }).catch(() => false);
      });
  }
  const ready = images;

  const pin = d.createElement('span');
  pin.className = 'intro__pin';
  el.appendChild(pin);

  const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
  let raf = 0;
  let endKm = 0; // where the zoom ends
  let clipShown = false;
  let photosShown = false;

  // The screen size, read once and on resize: reading layout every frame forces a reflow each time.
  let span = 0;
  const measure = () => { span = 0; };
  window.addEventListener('resize', measure);

  // Show the view `km` wide across the turning square (the screen's longer side when it
  // doesn't turn). The camera turns during the last part of the fall, from Karnataka down.
  function draw(km) {
    if (gone) return;
    if (!span) {
      const w = window.innerWidth, h = window.innerHeight;
      span = turn ? Math.ceil(Math.hypot(w, h)) : Math.max(w, h);
      spin.style.width = spin.style.height = `${span}px`;
    }
    if (turn) {
      const t = smooth(Math.log(900), Math.log(endKm || 11), Math.log(Math.max(km, 0.01)));
      spin.style.transform = `translate(-50%, -50%) rotate(${(turn * t).toFixed(2)}deg)`;
    }
    let covered = false; // once a closer level fills the screen, the ones behind it can go
    const last = levels.length - 1;
    for (let i = last; i >= 0; i--) {
      const L = levels[i], scale = L.km / km;
      let a = loaded[i] ? 1 : 0;
      // The middle levels have soft edges baked in and fade in while they're still in the
      // middle of the screen. Starting at a third of the screen also keeps each one's first
      // paint smaller than the opening globe, so Chrome keeps the globe as the page's
      // largest paint (LCP). The closest level has hard edges, so it waits until it fills
      // the screen and then fades in over the one behind.
      if (i === last && i > 0) a *= smooth(1, 0.88, 1 / scale);
      else if (i > 0) a *= smooth(3, 1.7, 1 / scale);
      const show = a > 0.005 && !covered && scale < 40;
      const st = layers[i].style;
      st.visibility = show ? 'visible' : 'hidden';
      if (!show) continue;
      st.opacity = a.toFixed(3);
      st.backgroundSize = `${(span * scale).toFixed(1)}px`;
      if (a >= 1 && scale * (1 - 2 * (L.feather || 0)) >= 1) covered = true;
    }
    // The pin marks the school until the streets around it are in view.
    pin.style.opacity = (smooth(16000, 7000, km) * (1 - smooth(60, 20, km))).toFixed(3);
  }

  // Fall from space to the school's neighbourhood.
  async function play(token, onPlace, duration = 7600) {
    await Promise.race([first, new Promise((r) => setTimeout(r, 2500))]);
    if (token.cancelled || !loaded[0]) return false;
    const last = levels[levels.length - 1];
    const km0 = 32000;
    // The clip's first frame shows `startKm` across its longer side. The zoom ends on exactly
    // what that frame shows on this screen (object-fit: cover crops it), so the cut is seamless.
    let km1 = last.km * 0.85;
    endKm = km1;
    if (clip) {
      const w = window.innerWidth, h = window.innerHeight;
      const [vw, vh] = clip.shape.size;
      const scale = Math.max(w / vw, h / vh);
      km1 = clip.startKm * (Math.max(w, h) / (Math.max(vw, vh) * scale));
      endKm = km1;
    }
    const closest = () => (deepest < 0 ? km0 : deepest === levels.length - 1 ? km1 : levels[deepest].km * 0.9);
    let lastPlace = null;
    el.classList.add('is-on');
    zoomStarted();
    return new Promise((resolve) => {
      let t = 0, prev = performance.now(), stalled = 0;
      token.onCancel = () => { cancelAnimationFrame(raf); resolve(false); };
      const frame = (now) => {
        if (token.cancelled) return;
        const dt = Math.min(64, now - prev);
        prev = now;
        // Advance the clock only while the next image is ready; give up after 4 s of waiting.
        const u = clamp((t + dt) / duration);
        const want = Math.exp(Math.log(km0) + (Math.log(km1) - Math.log(km0)) * ease.inOutSine(u));
        if (want >= closest()) t += dt;
        else if ((stalled += dt) > 4000) { resolve(true); return; }
        const km = Math.max(want, closest());
        draw(km);
        const place = km > 9000 ? '' : km > 1500 ? 0 : km > 150 ? 1 : km > 6 ? 2 : '';
        if (place !== lastPlace) { lastPlace = place; onPlace(place); }
        if (u < 1) raf = requestAnimationFrame(frame);
        else resolve(true);
      };
      raf = requestAnimationFrame(frame);
    });
  }

  // The campus clip, if it loaded in time and the browser lets it play (iPhones in Low Power
  // Mode block autoplay). Resolves once it has finished, or straight away if it can't play.
  async function playClip(token) {
    if (!video) return false;
    const deadline = performance.now() + 2000;
    while (!clipReady && performance.now() < deadline && !token.cancelled) await new Promise((r) => setTimeout(r, 50));
    if (!clipReady || token.cancelled) return false;
    try { await video.play(); } catch { return false; }
    video.classList.add('is-on');
    await new Promise((resolve) => {
      video.addEventListener('ended', resolve, { once: true });
      setTimeout(resolve, (video.duration || 6) * 1000 + 1500); // never hang on a stalled clip
      token.onCancel = resolve;
    });
    clipShown = true;
    return !token.cancelled;
  }

  // The campus from the school's own drone photos: the camera dives on past the satellite
  // images (they blur as they enlarge, which reads as speed) and lands on the straight-down
  // photo, pushes in, then cross-fades to the angled hero shot while `onHero` shows the
  // caption. Resolves false straight away if the photos aren't in.
  async function playCampus(token, onHero) {
    if (!photos) return false;
    const ok = await Promise.race([Promise.all(shotsReady), new Promise((r) => setTimeout(() => r(null), 1500))]);
    if (!ok || !ok[0] || token.cancelled) return false;
    const [top, hero] = shots;
    const from = endKm;
    const look = (div, scale, opacity) => {
      div.style.transform = `scale(${scale.toFixed(4)})`;
      div.style.opacity = opacity.toFixed(3);
    };
    // The dive: the satellite view keeps zooming while the photo grows in from the middle.
    await tween(1500, (v) => {
      draw(from * Math.exp(Math.log(0.08) * v));
      look(top, 0.25 + 0.75 * ease.outCubic(v), smooth(0.35, 0.8, v));
    }, ease.inOutSine, token);
    if (token.cancelled) return false;
    photosShown = true;
    // A slow push-in on the campus.
    await tween(1700, (v) => look(top, 1 + 0.07 * v, 1), (v) => v, token);
    if (token.cancelled) return false;
    if (!ok[1]) { onHero(); return true; } // no hero shot: the caption goes over the campus
    // The hero shot, with the caption.
    onHero();
    await tween(2600, (v) => {
      look(top, 1.07 + 0.03 * v, 1);
      look(hero, 1.08 - 0.08 * ease.outCubic(v), smooth(0, 0.3, v));
    }, (v) => v, token);
    return !token.cancelled;
  }

  // The streets (or the campus) fade into the dark while the caption shows.
  function fadeOut(token, duration = 1100) {
    const from = endKm || levels[levels.length - 1].km * 0.85;
    return tween(duration, (v) => {
      if (!clipShown && !photosShown) draw(from * (1 - 0.18 * v));
      el.style.opacity = (1 - v).toFixed(3);
    }, ease.inOutCubic, token).then(dispose);
  }

  // Let go of the images (8 large decoded bitmaps) as soon as the zoom is over.
  function dispose() {
    if (gone) return;
    gone = true;
    cancelAnimationFrame(raf);
    window.removeEventListener('resize', measure);
    spin.remove();
    shots.forEach((s) => s.remove());
    if (video) { video.pause(); video.removeAttribute('src'); video.textContent = ''; video.load(); video.remove(); }
  }

  return { play, playClip, playCampus, fadeOut, ready, dispose };
}
