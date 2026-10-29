/* Little game sounds, synthesised with Web Audio (no files to download).
   Quiet by design, silent until the visitor's first click (browser rule),
   and one mute switch remembered in this browser. */
const KEY = 'museum.mute';
let ctx = null, master = null;
let muted = (() => { try { return localStorage.getItem(KEY) === '1'; } catch { return false; } })();
const listeners = new Set();

function audio() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return null;
    ctx = new AC(); master = ctx.createGain(); master.gain.value = 0.16; master.connect(ctx.destination);
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}
function tone(freq, start, dur, { type = 'sine', vol = 1, glide = 0 } = {}) {
  const a = audio(); if (!a || muted) return;
  const t0 = a.currentTime + start, o = a.createOscillator(), g = a.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, t0);
  if (glide) o.frequency.exponentialRampToValueAtTime(freq * glide, t0 + dur);
  g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(vol, t0 + 0.012); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g); g.connect(master); o.start(t0); o.stop(t0 + dur + 0.02);
}
export const sfx = {
  hover() { tone(880, 0, 0.05, { type: 'triangle', vol: 0.25 }); },
  click() { tone(520, 0, 0.08, { type: 'triangle', vol: 0.6 }); tone(780, 0.04, 0.09, { type: 'triangle', vol: 0.45 }); },
  start() { [392, 523, 659, 784].forEach((f, i) => tone(f, i * 0.07, 0.22, { type: 'triangle', vol: 0.55 })); },
  blip() { tone(300 + Math.random() * 60, 0, 0.035, { type: 'square', vol: 0.12 }); },
  discover() { [659, 784, 988, 1319].forEach((f, i) => tone(f, i * 0.08, 0.3, { type: 'sine', vol: 0.7 })); },
  complete() { [523, 659, 784, 1047, 784, 1047, 1319].forEach((f, i) => tone(f, i * 0.11, 0.34, { type: 'triangle', vol: 0.6 })); },
  pop() { tone(660, 0, 0.12, { type: 'sine', vol: 0.5, glide: 1.6 }); },
  step() { tone(140, 0, 0.05, { type: 'sine', vol: 0.18 }); },
  get muted() { return muted; },
  setMuted(v) { muted = !!v; try { localStorage.setItem(KEY, muted ? '1' : '0'); } catch {} listeners.forEach(fn => fn(muted)); if (!muted) this.click(); },
  onChange(fn) { listeners.add(fn); fn(muted); },
  unlock() { audio(); }
};
// buttons inside the game click; the first gesture also unlocks audio
addEventListener('pointerdown', () => audio(), { once: true, capture: true });
document.addEventListener('click', e => { if (e.target.closest('.mu-btn, .hud-btn, .sel-card, .sel-tab, .dlg-next, .gm-item')) sfx.click(); }, true);
