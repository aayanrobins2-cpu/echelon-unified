/* 60 · at a glance: rolling numbers ------------------------------------------------
 * Whole numbers roll up like an odometer the first time they come into view.
 * Screen readers get the plain number; the rolling digits are hidden from them.
 */

function initOdometer() {
  const nums = $$('[data-odometer]');
  if (!nums.length || !fxOn()) return;
  const rolling = [];
  nums.forEach((el) => {
    const value = el.dataset.odometer;
    if (!/^\d+$/.test(value)) return; // e.g. "8–12" stays as written
    const sr = d.createElement('span');
    sr.className = 'sr-only';
    sr.textContent = value;
    const vis = d.createElement('span');
    vis.setAttribute('aria-hidden', 'true');
    vis.className = 'odo-wrap';
    [...value].forEach((ch) => {
      const col = d.createElement('span');
      col.className = 'odo';
      col.dataset.digit = ch;
      col.innerHTML = '0123456789'.split('').map((n) => `<span>${n}</span>`).join('');
      vis.appendChild(col);
    });
    el.replaceChildren(sr, vis);
    rolling.push(el);
  });
  const io = new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      if (!en.isIntersecting) return;
      $$('.odo', en.target).forEach((col, i) => {
        col.style.transitionDelay = `${i * 0.12}s`;
        col.style.transform = `translateY(-${Number(col.dataset.digit)}em)`;
      });
      io.unobserve(en.target);
    });
  }, { threshold: 0.6 });
  rolling.forEach((el) => io.observe(el));
}
