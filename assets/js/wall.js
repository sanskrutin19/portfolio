/* The visitor wall, the suggestion wall and the museum archive.
   Shown only when a backend is configured (live.js). Everything visitors
   write is rendered as text (never HTML) and appears only after review. */
import { dataReady, wall, visitor, saveVisitor, presence, bus, LOOK_DEFAULT } from './live.js';
import { thumbOf, castOf } from './people.js';

const section = document.getElementById('wall');
if (dataReady && section) {
  section.hidden = false;
  document.querySelectorAll('[data-live-nav]').forEach(el => { el.hidden = false; });

  const EXHIBIT = { rag: 'The Archive That Thinks', chat: 'The Sealed Artifact', geo: 'The Orbital Record', plant: 'The Living Specimen', xai: 'The Talking Alarm', water: 'The Field Log', sound: 'The Sound Room' };
  const CATEGORY = { feature: 'New portfolio feature', museum: 'Museum improvement', project: 'Project idea', design: 'Design feedback', aiml: 'AI / ML experiment', general: 'General' };
  const ERR = {
    rate_limited: 'You’ve pinned a few already. Try again in a little while.',
    duplicate: 'That one is already on its way to the wall.',
    busy: 'The wall is busy right now. Try again in a few minutes.',
    invalid: 'Please write at least a couple of words.'
  };
  const ago = iso => {
    const s = (Date.now() - new Date(iso).getTime()) / 1000;
    if (s < 3600) return Math.max(1, Math.round(s / 60)) + ' min ago';
    if (s < 86400) return Math.round(s / 3600) + ' h ago';
    return new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
  };
  const el = (tag, cls, text) => { const n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; };
  const figure = look => {   // the visitor's character, as a small portrait
    const f = el('img', 'wall-fig'); f.src = thumbOf(castOf(look)); f.alt = ''; f.width = 24; f.height = 24; f.loading = 'lazy';
    return f;
  };

  // exhibit pickers
  document.querySelectorAll('.wall-form select[name="exhibit"]').forEach(s => Object.entries(EXHIBIT).forEach(([v, t]) => s.appendChild(new Option(t, v))));
  document.querySelectorAll('.wall-form select[name="category"]').forEach(s => Object.entries(CATEGORY).forEach(([v, t]) => s.appendChild(new Option(t, v))));
  const fillName = () => { const v = visitor(); document.querySelectorAll('.wall-form input[name="name"]').forEach(i => { if (v && !i.value) i.value = v.name; }); };
  fillName(); bus.addEventListener('visitor', fillName);

  // keep references: in the 3D wing these blocks are moved onto the gallery walls
  const lists = {}; document.querySelectorAll('.wall-list').forEach(l => { lists[l.dataset.list] = l; });
  const stat = {}; document.querySelectorAll('.wall-archive [data-stat]').forEach(d => { stat[d.dataset.stat] = d; });
  async function load(kind) {
    const list = lists[kind];
    list.setAttribute('aria-busy', 'true'); list.replaceChildren(el('li', 'wall-empty', 'Loading…'));
    try {
      const rows = await wall.list(kind);
      list.replaceChildren();
      if (!rows.length) list.appendChild(el('li', 'wall-empty', kind === 'guestbook' ? 'No notes yet. Be the first to sign the wall.' : 'No suggestions on the wall yet. What should I build next?'));
      rows.forEach(r => {
        const li = el('li', 'wall-item');
        const head = el('p', 'wall-meta');
        head.append(figure(r.look), el('b', null, r.name), el('span', 'wall-time mono', ago(r.created_at)));
        li.appendChild(head);
        const tags = el('p', 'wall-tags mono');
        if (r.category && CATEGORY[r.category]) tags.appendChild(el('span', null, CATEGORY[r.category]));
        if (r.exhibit && EXHIBIT[r.exhibit]) tags.appendChild(el('span', null, EXHIBIT[r.exhibit]));
        if (tags.childNodes.length) li.appendChild(tags);
        li.appendChild(el('p', 'wall-msg', r.message));
        const rep = el('button', 'wall-report mono', 'Report'); rep.type = 'button';
        rep.addEventListener('click', async () => {
          if (!confirm('Report this entry? It will be reviewed, and hidden if others report it too.')) return;
          rep.disabled = true;
          try { await wall.report(kind, r.id, 'reported from the wall'); rep.textContent = 'Reported'; } catch { rep.disabled = false; rep.textContent = 'Try again'; }
        });
        li.appendChild(rep);
        list.appendChild(li);
      });
    } catch {
      list.replaceChildren();
      const li = el('li', 'wall-empty', 'Couldn’t reach the wall. '); const b = el('button', 'wall-retry', 'Try again'); b.type = 'button';
      b.addEventListener('click', () => load(kind)); li.appendChild(b); list.appendChild(li);
    } finally { list.removeAttribute('aria-busy'); }
  }

  document.querySelectorAll('.wall-form').forEach(form => {
    const kind = form.dataset.kind, status = form.querySelector('.wall-status'), btn = form.querySelector('button[type="submit"]');
    const msg = form.querySelector('textarea'), count = form.querySelector('.wall-count');
    msg.addEventListener('input', () => { count.textContent = `${msg.value.length} / 280`; });
    form.addEventListener('submit', async e => {
      e.preventDefault();
      const fd = new FormData(form), name = String(fd.get('name') || '').trim(), message = String(fd.get('message') || '').trim();
      if (!name || message.length < 2) { status.textContent = !name ? 'Add the name you’d like shown.' : ERR.invalid; status.dataset.tone = 'err'; return; }
      const v = visitor();
      if (!v || v.name !== name) saveVisitor({ name, look: v ? v.look : LOOK_DEFAULT, shown: v ? v.shown : true });
      const entry = { message, exhibit: fd.get('exhibit') || null };
      if (kind === 'suggestions') entry.category = fd.get('category');
      btn.disabled = true; status.textContent = 'Pinning…'; status.dataset.tone = '';
      try {
        await wall.post(kind, entry);
        form.reset(); fillName(); count.textContent = '0 / 280';
        status.textContent = kind === 'guestbook' ? 'Thank you! Your note will appear once I’ve read it.' : 'Thank you! Your suggestion is in, and it will appear on the wall once I’ve read it.';
        status.dataset.tone = 'ok'; stats();
      } catch (err) {
        status.textContent = ERR[err.message] || 'Couldn’t reach the wall. Check your connection and try again.'; status.dataset.tone = 'err';
      } finally { btn.disabled = false; }
    });
  });

  // the archive: only real numbers
  const out = k => stat[k];
  function online() {
    const o = out('online'); if (!o) return;
    o.textContent = presence.status === 'live' ? String(presence.roster.size) : '—';
  }
  async function stats() {
    try {
      const s = await wall.stats();
      out('today').textContent = s.today; out('total').textContent = s.total;
      out('notes').textContent = s.notes; out('suggestions').textContent = s.suggestions;
      out('since').textContent = s.since ? 'since ' + new Date(s.since + 'T00:00:00Z').toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' }) : 'counting starts with the first explorer';
    } catch { out('since').textContent = 'the archive is unavailable right now'; }
  }
  bus.addEventListener('roster', online); bus.addEventListener('status', online); online();
  load('guestbook'); load('suggestions'); stats();
  setInterval(() => { if (!document.hidden) stats(); }, 60000);
}
