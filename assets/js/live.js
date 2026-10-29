/* The live museum: visitor identity, real-time presence and the wall's data.
   Everything here is optional. Without a configured backend (see
   assets/js/live-config.js and supabase/README.md) the museum works on its
   own and none of the shared features are shown — nothing is simulated.

   Presence transports
     supabase  Supabase Realtime (websocket presence + broadcast)
     local     BroadcastChannel between tabs of one browser; only with
               ?presence=local, for development and tests. */

const cfg = window.MUSEUM_LIVE || {};
const params = new URLSearchParams(location.search);
const localPresence = params.get('presence') === 'local';
export const dataReady = !!(cfg.url || cfg.rest);
export const liveReady = dataReady || localPresence;
const REST = cfg.rest || (cfg.url ? cfg.url.replace(/\/$/, '') + '/rest/v1' : '');

/* ---------------- visitor identity (this browser only) ---------------- */
const KEY = 'museum.visitor.v1';
const store = {
  get() { try { return JSON.parse(localStorage.getItem(KEY)) || null; } catch { return null; } },
  set(v) { try { localStorage.setItem(KEY, JSON.stringify(v)); } catch { /* private mode: lives for this visit */ } }
};
const uuid = () => (crypto.randomUUID ? crypto.randomUUID() : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
  const r = Math.random() * 16 | 0; return (c === 'x' ? r : (r & 3 | 8)).toString(16); }));
let me = store.get();
// a look is the character a visitor picked from the cast (assets/js/people.js)
const CAST_IDS = ['f02', 'f03', 'f08', 'f12', 'f15', 'fp02', 'm04', 'm06', 'm08', 'm09', 'm12', 'm17'];
export const LOOK_DEFAULT = { char: 'f02' };
export function visitor() { return me; }
export function cleanName(s) { return String(s || '').replace(/[\u0000-\u001f\u007f<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, 24); }
export function cleanLook(l) {
  l = l || {};
  if (CAST_IDS.includes(l.char)) return { char: l.char };
  return { char: l.body === 1 ? 'm08' : 'f02' };   // looks saved before the realistic cast
}
export function saveVisitor({ name, look, shown }) {
  me = { id: (me && me.id) || uuid(), name: cleanName(name) || 'Visitor', look: cleanLook(look), shown: shown !== false, since: (me && me.since) || Date.now() };
  store.set(me);
  bus.dispatchEvent(new CustomEvent('visitor', { detail: me }));
  logVisit();
  presence.retrack();
  return me;
}
export function forgetVisitor() { try { localStorage.removeItem(KEY); } catch {} me = null; presence.untrack(); bus.dispatchEvent(new CustomEvent('visitor', { detail: null })); }
export const bus = new EventTarget();

/* ---------------- REST (the wall + archive) ---------------- */
async function rest(path, { method = 'GET', body, prefer } = {}) {
  const h = { 'Content-Type': 'application/json' };
  if (cfg.anonKey) { h.apikey = cfg.anonKey; h.Authorization = 'Bearer ' + cfg.anonKey; }
  if (prefer) h.Prefer = prefer;
  const r = await fetch(REST + path, { method, headers: h, body: body ? JSON.stringify(body) : undefined });
  if (!r.ok) {
    let msg = 'error'; try { const j = await r.json(); msg = j.message || msg; } catch {}
    const e = new Error(msg); e.status = r.status; throw e;
  }
  return r.status === 204 || r.status === 201 ? null : r.json();
}
export const wall = {
  list(kind, limit = 30) {
    const cols = kind === 'suggestions' ? 'id,created_at,name,look,category,message,exhibit' : 'id,created_at,name,look,message,exhibit';
    return rest(`/${kind}?select=${cols}&order=created_at.desc&limit=${limit}`);
  },
  post(kind, entry) {
    if (!me) throw new Error('no_visitor');
    return rest('/' + kind, { method: 'POST', prefer: 'return=minimal', body: { visitor_id: me.id, name: me.name, look: me.look, ...entry } });
  },
  report(kind, id, reason) { return rest('/rpc/report_item', { method: 'POST', body: { p_kind: kind, p_id: id, vid: me ? me.id : uuid(), p_reason: reason || null } }); },
  stats() { return rest('/rpc/museum_stats', { method: 'POST', body: {} }); },
  // a private note: only Sanskruti can read it (no read access exists for visitors)
  privateNote({ name, message, contact }) {
    const v = me || saveVisitor({ name, look: LOOK_DEFAULT, shown: true });
    return rest('/private_notes', { method: 'POST', prefer: 'return=minimal', body: { visitor_id: v.id, name: cleanName(name) || v.name, look: v.look, message, contact: contact || null } });
  }
};
function logVisit() {
  if (!dataReady || !me) return;
  const day = new Date().toISOString().slice(0, 10), k = 'museum.visit.' + day;
  try { if (localStorage.getItem(k)) return; } catch {}
  rest('/rpc/log_visit', { method: 'POST', body: { vid: me.id } }).then(() => { try { localStorage.setItem(k, '1'); } catch {} }).catch(() => {});
}
if (me) logVisit();

/* ---------------- presence ---------------- */
// emits: 'roster' (Map id → {id,name,look,x,z,h}), 'move' {id,x,z,h}, 'emote' {id,kind}, 'status' 'connecting'|'live'|'offline'
let pos = { x: 0, z: 8, h: Math.PI };
let status = 'off';
const roster = new Map();
function setStatus(s) { if (s !== status) { status = s; bus.dispatchEvent(new CustomEvent('status', { detail: s })); } }
function emitRoster() { bus.dispatchEvent(new CustomEvent('roster', { detail: roster })); }
let inside = false;   // tracked only once the visitor has actually walked in (not on the title screen)
const meta = () => me && me.shown && inside ? { id: me.id, name: me.name, look: me.look, x: +pos.x.toFixed(2), z: +pos.z.toFixed(2), h: +pos.h.toFixed(2) } : null;

function supabaseTransport() {
  let ch = null, tracked = false;
  return {
    async start() {
      setStatus('connecting');
      const { createClient } = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/+esm');
      const sb = createClient(cfg.url, cfg.anonKey, { auth: { persistSession: false, autoRefreshToken: false }, realtime: { params: { eventsPerSecond: 12 } } });
      ch = sb.channel('museum-v1', { config: { presence: { key: me ? me.id : 'watcher-' + uuid() }, broadcast: { self: false } } });
      ch.on('presence', { event: 'sync' }, () => {
        const st = ch.presenceState(); roster.clear();
        // keyed by visitor id, so two tabs of one visitor count once
        Object.values(st).forEach(metas => { const m = metas[metas.length - 1]; if (m && m.id) roster.set(m.id, m); });
        emitRoster();
      })
        .on('broadcast', { event: 'mv' }, ({ payload }) => bus.dispatchEvent(new CustomEvent('move', { detail: payload })))
        .on('broadcast', { event: 'em' }, ({ payload }) => bus.dispatchEvent(new CustomEvent('emote', { detail: payload })))
        .subscribe(s => {
          if (s === 'SUBSCRIBED') { setStatus('live'); tracked = false; this.retrack(); }
          else if (s === 'CHANNEL_ERROR' || s === 'TIMED_OUT' || s === 'CLOSED') setStatus('offline');
        });
      addEventListener('pagehide', () => { try { ch.untrack(); sb.removeChannel(ch); } catch {} });
    },
    retrack() { const m = meta(); if (!ch || status !== 'live') return; if (m) { ch.track(m); tracked = true; } else if (tracked) { ch.untrack(); tracked = false; } },
    untrack() { if (ch && tracked) { ch.untrack(); tracked = false; } },
    send(event, payload) { if (ch && status === 'live') ch.send({ type: 'broadcast', event, payload }); }
  };
}

function localTransport() {   // real presence between tabs of this browser (dev / tests)
  const bc = new BroadcastChannel('museum-presence-v1');
  const seen = new Map(), tabId = uuid();
  const hello = () => { const m = meta(); bc.postMessage(m ? { t: 'here', tab: tabId, m } : { t: 'bye', tab: tabId }); };
  const prune = () => {
    const now = Date.now(); roster.clear();
    for (const [tab, s] of seen) { if (now - s.at > 9000) seen.delete(tab); else roster.set(s.m.id, s.m); }
    const m = meta(); if (m) roster.set(m.id, m);
    emitRoster();
  };
  bc.onmessage = ({ data: d }) => {
    if (d.t === 'here') { const isNew = !seen.has(d.tab); seen.set(d.tab, { m: d.m, at: Date.now() }); if (isNew) { hello(); } prune(); }
    else if (d.t === 'bye') { seen.delete(d.tab); prune(); }
    else if (d.t === 'mv' || d.t === 'em') bus.dispatchEvent(new CustomEvent(d.t === 'mv' ? 'move' : 'emote', { detail: d.p }));
  };
  return {
    start() { setStatus('live'); hello(); setInterval(() => { hello(); prune(); }, 3000); addEventListener('pagehide', () => bc.postMessage({ t: 'bye', tab: tabId })); prune(); },
    retrack() { hello(); prune(); },
    untrack() { bc.postMessage({ t: 'bye', tab: tabId }); prune(); },
    send(event, payload) { bc.postMessage({ t: event, p: payload }); }
  };
}

const transport = localPresence ? localTransport() : (cfg.url && cfg.anonKey ? supabaseTransport() : null);
export const presenceReady = !!transport;
let lastSent = 0, lastPos = '';
export const presence = {
  get status() { return status; },
  roster,
  setInside(v) { inside = !!v; if (transport) transport.retrack(); },
  start() { if (transport && status === 'off') Promise.resolve(transport.start()).catch(() => setStatus('offline')); },
  retrack() { if (transport) transport.retrack(); },
  untrack() { if (transport) transport.untrack(); },
  // called every frame with the player's position; sends ~6×/s while moving
  move(x, z, h, now) {
    pos = { x, z, h };
    if (!transport || !me || !me.shown || !inside || status !== 'live') return;
    const key = x.toFixed(2) + z.toFixed(2) + h.toFixed(1);
    if (key === lastPos || now - lastSent < 160) return;
    lastSent = now; lastPos = key;
    transport.send('mv', { id: me.id, x: +x.toFixed(2), z: +z.toFixed(2), h: +h.toFixed(2) });
    if (!this._t || now - this._t > 8000) { this._t = now; transport.retrack(); }   // refresh presence for late joiners
  },
  emote(kind) { if (transport && me && me.shown && inside) transport.send('em', { id: me.id, kind }); }
};
