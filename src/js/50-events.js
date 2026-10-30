/* 50 · event details dialog ----------------------------------------------------
 * Each card's full rules are already in the page inside a <details> (so they
 * work without JavaScript). With JavaScript they open in a modal dialog
 * instead, tinted with the event's colours.
 */

function initDialog() {
  const dialog = $('#event-dialog');
  if (!dialog || typeof dialog.showModal !== 'function') return; // old browsers keep <details>
  const title = $('#event-dialog-title', dialog);
  const body = $('[data-dialog-body]', dialog);
  const art = $('.dialog__art', dialog);
  let opener = null;

  $$('[data-open-event]').forEach((btn) => {
    const card = btn.closest('.ev');
    const details = $('.ev__details', card);
    btn.hidden = false;
    if (details) details.hidden = true;
    btn.addEventListener('click', () => {
      opener = btn;
      title.textContent = $('.ev__title', card).textContent;
      ['--c1', '--c2', '--c3'].forEach((v) => art.style.setProperty(v, card.style.getPropertyValue(v)));
      const sourceArt = $('.ev__art', card);
      art.classList.toggle('art--event-logo', sourceArt.classList.contains('art--event-logo'));
      art.innerHTML = sourceArt.innerHTML;
      const summary = d.createElement('p');
      summary.textContent = $('.ev__summary', card).textContent;
      const full = $('[data-event-full]', card).cloneNode(true);
      // Inside the dialog the card's h4 sub-headings sit under an h2, so they become h3.
      full.querySelectorAll('h4').forEach((h) => {
        const h3 = d.createElement('h3');
        h3.append(...h.childNodes);
        h.replaceWith(h3);
      });
      body.replaceChildren(summary, ...full.childNodes);
      dialog.showModal();
      d.dispatchEvent(new CustomEvent('echelon:modal', { detail: dialog }));
      title.focus();
    });
  });

  $$('[data-dialog-close]', dialog).forEach((b) => b.addEventListener('click', () => dialog.close()));
  dialog.addEventListener('click', (e) => { if (e.target === dialog) dialog.close(); }); // backdrop
  dialog.addEventListener('close', () => { if (opener) opener.focus(); });

  // "Register your team" inside the dialog: close it and move focus to the register section.
  $('[data-dialog-register]', dialog)?.addEventListener('click', (e) => {
    e.preventDefault();
    opener = null;
    dialog.close();
    const target = $('#register-title');
    $('#register').scrollIntoView({ behavior: fxOn() ? 'smooth' : 'auto' });
    target.setAttribute('tabindex', '-1');
    target.focus({ preventScroll: true });
  });
}
