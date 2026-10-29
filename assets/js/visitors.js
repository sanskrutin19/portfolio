/* Name tags and emote bubbles that float above the people in the museum.
   (The people themselves are in people.js.) */
import * as THREE from 'three';

// a name tag / emote bubble that always faces the camera
export function makeLabel(text, { you = false, font = '"Geist", system-ui, sans-serif' } = {}) {
  const c = document.createElement('canvas'), g = c.getContext('2d'), s = 2;
  g.font = `600 ${26 * s}px ${font}`;
  const w = Math.ceil(g.measureText(text).width) + 40 * s, h = 46 * s;
  c.width = w; c.height = h;
  g.font = `600 ${26 * s}px ${font}`; g.textBaseline = 'middle'; g.textAlign = 'center';
  g.fillStyle = you ? 'rgba(155,61,34,.92)' : 'rgba(29,26,22,.82)';
  const r = h / 2; g.beginPath(); g.moveTo(r, 0); g.arcTo(w, 0, w, h, r); g.arcTo(w, h, 0, h, r); g.arcTo(0, h, 0, 0, r); g.arcTo(0, 0, w, 0, r); g.fill();
  g.fillStyle = '#f6f1e8'; g.fillText(text, w / 2, h / 2 + 1);
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false, transparent: true }));
  const k = 0.0023; sp.scale.set(w * k / s * 1.0, h * k / s, 1); sp.renderOrder = 10;
  sp.userData.dispose = () => { tex.dispose(); sp.material.dispose(); };
  return sp;
}
export const EMOTES = { wave: '👋', cheer: '🎉', heart: '♥', clap: '👏' };
export function makeEmote(kind) {
  const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d');
  g.fillStyle = '#f6f1e8'; g.beginPath(); g.arc(64, 60, 52, 0, Math.PI * 2); g.fill();
  g.beginPath(); g.moveTo(52, 104); g.lineTo(64, 126); g.lineTo(76, 104); g.fill();
  g.font = '64px "Segoe UI Emoji","Apple Color Emoji","Noto Color Emoji",sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillStyle = '#9b3d22'; g.fillText(EMOTES[kind] || '♥', 64, 64);
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false, transparent: true }));
  sp.scale.set(0.42, 0.42, 1); sp.renderOrder = 11;
  sp.userData.dispose = () => { tex.dispose(); sp.material.dispose(); };
  return sp;
}
