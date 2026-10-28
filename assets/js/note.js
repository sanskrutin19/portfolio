/* "Write to Sanskruti": a private note only she can read.
   With the backend it is stored privately (supabase/schema.sql: private_notes,
   which visitors can write but never read). Without it, the note opens in the
   visitor's own email app, addressed to her. */
import { dataReady, wall, visitor, cleanName } from './live.js';

const dlg = document.getElementById('note-dlg');
if (dlg) {
  const form = dlg.querySelector('form'), nameIn = form.elements.name, msg = form.elements.message, contact = form.elements.contact;
  const status = dlg.querySelector('.nt-status'), send = dlg.querySelector('.nt-send'), count = dlg.querySelector('.nt-count');
  const EMAIL = 'naiksanskruti03@gmail.com';
  dlg.querySelectorAll('[data-if-live]').forEach(el => { el.hidden = !dataReady; });
  dlg.querySelectorAll('[data-if-email]').forEach(el => { el.hidden = dataReady; });
  send.textContent = dataReady ? 'Send privately' : 'Open in my email app';
  const ERR = {
    rate_limited: 'You’ve sent a few already. Try again a little later, or email me directly.',
    duplicate: 'I already have this one. Thank you!',
    busy: 'Lots of notes right now. Try again in a few minutes.',
    invalid: 'Please write at least a couple of words.'
  };

  const open = () => {
    const v = visitor(); if (v && !nameIn.value) nameIn.value = v.name;
    status.textContent = ''; status.dataset.tone = '';
    dlg.showModal(); setTimeout(() => (nameIn.value ? msg : nameIn).focus(), 40);
  };
  document.addEventListener('click', e => { const t = e.target.closest('[data-open-note]'); if (t) { e.preventDefault(); open(); } });
  dlg.querySelector('.nt-cancel').addEventListener('click', () => dlg.close());
  msg.addEventListener('input', () => { count.textContent = `${msg.value.length} / 1000`; });

  form.addEventListener('submit', async e => {
    e.preventDefault();
    const name = cleanName(nameIn.value), message = msg.value.trim(), reach = contact.value.trim().slice(0, 120);
    if (!name) { status.textContent = 'Add your name, so I know who it’s from.'; status.dataset.tone = 'err'; nameIn.focus(); return; }
    if (message.length < 2) { status.textContent = ERR.invalid; status.dataset.tone = 'err'; msg.focus(); return; }
    if (!dataReady) {
      const body = `${message}\n\n— ${name}${reach ? `\nReach me at: ${reach}` : ''}\n\n(sent from your portfolio museum)`;
      location.href = `mailto:${EMAIL}?subject=${encodeURIComponent('A note from ' + name)}&body=${encodeURIComponent(body)}`;
      status.textContent = 'Your email app should open with the note ready to send.'; status.dataset.tone = 'ok';
      return;
    }
    send.disabled = true; status.textContent = 'Sending…'; status.dataset.tone = '';
    try {
      await wall.privateNote({ name, message, contact: reach });
      form.reset(); count.textContent = '0 / 1000';
      status.textContent = reach ? 'Sent! Only I can read it, and I’ll get back to you.' : 'Sent! Only I can read it. Thank you.';
      status.dataset.tone = 'ok';
    } catch (err) {
      status.textContent = ERR[err.message] || `Couldn’t send it just now. You can email me at ${EMAIL}.`; status.dataset.tone = 'err';
    } finally { send.disabled = false; }
  });
}
