/* 55 · LCD countdown -------------------------------------------------------------
 * Counts down to content.json "event.date". With no date it keeps showing
 * "Date to be announced". Add ?date=2027-01-16T08:30:00%2B05:30 to the address
 * to preview it before the real date is set.
 */

function initCountdown() {
  const el = $('[data-countdown]');
  if (!el) return;
  const preview = new URLSearchParams(location.search).get('date');
  const iso = preview || el.dataset.date;
  const target = iso ? Date.parse(iso) : NaN;
  if (Number.isNaN(target)) return;

  const status = $('[data-cd-status]', el);
  const nums = Object.fromEntries(['d', 'h', 'm', 's'].map((k) => [k, $(`[data-cd="${k}"]`, el)]));
  if (preview) {
    status.textContent = `Preview from the link: counting down to ${new Date(target).toLocaleString('en-IN', {
      dateStyle: 'full', timeStyle: 'short', timeZone: 'Asia/Kolkata',
    })}.`;
  }

  const set = (key, value) => {
    const text = String(value).padStart(2, '0');
    const node = nums[key];
    if (node.textContent === text) return;
    node.textContent = text;
    node.dataset.ghost = '8'.repeat(text.length);
  };

  let timer = 0;
  // Wake up right when the displayed second changes, so the number never lags.
  const nextChange = () => ((target - Date.now()) % 1000) + 20;
  const tick = () => {
    const left = target - Date.now();
    if (left <= 0) {
      el.classList.add('is-live');
      status.textContent = el.dataset.live;
      return false;
    }
    const s = Math.floor(left / 1000);
    set('d', Math.floor(s / 86400));
    set('h', Math.floor((s % 86400) / 3600));
    set('m', Math.floor((s % 3600) / 60));
    set('s', s % 60);
    return true;
  };
  const start = () => {
    clearTimeout(timer);
    if (!tick()) return;
    const loop = () => { if (tick()) timer = setTimeout(loop, nextChange()); };
    timer = setTimeout(loop, nextChange());
  };
  d.addEventListener('visibilitychange', () => (d.hidden ? clearTimeout(timer) : start()));
  start();
}
