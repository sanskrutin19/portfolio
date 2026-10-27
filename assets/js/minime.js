/* Mini-me: a 3D Sanskruti (styled after her avatar: long wavy centre-parted
   hair, sage collared shirt, flared jeans, white sneakers).
   - In the hero she stands large in the middle and turns toward the cursor.
   - After the hero she shrinks into a companion that roams the whole screen:
     she walks to the cursor in any direction, wanders on her own, and can be
     picked up and dragged anywhere. Click her and she says hi.
   Built from primitives and animated procedurally. */
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

const root = document.documentElement;
const canvas = document.getElementById('avatar-canvas');
const bubble = document.getElementById('mini-bubble');
const hit = document.getElementById('mini-hit');
const hideBtn = document.getElementById('mini-hide');
const heroEl = document.getElementById('home');
if (!canvas || !hit) throw new Error('mini-me markup missing');
root.classList.add('avatar-on');

/* ---------------- renderer: one transparent full-screen layer, px units ---------------- */
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
const narrowScreen = () => window.innerWidth < 640;
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, narrowScreen() ? 1.5 : 2));
renderer.setClearColor(0x000000, 0);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
const scene = new THREE.Scene();
let W = window.innerWidth, H = window.innerHeight;
const cam = new THREE.OrthographicCamera(0, W, 0, -H, -6000, 6000);

scene.add(new THREE.HemisphereLight(0xffffff, 0xb9b2a4, 1.5));
const key = new THREE.DirectionalLight(0xffffff, 2.1); key.position.set(0.6, 0.9, 1); scene.add(key);
const rim = new THREE.DirectionalLight(0xbcd0ff, 1.1); rim.position.set(-1, 0.4, -0.8); scene.add(rim);

/* ---------------- palette ---------------- */
const COL = {
  skin: '#dca586', skinShade: '#c68a6a', hair: '#1e1613', hairShine: '#5c4438', shirt: '#c6d7a6', shirtLight: '#d7e4bd',
  button: '#f1f4ea', jeans: '#4f6d9c', jeansDark: '#3e5781', shoe: '#f5f5f2', sole: '#d6d6d2',
  iris: '#4a2a1a', mouth: '#5e1d22', lip: '#b45e5c', blush: '#e2837c', brow: '#1b1311', gold: '#d6a743'
};
const mat = (c, rough = 0.72, metal = 0) => new THREE.MeshStandardMaterial({ color: c, roughness: rough, metalness: metal });
const M = {
  skin: mat(COL.skin, 0.6), skinShade: mat(COL.skinShade, 0.6), hair: mat(COL.hair, 0.55),
  hairSheet: new THREE.MeshStandardMaterial({ color: COL.hair, roughness: 0.5, side: THREE.DoubleSide }),
  hairShine: new THREE.MeshStandardMaterial({ color: COL.hairShine, roughness: 0.3 }),
  shirt: mat(COL.shirt, 0.82), shirtLight: mat(COL.shirtLight, 0.82), button: mat(COL.button, 0.4),
  jeans: mat(COL.jeans, 0.88), jeansDark: mat(COL.jeansDark, 0.9), shoe: mat(COL.shoe, 0.55), sole: mat(COL.sole, 0.7),
  white: new THREE.MeshBasicMaterial({ color: '#ffffff' }), black: new THREE.MeshBasicMaterial({ color: '#0d0d0d' }),
  iris: mat(COL.iris, 0.3), mouth: new THREE.MeshBasicMaterial({ color: COL.mouth }), lip: mat(COL.lip, 0.5),
  brow: mat(COL.brow, 0.8), gold: mat(COL.gold, 0.3, 0.8),
  blush: new THREE.MeshBasicMaterial({ color: COL.blush, transparent: true, opacity: 0.22 }),
  // wardrobe: these are recoloured when the outfit changes
  top: mat('#f3a6bb', 0.8), topSheet: new THREE.MeshStandardMaterial({ color: '#f3a6bb', roughness: 0.8, side: THREE.DoubleSide }),
  trim: mat('#fffaf5', 0.7), bow: mat('#d95f7f', 0.55), lapel: mat('#151621', 0.7),
  thigh: mat(COL.skin, 0.6), lower: mat(COL.jeans, 0.88), upperArm: mat(COL.skin, 0.6), forearm: mat(COL.skin, 0.6),
  bottom: mat('#f3a6bb', 0.8), sock: mat('#fbfaf7', 0.8), goldBtn: mat('#d6a743', 0.3, 0.8)
};
const capsule = (r, len, cap = 12, rad = 28) => new THREE.CapsuleGeometry(r, len, cap, rad);
// one continuous, tapered limb segment with rounded ends, so joints blend instead of breaking
function limb(parent, rTop, rBot, len, m, y0 = 0) {
  add(parent, new THREE.CylinderGeometry(rTop, rBot, len, 32, 1, true), m, 0, y0 - len / 2, 0);
  add(parent, new THREE.SphereGeometry(rTop, 32, 18), m, 0, y0, 0);
  add(parent, new THREE.SphereGeometry(rBot, 32, 18), m, 0, y0 - len, 0);
}
const add = (parent, geo, m, x = 0, y = 0, z = 0) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); parent.add(o); return o; };

/* wavy hair lock hanging from its top (origin): fuller in the middle,
   tapering to a soft curl at the tip */
function strand(r, len, phase, amp = 0.05, freq = 7.5, curl = 1) {
  const g = new THREE.CapsuleGeometry(r, len, 12, 14);
  g.translate(0, -len / 2, 0);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const y = p.getY(i), t = Math.min(1, Math.max(0, -y / len));
    const body = 1 + Math.sin(t * Math.PI) * 0.18 - t * t * 0.45;
    let x = p.getX(i) * body + Math.sin(y * freq + phase) * amp * t;
    let z = p.getZ(i) * body * (1 - t * 0.2) + Math.cos(y * freq * 0.8 + phase) * amp * 0.5 * t;
    if (t > 0.78) { const c = (t - 0.78) / 0.22; x += c * c * 0.07 * curl; z += c * c * 0.06; }
    p.setX(i, x); p.setZ(i, z);
  }
  g.computeVertexNormals();
  return g;
}

/* ---------------- the character (units; feet at y = 0, ~2.72 tall) ---------------- */
const HEIGHT_UNITS = 2.9;
const fig = new THREE.Group();        // screen position + scale
const yawG = new THREE.Group();       // facing direction
const body = new THREE.Group();       // squash / bob
fig.add(yawG); yawG.add(body); scene.add(fig);
fig.rotation.x = 0.1;                 // look slightly from above

// wardrobe: meshes tagged with the outfits they belong to
const OUTFIT_PARTS = { dress: [], casual: [], smart: [] };
function only(mesh, ...outfits) { outfits.forEach(o => OUTFIT_PARTS[o].push(mesh)); return mesh; }

// legs: tapered thigh and shin that bend at a rounded knee
function leg(s) {
  const hip = new THREE.Group(); hip.position.set(s * 0.12, 1.12, 0); body.add(hip);
  limb(hip, 0.112, 0.094, 0.52, M.thigh);
  const knee = new THREE.Group(); knee.position.y = -0.52; hip.add(knee);
  only(add(knee, new THREE.CylinderGeometry(0.1, 0.16, 0.5, 32, 1, true), M.lower, 0, -0.25, 0), 'casual');
  only(add(knee, new THREE.SphereGeometry(0.1, 32, 18), M.lower), 'casual');
  only(add(knee, new THREE.CircleGeometry(0.16, 32), M.jeansDark, 0, -0.5, 0), 'casual').rotation.x = Math.PI / 2;
  const straight = new THREE.Group(); knee.add(straight); limb(straight, 0.095, 0.088, 0.47, M.lower); straight.children.forEach(m => only(m, 'smart'));
  const calf = new THREE.Group(); knee.add(calf); limb(calf, 0.09, 0.064, 0.42, M.skin); calf.children.forEach(m => only(m, 'dress'));
  const shoe = add(knee, new RoundedBoxGeometry(0.2, 0.12, 0.36, 4, 0.055), M.shoe, 0, -0.535, 0.06);
  add(shoe, new RoundedBoxGeometry(0.21, 0.035, 0.37, 2, 0.015), M.sole, 0, -0.055, 0);
  return { hip, knee };
}
const legL = leg(-1), legR = leg(1);
add(body, new THREE.SphereGeometry(0.27, 24, 16), M.bottom, 0, 1.15, 0).scale.set(0.9, 0.5, 0.7);

// torso: one bodice, with per-outfit details
const torso = new THREE.Group(); body.add(torso);
add(torso, capsule(0.245, 0.32), M.top, 0, 1.5, 0).scale.set(1, 1, 0.74);
add(torso, new THREE.SphereGeometry(0.27, 40, 24), M.top, 0, 1.74, 0).scale.set(1.18, 0.42, 0.74);   // shoulder yoke
only(add(torso, new THREE.CylinderGeometry(0.25, 0.29, 0.24, 24), M.top, 0, 1.14, 0), 'casual', 'smart').scale.set(1, 1, 0.78);
for (const s of [-1, 1]) {
  only(add(torso, new THREE.BoxGeometry(0.14, 0.075, 0.03), M.trim, s * 0.075, 1.86, 0.15), 'casual', 'smart').rotation.set(-0.35, 0, s * -0.55);
  // smart: blazer lapels
  const lap = only(add(torso, new THREE.BoxGeometry(0.07, 0.3, 0.02), M.lapel, s * 0.085, 1.66, 0.19), 'smart');
  lap.rotation.set(-0.1, 0, s * 0.35);
}
only(add(torso, new THREE.BoxGeometry(0.014, 0.5, 0.01), M.trim, 0, 1.55, 0.186), 'casual');
for (const y of [1.7, 1.56, 1.42, 1.28]) only(add(torso, new THREE.SphereGeometry(0.014, 8, 6), M.button, 0, y, 0.19), 'casual');
const neck = new THREE.Shape(); neck.moveTo(-0.07, 0.12); neck.lineTo(0.07, 0.12); neck.lineTo(0, -0.05); neck.lineTo(-0.07, 0.12);
only(add(torso, new THREE.ShapeGeometry(neck), M.skin, 0, 1.72, 0.183), 'dress');   // soft V neckline
const vShape = new THREE.Shape(); vShape.moveTo(-0.08, 0.2); vShape.lineTo(0.08, 0.2); vShape.lineTo(0, -0.06); vShape.lineTo(-0.08, 0.2);
only(add(torso, new THREE.ShapeGeometry(vShape), M.trim, 0, 1.64, 0.185), 'smart');
for (const y of [1.42, 1.3]) only(add(torso, new THREE.SphereGeometry(0.016, 8, 6), M.goldBtn, 0.02, y, 0.19), 'smart');
// dress: a thin self-tie belt at the waist
const band = only(add(torso, new THREE.TorusGeometry(0.247, 0.012, 10, 48), M.bow, 0, 1.2, 0), 'dress');
band.rotation.x = Math.PI / 2; band.scale.set(1, 0.76, 1);
// dress: an A-line midi skirt with soft, natural folds (sways and twirls)
const skirt = only(new THREE.Group(), 'dress'); skirt.position.y = 1.21; body.add(skirt);
const skirtGeo = (() => {
  const g = new THREE.CylinderGeometry(0.255, 0.43, 0.8, 72, 10, true);
  g.translate(0, -0.4, 0);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const ang = Math.atan2(x, z), t = -y / 0.8;
    const fold = 1 + (Math.sin(ang * 6 + 0.7) * 0.6 + Math.sin(ang * 11) * 0.4) * 0.03 * t;
    p.setX(i, x * fold); p.setZ(i, z * fold * 0.9);
    p.setY(i, y + Math.sin(ang * 5) * 0.012 * t);
  }
  g.computeVertexNormals();
  return g;
})();
add(skirt, skirtGeo, M.topSheet);
add(body, new THREE.CylinderGeometry(0.068, 0.075, 0.16, 14), M.skin, 0, 1.93, -0.01);
add(body, new THREE.SphereGeometry(0.075, 12, 8), M.skin, 0, 1.86, 0.1).scale.set(1, 0.5, 0.4);

// arms: sleeve (puffed for the dress), then one smooth tapered arm with a rounded elbow
function arm(s) {
  const sh = new THREE.Group(); sh.position.set(s * 0.31, 1.78, 0); body.add(sh);
  only(add(sh, capsule(0.095, 0.12), M.top, 0, -0.09, 0), 'casual', 'smart');
  only(add(sh, new THREE.SphereGeometry(0.105, 32, 20), M.top, 0, -0.08, 0), 'dress').scale.set(1, 0.72, 0.95);   // short cap sleeve
  limb(sh, 0.066, 0.058, 0.42, M.upperArm, -0.0);
  const el = new THREE.Group(); el.position.y = -0.42; sh.add(el);
  limb(el, 0.058, 0.05, 0.25, M.forearm);
  add(el, new THREE.SphereGeometry(0.07, 28, 18), M.skin, 0, -0.32, 0.005).scale.set(0.85, 1.12, 0.66);   // mitten hand
  add(el, new THREE.SphereGeometry(0.028, 16, 10), M.skin, -s * 0.05, -0.29, 0.03);                       // thumb
  return { sh, el };
}
const armL = arm(-1), armR = arm(1);

const OUTFITS = {
  dress:  { label: 'Dusty-rose midi.', top: '#cf9c96', trim: '#e9cdc8', bow: '#a7716c', bottom: '#cf9c96', thigh: COL.skin, lower: COL.skin, shoe: '#f4f3ef', sole: '#d9d8d3', upperArm: COL.skin, forearm: COL.skin },
  casual: { label: 'Casual Friday.', top: COL.shirt, trim: COL.shirtLight, bow: '#d95f7f', bottom: COL.jeans, thigh: COL.jeans, lower: COL.jeans, shoe: COL.shoe, sole: COL.sole, upperArm: COL.skin, forearm: COL.skin },
  smart:  { label: 'Interview mode.', top: '#1f2130', trim: '#f6f6f2', bow: '#d95f7f', bottom: '#23242d', thigh: '#23242d', lower: '#23242d', shoe: '#151515', sole: '#2b2b2b', upperArm: '#1f2130', forearm: '#1f2130' }
};
const OUTFIT_ORDER = ['dress', 'casual', 'smart'];
let outfit = 'dress';
function wear(name) {
  const o = OUTFITS[name]; outfit = name;
  M.top.color.set(o.top); M.topSheet.color.set(o.top); M.trim.color.set(o.trim); M.bow.color.set(o.bow);
  M.bottom.color.set(o.bottom); M.thigh.color.set(o.thigh); M.lower.color.set(o.lower);
  M.shoe.color.set(o.shoe); M.sole.color.set(o.sole); M.upperArm.color.set(o.upperArm); M.forearm.color.set(o.forearm);
  Object.values(OUTFIT_PARTS).forEach(list => list.forEach(m => { m.visible = false; }));
  OUTFIT_PARTS[name].forEach(m => { m.visible = true; });
}
try { const saved = localStorage.getItem('minime-outfit'); if (OUTFITS[saved]) outfit = saved; } catch (e) {}

// head (built at radius 0.42, scaled up a little for a cuter, chibi-ish look)
const headPivot = new THREE.Group(); headPivot.position.y = 1.98; body.add(headPivot);
const head = new THREE.Group(); head.position.y = 0.4; head.scale.setScalar(0.95); headPivot.add(head);
// an oval face: full at the cheeks, tapering to a soft chin (lathe profile)
const faceProfile = [[0, -0.46], [0.1, -0.448], [0.2, -0.405], [0.29, -0.31], [0.355, -0.17], [0.392, -0.02],
  [0.405, 0.1], [0.4, 0.22], [0.36, 0.33], [0.27, 0.42], [0.14, 0.47], [0, 0.485]].map(([x, y]) => new THREE.Vector2(x, y));
add(head, new THREE.LatheGeometry(faceProfile, 48), M.skin).scale.set(0.97, 1, 0.9);
for (const s of [-1, 1]) add(head, new THREE.SphereGeometry(0.07, 14, 10), M.skin, s * 0.39, 0.0, -0.02).scale.set(0.5, 1, 0.8);

// face: almond-shaped eyes lifted at the outer corner, defined upper lids, soft brows
const eyes = [];
for (const s of [-1, 1]) {
  const eye = new THREE.Group(); eye.position.set(s * 0.15, 0.03, 0.322); eye.rotation.set(0, s * 0.34, s * 0.13); head.add(eye);
  add(eye, new THREE.SphereGeometry(0.088, 32, 18), M.white).scale.set(1.28, 0.6, 0.4);
  add(eye, new THREE.SphereGeometry(0.05, 28, 16), M.iris, 0, -0.002, 0.026).scale.set(1, 1, 0.4);
  add(eye, new THREE.SphereGeometry(0.024, 16, 10), M.black, 0, -0.002, 0.038).scale.set(1, 1, 0.4);
  add(eye, new THREE.SphereGeometry(0.012, 10, 8), M.white, 0.018, 0.016, 0.047);
  const lid = add(eye, new THREE.TorusGeometry(0.112, 0.01, 8, 32, Math.PI), M.black, 0, -0.004, 0.02);
  lid.scale.set(1, 0.5, 1);                                   // upper lash line follows the almond
  const wing = add(eye, new THREE.CapsuleGeometry(0.006, 0.03, 3, 8), M.black, s * 0.118, 0.012, 0.018);
  wing.rotation.z = -s * 1.05;                                // tiny lifted outer corner
  eyes.push(eye);
  const brow = add(head, new THREE.TorusGeometry(0.1, 0.009, 8, 20, Math.PI * 0.42), M.brow, s * 0.152, 0.075, 0.338);
  brow.rotation.set(0, s * 0.34, Math.PI * 0.3 - s * 0.05);
  add(head, new THREE.CircleGeometry(0.075, 24), M.blush, s * 0.215, -0.11, 0.287).rotation.y = s * 0.6;
  add(head, new THREE.TorusGeometry(0.04, 0.009, 6, 16), M.gold, s * 0.39, -0.12, 0.0).rotation.y = Math.PI / 2;
}
add(head, new THREE.SphereGeometry(0.026, 12, 8), M.skinShade, 0, -0.085, 0.352).scale.set(1.1, 0.8, 1);
const mouth = new THREE.Group(); mouth.position.set(0, -0.225, 0.3); mouth.rotation.x = -0.12; mouth.scale.setScalar(0.9); head.add(mouth);
const mouthBase = 0.9;
add(mouth, new THREE.CircleGeometry(0.08, 24, Math.PI, Math.PI), M.mouth);
add(mouth, new THREE.CircleGeometry(0.075, 24, Math.PI, Math.PI), M.white, 0, 0, 0.002).scale.set(1, 0.3, 1);
add(mouth, new THREE.TorusGeometry(0.08, 0.011, 6, 24, Math.PI), M.lip, 0, 0, 0.002).rotation.z = Math.PI;

// hair: lots of volume at the crown and sides, a centre part, short curtain layers
// framing the face, and a loose side braid falling over one shoulder
const hair = new THREE.Group(); head.add(hair);
const cap = add(hair, new THREE.SphereGeometry(0.47, 56, 32, 0, Math.PI * 2, 0, Math.PI * 0.6), M.hair, 0, 0.05, -0.02);
cap.rotation.x = -1.15; cap.scale.set(1.12, 1.1, 1.12);
add(hair, new THREE.SphereGeometry(0.47, 56, 32, Math.PI, Math.PI, Math.PI * 0.1, Math.PI * 0.66), M.hair, 0, 0.02, -0.02).scale.set(1.12, 1.08, 1.12);
add(hair, new THREE.SphereGeometry(0.33, 40, 24), M.hair, 0, 0.3, -0.12).scale.set(1.18, 1, 1.1);   // crown lift
for (const s of [-1, 1]) add(hair, new THREE.SphereGeometry(0.3, 40, 24), M.hair, s * 0.36, -0.06, -0.1).scale.set(0.5, 0.95, 0.85);   // side fullness
const part = add(hair, new THREE.TorusGeometry(0.505, 0.009, 8, 32, Math.PI * 0.26), M.skin, 0, 0.05, -0.02);
part.rotation.set(-1.15, -Math.PI / 2, 0);

// soft wavy mass falling behind the shoulders
const backHair = new THREE.Group(); hair.add(backHair);
function sheet(rTop, rBot, h, phase) {
  const g = new THREE.CylinderGeometry(rTop, rBot, h, 64, 22, true, Math.PI * 0.45, Math.PI * 1.1);
  g.translate(0, -h / 2 + 0.1, 0);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const ang = Math.atan2(x, z), t = Math.min(1, Math.max(0, (0.1 - y) / h));
    const wave = 1 + Math.sin(y * 7 + ang * 3 + phase) * 0.045 * t + Math.sin(ang * 9 + phase) * 0.015;
    p.setX(i, x * wave); p.setZ(i, z * wave);
    p.setY(i, y + Math.sin(ang * 5 + phase) * 0.05 * t * t);
  }
  g.computeVertexNormals();
  return g;
}
add(backHair, sheet(0.52, 0.68, 1.15, 0), M.hairSheet, 0, 0.02, -0.04);
add(backHair, sheet(0.49, 0.6, 1.0, 1.7), M.hairSheet, 0, 0.02, -0.07);

// face-framing curtain layers: short at the front, sweeping outward
const frontHair = [];
for (const s of [-1, 1]) {
  const short = add(hair, strand(0.07, 0.4, s * 1.1, 0.03, 8, s), M.hair, s * 0.2, 0.36, 0.33);
  short.scale.set(1.8, 1, 0.42); short.rotation.set(-0.3, s * 0.3, s * 0.38);
  const cheek = add(hair, strand(0.075, 0.5, s * 2.3, 0.04, 8, s), M.hair, s * 0.33, 0.2, 0.24);
  cheek.scale.set(1.7, 1, 0.45); cheek.rotation.set(-0.2, s * 0.35, s * 0.22);
  const jaw = add(hair, strand(0.08, 0.66, s * 0.4, 0.05, 7, s), M.hair, s * 0.41, 0.08, 0.12);
  jaw.scale.set(1.6, 1, 0.5); jaw.rotation.set(-0.08, s * 0.3, s * 0.1);
  frontHair.push(short, cheek, jaw);
}

// loose side braid over her right shoulder, three interlocking strands
const braid = new THREE.Group(); braid.position.set(-0.36, -0.08, 0.0); hair.add(braid);
const braidPivot = new THREE.Group(); braid.add(braidPivot);
const braidPath = new THREE.CatmullRomCurve3([
  new THREE.Vector3(0, 0, 0), new THREE.Vector3(0.0, -0.38, 0.16), new THREE.Vector3(0.08, -0.78, 0.33),
  new THREE.Vector3(0.14, -1.12, 0.37), new THREE.Vector3(0.17, -1.34, 0.36)
]);
const N_LOBES = 22;
for (let i = 0; i < N_LOBES; i++) {
  const u = i / (N_LOBES - 1), pt = braidPath.getPointAt(u), tan = braidPath.getTangentAt(u);
  const r = 0.095 - u * 0.035, side = i % 2 ? 1 : -1;
  const lobe = add(braidPivot, new THREE.SphereGeometry(r, 32, 20), M.hair, pt.x + side * r * 0.38, pt.y, pt.z);
  lobe.scale.set(0.95, 1.7, 0.78);
  lobe.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), tan);
  lobe.rotateZ(side * 0.55);
}
add(braidPivot, new THREE.TubeGeometry(braidPath, 64, 0.06, 20, false), M.hair);
const tieAt = braidPath.getPointAt(1);
add(braidPivot, new THREE.TorusGeometry(0.04, 0.016, 12, 28), M.bow, tieAt.x, tieAt.y - 0.02, tieAt.z).rotation.x = Math.PI / 2;
const tuft = add(braidPivot, strand(0.06, 0.26, 1, 0.03, 9, 1), M.hair, tieAt.x, tieAt.y - 0.04, tieAt.z);
tuft.scale.set(1.4, 1, 0.8);
const hairSpring = { a: 0, v: 0, b: 0, vb: 0 };
wear(outfit);


const shadow = new THREE.Mesh(new THREE.CircleGeometry(1, 40), new THREE.MeshBasicMaterial({ color: '#000', transparent: true, opacity: 0.16 }));
shadow.position.z = -3000; scene.add(shadow);

/* ---------------- sizing ---------------- */
function resize() {
  W = window.innerWidth; H = window.innerHeight;
  renderer.setSize(W, H, false);
  cam.right = W; cam.bottom = -H; cam.updateProjectionMatrix();
}
resize();
window.addEventListener('resize', resize);
const companionPx = () => (W < 640 ? 84 : W < 1024 ? 110 : 135);
const nameEl = document.getElementById('hero-title');
const skipBtn = document.getElementById('skip-intro');
const outfitBtn = document.getElementById('mini-outfit');
// where she stands in the hero, measured from the real layout on every screen size:
// beside the name when there is room, otherwise below the tagline on the right
const stageEl = document.getElementById('hero-stage');
const heroQ = s => document.querySelector(s);
let layoutCache = null, layoutAt = -1;
function heroLayout() {
  const now = performance.now();
  if (layoutCache && now - layoutAt < 120) return layoutCache;
  layoutAt = now;
  if (!stageEl || !nameEl) return (layoutCache = { x: W * 0.62, y: H - 40, px: Math.min(H * 0.42, W * 0.9), below: true });
  const st = stageEl.getBoundingClientRect();
  const nameBottom = st.top + nameEl.offsetHeight;
  const vis = el => el && el.offsetParent !== null ? el.getBoundingClientRect() : null;
  const roles = vis(heroQ('.hero-roles')), right = vis(heroQ('.hero-right')), tag = vis(heroQ('.hero-tag'));
  // beside the name
  let px = Math.min(H * 0.62, 560);
  let feet = Math.min(H - 30, nameBottom + px * 0.12);
  let x = st.right + px * 0.27;
  const headroom = r => (r && x + px * 0.25 > r.left && x - px * 0.25 < r.right ? r.bottom + 10 : 64);
  px = Math.min(px, feet - headroom(roles));
  feet = Math.min(H - 30, nameBottom + px * 0.12);
  x = Math.min(W - px * 0.26, st.right + px * 0.27);
  if (W - st.right - 12 >= px * 0.46 && px > H * 0.34) {
    root.classList.remove('hero-below');
    return (layoutCache = { x, y: feet, px, below: false });
  }
  // below the tagline, on the right-hand side
  const top = (tag ? tag.bottom : nameBottom) + 14;
  const floor = (right ? Math.min(H - 24, right.top - 6) : H - 24);
  px = Math.max(90, Math.min(floor - top, W * 0.9, H * 0.52));
  x = Math.max(px * 0.3, Math.min(W - px * 0.3, W * (W < 640 ? 0.66 : 0.7)));
  root.classList.add('hero-below');
  return (layoutCache = { x, y: floor, px, below: true });
}
const heroPx = () => heroLayout().px;
const heroAnchor = () => heroLayout();
window.addEventListener('resize', () => { layoutAt = -1; });

/* ---------------- speech ---------------- */
let bubbleTimer = 0, lastLine = '';
function say(text, ms = 4200) {
  if (!text || text === lastLine) return;
  lastLine = text;
  bubble.textContent = text;
  bubble.classList.add('show');
  clearTimeout(bubbleTimer);
  bubbleTimer = setTimeout(() => { bubble.classList.remove('show'); lastLine = ''; }, ms);
}
// she only speaks on a few sections, so she never talks over the content
const LINES = {
  home: "Hi! I'm Sanskruti. Drag me around, or scroll and I'll tag along.",
  work: 'More in the collection below.',
  about: 'Hi again! My projects are just below.',
  lens: "Ask my portfolio anything. I'll show you the evidence.",
  contact: "Say hi! I'd love to hear from you."
};
const CLICK_LINES = ['Hi there!', 'Want to see my projects?', 'Certified yapper, but a sensible talker.', 'Clumsy? Yeah… but always moving forward.'];
const DROP_LINES = ['Wheee!', "Okay, I'll stay here.", 'Careful, I bruise easily!'];
let clickIdx = 0, dropIdx = 0;
const sectionIO = new IntersectionObserver(entries => {
  for (const en of entries) {
    if (!en.isIntersecting) continue;
    if (en.target.id === 'home' && root.classList.contains('intro')) continue;
    if (W < 640 && en.target.id !== 'home') continue;   // on phones she only chats in the hero, so she never covers text
    say(LINES[en.target.id]);
    if (en.target.id === 'contact' && !playClip('bow')) act('wave');
  }
}, { rootMargin: '-45% 0px -45% 0px' });
Object.keys(LINES).forEach(id => { const el = document.getElementById(id); if (el) sectionIO.observe(el); });

/* ---------------- realistic model (Avaturn) ----------------
   #avatar-canvas carries data-model (the default body), data-model-alt (a second
   outfit, loaded on demand) and data-anims (a folder of animation-only GLBs).
   - Everyday motion (walking, dragging the name, looking at the cursor, waving)
     comes from the invisible stylised rig and is copied onto the real skeleton.
   - Her motion-captured clips (oops, bow, excited, dance) blend in on top for
     special moments, then blend back out.
   - Face blendshapes give her blinks, a soft smile and a talking mouth. */
let real = null, realPending = !!canvas.dataset.model;
const DRIVEN = ['Spine', 'RightUpLeg', 'RightLeg', 'LeftUpLeg', 'LeftLeg', 'RightArm', 'RightForeArm', 'LeftArm', 'LeftForeArm', 'Neck', 'Head'];
const CLIP_RANGES = { oops: [0, 3.6], bow: [0.4, 5.2], excited: [0.4, 8.5], dance: [2, 11] };   // seconds used from each take
let loaderP = null, envSet = false;
function loader() {
  if (!loaderP) loaderP = Promise.all([
    import('three/addons/loaders/GLTFLoader.js'), import('three/addons/libs/meshopt_decoder.module.js')
  ]).then(([{ GLTFLoader }, { MeshoptDecoder }]) => new GLTFLoader().setMeshoptDecoder(MeshoptDecoder));
  return loaderP;
}
async function loadBody(url) {
  const gltf = await (await loader()).loadAsync(url);
  const model = gltf.scene;
  // her resting pose: the calm end of the take baked into the body file
  if (gltf.animations[0]) { const mx = new THREE.AnimationMixer(model); const c = gltf.animations[0]; mx.clipAction(c).play(); mx.setTime(c.duration * 0.97); }
  model.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(model, true), size = box.getSize(new THREE.Vector3());
  model.scale.setScalar(HEIGHT_UNITS / size.y);
  model.updateMatrixWorld(true);
  box.setFromObject(model, true);
  model.position.set(-(box.min.x + box.max.x) / 2, -box.min.y, -(box.min.z + box.max.z) / 2);
  const bones = {}, rest = new Map(), morphs = [];
  let hips = null;
  model.traverse(o => {
    if (o.isBone) { bones[o.name.replace('mixamorig', '')] = o; rest.set(o, o.quaternion.clone()); if (/Hips$/.test(o.name)) hips = o; }
    if (o.isMesh) {
      o.frustumCulled = false;
      (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => { m.envMapIntensity = 0.75; });
      if (o.morphTargetDictionary) morphs.push(o);
    }
  });
  const wrap = new THREE.Group(); wrap.add(model);
  return { model, wrap, bones, rest, morphs, hips, hipsRest: hips ? hips.position.clone() : null, mixer: new THREE.AnimationMixer(model) };
}
async function loadClip(name) {
  const gltf = await (await loader()).loadAsync(`${canvas.dataset.anims}/anim-${name}.glb`);
  const [from, to] = CLIP_RANGES[name];
  const clip = THREE.AnimationUtils.subclip(gltf.animations[0], name, Math.round(from * 30), Math.round(to * 30), 30);
  // keep her on the spot: remove sideways/forward drift of the hips, keep the up-down
  clip.tracks.forEach(t => {
    if (!/Hips\.position$/.test(t.name)) return;
    const v = t.values, x0 = v[0], z0 = v[2];
    for (let i = 0; i < v.length; i += 3) { v[i] = x0; v[i + 2] = z0; }
  });
  return clip;
}
function mountBody(b) {
  if (real) { yawG.remove(real.wrap); b.clips = real.clips; }
  else b.clips = {};
  yawG.add(b.wrap);
  real = b;
}
async function loadRealModel() {
  try {
    const b = await loadBody(canvas.dataset.model);
    if (!envSet) {
      const { RoomEnvironment } = await import('three/addons/environments/RoomEnvironment.js');
      scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture;
      envSet = true;
    }
    mountBody(b);
    body.visible = false;
    root.classList.add('real-avatar');
    if (canvas.dataset.anims) {
      for (const n of Object.keys(CLIP_RANGES)) loadClip(n).then(c => { real.clips[n] = c; }).catch(e => console.warn('clip', n, e));
    }
  } catch (e) {
    console.warn('Realistic avatar model unavailable, keeping the stylised one:', e);
    body.visible = true;
  }
  realPending = false;
}
if (realPending) {
  body.visible = false;
  loadRealModel();
  setTimeout(() => { if (realPending) { realPending = false; body.visible = true; } }, 12000);   // slow network: don't hold the page
}

// ----- clip playback, blended over the procedural pose -----
const clipState = { name: null, action: null, t: 0, dur: 0, w: 0 };
function playClip(name) {
  if (!real || !real.clips[name] || dragging) return false;
  if (clipState.action) clipState.action.stop();
  const a = real.mixer.clipAction(real.clips[name]);
  a.reset(); a.setLoop(THREE.LoopOnce, 1); a.clampWhenFinished = true; a.play();
  Object.assign(clipState, { name, action: a, t: 0, dur: real.clips[name].duration, w: 0 });
  action = 'clip'; actionT = 0;
  return true;
}
function stopClip() {
  if (clipState.action) clipState.action.stop();
  Object.assign(clipState, { name: null, action: null, t: 0, w: 0 });
  if (action === 'clip') action = null;
}

const _qa = new THREE.Quaternion(), _qb = new THREE.Quaternion(), _qc = new THREE.Quaternion();
const jointQ = (obj, parent) => {   // a stylised joint's rotation, expressed in the figure's frame
  const q = new THREE.Quaternion().setFromEuler(obj.rotation);
  return parent ? parent.clone().multiply(q).multiply(parent.clone().invert()) : q;
};
const zRot = a => new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), a);
function drive(name, dModel) {
  const bone = real.bones[name];
  if (!bone) return;
  const restQ = real.rest.get(bone);
  bone.quaternion.copy(restQ);
  bone.parent.updateWorldMatrix(true, false);
  const qParent = bone.parent.getWorldQuaternion(_qa);
  const qRoot = real.wrap.getWorldQuaternion(_qb);
  const dWorld = _qc.copy(qRoot).multiply(dModel).multiply(qRoot.clone().invert());
  bone.quaternion.copy(qParent.clone().invert().multiply(dWorld).multiply(qParent).multiply(restQ));
}
function setMorph(name, v) {
  for (const m of real.morphs) { const i = m.morphTargetDictionary[name]; if (i !== undefined) m.morphTargetInfluences[i] = v; }
}
const ARM_IN = 0.22;   // her resting pose holds the arms a little out; bring them in to match
const _snap = new Map();
function applyReal(dt, t, blinkAmt, talking) {
  // 1) start from her resting pose, then copy the stylised rig's motion onto it
  for (const [bone, q] of real.rest) bone.quaternion.copy(q);
  if (real.hips) real.hips.position.copy(real.hipsRest);
  real.wrap.position.copy(body.position);
  real.wrap.rotation.set(body.rotation.x * 0.6, 0, body.rotation.z);
  const hipR = jointQ(legL.hip), hipL = jointQ(legR.hip);   // stylised "L" side = her right
  drive('RightUpLeg', hipR); drive('RightLeg', jointQ(legL.knee, hipR));
  drive('LeftUpLeg', hipL); drive('LeftLeg', jointQ(legR.knee, hipL));
  const shR = jointQ(armL.sh).multiply(zRot(ARM_IN)), shL = jointQ(armR.sh).multiply(zRot(-ARM_IN));
  drive('RightArm', shR); drive('RightForeArm', jointQ(armL.el, shR));
  drive('LeftArm', shL); drive('LeftForeArm', jointQ(armR.el, shL));
  const headQ = jointQ(headPivot), half = new THREE.Quaternion().slerp(headQ, 0.45);
  drive('Neck', half); drive('Head', half.clone().invert().multiply(headQ));

  // 2) a motion-captured clip, if one is playing, blends in over that pose
  if (clipState.action) {
    clipState.t += dt;
    const fadeIn = Math.min(1, clipState.t / 0.35), fadeOut = Math.min(1, (clipState.dur - clipState.t) / 0.45);
    clipState.w = Math.max(0, Math.min(fadeIn, fadeOut));
    for (const bone of real.rest.keys()) _snap.set(bone, bone.quaternion.clone());
    const hipsSnap = real.hips ? real.hips.position.clone() : null;
    real.mixer.update(dt);
    for (const [bone, q] of _snap) bone.quaternion.slerpQuaternions(q, bone.quaternion.clone(), clipState.w);
    if (real.hips) real.hips.position.lerpVectors(hipsSnap, real.hips.position.clone(), clipState.w);
    if (clipState.t >= clipState.dur) stopClip();
  }

  // 3) face: blinks, a soft resting smile, a moving mouth while she talks
  setMorph('eyeBlinkLeft', blinkAmt); setMorph('eyeBlinkRight', blinkAmt);
  setMorph('mouthSmile', 0.32);
  const jaw = talking ? 0.12 + Math.abs(Math.sin(t * 13)) * 0.22 : 0;
  setMorph('jawOpen', jaw); setMorph('viseme_aa', jaw * 0.8);
}

/* ---------------- actions ---------------- */
let action = null, actionT = 0;
function act(name) { if (action === 'pull') return; action = name; actionT = 0; }
window.addEventListener('ask:answer', e => {
  if (e.detail.found) { if (!playClip('excited')) act('cheer'); say("Here's the evidence. Click a project to step inside.", 3600); }
  else { act('wave'); say("I only quote real work, so no answer is better than a made-up one.", 3600); }
});
let nextFlourish = 4 + Math.random() * 3;   // seconds until her next little idle flourish

/* ---------------- outfits ---------------- */
let altBody = null, altLoading = false, onAlt = false;
if (outfitBtn) outfitBtn.addEventListener('click', async () => {
  if (real && canvas.dataset.modelAlt) {        // real avatar: swap between her two outfits
    if (altLoading) return;
    if (!altBody) { altLoading = true; say('One sec, changing…', 1800); try { altBody = await loadBody(canvas.dataset.modelAlt); } catch (e) { altLoading = false; return; } altLoading = false; altBody.other = real; }
    const next = onAlt ? altBody.other : altBody;
    stopClip(); act('twirl');
    setTimeout(() => mountBody(next), 420);    // swap mid-spin
    onAlt = !onAlt;
    say(onAlt ? 'Casual mode.' : 'Back in the dress!', 2200);
    return;
  }
  const next = OUTFIT_ORDER[(OUTFIT_ORDER.indexOf(outfit) + 1) % OUTFIT_ORDER.length];
  act('twirl');
  setTimeout(() => wear(next), 420);     // swap mid-spin
  say(OUTFITS[next].label, 2200);
  try { localStorage.setItem('minime-outfit', next); } catch (e) {}
});

/* ---------------- opening scene (after huyml.co): she drags her name onto the page ---------------- */
const intro = { on: root.classList.contains('intro') && !!nameEl && !narrowScreen() && !heroLayout().below, stage: 'pull', t: 0, x: 0, dx: 0, r: null };
function endIntro() {
  if (!intro.on) return;
  intro.on = false;
  root.classList.remove('intro', 'intro-running');
  root.classList.add('hero-in');
  if (nameEl) nameEl.style.transform = '';
  try { sessionStorage.setItem('intro-seen', '1'); } catch (e) {}
  if (window.__lenis) window.__lenis.start();
  action = null;
  setTimeout(() => { act('wave'); say(LINES.home, 4200); root.classList.add('doodles-on'); }, 250);
}
if (root.classList.contains('intro') && !intro.on) {   // small screens: no drag scene
  root.classList.remove('intro'); root.classList.add('hero-in');
  try { sessionStorage.setItem('intro-seen', '1'); } catch (e) {}
}
if (intro.on) {
  root.classList.add('intro-running');
  if (window.__lenis) window.__lenis.stop();
  action = 'pull';
  if (skipBtn) skipBtn.addEventListener('click', endIntro);
} else {
  setTimeout(() => { act('wave'); root.classList.add('doodles-on'); }, 700);
}

/* ---------------- hide / show ---------------- */
let hidden = false;
try { hidden = localStorage.getItem('minime-hidden') === '1'; } catch (e) {}
function setHidden(h) {
  hidden = h;
  root.classList.toggle('mini-hidden', h);
  hideBtn.setAttribute('aria-pressed', String(h));
  hideBtn.setAttribute('aria-label', h ? 'Show mini-me' : 'Hide mini-me');
  hideBtn.title = h ? 'Show mini-me' : 'Hide mini-me';
  try { localStorage.setItem('minime-hidden', h ? '1' : '0'); } catch (e) {}
}
hideBtn.addEventListener('click', () => setHidden(!hidden));
setHidden(hidden);

/* ---------------- movement state (screen px, feet position) ---------------- */
const pos = { x: W * 0.93, y: H - 24 };
const target = { x: pos.x, y: pos.y };
const vel = { x: 0, y: 0 };
const pointer = { x: W / 2, y: H / 2, last: -1e9, moved: false };
let heroBlend = 1, freed = false, dragging = false, pressed = false, justDragged = false;
let dragOff = { x: 0, y: 0 }, pressAt = { x: 0, y: 0 }, wanderAt = 0, idleT = 0, phase = 0, walkAmt = 0, yaw = 0;
let nextBlink = 2, squash = 0, visibleAmt = 0;

window.addEventListener('pointermove', e => {
  pointer.x = e.clientX; pointer.y = e.clientY; pointer.last = performance.now(); pointer.moved = true;
}, { passive: true });
window.addEventListener('scroll', () => { if (window.scrollY <= 2) freed = false; }, { passive: true });

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const damp = (k, dt) => 1 - Math.pow(1 - k, dt * 60);
function bounds(px) {
  return { x0: Math.max(px * 0.3 + 10, 70), x1: W - Math.max(px * 0.3 + 10, 92), y0: Math.min(H - 10, px + 80), y1: H - 10 };
}
function displayPos() {
  const a = heroAnchor();
  return { x: lerp(pos.x, a.x, heroBlend), y: lerp(pos.y, a.y, heroBlend) };
}

/* drag + click */
hit.addEventListener('pointerdown', e => {
  pressed = true; justDragged = false;
  pressAt = { x: e.clientX, y: e.clientY };
  const cur = displayPos();
  dragOff = { x: cur.x - e.clientX, y: cur.y - e.clientY };
  hit.setPointerCapture(e.pointerId);
});
hit.addEventListener('pointermove', e => {
  if (!pressed) return;
  if (!dragging && Math.hypot(e.clientX - pressAt.x, e.clientY - pressAt.y) > 5) {
    dragging = true; freed = true; stopClip();
    const cur = displayPos(); pos.x = cur.x; pos.y = cur.y; heroBlend = 0;
    say('Whoa, put me down gently!', 1800);
  }
  if (dragging) { target.x = e.clientX + dragOff.x; target.y = e.clientY + dragOff.y; }
});
function release() {
  if (!pressed) return;
  pressed = false;
  if (dragging) {
    dragging = false; justDragged = true; squash = 1;
    const b = bounds(companionPx());
    target.x = pos.x = clamp(pos.x, b.x0, b.x1);
    target.y = pos.y = clamp(pos.y, b.y0, b.y1);
    if (playClip('oops')) say('Oops!', 2200); else say(DROP_LINES[dropIdx++ % DROP_LINES.length], 2400);
    wanderAt = performance.now() + 7000;
  }
}
hit.addEventListener('pointerup', release);
hit.addEventListener('pointercancel', release);
hit.addEventListener('click', () => {
  if (justDragged) { justDragged = false; return; }
  const k = clickIdx % 3;
  if (!(k === 1 && playClip('dance')) && !(k === 2 && playClip('excited'))) act('wave');
  say(CLICK_LINES[clickIdx++ % CLICK_LINES.length], 3200);
});

/* ---------------- loop ---------------- */
let last = 0;
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, last ? (now - last) / 1000 : 0.016); last = now;
  const t = now / 1000;
  if (hidden) { renderer.clear(); return; }
  if (realPending) { renderer.clear(); return; }   // wait for the real avatar before the opening scene
  if (root.classList.contains('in-museum')) {   // she is inside the museum there, so the companion steps out
    renderer.clear(); bubble.classList.remove('show'); hit.style.pointerEvents = 'none'; canvas.style.opacity = '0';
    freed = false; return;
  }
  canvas.style.opacity = ''; hit.style.pointerEvents = '';

  // hero ↔ companion
  const heroH = heroEl ? heroEl.offsetHeight : H;
  const heroTarget = (intro.on || (!freed && !dragging)) ? clamp(1 - window.scrollY / (heroH * 0.45), 0, 1) : 0;
  visibleAmt = 1;
  heroBlend += (heroTarget - heroBlend) * damp(0.12, dt);
  const compPx = companionPx();
  const px = lerp(compPx, heroPx(), heroBlend);
  const b = bounds(compPx);

  // decide where to go: she keeps to the side margins so she never covers the content
  if (!dragging && heroBlend < 0.5) {
    const leftX = () => lerp(b.x0, Math.max(b.x0, W * 0.1), Math.random());
    const rightX = () => lerp(Math.min(b.x1, W * 0.9), b.x1, Math.random());
    const sinceMove = now - pointer.last;
    // she lives along the bottom edge: walks to the cursor's side, otherwise idles
    if (pointer.moved && sinceMove > 1200 && sinceMove < 5000) {
      const toLeft = pointer.x < W / 2;
      if (toLeft !== pos.x < W / 2) { target.x = toLeft ? leftX() : rightX(); target.y = b.y1 - Math.random() * 14; }
      pointer.moved = false;
    } else if (now > wanderAt) {
      wanderAt = now + 14000 + Math.random() * 8000;
      if (Math.random() < 0.4) { target.x = pos.x < W / 2 ? leftX() : rightX(); target.y = b.y1 - Math.random() * 14; }
    }
    target.x = clamp(target.x, b.x0, b.x1);
    target.y = clamp(target.y, b.y0, b.y1);
  }

  // move
  const dx = target.x - pos.x, dy = target.y - pos.y, dist = Math.hypot(dx, dy);
  let vx = 0, vy = 0;
  if (dragging) {
    const k = damp(0.35, dt);
    vx = (dx * k) / dt; vy = (dy * k) / dt;
    pos.x += dx * k; pos.y += dy * k;
  } else if (dist > 3 && heroBlend < 0.95) {
    const speed = Math.min(dist * 2.5, compPx * (dist > compPx * 3 ? 1.5 : 0.9));
    vx = (dx / dist) * speed; vy = (dy / dist) * speed;
    pos.x += vx * dt; pos.y += vy * dt;
  }
  vel.x += (vx - vel.x) * damp(0.2, dt); vel.y += (vy - vel.y) * damp(0.2, dt);
  const speedNow = Math.hypot(vel.x, vel.y);
  let walking = !dragging && speedNow > compPx * 0.15;
  idleT = walking || dragging ? 0 : idleT + dt;

  // place the figure (the intro overrides where she stands)
  let d = displayPos();
  let introYaw = null;
  if (intro.on) {
    // opening scene: she walks in from the left dragging the name behind her
    const hp = heroPx();
    if (!intro.r) { nameEl.style.transform = 'none'; intro.r = nameEl.getBoundingClientRect(); }
    const endX = Math.min(W - hp * 0.3, intro.r.right + hp * 0.26);
    const footY = Math.min(H - 30, intro.r.bottom + hp * 0.14);
    intro.t += dt;
    let lag = 0;
    if (intro.stage === 'pull') {
      const u = Math.min(1, intro.t / 3.6);
      intro.x = lerp(-hp * 0.3, endX, 1 - Math.pow(1 - u, 1.8));
      const want = intro.x - hp * 0.2 - intro.r.right;   // the name's right edge follows her hands
      lag = want - intro.dx;
      intro.dx += lag * damp(0.2, dt);                    // a little weight, like something being dragged
      if (u >= 1) { intro.stage = 'settle'; intro.t = 0; action = null; }
    } else {
      intro.dx += (0 - intro.dx) * damp(0.12, dt);
      intro.x = endX;
      if (intro.t > 0.8) endIntro();
    }
    const skew = clamp(-lag * 0.06, -9, 9);
    nameEl.style.transform = `translate3d(${intro.dx.toFixed(1)}px, 0, 0) skewX(${skew.toFixed(2)}deg)`;
    d = { x: intro.x, y: footY };
    walking = intro.stage === 'pull';
    introYaw = intro.stage === 'pull' ? Math.PI / 2 : 0;
  }
  const depth = 0.9 + 0.18 * (d.y / H) * (1 - heroBlend);
  const s = (px / HEIGHT_UNITS) * depth;
  fig.position.set(d.x, -d.y, 0);
  fig.scale.setScalar(s);
  shadow.position.set(d.x, -d.y + 2, -3000);
  shadow.scale.set(s * 0.55, s * 0.12, 1);

  // facing: turntable toward the cursor in the hero, travel direction while walking
  let yawTarget;
  if (introYaw !== null) yawTarget = introYaw;
  else if (action === 'clip') yawTarget = 0;   // face the visitor while performing
  else if (heroBlend > 0.5 && !dragging) yawTarget = clamp((pointer.x / W - 0.5) * 1.0, -0.5, 0.5);
  else if (walking) yawTarget = Math.atan2(vel.x, vel.y);
  else if (dragging) yawTarget = clamp(vel.x * 0.0012, -0.6, 0.6);
  else yawTarget = clamp(((pointer.x - d.x) / W) * 1.2, -0.5, 0.5);
  let dyaw = yawTarget - yaw;
  while (dyaw > Math.PI) dyaw -= Math.PI * 2;
  while (dyaw < -Math.PI) dyaw += Math.PI * 2;
  yaw += dyaw * damp(0.12, dt);
  yawG.rotation.y = yaw;

  // walk cycle
  walkAmt += ((walking ? (intro.on ? 0.6 : Math.min(1, speedNow / (compPx * 1.2))) : 0) - walkAmt) * damp(0.15, dt);
  phase += dt * (7 + 4 * walkAmt) * Math.min(1, walkAmt * 4);
  const sw = Math.sin(phase);
  const pose = {
    hipL: -sw * 0.55 * walkAmt, hipR: sw * 0.55 * walkAmt,
    kneeL: Math.max(0, Math.sin(phase + 1.6)) * 0.9 * walkAmt, kneeR: Math.max(0, Math.sin(phase + 1.6 + Math.PI)) * 0.9 * walkAmt,
    shLx: sw * 0.5 * walkAmt, shRx: -sw * 0.5 * walkAmt, shLz: -0.1, shRz: 0.1,
    elLx: -0.15 - 0.25 * walkAmt, elRx: -0.15 - 0.25 * walkAmt, elLz: 0, elRz: 0
  };
  let bob = Math.abs(Math.cos(phase)) * 0.05 * walkAmt;

  // every few seconds of standing she does a little something
  if (!intro.on && !action && !walking && !dragging) {
    nextFlourish -= dt;
    if (nextFlourish <= 0) {
      const pick = ['twirl', 'wave', 'hop', 'dance'][Math.floor(Math.random() * 4)];
      if (!(pick === 'dance' && playClip('dance'))) act(pick === 'dance' ? 'wave' : pick);
      nextFlourish = 8 + Math.random() * 6;
    }
  }
  // idle: hands on hips after a moment (her signature pose)
  const sass = clamp((idleT - 2.5) * 1.5, 0, 1) * (action ? 0 : 1);
  if (sass > 0) {
    pose.shLz = lerp(pose.shLz, -0.78, sass); pose.shRz = lerp(pose.shRz, 0.78, sass);
    pose.shLx = lerp(pose.shLx, 0.18, sass); pose.shRx = lerp(pose.shRx, 0.18, sass);
    pose.elLz = lerp(0, 1.95, sass); pose.elRz = lerp(0, -1.95, sass);
    pose.elLx = lerp(pose.elLx, 0, sass); pose.elRx = lerp(pose.elRx, 0, sass);
  }

  // dragged: legs kick, arms flail
  if (dragging) {
    pose.hipL = Math.sin(t * 11) * 0.5; pose.hipR = Math.sin(t * 11 + Math.PI) * 0.5;
    pose.kneeL = 0.5 + Math.sin(t * 11) * 0.3; pose.kneeR = 0.5 - Math.sin(t * 11) * 0.3;
    pose.shLz = -1.9 - Math.sin(t * 9) * 0.35; pose.shRz = 1.9 + Math.sin(t * 9 + 1) * 0.35;
    pose.shLx = pose.shRx = 0; pose.elLz = 0.4; pose.elRz = -0.4;
  }

  // one-off actions
  if (action) {
    actionT += dt;
    if (action === 'wave') {
      const k = Math.min(1, actionT * 5) * Math.min(1, (2.2 - actionT) * 5);
      pose.shRz = lerp(pose.shRz, 2.55, k); pose.shRx = lerp(pose.shRx, 0, k);
      pose.elRz = lerp(pose.elRz, 0.35 + Math.sin(actionT * 13) * 0.45, k); pose.elRx = lerp(pose.elRx, 0, k);
      if (actionT > 2.2) action = null;
    } else if (action === 'pull') {          // arms reaching back to the name, leaning forward to drag it
      pose.shLx = pose.shRx = 0.95; pose.shLz = -0.12; pose.shRz = 0.12;
      pose.elLx = pose.elRx = -0.25; pose.elLz = pose.elRz = 0;
    } else if (action === 'twirl') {         // a full spin, arms out, skirt flaring
      const k = Math.min(1, actionT * 5) * Math.min(1, (1.2 - actionT) * 5);
      pose.shLz = lerp(pose.shLz, -1.25, k); pose.shRz = lerp(pose.shRz, 1.25, k);
      pose.shLx = pose.shRx = 0; pose.elLz = lerp(pose.elLz, -0.25, k); pose.elRz = lerp(pose.elRz, 0.25, k);
      bob += Math.sin(Math.min(1, actionT / 1.2) * Math.PI) * 0.06;
      if (actionT > 1.2) action = null;
    } else if (action === 'hop') {           // a happy little hop
      const u = Math.min(1, actionT / 0.7);
      bob += Math.max(0, Math.sin(u * Math.PI)) * 0.22;
      pose.kneeL = pose.kneeR = Math.max(0, Math.sin(u * Math.PI)) * 0.6;
      pose.shLz = lerp(pose.shLz, -0.6, Math.sin(u * Math.PI)); pose.shRz = lerp(pose.shRz, 0.6, Math.sin(u * Math.PI));
      if (actionT > 0.75) { action = null; squash = 1; }
    } else if (action === 'cheer') {
      const k = Math.min(1, actionT * 6) * Math.min(1, (1 - actionT) * 6);
      pose.shLz = lerp(pose.shLz, -2.7, k); pose.shRz = lerp(pose.shRz, 2.7, k);
      pose.shLx = pose.shRx = 0; pose.elLz = lerp(pose.elLz, -0.3, k); pose.elRz = lerp(pose.elRz, 0.3, k);
      bob += Math.max(0, Math.sin(Math.min(1, actionT / 0.6) * Math.PI)) * 0.3;
      if (actionT > 1) action = null;
    }
  }

  // apply pose (smoothed)
  const k = damp(0.25, dt);
  const ease = (o, prop, v) => { o.rotation[prop] += (v - o.rotation[prop]) * k; };
  ease(legL.hip, 'x', pose.hipL); ease(legR.hip, 'x', pose.hipR);
  ease(legL.knee, 'x', pose.kneeL); ease(legR.knee, 'x', pose.kneeR);
  ease(armL.sh, 'x', pose.shLx); ease(armR.sh, 'x', pose.shRx);
  ease(armL.sh, 'z', pose.shLz); ease(armR.sh, 'z', pose.shRz);
  ease(armL.el, 'x', pose.elLx); ease(armR.el, 'x', pose.elRx);
  ease(armL.el, 'z', pose.elLz); ease(armR.el, 'z', pose.elRz);

  squash = Math.max(0, squash - dt * 3);
  const sq = Math.sin(squash * Math.PI) * 0.12;
  const still = 1 - walkAmt;
  body.position.y = bob + (dragging ? Math.sin(t * 6) * 0.04 : 0);
  body.position.x = Math.sin(t * 1.1) * 0.025 * still;                    // weight shift
  body.scale.set(1 + sq, 1 - sq + Math.sin(t * 2.1) * 0.008 * still, 1 + sq);
  body.rotation.z = dragging ? clamp(-vel.x * 0.0008, -0.35, 0.35) : Math.sin(t * 1.1) * 0.03 * still;
  body.rotation.x = action === 'pull' ? 0.24 : 0.06 * walkAmt;
  // twirl spins her on the spot (on top of her facing)
  const spin = action === 'twirl' ? (1 - Math.cos(Math.PI * Math.min(1, actionT / 1.1))) * Math.PI : 0;
  yawG.rotation.y = yaw + spin;
  // the skirt swishes with her steps and flares when she spins or hops
  const flare = action === 'twirl' ? Math.sin(Math.min(1, actionT / 1.2) * Math.PI) * 0.35 : action === 'hop' ? 0.12 : 0;
  skirt.scale.set(1 + flare, 1 - flare * 0.25, 1 + flare);
  skirt.rotation.x = Math.sin(phase * 2) * 0.05 * walkAmt - vel.y * 0.0002;
  skirt.rotation.z = Math.sin(phase) * 0.04 * walkAmt + Math.sin(t * 1.1) * 0.02 * still;

  // head: look toward the cursor when not walking
  const look = !walking && !dragging;
  const lx = clamp((pointer.x - d.x) / (W * 0.5), -1, 1), ly = clamp((pointer.y - (d.y - px * 0.85)) / (H * 0.6), -1, 1);
  headPivot.rotation.y += ((look ? lx * 0.32 - yaw * 0.3 : 0) - headPivot.rotation.y) * damp(0.08, dt);
  headPivot.rotation.x += ((look ? ly * 0.22 : 0) - headPivot.rotation.x) * damp(0.08, dt);
  headPivot.rotation.z = Math.sin(t * 1.2) * 0.035 * (1 - walkAmt) + 0.06 * sass;

  // hair sways with motion
  // braid and hair swing on a soft spring: bounce with steps, fly out on a twirl
  const spinning = action === 'twirl' ? Math.sin(Math.min(1, actionT / 1.2) * Math.PI) : 0;
  const swingA = clamp(walkAmt * (0.25 + Math.sin(phase * 2) * 0.12) + spinning * 0.9 + (action === 'hop' ? 0.35 : 0) + (dragging ? 0.4 : 0) + Math.sin(t * 1.3) * 0.04, -0.6, 1.4);
  const swingB = clamp(-vel.x * 0.0008 + spinning * 0.5 + Math.sin(t * 0.9) * 0.05, -0.8, 0.8);
  hairSpring.v += ((swingA - hairSpring.a) * 70 - hairSpring.v * 7) * dt; hairSpring.a += hairSpring.v * dt;
  hairSpring.vb += ((swingB - hairSpring.b) * 60 - hairSpring.vb * 6) * dt; hairSpring.b += hairSpring.vb * dt;
  braidPivot.rotation.set(hairSpring.a * 0.22, 0, clamp(hairSpring.b * 0.35 - spinning * 0.4, -0.5, 0.5));
  backHair.rotation.set(hairSpring.a * 0.15, 0, hairSpring.b * 0.1);
  frontHair.forEach((h, i) => { h.position.y += Math.sin(t * 1.4 + i) * 0.0004; });

  // blink + talk
  nextBlink -= dt;
  const blink = nextBlink < 0.12 && nextBlink > 0 ? 0.1 : 1;
  if (nextBlink < 0) nextBlink = 2.4 + Math.random() * 3;
  eyes.forEach(e => { e.scale.y = blink; });
  mouth.scale.y = mouthBase * (bubble.classList.contains('show') ? 0.75 + Math.abs(Math.sin(t * 14)) * 0.5 : 1);

  if (real) applyReal(dt, t, 1 - blink, bubble.classList.contains('show'));
  if (real && real.hips) {   // the floor shadow follows her hips when a clip moves her about
    const hp = real.hips.getWorldPosition(new THREE.Vector3());
    shadow.position.x = hp.x;
  }
  renderer.render(scene, cam);

  // hit box + bubble follow her
  const hw = px * 0.42;
  hit.style.width = `${hw}px`; hit.style.height = `${px}px`;
  hit.style.transform = `translate(${(d.x - hw / 2).toFixed(1)}px, ${(d.y - px).toFixed(1)}px)`;
  const bw = bubble.offsetWidth, bh = bubble.offsetHeight;
  let bx = clamp(d.x - 14, 8, W - bw - 8), by = Math.max(60, d.y - px * (heroBlend > 0.5 ? 0.92 : 1.02) - bh - 8);
  if (heroBlend > 0.5 && heroLayout().below) {   // keep the bubble off the name: beside her shoulder
    bx = clamp(d.x - px * 0.22 - bw, 8, W - bw - 8); by = clamp(d.y - px * 0.82, 60, H - bh - 8);
  }
  bubble.style.transform = `translate(${bx.toFixed(1)}px, ${by.toFixed(1)}px)`;
}
requestAnimationFrame(frame);
