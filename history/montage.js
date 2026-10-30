(() => {
  'use strict';
  const base = new URL('.', document.currentScript.src);
  const manifest = fetch(new URL('montage-photos.json', base), { cache: 'no-cache' }).then(response => {
    if (!response.ok) throw new Error('Photo list unavailable');
    return response.json();
  });
  const mounted = new Set();
  const cleanup = new Map();

  async function mount(root) {
    if (mounted.has(root)) return;
    mounted.add(root);
    try {
      const groups = await manifest;
      if (!root.isConnected) return;
      const photos = root.dataset.montage === 'all'
        ? ['1', '2', '3'].flatMap(edition => groups[edition])
        : groups[root.dataset.montage];
      if (!photos?.length) throw new Error('No photos');
      const images = [...root.querySelectorAll('[data-montage-image]')];
      const controls = root.querySelector('[data-montage-controls]');
      const toggle = root.querySelector('[data-montage-toggle]');
      const caption = root.querySelector('[data-montage-caption]');
      const edition = root.querySelector('[data-montage-edition]');
      const count = root.querySelector('[data-montage-count]');
      const error = root.querySelector('[data-montage-error]');
      images[0].src = new URL(photos[0].src, base).href;
      images[0].alt = photos[0].alt;
      edition.textContent = `Echelon ${photos[0].edition}`;
      const motion = matchMedia('(prefers-reduced-motion: reduce)');
      let index = 0, active = 0, request = 0, timer;
      let paused = motion.matches, visible = false;

      function schedule() {
        clearTimeout(timer);
        toggle.textContent = paused ? 'Play' : 'Pause';
        toggle.setAttribute('aria-label', paused ? 'Play photo montage' : 'Pause photo montage');
        if (!paused && visible && !document.hidden && root.isConnected) {
          timer = setTimeout(() => show(index + 1, false), 4500);
        }
      }
      function preloadNext() {
        const next = new Image();
        next.src = new URL(photos[(index + 1) % photos.length].src, base).href;
      }
      async function show(nextIndex, manual) {
        clearTimeout(timer);
        if (manual) paused = true;
        const token = ++request;
        const next = (nextIndex + photos.length) % photos.length;
        const photo = photos[next];
        try {
          const loaded = new Image();
          loaded.src = new URL(photo.src, base).href;
          await loaded.decode();
          if (token !== request || !root.isConnected) return;
          const incoming = images[1 - active];
          incoming.src = loaded.src;
          incoming.alt = photo.alt;
          incoming.removeAttribute('aria-hidden');
          incoming.classList.add('is-active');
          images[active].classList.remove('is-active');
          images[active].setAttribute('aria-hidden', 'true');
          active = 1 - active;
          index = next;
          caption.setAttribute('aria-live', manual ? 'polite' : 'off');
          edition.textContent = `Echelon ${photo.edition}`;
          count.textContent = `${index + 1} / ${photos.length}`;
          error.hidden = true;
          preloadNext();
        } catch (_) {
          if (token !== request || !root.isConnected) return;
          paused = true;
          error.textContent = 'This photo could not be loaded. Use the arrows to try another photo.';
          error.hidden = false;
        }
        schedule();
      }

      root.querySelector('[data-montage-previous]').addEventListener('click', () => show(index - 1, true));
      root.querySelector('[data-montage-next]').addEventListener('click', () => show(index + 1, true));
      toggle.addEventListener('click', () => { paused = !paused; schedule(); });
      root.addEventListener('focusin', event => {
        if (event.target !== toggle && !root.contains(event.relatedTarget)) paused = true;
        schedule();
      });
      root.addEventListener('keydown', event => {
        if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
          event.preventDefault();
          show(index + (event.key === 'ArrowRight' ? 1 : -1), true);
        }
      });
      const onVisibility = () => schedule();
      const onMotion = () => { if (motion.matches) paused = true; schedule(); };
      document.addEventListener('visibilitychange', onVisibility);
      motion.addEventListener('change', onMotion);
      const observer = new IntersectionObserver(entries => {
        visible = entries[0].isIntersecting;
        schedule();
      }, { threshold: 0.1 });
      observer.observe(root);
      cleanup.set(root, () => {
        ++request;
        clearTimeout(timer);
        observer.disconnect();
        document.removeEventListener('visibilitychange', onVisibility);
        motion.removeEventListener('change', onMotion);
      });
      controls.hidden = false;
      count.textContent = `1 / ${photos.length}`;
      preloadNext();
      schedule();
    } catch (_) {
      const error = root.querySelector('[data-montage-error]');
      error.textContent = 'The photo montage could not be loaded. Please refresh to try again.';
      error.hidden = false;
    }
  }
  function scan() {
    for (const root of mounted) {
      if (!root.isConnected) {
        cleanup.get(root)?.();
        cleanup.delete(root);
        mounted.delete(root);
      }
    }
    document.querySelectorAll('[data-montage]').forEach(mount);
  }
  scan();
  // Edition 3.0 renders its home and event pages without a full page reload.
  new MutationObserver(records => {
    if (records.some(record => [...record.addedNodes, ...record.removedNodes].some(node =>
      node.nodeType === 1 && (node.matches('[data-montage]') || node.querySelector('[data-montage]'))))) scan();
  }).observe(document.body, { childList: true, subtree: true });
})();
