/* Visitor avatars: small, soft "museum figurines" built from a handful of
   primitives, so a room full of visitors costs almost nothing to draw.
   A look is { style, skin, outfit, acc } — indices into the lists below. */
import * as THREE from 'three';

export const STYLES = ['Bob', 'Curls', 'Bun', 'Crop'];
export const SKINS = ['#f3d2b8', '#e6b996', '#c99a76', '#a87553', '#7d5136', '#5a3a26'];
export const OUTFITS = [
  { name: 'Terracotta', top: '#9b3d22', low: '#3a2a20' }, { name: 'Ink', top: '#2a241c', low: '#5e574d' },
  { name: 'Sage', top: '#5c6b4a', low: '#2a241c' }, { name: 'Ochre', top: '#c9a26a', low: '#3b4a6b' },
  { name: 'Indigo', top: '#3b4a6b', low: '#c9b79c' }, { name: 'Plum', top: '#6b3b5a', low: '#2a241c' }
];
export const ACCS = ['None', 'Glasses', 'Scarf', 'Beret'];
const HAIR = '#2b1d14';

const mats = new Map();
function mat(color, rough = 0.75, metal = 0) {
  const k = color + rough + metal;
  if (!mats.has(k)) mats.set(k, new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal }));
  return mats.get(k);
}
const G = {
  torso: new THREE.CapsuleGeometry(0.2, 0.34, 6, 16),
  skirt: new THREE.CylinderGeometry(0.2, 0.27, 0.3, 20, 1, true),
  limb: new THREE.CapsuleGeometry(0.06, 0.42, 4, 10),
  arm: new THREE.CapsuleGeometry(0.052, 0.38, 4, 10),
  head: new THREE.SphereGeometry(0.17, 24, 18),
  neck: new THREE.CylinderGeometry(0.06, 0.07, 0.1, 10),
  cap: new THREE.SphereGeometry(0.182, 24, 14, 0, Math.PI * 2, 0, Math.PI * 0.55),
  bobSide: new THREE.SphereGeometry(0.19, 20, 14, Math.PI * 0.15, Math.PI * 1.7, Math.PI * 0.3, Math.PI * 0.42),
  curl: new THREE.SphereGeometry(0.065, 10, 8),
  bun: new THREE.SphereGeometry(0.085, 14, 10),
  lens: new THREE.TorusGeometry(0.045, 0.009, 6, 16),
  bridge: new THREE.CylinderGeometry(0.006, 0.006, 0.04, 6),
  scarf: new THREE.TorusGeometry(0.11, 0.045, 8, 20),
  beret: new THREE.CylinderGeometry(0.17, 0.2, 0.07, 22),
  shoe: new THREE.SphereGeometry(0.07, 10, 8),
  eye: new THREE.SphereGeometry(0.016, 8, 6)
};

export function makeFigure(look) {
  const group = new THREE.Group();
  const body = new THREE.Group(); group.add(body);
  const parts = {};
  function build(l) {
    while (body.children.length) body.remove(body.children[0]);
    const skin = mat(SKINS[l.skin] || SKINS[2]), o = OUTFITS[l.outfit] || OUTFITS[0];
    const top = mat(o.top, 0.8), low = mat(o.low, 0.85), hair = mat(HAIR, 0.6);
    const add = (geo, m, x, y, z, parent = body) => { const me = new THREE.Mesh(geo, m); me.position.set(x, y, z); parent.add(me); return me; };
    // legs (pivot at the hip)
    parts.legs = [-1, 1].map(s => { const hip = new THREE.Group(); hip.position.set(s * 0.09, 0.62, 0); body.add(hip);
      add(G.limb, low, 0, -0.28, 0, hip); const sh = add(G.shoe, mat('#1d1a16', 0.5), 0, -0.56, 0.03, hip); sh.scale.set(1, 0.6, 1.5); return hip; });
    add(G.torso, top, 0, 0.98, 0);
    const skirt = add(G.skirt, top, 0, 0.7, 0); skirt.material = top;
    add(G.neck, skin, 0, 1.27, 0);
    // arms (pivot at the shoulder)
    parts.arms = [-1, 1].map(s => { const sh = new THREE.Group(); sh.position.set(s * 0.25, 1.18, 0); sh.rotation.z = s * 0.12; body.add(sh);
      add(G.arm, top, 0, -0.2, 0, sh); add(G.curl, skin, 0, -0.45, 0, sh).scale.setScalar(0.85); return sh; });
    const head = new THREE.Group(); head.position.set(0, 1.46, 0); body.add(head); parts.head = head;
    add(G.head, skin, 0, 0, 0, head);
    [-1, 1].forEach(s => add(G.eye, mat('#1d1a16', 0.3), s * 0.06, 0.01, 0.155, head));
    // hair
    const capM = add(G.cap, hair, 0, 0.01, -0.005, head); capM.rotation.x = -0.25;
    if (l.style === 0) { const side = add(G.bobSide, hair, 0, -0.03, -0.01, head); side.rotation.y = Math.PI; }
    if (l.style === 1) { for (let i = 0; i < 14; i++) { const a = (i / 14) * Math.PI * 2, r = 0.16; add(G.curl, hair, Math.cos(a) * r, 0.06 + Math.sin(i * 1.7) * 0.05, Math.sin(a) * r - 0.02, head); } }
    if (l.style === 2) add(G.bun, hair, 0, 0.16, -0.1, head);
    if (l.style === 3) capM.scale.set(1, 0.85, 1);
    // accessory
    if (l.acc === 1) { [-1, 1].forEach(s => add(G.lens, mat('#1d1a16', 0.3, 0.4), s * 0.06, 0.01, 0.165, head)); add(G.bridge, mat('#1d1a16'), 0, 0.012, 0.168, head).rotation.z = Math.PI / 2; }
    if (l.acc === 2) { const sc = add(G.scarf, mat(o.top === '#9b3d22' ? '#c9a26a' : '#9b3d22', 0.9), 0, 1.25, 0); sc.rotation.x = Math.PI / 2; }
    if (l.acc === 3) { const b = add(G.beret, mat(o.top === '#2a241c' ? '#9b3d22' : '#2a241c', 0.9), 0.02, 0.14, -0.02, head); b.rotation.z = -0.18; }
    body.traverse(m => { if (m.isMesh) m.castShadow = false; });
  }
  build(cleanLook(look));
  // a soft shadow
  const blob = new THREE.Mesh(new THREE.CircleGeometry(0.26, 24), new THREE.MeshBasicMaterial({ color: '#2a241c', transparent: true, opacity: 0.13, depthWrite: false }));
  blob.rotation.x = -Math.PI / 2; blob.position.y = 0.01; group.add(blob);
  return {
    group,
    setLook(l) { build(cleanLook(l)); },
    // walk 0..1, phase radians, wave 0..1, t seconds
    pose(walk, phase, wave, t) {
      const sw = Math.sin(phase) * walk;
      parts.legs[0].rotation.x = sw * 0.6; parts.legs[1].rotation.x = -sw * 0.6;
      parts.arms[0].rotation.x = -sw * 0.5; parts.arms[1].rotation.x = sw * 0.5 * (1 - wave);
      parts.arms[1].rotation.z = 0.12 + wave * 2.5; parts.arms[1].rotation.y = wave * Math.sin(t * 12) * 0.35;
      body.position.y = Math.abs(Math.cos(phase)) * 0.035 * walk + Math.sin(t * 2) * 0.004 * (1 - walk);
      parts.head.rotation.z = Math.sin(t * 1.3) * 0.03 * (1 - walk);
    }
  };
}
function cleanLook(l) { l = l || {}; const n = (v, m) => Math.max(0, Math.min(m, v | 0)); return { style: n(l.style, 3), skin: n(l.skin, 5), outfit: n(l.outfit, 5), acc: n(l.acc, 3) }; }

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
