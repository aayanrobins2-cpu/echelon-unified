/* 40 · header + nav ----------------------------------------------------------
 * Solid fade behind the header once you scroll, the mobile menu, and the
 * glass pill that slides to the section you are reading.
 */

function initHeader() {
  const header = $('[data-header]');
  if (!header) return;

  const sentinel = d.createElement('div');
  sentinel.setAttribute('aria-hidden', 'true');
  sentinel.style.cssText = 'position:absolute;top:0;left:0;width:1px;height:80px;pointer-events:none';
  d.body.prepend(sentinel);
  new IntersectionObserver(([entry]) => header.classList.toggle('is-scrolled', !entry.isIntersecting)).observe(sentinel);

  // Mobile menu.
  const toggle = $('.nav__toggle', header);
  const list = $('#nav-list');
  const setOpen = (open) => {
    toggle.setAttribute('aria-expanded', String(open));
    header.classList.toggle('is-open', open);
  };
  toggle.hidden = false;
  toggle.addEventListener('click', () => setOpen(toggle.getAttribute('aria-expanded') !== 'true'));
  list.addEventListener('click', (e) => { if (e.target.closest('a')) setOpen(false); });
  d.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && header.classList.contains('is-open')) { setOpen(false); toggle.focus(); }
  });
  d.addEventListener('click', (e) => {
    if (header.classList.contains('is-open') && !header.contains(e.target)) setOpen(false);
  });
  media('(min-width: 62rem)').addEventListener('change', (e) => { if (e.matches) setOpen(false); });

  // Section spy + the sliding pill.
  const pill = $('.nav__pill', list);
  const links = new Map($$('a[href^="#"]', list).map((a) => [a.getAttribute('href').slice(1), a]));
  const sections = [...links.keys()].map((id) => d.getElementById(id)).filter(Boolean);
  const inBand = new Set();
  let current = null;
  const place = () => {
    if (!pill) return;
    if (!current || !current.offsetWidth) { pill.classList.remove('is-on'); return; }
    pill.style.width = `${current.offsetWidth}px`;
    pill.style.transform = `translateX(${current.offsetLeft}px)`;
    pill.classList.add('is-on');
  };
  const spy = new IntersectionObserver((entries) => {
    entries.forEach((en) => { if (en.isIntersecting) inBand.add(en.target.id); else inBand.delete(en.target.id); });
    const id = sections.map((s) => s.id).find((i) => inBand.has(i));
    const next = id ? links.get(id) : null;
    if (next !== current) {
      links.forEach((a) => a.classList.remove('is-current'));
      current = next;
      if (current) current.classList.add('is-current');
      place();
    }
  }, { rootMargin: '-45% 0px -50% 0px' });
  sections.forEach((s) => spy.observe(s));
  window.addEventListener('resize', place);
  if (d.fonts) d.fonts.ready.then(place);
}
