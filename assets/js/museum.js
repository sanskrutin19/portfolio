/* The Museum of Things That Think — the home page as a small 3D game.
   A rotunda with seven exhibits (projects + the Sound Room / About).
   Sanskruti's real avatar is the player: walk with WASD / arrows, or click /
   tap the floor or an exhibit; a guided tour walks her round on her own.
   Walking up to an exhibit shows its museum placard; Enter opens the
   project's 3D world (worlds.js) or, for the Sound Room, the About section. */
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { CSS3DRenderer, CSS3DObject } from 'three/addons/renderers/CSS3DRenderer.js';

const root = document.documentElement;
const sec = document.getElementById('home');
const canvas = document.getElementById('museum-canvas');
if (!sec || !canvas) throw new Error('museum markup missing');
const $ = s => sec.querySelector(s);
const placard = $('.mu-placard'), loadEl = $('.mu-loading'), mapCv = $('.mu-map'), tourBtn = $('#mu-tour');
const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------------- exhibits ---------------- */
const EXHIBITS = [
  { id: 'rag', no: '01', ang: 180, title: 'The Archive That Thinks', proj: 'Tender Intelligence · offline RAG',
    desc: 'An archive that reads hundreds of tender pages and answers with the exact sentence and page it came from. Hours of review become minutes.', live: 'https://promptivo.live/app' },
  { id: 'chat', no: '02', ang: 130, title: 'The Sealed Artifact', proj: 'SecureChat · end-to-end encryption',
    desc: 'Messages, calls and 500 MB files sealed with the Signal Protocol, and still usable with no connection.' },
  { id: 'geo', no: '03', ang: 80, title: 'The Orbital Record', proj: 'Construction detection · geospatial AI',
    desc: 'Satellite eyes that watch a pipeline corridor every five days and flag new construction. Targets, in progress.' },
  { id: 'plant', no: '04', ang: 230, title: 'The Living Specimen', proj: 'Crop-disease AI · Endureva internship',
    desc: 'A diagnosis that shows its work: a phone app that names the disease and highlights the part of the leaf that told it so.' },
  { id: 'xai', no: '05', ang: 280, title: 'The Talking Alarm', proj: 'XAI-Care · explainable fall detection',
    desc: 'A fall alarm that explains every alert to the caregiver, with Grad-CAM and SHAP.' },
  { id: 'water', no: '06', ang: 30, title: 'The Field Log', proj: 'Water Survey · offline-first app',
    desc: 'A field notebook that never needs signal: records wait offline and sync themselves when the network returns.' },
  { id: 'sound', no: '07', ang: 330, title: 'The Sound Room', proj: 'About me',
    desc: 'The story behind the exhibits, played as lyrics on a glass speaker.', about: true }
];
const TOUR = ['rag', 'plant', 'xai', 'sound', 'water', 'geo', 'chat'];
const R = 14, H = 7, RING = 9;
EXHIBITS.forEach(e => {
  const a = THREE.MathUtils.degToRad(e.ang);
  e.pos = new THREE.Vector3(Math.sin(a) * RING, 0, Math.cos(a) * RING);
  e.spot = new THREE.Vector3(Math.sin(a) * (RING - 2.7), 0, Math.cos(a) * (RING - 2.7));
});
const byId = id => EXHIBITS.find(e => e.id === id);

/* ---------------- renderer ---------------- */
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
const small = () => sec.clientWidth < 700;
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, small() ? 1.5 : 1.75));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
const scene = new THREE.Scene();
scene.background = new THREE.Color('#e6ddcf');
scene.fog = new THREE.Fog('#e6ddcf', 22, 42);
scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture;
const cam = new THREE.PerspectiveCamera(48, 1, 0.1, 100);

scene.add(new THREE.HemisphereLight('#fff6ea', '#8a8073', 1.4));
const key = new THREE.DirectionalLight('#fff1dc', 1.1); key.position.set(4, 12, 6); scene.add(key);

const std = (color, rough = 0.6, metal = 0, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal, ...extra });

/* ---------------- typography painted into the room ---------------- */
const FONT = '"Fraunces", Georgia, serif', MONO = '"Geist Mono", ui-monospace, monospace';
function canvasTex(w, h, draw) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  const paint = () => { const g = c.getContext('2d'); g.clearRect(0, 0, w, h); draw(g, w, h); t.needsUpdate = true; };
  paint(); repaint.push(paint);
  return t;
}
const repaint = [];
if (document.fonts) Promise.all([
  document.fonts.load(`italic 300 80px ${FONT}`), document.fonts.load(`400 80px ${FONT}`), document.fonts.load(`500 20px ${MONO}`)
]).then(() => repaint.forEach(p => p())).catch(() => {});

/* ---------------- the rotunda ---------------- */
// floor: warm terrazzo with an inlaid compass and a ring of lettering
const floorTex = canvasTex(2048, 2048, (g, w) => {
  const c = w / 2, px = c / R;
  const grd = g.createRadialGradient(c, c, 0, c, c, c);
  grd.addColorStop(0, '#d8cdbd'); grd.addColorStop(0.7, '#cbbfad'); grd.addColorStop(1, '#b9ac99');
  g.fillStyle = grd; g.fillRect(0, 0, w, w);
  let s = 7; const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < 9000; i++) { g.fillStyle = `rgba(${rnd() < 0.5 ? '60,50,40' : '255,250,240'},${(0.05 + rnd() * 0.12).toFixed(2)})`; const r = 0.6 + rnd() * 2.2; g.fillRect(rnd() * w, rnd() * w, r, r); }
  g.strokeStyle = 'rgba(70,55,40,.45)'; g.lineWidth = 3;
  [3.3, 3.45, 5.8, 11.4, 11.55].forEach(r => { g.beginPath(); g.arc(c, c, r * px, 0, Math.PI * 2); g.stroke(); });
  // compass: one arm per exhibit
  g.fillStyle = 'rgba(150,62,32,.85)';
  EXHIBITS.forEach(e => {
    const a = THREE.MathUtils.degToRad(e.ang);
    const ax = Math.sin(a), az = Math.cos(a);
    g.beginPath(); g.moveTo(c + ax * 3.3 * px, c + az * 3.3 * px);
    g.lineTo(c + (ax * 0.2 - az * 0.32) * px, c + (az * 0.2 + ax * 0.32) * px);
    g.lineTo(c + (ax * 0.2 + az * 0.32) * px, c + (az * 0.2 - ax * 0.32) * px); g.closePath(); g.fill();
  });
  g.beginPath(); g.arc(c, c, 0.55 * px, 0, Math.PI * 2); g.fillStyle = '#efe7da'; g.fill(); g.stroke();
  // lettering around the inner ring
  const text = 'THE MUSEUM OF THINGS THAT THINK  ·  SANSKRUTI NAIK  ·  AI / ML ENGINEER  ·  ';
  g.fillStyle = 'rgba(55,42,30,.78)'; g.font = `400 ${0.42 * px}px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle';
  const rr = 4.6 * px, total = text.length;
  for (let i = 0; i < total; i++) {
    const a = (i / total) * Math.PI * 2;
    g.save(); g.translate(c + Math.sin(a) * rr, c - Math.cos(a) * rr); g.rotate(a); g.fillText(text[i], 0, 0); g.restore();
  }
});
const floor = new THREE.Mesh(new THREE.CircleGeometry(R, 128), std('#ffffff', 0.32, 0, { map: floorTex }));
floor.rotation.x = -Math.PI / 2; scene.add(floor);
const floorPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

// the wall has a doorway at the entrance (+z) that leads into the gallery wing
const DOOR = THREE.MathUtils.degToRad(11);
const wall = new THREE.Mesh(new THREE.CylinderGeometry(R, R, H, 128, 1, true, DOOR, Math.PI * 2 - DOOR * 2), std('#efe7da', 0.95, 0, { side: THREE.BackSide }));
wall.position.y = H / 2; scene.add(wall);
const trim = std('#d9cdbb', 0.6);
[H - 0.25].forEach(y => { const t = new THREE.Mesh(new THREE.TorusGeometry(R - 0.06, 0.12, 8, 128), trim); t.rotation.x = Math.PI / 2; t.position.y = y; scene.add(t); });
const ceil = new THREE.Mesh(new THREE.CircleGeometry(R, 96), std('#e3d9ca', 0.9, 0, { side: THREE.DoubleSide }));
ceil.rotation.x = Math.PI / 2; ceil.position.y = H; scene.add(ceil);
const sky = new THREE.Mesh(new THREE.CircleGeometry(4.2, 64), new THREE.MeshBasicMaterial({ color: '#fffaf0' }));
sky.rotation.x = Math.PI / 2; sky.position.y = H - 0.02; scene.add(sky);
const skyRing = new THREE.Mesh(new THREE.TorusGeometry(4.25, 0.1, 8, 64), trim); skyRing.rotation.x = Math.PI / 2; skyRing.position.y = H - 0.05; scene.add(skyRing);

// columns between the exhibits
const colMat = std('#f3ece1', 0.75);
[350, 10, 55, 105, 155, 205, 255, 305].forEach(d => {
  const a = THREE.MathUtils.degToRad(d), x = Math.sin(a) * (R - 0.7), z = Math.cos(a) * (R - 0.7);
  const col = new THREE.Group(); col.position.set(x, 0, z); scene.add(col);
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.36, H - 0.6, 24), colMat); shaft.position.y = H / 2; col.add(shaft);
  for (let k = 0; k < 12; k++) { // fluting
    const f = new THREE.Mesh(new THREE.BoxGeometry(0.04, H - 0.9, 0.04), std('#ddd2c2', 0.8)); const fa = (k / 12) * Math.PI * 2;
    f.position.set(Math.sin(fa) * 0.33, H / 2, Math.cos(fa) * 0.33); col.add(f);
  }
  [0.15, H - 0.3].forEach(y => { const b = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.3, 0.95), colMat); b.position.y = y; col.add(b); });
});

/* ---------------- exhibit objects ---------------- */
const glassMat = new THREE.MeshPhysicalMaterial({ color: '#ffffff', roughness: 0.04, metalness: 0, transparent: true, opacity: 0.14, depthWrite: false, clearcoat: 1 });
const BUILD = {
  rag(g) {
    const pages = [];
    for (let i = 0; i < 9; i++) {
      const lit = i === 4;
      const tex = canvasTex(256, 340, (c, w, h) => {
        c.fillStyle = '#fbf7ee'; c.fillRect(0, 0, w, h);
        for (let y = 40, k = 0; y < h - 24; y += 18, k++) {
          if (lit && k === 6) { c.fillStyle = '#ffd34d'; c.fillRect(18, y - 9, 214, 15); }
          c.fillStyle = lit && k === 6 ? '#2a241c' : 'rgba(40,32,24,.28)'; c.fillRect(22, y - 4, 200 - (k * 29) % 70, 5);
        }
        c.fillStyle = '#a2381f'; c.font = `500 18px ${MONO}`; c.fillText('p.' + (i * 3 + 4), w - 56, h - 14);
      });
      const m = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.82), std('#ffffff', 0.85, 0, { map: tex, side: THREE.DoubleSide }));
      g.add(m); pages.push(m);
    }
    return t => pages.forEach((m, k) => {
      const s = (k - 4) * 0.16 + Math.sin(t * 0.7) * 0.02, lift = k === 4 ? 0.18 + Math.sin(t * 1.4) * 0.05 : 0;
      m.position.set(s * 0.9, lift, (k - 4) * -0.035 + lift * 0.4); m.rotation.set(-0.15, s * 0.9, s * 0.25);
    });
  },
  chat(g) {
    const metal = std('#2b2d33', 0.25, 0.85), mint = std('#3ddc84', 0.3, 0.2, { emissive: '#1a8f55', emissiveIntensity: 0.6 });
    const body = new THREE.Mesh(new RoundedBoxGeometry(0.62, 0.5, 0.3, 4, 0.06), metal); g.add(body);
    const shackle = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.05, 16, 32, Math.PI), std('#c9ccd3', 0.2, 0.9)); shackle.position.y = 0.25; g.add(shackle);
    const hole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.32, 16), mint); hole.rotation.x = Math.PI / 2; g.add(hole);
    const cubes = [];
    for (let i = 0; i < 8; i++) { const c = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.08), mint); g.add(c); cubes.push(c); }
    return t => { g.rotation.y = Math.sin(t * 0.5) * 0.5; cubes.forEach((c, i) => { const a = t * 0.9 + i * Math.PI / 4; c.position.set(Math.cos(a) * 0.55, Math.sin(a * 2) * 0.12, Math.sin(a) * 0.55); c.rotation.set(t, t * 1.3, 0); }); };
  },
  geo(g) {
    g.add(new THREE.Mesh(new THREE.SphereGeometry(0.42, 48, 32), std('#1b3d6e', 0.55, 0.1)));
    g.add(new THREE.Mesh(new THREE.SphereGeometry(0.43, 28, 18), new THREE.MeshBasicMaterial({ color: '#8fd3ff', wireframe: true, transparent: true, opacity: 0.35 })));
    const orbit = new THREE.Mesh(new THREE.TorusGeometry(0.7, 0.008, 6, 96), std('#c7a14a', 0.3, 0.8)); orbit.rotation.x = 1.15; g.add(orbit);
    const sat = new THREE.Group(); g.add(sat);
    sat.add(new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.12), std('#e8edf5', 0.3, 0.8)));
    [-1, 1].forEach(s => { const p = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.01, 0.08), std('#2a4fb0', 0.4, 0.5)); p.position.x = s * 0.15; sat.add(p); });
    const v = new THREE.Vector3();
    return t => { g.children[0].rotation.y = t * 0.25; g.children[1].rotation.y = t * 0.25; const a = t * 0.8; v.set(Math.cos(a) * 0.7, 0, Math.sin(a) * 0.7).applyAxisAngle(new THREE.Vector3(1, 0, 0), 1.15 - Math.PI / 2); sat.position.copy(v); sat.lookAt(0, 0, 0); };
  },
  plant(g) {
    const shape = new THREE.Shape(); shape.moveTo(0, -0.38); shape.bezierCurveTo(0.32, -0.2, 0.34, 0.24, 0, 0.44); shape.bezierCurveTo(-0.34, 0.24, -0.32, -0.2, 0, -0.38);
    const leafTex = canvasTex(256, 256, (c, w, h) => {
      c.fillStyle = '#3f7a34'; c.fillRect(0, 0, w, h); c.strokeStyle = 'rgba(200,232,150,.7)'; c.lineWidth = 3; c.beginPath(); c.moveTo(w / 2, h); c.lineTo(w / 2, 0); c.stroke();
      const hg = c.createRadialGradient(w * 0.66, h * 0.4, 2, w * 0.66, h * 0.4, 60); hg.addColorStop(0, 'rgba(255,250,210,.95)'); hg.addColorStop(0.4, 'rgba(255,165,40,.75)'); hg.addColorStop(1, 'rgba(255,60,40,0)');
      c.fillStyle = hg; c.fillRect(0, 0, w, h);
    });
    const geo = new THREE.ShapeGeometry(shape, 24); const pos = geo.attributes.position, uv = geo.attributes.uv;
    for (let i = 0; i < pos.count; i++) uv.setXY(i, (pos.getX(i) + 0.34) / 0.68, (pos.getY(i) + 0.38) / 0.82);
    const leaf = new THREE.Mesh(geo, std('#ffffff', 0.55, 0, { map: leafTex, side: THREE.DoubleSide })); g.add(leaf);
    const jar = new THREE.Group(); g.add(jar);
    jar.add(new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.85, 40, 1, true), glassMat));
    const dome = new THREE.Mesh(new THREE.SphereGeometry(0.42, 40, 16, 0, Math.PI * 2, 0, Math.PI / 2), glassMat); dome.position.y = 0.42; jar.add(dome);
    const knob = new THREE.Mesh(new THREE.SphereGeometry(0.05, 16, 12), std('#b48a46', 0.3, 0.8)); knob.position.y = 0.86; jar.add(knob);
    return t => { leaf.rotation.y = Math.sin(t * 0.6) * 0.7; leaf.rotation.z = Math.sin(t * 0.9) * 0.05; };
  },
  xai(g) {
    const band = new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.07, 16, 48), std('#b9a4ff', 0.45)); band.scale.set(1, 1.3, 0.6); g.add(band);
    const faceC = document.createElement('canvas'); faceC.width = faceC.height = 256;
    const faceT = new THREE.CanvasTexture(faceC); faceT.colorSpace = THREE.SRGBColorSpace;
    const face = new THREE.Mesh(new THREE.CylinderGeometry(0.27, 0.27, 0.08, 40), [std('#2b2340', 0.4), new THREE.MeshBasicMaterial({ map: faceT }), std('#2b2340', 0.4)]);
    face.rotation.x = Math.PI / 2; face.position.z = 0.1; g.add(face);
    const bars = [0.9, 0.65, 0.45, 0.2].map((v, i) => { const b = new THREE.Mesh(new THREE.BoxGeometry(0.07, 1, 0.07), std(i === 3 ? '#ffb4a2' : '#7c6cff', 0.4)); b.position.set(0.5 + i * 0.1, -0.25, 0); b.userData.v = v * 0.5; g.add(b); return b; });
    return t => {
      const c = faceC.getContext('2d'); c.fillStyle = '#1f1a30'; c.fillRect(0, 0, 256, 256); c.strokeStyle = '#ff8fa3'; c.lineWidth = 7; c.beginPath();
      for (let x = 0; x <= 256; x += 4) { const ph = x / 256 * 6 + t * 4, spike = Math.abs((ph % 6.28) - 3.14) < 0.25 ? -60 : 0; c.lineTo(x, 128 + Math.sin(ph) * 8 + spike); }
      c.stroke(); faceT.needsUpdate = true;
      bars.forEach((b, i) => { b.scale.y = b.userData.v * (0.75 + 0.25 * Math.sin(t * 2 + i)); b.position.y = -0.3 + b.scale.y / 2; });
      g.rotation.y = Math.sin(t * 0.5) * 0.4;
    };
  },
  water(g) {
    const prof = []; for (let i = 0; i <= 24; i++) { const u = i / 24, y = -0.32 + u * 0.72, r = u < 0.6 ? Math.sin(u / 0.6 * Math.PI * 0.5 + 0.0) * 0.3 * Math.sqrt(1 - Math.max(0, (u - 0.1)) * 0.4) : 0.3 * (1 - (u - 0.6) / 0.4) ** 1.4; prof.push(new THREE.Vector2(Math.max(0.001, r), y)); }
    const drop = new THREE.Mesh(new THREE.LatheGeometry(prof, 48), new THREE.MeshPhysicalMaterial({ color: '#2aa6c4', roughness: 0.05, metalness: 0, clearcoat: 1, transmission: 0, transparent: true, opacity: 0.88 }));
    g.add(drop);
    const pins = [0, 1, 2].map(i => { const p = new THREE.Group(); const m = std(i ? '#9be36a' : '#ff8a3d', 0.4); const h = new THREE.Mesh(new THREE.SphereGeometry(0.06, 16, 12), m); h.position.y = 0.12; p.add(h); const c = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.12, 12), m); c.rotation.x = Math.PI; c.position.y = 0.05; p.add(c); g.add(p); return p; });
    return t => { drop.rotation.y = t * 0.3; pins.forEach((p, i) => { const a = t * 0.6 + i * 2.1; p.position.set(Math.cos(a) * 0.55, -0.2 + Math.sin(t * 2 + i) * 0.04, Math.sin(a) * 0.55); }); };
  },
  sound(g) {
    const frame = new THREE.Mesh(new RoundedBoxGeometry(1.05, 0.62, 0.34, 4, 0.04), std('#141414', 0.4, 0.3)); g.add(frame);
    const glass = new THREE.Mesh(new THREE.BoxGeometry(0.93, 0.5, 0.36), new THREE.MeshPhysicalMaterial({ color: '#cfe6e1', roughness: 0.08, transparent: true, opacity: 0.55, clearcoat: 1 })); g.add(glass);
    const coneMat = std('#0d0d0d', 0.5, 0.2);
    const cones = [[-0.28, 0.08, 0.16], [0.3, -0.1, 0.13]].map(([x, y, r]) => { const c = new THREE.Group(); c.position.set(x, y, 0.19); const ring = new THREE.Mesh(new THREE.TorusGeometry(r * 0.8, r * 0.22, 16, 40), coneMat); c.add(ring); const cap = new THREE.Mesh(new THREE.SphereGeometry(r * 0.5, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), std('#9aa4ad', 0.15, 0.9)); cap.rotation.x = Math.PI / 2; c.add(cap); g.add(c); return c; });
    const lyric = canvasTex(512, 256, (c, w, h) => { c.fillStyle = 'rgba(26,29,28,.9)'; c.font = `italic 300 64px ${FONT}`; c.textAlign = 'center'; c.fillText('after the demo.', w / 2, h / 2 + 20); });
    const ly = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.4), new THREE.MeshBasicMaterial({ map: lyric, transparent: true })); ly.position.z = 0.185; g.add(ly);
    return t => { cones.forEach((c, i) => { const k = 1 + Math.max(0, Math.sin(t * 13 + i * 3)) * 0.06; c.scale.setScalar(k); }); g.rotation.y = Math.sin(t * 0.4) * 0.35; };
  }
};
const plinthMat = std('#f6f1e8', 0.55), labelMat = std('#2a241c', 0.5);
EXHIBITS.forEach(e => {
  const grp = new THREE.Group(); grp.position.copy(e.pos); grp.lookAt(0, 0, 0); scene.add(grp);
  const plinth = new THREE.Mesh(new RoundedBoxGeometry(1.5, 1.05, 1.5, 4, 0.05), plinthMat); plinth.position.y = 0.525; grp.add(plinth);
  const lip = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.06, 1.6), std('#d8ccb9', 0.5)); lip.position.y = 1.06; grp.add(lip);
  // placard on the plinth front, in the museum's type
  const tex = canvasTex(512, 160, (c, w, h) => {
    c.fillStyle = '#2a241c'; c.fillRect(0, 0, w, h);
    c.fillStyle = '#c9a26a'; c.font = `500 22px ${MONO}`; c.fillText('No. ' + e.no, 26, 44);
    c.fillStyle = '#f3ece1'; c.font = `italic 300 46px ${FONT}`; c.fillText(e.title, 26, 104);
    c.fillStyle = 'rgba(243,236,225,.6)'; c.font = `400 20px ${MONO}`; c.fillText(e.proj.toUpperCase(), 26, 140);
  });
  const plate = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.375), new THREE.MeshBasicMaterial({ map: tex })); plate.position.set(0, 0.62, 0.755); grp.add(plate);
  // the object, hovering in a glass vitrine
  const obj = new THREE.Group(); obj.position.y = 1.72; grp.add(obj);
  e.update = BUILD[e.id](obj); e.obj = obj; e.grp = grp;
  if (e.id !== 'plant') {
    const vit = new THREE.Mesh(new THREE.BoxGeometry(1.36, 1.3, 1.36), glassMat); vit.position.y = 1.74; grp.add(vit);
    const edges = new THREE.LineSegments(new THREE.EdgesGeometry(vit.geometry), new THREE.LineBasicMaterial({ color: '#b9ab96', transparent: true, opacity: 0.7 })); edges.position.copy(vit.position); grp.add(edges);
  }
  // pool of light
  const spot = new THREE.SpotLight('#fff2dc', 60, 12, 0.36, 0.7, 1.2);
  spot.position.set(e.pos.x * 0.78, H - 0.4, e.pos.z * 0.78); spot.target.position.set(e.pos.x, 1.4, e.pos.z);
  scene.add(spot); scene.add(spot.target);
  // big title on the wall above
  const wt = canvasTex(1024, 300, (c, w, h) => {
    c.fillStyle = 'rgba(42,36,28,.55)'; c.font = `500 30px ${MONO}`; c.textAlign = 'center'; c.fillText('EXHIBIT ' + e.no, w / 2, 60);
    c.fillStyle = '#2a241c'; c.font = `italic 300 96px ${FONT}`; c.fillText(e.title, w / 2, 180);
    c.fillStyle = '#9b3d22'; c.fillRect(w / 2 - 40, 228, 80, 3);
  });
  const a = THREE.MathUtils.degToRad(e.ang);
  const banner = new THREE.Mesh(new THREE.PlaneGeometry(4.6, 1.35), new THREE.MeshBasicMaterial({ map: wt, transparent: true }));
  banner.position.set(Math.sin(a) * (R - 0.08), 4.7, Math.cos(a) * (R - 0.08)); banner.lookAt(0, 4.7, 0); scene.add(banner);
  e.hit = [plinth, obj];
});

/* ---------------- the avatar ---------------- */
const char = new THREE.Group(); scene.add(char);
const blob = new THREE.Mesh(new THREE.CircleGeometry(0.3, 32), new THREE.MeshBasicMaterial({ color: '#2a241c', transparent: true, opacity: 0.13, depthWrite: false }));
blob.rotation.x = -Math.PI / 2; blob.position.y = 0.01; char.add(blob);
let rig = null;
const HEIGHT = 1.72;
const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
async function loadAvatar() {
  const gltf = await loader.loadAsync('assets/avatar/sanskruti-dress.glb');
  const model = gltf.scene;
  if (gltf.animations[0]) { const mx = new THREE.AnimationMixer(model); const c = gltf.animations[0]; mx.clipAction(c).play(); mx.setTime(c.duration * 0.97); }
  model.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(model, true), size = box.getSize(new THREE.Vector3());
  model.scale.setScalar(HEIGHT / size.y); model.updateMatrixWorld(true); box.setFromObject(model, true);
  model.position.set(-(box.min.x + box.max.x) / 2, -box.min.y, -(box.min.z + box.max.z) / 2);
  const bones = {}, rest = new Map(); let hips = null;
  model.traverse(o => {
    if (o.isBone) { bones[o.name.replace('mixamorig', '')] = o; rest.set(o, o.quaternion.clone()); if (/Hips$/.test(o.name)) hips = o; }
    if (o.isMesh) { o.frustumCulled = false; (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => { m.envMapIntensity = 0.8; }); }
  });
  const wrap = new THREE.Group(); wrap.add(model); char.add(wrap);
  rig = { model, wrap, bones, rest, hips, hipsRest: hips ? hips.position.clone() : null, mixer: new THREE.AnimationMixer(model), clips: {} };
  ['dance', 'bow', 'excited'].forEach(n => loader.loadAsync(`assets/avatar/anim-${n}.glb`).then(gl => {
    const range = { dance: [2, 11], bow: [0.4, 5.2], excited: [0.4, 8.5] }[n];
    const clip = THREE.AnimationUtils.subclip(gl.animations[0], n, Math.round(range[0] * 30), Math.round(range[1] * 30), 30);
    clip.tracks.forEach(t => { if (/Hips\.position$/.test(t.name)) { const v = t.values, x0 = v[0], z0 = v[2]; for (let i = 0; i < v.length; i += 3) { v[i] = x0; v[i + 2] = z0; } } });
    rig.clips[n] = clip;
  }).catch(() => {}));
}
const _a = new THREE.Quaternion(), _b = new THREE.Quaternion(), _c = new THREE.Quaternion();
function drive(name, q) {
  const bone = rig.bones[name]; if (!bone) return;
  const restQ = rig.rest.get(bone);
  bone.quaternion.copy(restQ); bone.parent.updateWorldMatrix(true, false);
  const qp = bone.parent.getWorldQuaternion(_a), qr = rig.wrap.getWorldQuaternion(_b);
  const dw = _c.copy(qr).multiply(q).multiply(qr.clone().invert());
  bone.quaternion.copy(qp.clone().invert().multiply(dw).multiply(qp).multiply(restQ));
}
const E = new THREE.Euler(), Q = () => new THREE.Quaternion();
const qx = a => Q().setFromAxisAngle(new THREE.Vector3(1, 0, 0), a);
const qe = (x, y, z) => Q().setFromEuler(E.set(x, y, z));
const conj = (o, i) => o.clone().multiply(i).multiply(o.clone().invert());
const angDiff = (a, b) => { let d = a - b; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; return d; };
const smooth = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

/* ==========================================================================
   THE GALLERY WING — the rest of the site, hung in 3D
   The page sections are moved into CSS3D panels on the gallery walls; scroll
   drives the camera (and the avatar) from wall to wall.
   ========================================================================== */
const S = 0.005;                 // world units per CSS pixel on the walls
const CW = 5, CH = 15, CZ0 = 13; // corridor half-width, height, start
const cssLayer = document.createElement('div'); cssLayer.className = 'wing-layer'; document.body.appendChild(cssLayer);
const css = new CSS3DRenderer({ element: cssLayer });
const cssScene = new THREE.Scene();
const wing = new THREE.Group(); scene.add(wing);
const journey = document.createElement('div'); journey.className = 'journey'; journey.id = 'journey';
sec.after(journey);

const pairs = a => a.reduce((o, el, i) => (i % 2 ? o[o.length - 1].push(el) : o.push([el]), o), []);
// which content goes on which wall, room by room (in reading order)
const ROOMS = [
  { id: 'about', title: 'The Sound Room', side: -1, tone: 'paper', panels: [['#about .label', '#about-title', '#speaker'], ['#about .about-lede', '#tracklist'], ['narrow', '#about .about-facts']] },
  { id: 'skills', title: 'The Guidebook', side: 1, tone: 'band', panels: [['#skills .label', '#skills-title', '#skills .skills-intro', '#skills .skill-filter', '#skill-map']] },
  { id: 'experience', title: 'The Record', side: -1, tone: 'paper', frames: true, panels: [['#experience .label', '#exp-title'], ...pairs([...document.querySelectorAll('#experience .tl-item')])] },
  { id: 'work', title: 'Also in the Collection', side: 1, tone: 'paper', panels: [['#work .index']] },
  { id: 'contact', title: 'The Visitor Desk', side: 0, tone: 'band', panels: [['#contact .wrap']] }
];
const stops = [];   // filled by layoutWing()
let built = false;
function makePanels() {
  ROOMS.forEach(room => {
    const sectionEl = document.getElementById(room.id);
    room.section = sectionEl;
    room.panelEls = room.panels.map(sels => {
      const p = document.createElement('div');
      p.className = 'w-panel ' + room.tone + (room.frames ? ' framed' : '');
      sels.forEach(sel => {
        if (sel === 'narrow') { p.classList.add('narrow'); return; }
        const el = typeof sel === 'string' ? document.querySelector(sel) : sel; if (!el) return;
        if (el.classList.contains('tl-item')) {   // timeline rows keep their list
          let ol = p.lastElementChild; if (!ol || ol.tagName !== 'OL') { ol = document.createElement('ol'); ol.className = 'timeline'; p.appendChild(ol); }
          ol.appendChild(el);
        } else p.appendChild(el);
      });
      p.querySelectorAll('.reveal').forEach(n => n.classList.add('in'));
      return p;
    });
    journey.appendChild(sectionEl);   // the emptied section becomes a scroll marker (for the nav)
  });
  root.classList.add('wing-on');
  built = true;
}

const deco = new THREE.Group(); wing.add(deco);
const objs = [];
function clearGroup(g) { while (g.children.length) { const c = g.children.pop(); c.traverse(o => { if (o.geometry) o.geometry.dispose(); }); } }

function layoutWing() {
  if (!built) return;
  const vw = window.innerWidth, vh = window.innerHeight;
  objs.forEach(o => cssScene.remove(o)); objs.length = 0; stops.length = 0; clearGroup(deco);
  // measure the panels in a visible (but invisible-to-the-eye) layer
  const was = cssLayer.style.display; cssLayer.style.display = ''; cssLayer.style.visibility = 'hidden';
  const measure = document.createElement('div'); measure.style.cssText = 'position:fixed;left:0;top:0;visibility:hidden;pointer-events:none;'; document.body.appendChild(measure);
  const sizes = new Map();
  ROOMS.forEach(room => room.panelEls.forEach(el => { el.style.visibility = ''; measure.appendChild(el); sizes.set(el, [el.offsetWidth, el.offsetHeight]); }));
  measure.remove(); cssLayer.style.display = was; cssLayer.style.visibility = '';
  const fov = THREE.MathUtils.degToRad(cam.fov);
  const D = (vh * S / 2) / Math.tan(fov / 2);
  let zL = CZ0 + 3, zR = CZ0 + 3, zEnd = 0;
  const frameMat = std('#2a241c', 0.5, 0.2), mountMat = std('#f9f5ee', 0.8), goldMat = std('#c49a58', 0.45, 0.35);
  ROOMS.forEach((room, ri) => {
    const start = Math.max(zL, zR) + (ri ? 3.2 : 0);
    if (room.side === -1) zL = Math.max(zL, start); else if (room.side === 1) zR = Math.max(zR, start);
    room.stopFrom = stops.length;
    room.panelEls.forEach(el => {
      const obj = new CSS3DObject(el); obj.scale.setScalar(S); cssScene.add(obj); objs.push(obj);
      const [wpx, hpx] = sizes.get(el), w = wpx * S, h = hpx * S;
      const top = h + (room.side === 0 ? 1.5 : 0.9), cy = top - h / 2;
      let c, n;
      if (room.side === 0) { zEnd = Math.max(zL, zR) + 6; c = new THREE.Vector3(0, cy, zEnd - 0.02); n = new THREE.Vector3(0, 0, -1); }
      else {
        const z = (room.side === -1 ? zL : zR) + w / 2;
        c = new THREE.Vector3(room.side * (CW - 0.02), cy, z); n = new THREE.Vector3(-room.side, 0, 0);
        if (room.side === -1) zL = z + w / 2 + 2.6; else zR = z + w / 2 + 2.6;
      }
      obj.position.copy(c); obj.lookAt(c.clone().add(n));
      // a physical mount / frame behind the panel
      const mount = new THREE.Mesh(new THREE.BoxGeometry(w + 0.24, h + 0.24, 0.06), room.frames ? goldMat : (room.tone === 'band' ? frameMat : mountMat));
      mount.position.copy(c).addScaledVector(n, -0.03); mount.lookAt(mount.position.clone().add(n)); deco.add(mount);
      // camera stop(s): square-on, at 1:1 pixel size; tall panels pan from top to bottom
      const viewH = vh * S, right = new THREE.Vector3().crossVectors(n.clone().negate(), new THREE.Vector3(0, 1, 0)).normalize();
      const yTop = h > viewH * 0.9 ? top - viewH / 2 + 0.25 : cy, yBot = h > viewH * 0.9 ? top - h + viewH / 2 - 0.25 : cy;
      // she stands beside the panel: in view on wide screens, just off-frame on phones (she walks between walls)
      const fwd = vw < 700 ? 0.5 : 1.4, hv = (vw * S / 2) * (D - fwd) / D;
      const avatarAt = c.clone().addScaledVector(n, fwd).addScaledVector(right, vw < 700 ? w / 2 + 0.6 : Math.min(w / 2 + 0.5, hv - 0.45)); avatarAt.y = 0;
      stops.push({ room, el, obj, c, n, D, yTop, yBot, pan: Math.max(0, (yTop - yBot) / S), avatarAt });
    });
    room.stopTo = stops.length;
    // the room's name on the wall above its first panel
    const first = stops[room.stopFrom];
    const tex = canvasTex(1400, 260, (g, w2, h2) => {
      g.fillStyle = 'rgba(42,36,28,.55)'; g.font = `500 34px ${MONO}`; g.textAlign = 'center'; g.fillText('ROOM ' + String(ri + 1).padStart(2, '0'), w2 / 2, 56);
      g.fillStyle = room.tone === 'band' && false ? '#f3ece1' : '#2a241c'; g.font = `italic 300 120px ${FONT}`; g.fillText(room.title, w2 / 2, 190);
    });
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(7, 1.3), new THREE.MeshBasicMaterial({ map: tex, transparent: true }));
    sign.position.copy(first.c).addScaledVector(first.n, 0.02); sign.position.y = Math.min(CH - 1, (first.yTop + vh * S / 2) + 1.6);
    sign.lookAt(sign.position.clone().add(first.n)); deco.add(sign);
    // the room's name inlaid in the floor at its threshold
    const ftex = canvasTex(1600, 220, (g, w2) => { g.fillStyle = 'rgba(155,61,34,.75)'; g.font = `italic 300 140px ${FONT}`; g.textAlign = 'center'; g.fillText(room.title, w2 / 2, 160); });
    const inlay = new THREE.Mesh(new THREE.PlaneGeometry(8, 1.1), new THREE.MeshBasicMaterial({ map: ftex, transparent: true, depthWrite: false }));
    inlay.rotation.x = -Math.PI / 2; inlay.rotation.z = Math.PI; inlay.position.set(0, 0.012, (room.side === 0 ? first.c.z - 5 : first.c.z - 1.5)); deco.add(inlay);
  });
  zEnd = Math.max(zEnd, zL, zR) + 0.1;

  // architecture: floor, walls, ceiling with a skylight, end wall
  const len = zEnd - CZ0 + 1, mid = CZ0 - 1 + len / 2;
  const fl = new THREE.Mesh(new THREE.PlaneGeometry(CW * 2, len), std('#d8cdbd', 0.4)); fl.rotation.x = -Math.PI / 2; fl.position.set(0, 0, mid); deco.add(fl);
  const runner = new THREE.Mesh(new THREE.PlaneGeometry(2.2, len - 2), std('#8f3a21', 0.85)); runner.rotation.x = -Math.PI / 2; runner.position.set(0, 0.006, mid + 1); deco.add(runner);
  const wallMat = std('#efe7da', 0.95);
  [-1, 1].forEach(s => { const w = new THREE.Mesh(new THREE.PlaneGeometry(len, CH), wallMat); w.position.set(s * CW, CH / 2, mid); w.rotation.y = -s * Math.PI / 2; deco.add(w);
    const sk = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.3, len), std('#d9cdbb', 0.6)); sk.position.set(s * (CW - 0.06), 0.15, mid); deco.add(sk); });
  const ce = new THREE.Mesh(new THREE.PlaneGeometry(CW * 2, len), std('#e3d9ca', 0.9)); ce.rotation.x = Math.PI / 2; ce.position.set(0, CH, mid); deco.add(ce);
  const sl = new THREE.Mesh(new THREE.PlaneGeometry(2.6, len - 2), new THREE.MeshBasicMaterial({ color: '#fffaf0' })); sl.rotation.x = Math.PI / 2; sl.position.set(0, CH - 0.02, mid); deco.add(sl);
  const ew = new THREE.Mesh(new THREE.PlaneGeometry(CW * 2, CH), wallMat); ew.position.set(0, CH / 2, zEnd + 0.04); ew.rotation.y = Math.PI; deco.add(ew);
  // the doorway arch from the rotunda
  const arch = new THREE.Mesh(new THREE.TorusGeometry(2.7, 0.18, 12, 48, Math.PI), std('#d9cdbb', 0.6)); arch.position.set(0, H - 1.4, R - 0.3); deco.add(arch);
  // furniture: a reception desk at the end, a library of books in the Guidebook
  const desk = new THREE.Group(); desk.position.set(0, 0, zEnd - 1.6); deco.add(desk);
  const top2 = new THREE.Mesh(new RoundedBoxGeometry(4.4, 1.05, 1.0, 4, 0.06), std('#2a241c', 0.45, 0.1)); top2.position.y = 0.525; desk.add(top2);
  const lip = new THREE.Mesh(new THREE.BoxGeometry(4.6, 0.06, 1.2), std('#b48a46', 0.35, 0.7)); lip.position.y = 1.08; desk.add(lip);
  const bell = new THREE.Mesh(new THREE.SphereGeometry(0.14, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), std('#c9a26a', 0.25, 0.9)); bell.position.set(1.2, 1.11, 0); desk.add(bell);
  const guide = ROOMS.find(r => r.id === 'skills'), gs = stops[guide.stopFrom];
  if (gs) {
    const colors = ['#8f3a21', '#2a241c', '#5c6b4a', '#c9a26a', '#3b4a6b', '#e7dccb'];
    const shelfLen = Math.min(12, sizes.get(gs.el)[0] * S + 5), shelfZ0 = gs.c.z - shelfLen / 2;
    const books = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), std('#ffffff', 0.7), 700);
    const m4 = new THREE.Matrix4(), col = new THREE.Color(); let nb = 0;
    for (let row = 0; row < 6; row++) {
      const y = 0.5 + row * 1.45;
      const plank = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.06, shelfLen), std('#7a5a3a', 0.6)); plank.position.set(-CW + 0.25, y, shelfZ0 + shelfLen / 2); deco.add(plank);
      let z = shelfZ0 + 0.1, k = row * 7;
      while (z < shelfZ0 + shelfLen - 0.2 && nb < 700) {
        const t = 0.08 + ((k * 37) % 9) / 100, hh = 0.7 + ((k * 53) % 40) / 100;
        m4.makeScale(0.42, hh, t).setPosition(-CW + 0.25, y + 0.03 + hh / 2, z + t / 2);
        books.setMatrixAt(nb, m4); books.setColorAt(nb, col.set(colors[k % colors.length])); nb++;
        z += t + 0.01; k++;
      }
    }
    books.count = nb; deco.add(books);
  }
  // a few warm lights down the wing
  for (let z = CZ0 + 6; z < zEnd; z += 14) { const l = new THREE.PointLight('#fff1dc', 30, 18, 1.5); l.position.set(0, CH - 2, z); deco.add(l); }

  // the scroll timeline: travel → dwell (→ pan) for every stop; markers for the nav
  const T = vh * 0.85, DW = vh * 0.55, INTRO = vh * 0.45;
  let s = INTRO;
  stops.forEach(st => { st.s0 = s; st.s1 = s + T; st.s2 = st.s1 + DW * 0.5 + st.pan; st.s3 = st.s2 + DW * 0.5; s = st.s3; });
  const total = s + vh;   // one screen more, so the last wall settles before the footer
  journey.style.height = Math.round(total) + 'px';
  ROOMS.forEach(room => {
    const a = stops[room.stopFrom], b = stops[room.stopTo - 1];
    room.section.style.top = Math.round(a.s1 + 64) + 'px';
    room.section.style.height = Math.max(1, Math.round(b.s3 - a.s1)) + 'px';
  });
  wingLen = zEnd;
}
let wingLen = 40;

// camera + avatar along the timeline
const railCam = new THREE.Vector3(), railLook = new THREE.Vector3(), railAv = new THREE.Vector3();
let railHead = 0;
const K0 = { cam: new THREE.Vector3(0, 3.0, 6.5), look: new THREE.Vector3(0, 2.4, 22), av: new THREE.Vector3(0, 0, 11.6) };
function stopPose(st, y, out) { out.cam.copy(st.c).addScaledVector(st.n, st.D); out.cam.y = y; out.look.copy(st.c); out.look.y = y; out.av.copy(st.avatarAt); }
const pa = { cam: new THREE.Vector3(), look: new THREE.Vector3(), av: new THREE.Vector3() }, pb = { cam: new THREE.Vector3(), look: new THREE.Vector3(), av: new THREE.Vector3() };
function rail(js) {   // js = scroll position inside the journey (px)
  let A = K0, B = K0, u = 0, facing = null;
  if (!stops.length || js <= (stops[0] ? stops[0].s0 : 0)) { A = K0; B = K0; }
  else {
    for (let i = 0; i < stops.length; i++) {
      const st = stops[i], prev = i ? stops[i - 1] : null;
      if (js < st.s1) {           // travelling from the previous stop (or the doorway) to this one
        if (prev) { stopPose(prev, prev.yBot, pa); A = pa; } else A = K0;
        stopPose(st, st.yTop, pb); B = pb; u = smooth(st.s0, st.s1, js); break;
      }
      if (js < st.s3) {           // dwelling: read, then pan down a tall wall
        stopPose(st, st.yTop, pa); stopPose(st, st.yBot, pb); A = pa; B = pb; u = smooth(st.s1 + (st.s2 - st.s1 - st.pan) * 0.5, st.s2, js); facing = st; break;
      }
      if (i === stops.length - 1) { stopPose(st, st.yBot, pa); A = pa; B = pa; facing = st; }
    }
  }
  railCam.lerpVectors(A.cam, B.cam, u); railLook.lerpVectors(A.look, B.look, u); railAv.lerpVectors(A.av, B.av, u);
  // a gentle arc so the camera swings round rather than sliding sideways
  if (A !== B && A.cam && B.cam && !A.cam.equals(B.cam)) railCam.y += Math.sin(u * Math.PI) * 0.6;
  return facing;
}

// keep panels that aren't near the camera out of the browser's way
function cullPanels() {
  const f = new THREE.Vector3(); cam.getWorldDirection(f);
  objs.forEach(o => { const v = o.position.clone().sub(cam.position); const vis = v.dot(f) > 0.5 && v.length() < 40; if (o.element.style.visibility !== (vis ? 'visible' : 'hidden')) o.element.style.visibility = vis ? 'visible' : 'hidden'; });
}

/* ---------------- game state ---------------- */
const P = { pos: new THREE.Vector3(0, 0, 8), heading: Math.PI, target: null, focus: null };
const keys = new Set();
let camYaw = 0, camYawUser = 0, phase = 0, walkAmt = 0, idleT = 0, waveT = -1, active = null, tour = null, introT = 0, started = false, blendB = 0;
const clip = { action: null, t: 0, dur: 0 };
function playClip(n) {
  if (!rig || !rig.clips[n] || clip.action) return;
  const a = rig.mixer.clipAction(rig.clips[n]); a.reset(); a.setLoop(THREE.LoopOnce, 1); a.clampWhenFinished = true; a.play();
  Object.assign(clip, { action: a, t: 0, dur: rig.clips[n].duration });
}
function stopClip() { if (clip.action) clip.action.stop(); clip.action = null; }
function begin() { if (!started) { started = true; sec.classList.add('mu-started'); } }
function walkTo(v, focus = null) { begin(); stopClip(); P.target = v.clone(); P.focus = focus; }
function goExhibit(e) { walkTo(e.spot, e); }

/* ---------------- input (the rotunda) ---------------- */
let inView = false;
const roaming = () => blendB < 0.05;
const MOVE = { KeyW: [0, 1], ArrowUp: [0, 1], KeyS: [0, -1], ArrowDown: [0, -1], KeyA: [-1, 0], ArrowLeft: [-1, 0], KeyD: [1, 0], ArrowRight: [1, 0] };
window.addEventListener('keydown', e => {
  if (!inView || !roaming() || root.classList.contains('world-open') || /INPUT|TEXTAREA|SELECT|BUTTON/.test(e.target.tagName) || e.metaKey || e.ctrlKey || e.altKey) return;
  if (MOVE[e.code]) { keys.add(e.code); e.preventDefault(); stopTour(); P.target = null; begin(); }
  if ((e.code === 'KeyE' || e.code === 'Enter') && active) { e.preventDefault(); enter(active); }
});
window.addEventListener('keyup', e => keys.delete(e.code));
window.addEventListener('blur', () => keys.clear());
const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
let down = null;
canvas.addEventListener('pointerdown', e => { if (!roaming()) return; down = { x: e.clientX, y: e.clientY, yaw: camYawUser, drag: false }; canvas.setPointerCapture(e.pointerId); });
canvas.addEventListener('pointermove', e => { if (!down) return; const dx = e.clientX - down.x; if (Math.abs(dx) > 6) down.drag = true; if (down.drag) camYawUser = down.yaw - dx * 0.006; });
canvas.addEventListener('pointerup', e => {
  const d = down; down = null;
  if (!d || d.drag || !roaming()) return;
  const r = canvas.getBoundingClientRect();
  ndc.set((e.clientX - r.left) / r.width * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
  ray.setFromCamera(ndc, cam); stopTour();
  for (const ex of EXHIBITS) if (ray.intersectObjects(ex.hit, true).length) { goExhibit(ex); return; }
  const p = new THREE.Vector3(); if (ray.ray.intersectPlane(floorPlane, p)) walkTo(p);
});

/* ---------------- placard, tour, minimap ---------------- */
const pTitle = placard.querySelector('.mp-title'), pNo = placard.querySelector('.mp-no'), pProj = placard.querySelector('.mp-proj'),
  pDesc = placard.querySelector('.mp-desc'), pEnter = placard.querySelector('.mp-enter'), pLive = placard.querySelector('.mp-live');
function showPlacard(e) {
  if (active === e) return;
  active = e;
  if (!e) { placard.classList.remove('on'); return; }
  pNo.textContent = 'Exhibit ' + e.no; pTitle.textContent = e.title; pProj.textContent = e.proj; pDesc.textContent = e.desc;
  pEnter.textContent = e.about ? 'Listen  →' : 'Enter the exhibit  →';
  if (e.about) pEnter.removeAttribute('data-world'); else pEnter.setAttribute('data-world', e.id);
  pEnter.setAttribute('href', e.about ? '#about' : '#case-' + (e.id === 'chat' ? 'securechat' : e.id));
  pLive.hidden = !e.live; if (e.live) pLive.href = e.live;
  placard.classList.add('on');
}
function scrollToEl(el) { window.__lenis ? window.__lenis.scrollTo(el, { offset: -64, duration: 2.2 }) : el.scrollIntoView({ behavior: 'smooth' }); }
function enter(e) { if (e.about) { stopTour(); scrollToEl(document.getElementById('about')); return; } pEnter.click(); }
pEnter.addEventListener('click', ev => { if (active && active.about) { ev.preventDefault(); enter(active); } });
function startTour() { begin(); tour = { i: 0, wait: 0 }; goExhibit(byId(TOUR[0])); tourBtn.textContent = 'Stop the tour'; tourBtn.setAttribute('aria-pressed', 'true'); }
function stopTour() { if (!tour) return; tour = null; tourBtn.textContent = 'Guided tour'; tourBtn.setAttribute('aria-pressed', 'false'); }
tourBtn.addEventListener('click', () => (tour ? stopTour() : startTour()));
const mctx = mapCv.getContext('2d');
function drawMap() {
  const s = mapCv.width, c = s / 2, k = (s / 2 - 8) / R;
  mctx.clearRect(0, 0, s, s);
  mctx.fillStyle = 'rgba(246,241,232,.92)'; mctx.beginPath(); mctx.arc(c, c, s / 2 - 2, 0, Math.PI * 2); mctx.fill();
  mctx.strokeStyle = 'rgba(42,36,28,.5)'; mctx.lineWidth = 1.5; mctx.stroke();
  EXHIBITS.forEach(e => {
    const on = active === e; mctx.fillStyle = on ? '#9b3d22' : '#2a241c';
    mctx.fillRect(c + e.pos.x * k - 5, c + e.pos.z * k - 5, 10, 10);
    mctx.fillStyle = on ? '#9b3d22' : 'rgba(42,36,28,.7)'; mctx.font = `600 10px ${MONO}`; mctx.textAlign = 'center';
    mctx.fillText(e.no, c + e.pos.x * k * 0.78, c + e.pos.z * k * 0.78 + 4);
  });
  const px = c + char.position.x * k, pz = c + Math.min(R, char.position.z) * k;
  mctx.save(); mctx.translate(px, pz); mctx.rotate(-char.rotation.y + Math.PI);
  mctx.fillStyle = '#9b3d22'; mctx.beginPath(); mctx.moveTo(0, -8); mctx.lineTo(5.5, 6); mctx.lineTo(-5.5, 6); mctx.closePath(); mctx.fill(); mctx.restore();
}
mapCv.addEventListener('click', e => {
  const r = mapCv.getBoundingClientRect(), s = r.width, k = (s / 2 - 8 * s / mapCv.width) / R;
  const x = (e.clientX - r.left - s / 2) / k, z = (e.clientY - r.top - s / 2) / k;
  stopTour();
  let best = null, bd = 2.2; EXHIBITS.forEach(ex => { const d = Math.hypot(ex.pos.x - x, ex.pos.z - z); if (d < bd) { bd = d; best = ex; } });
  if (best) goExhibit(best); else walkTo(new THREE.Vector3(x, 0, z));
});

/* ---------------- loop ---------------- */
const tmp = new THREE.Vector3(), camPos = new THREE.Vector3(0, 5.6, 12.6), camLook = new THREE.Vector3(0, 1.4, -4);
const roamCam = new THREE.Vector3(0, 5.6, 12.6), roamLook = new THREE.Vector3(0, 1.4, -4);
const prevAv = new THREE.Vector3(0, 0, 8);
function resize() {
  const w = window.innerWidth, h = window.innerHeight;
  renderer.setSize(w, h, false); css.setSize(w, h);
  cam.aspect = w / h; cam.fov = w / h < 0.8 ? 62 : 48; cam.updateProjectionMatrix();
  mapCv.width = mapCv.height = Math.round(mapCv.clientWidth * Math.min(2, window.devicePixelRatio || 1)) || 240;
  layoutWing();
}
let rt; window.addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(resize, 120); });

let last = 0;
function frame(now) {
  requestAnimationFrame(frame);
  if (root.classList.contains('world-open')) { last = 0; return; }
  const dt = Math.min(0.05, last ? (now - last) / 1000 : 0.016); last = now;
  const t = now / 1000;
  EXHIBITS.forEach(e => e.update(reduce ? 0 : t));

  // where are we: the rotunda (play) or the wing (scroll)?
  const H0 = sec.offsetHeight, sy = window.scrollY;
  blendB = built ? smooth(H0 * 0.18, H0 * 0.9, sy) : 0;
  canvas.style.pointerEvents = roaming() ? '' : 'none';
  if (!roaming()) { keys.clear(); P.target = null; stopTour(); }

  // ---- rotunda movement ----
  const mv = new THREE.Vector3();
  const camFwd = new THREE.Vector3(Math.sin(camYaw + camYawUser + Math.PI), 0, Math.cos(camYaw + camYawUser + Math.PI));
  const camRight = new THREE.Vector3(-camFwd.z, 0, camFwd.x);
  keys.forEach(k => { const [x, z] = MOVE[k]; mv.addScaledVector(camRight, x).addScaledVector(camFwd, z); });
  let speed = 0;
  if (mv.lengthSq() > 0) { mv.normalize(); speed = 2.6; }
  else if (P.target) {
    tmp.subVectors(P.target, P.pos); tmp.y = 0; const d = tmp.length();
    if (d < 0.08) { P.target = null; if (P.focus) waveT = 0; }
    else { mv.copy(tmp).normalize(); speed = Math.min(2.4, d * 3 + 0.4); }
  }
  if (speed) { if (clip.action) stopClip(); P.pos.addScaledVector(mv, speed * dt); P.heading += angDiff(Math.atan2(mv.x, mv.z), P.heading) * (1 - Math.pow(0.0005, dt)); }
  else if (P.focus) P.heading += angDiff(Math.atan2(P.focus.pos.x - P.pos.x, P.focus.pos.z - P.pos.z), P.heading) * (1 - Math.pow(0.02, dt));
  const r = Math.hypot(P.pos.x, P.pos.z); if (r > R - 1.6) P.pos.multiplyScalar((R - 1.6) / r);
  EXHIBITS.forEach(e => { tmp.subVectors(P.pos, e.pos); tmp.y = 0; const d = tmp.length(); if (d < 1.45) P.pos.addScaledVector(tmp.normalize(), 1.45 - d); });

  // ---- rotunda camera ----
  if (rig || introT > 0) introT = Math.min(1, introT + dt / (reduce ? 0.01 : 3.2));
  if (speed && mv.dot(camFwd) > -0.3) camYaw += angDiff(P.heading + Math.PI, camYaw) * (1 - Math.pow(0.25, dt));
  if (!down) camYawUser *= Math.pow(0.4, dt);
  const yaw = camYaw + camYawUser, dist = small() ? 6.2 : 5.4, height = small() ? 3.1 : 2.5;
  const follow = tmp.set(P.pos.x + Math.sin(yaw) * dist, height, P.pos.z + Math.cos(yaw) * dist);
  const fr = Math.hypot(follow.x, follow.z); if (fr > R - 0.6) { follow.x *= (R - 0.6) / fr; follow.z *= (R - 0.6) / fr; }
  const e3 = 1 - Math.pow(1 - introT, 3);
  roamCam.lerp(new THREE.Vector3(0, 5.6, 12.6).lerp(follow, e3), 1 - Math.pow(0.02, dt));
  const lookGoal = new THREE.Vector3(0, 1.4, -4).lerp(new THREE.Vector3(P.pos.x, 1.15, P.pos.z), e3);
  if (active && !speed) lookGoal.lerp(new THREE.Vector3(active.pos.x, 1.4, active.pos.z), 0.35 * e3);
  roamLook.lerp(lookGoal, 1 - Math.pow(0.01, dt));

  // ---- the wing ----
  const facing = rail(sy - journey.offsetTop);
  cam.position.lerpVectors(roamCam, railCam, blendB);
  camLook.lerpVectors(roamLook, railLook, blendB);
  cam.lookAt(camLook);

  // ---- the avatar: player in the rotunda, companion in the wing ----
  const avPos = tmp.lerpVectors(P.pos, railAv, blendB).clone();
  let head = P.heading;
  if (blendB > 0) {
    const moving = avPos.distanceTo(prevAv) / dt;
    if (moving > 0.3) railHead += angDiff(Math.atan2(avPos.x - prevAv.x, avPos.z - prevAv.z), railHead) * (1 - Math.pow(0.001, dt));
    else railHead += angDiff(Math.atan2(cam.position.x - avPos.x, cam.position.z - avPos.z), railHead) * (1 - Math.pow(0.05, dt));
    head = P.heading + angDiff(railHead, P.heading) * blendB;
    speed = Math.max(speed * (1 - blendB), Math.min(2.4, moving));
  } else railHead = P.heading;
  const arrived = blendB > 0.5 && facing && speed < 0.2 && walkAmt > 0.4;
  if (arrived) waveT = 0;
  prevAv.copy(avPos);
  char.position.copy(avPos); char.rotation.y = head;

  walkAmt += ((speed ? Math.min(1, speed / 2.2) : 0) - walkAmt) * (1 - Math.pow(0.002, dt));
  phase += dt * 9.5 * Math.min(1, walkAmt * 3) * (0.75 + 0.25 * walkAmt);
  idleT = speed ? 0 : idleT + dt;
  if (idleT > 10 && !tour && !clip.action && !reduce && roaming()) { playClip(Math.random() < 0.6 ? 'dance' : 'excited'); idleT = -8; }

  if (rig) {
    for (const [b, q] of rig.rest) b.quaternion.copy(q);
    if (rig.hips) rig.hips.position.copy(rig.hipsRest);
    const sw = Math.sin(phase) * walkAmt;
    rig.wrap.position.y = Math.abs(Math.cos(phase)) * 0.03 * walkAmt + Math.sin(t * 2.1) * 0.003 * (1 - walkAmt);
    rig.wrap.rotation.set(0.04 * walkAmt, 0, Math.sin(t * 1.1) * 0.012 * (1 - walkAmt));
    const hipR = qx(-sw * 0.55), hipL = qx(sw * 0.55);
    drive('RightUpLeg', hipR); drive('RightLeg', conj(hipR, qx(Math.max(0, Math.sin(phase + 1.6)) * 0.9 * walkAmt)));
    drive('LeftUpLeg', hipL); drive('LeftLeg', conj(hipL, qx(Math.max(0, Math.sin(phase + 1.6 + Math.PI)) * 0.9 * walkAmt)));
    let lz = 0.1, lx = -sw * 0.45, lel = -0.15 - 0.25 * walkAmt, lelz = 0;
    if (waveT >= 0) {
      waveT += dt; const k = Math.min(1, waveT * 5) * Math.min(1, (2 - waveT) * 5);
      lz = 0.1 + k * 2.45; lx *= 1 - k; lel = lel * (1 - k); lelz = k * (0.35 + Math.sin(waveT * 13) * 0.45);
      if (waveT > 2) waveT = -1;
    }
    const shR = qe(sw * 0.45, 0, -0.1).multiply(Q().setFromAxisAngle(new THREE.Vector3(0, 0, 1), 0.22));
    const shL = qe(lx, 0, lz).multiply(Q().setFromAxisAngle(new THREE.Vector3(0, 0, 1), -0.22));
    drive('RightArm', shR); drive('RightForeArm', conj(shR, qe(-0.15 - 0.25 * walkAmt, 0, 0)));
    drive('LeftArm', shL); drive('LeftForeArm', conj(shL, qe(lel, 0, lelz)));
    let hy = 0;
    if (active && !speed && roaming()) hy = Math.max(-0.5, Math.min(0.5, angDiff(Math.atan2(active.pos.x - P.pos.x, active.pos.z - P.pos.z), P.heading)));
    else if (facing && !speed) hy = Math.max(-0.6, Math.min(0.6, angDiff(Math.atan2(-facing.n.x, -facing.n.z), head)));
    const hq = qe(0.05, hy, 0), half = Q().slerp(hq, 0.45);
    drive('Neck', half); drive('Head', half.clone().invert().multiply(hq));
    if (clip.action) {
      clip.t += dt;
      const w = Math.max(0, Math.min(Math.min(1, clip.t / 0.35), (clip.dur - clip.t) / 0.45));
      const snap = new Map(); for (const b of rig.rest.keys()) snap.set(b, b.quaternion.clone());
      const hs = rig.hips ? rig.hips.position.clone() : null;
      rig.mixer.update(dt);
      for (const [b, q] of snap) b.quaternion.slerpQuaternions(q, b.quaternion.clone(), w);
      if (rig.hips) rig.hips.position.lerpVectors(hs, rig.hips.position.clone(), w);
      if (clip.t >= clip.dur) stopClip();
    }
  }

  // nearest exhibit → placard (rotunda only)
  let near = null, nd = 3.3;
  if (roaming()) EXHIBITS.forEach(e => { const d = Math.hypot(e.pos.x - P.pos.x, e.pos.z - P.pos.z); if (d < nd) { nd = d; near = e; } });
  showPlacard(near);
  EXHIBITS.forEach(e => { const k = e === near ? 1.08 : 1; e.obj.scale.lerp(new THREE.Vector3(k, k, k), 0.08); });
  if (tour && !P.target) { tour.wait += dt; if (tour.wait > 4.2) { tour.i++; tour.wait = 0; if (tour.i >= TOUR.length) stopTour(); else goExhibit(byId(TOUR[tour.i])); } }

  renderer.render(scene, cam);
  const fade = smooth(0.25, 0.75, blendB);
  if (fade > 0) { cullPanels(); css.render(cssScene, cam); cssLayer.style.display = 'block'; cssLayer.style.opacity = fade.toFixed(3); }
  else cssLayer.style.display = 'none';
  if (sy < H0) drawMap();
}

/* ---------------- start ---------------- */
new IntersectionObserver(en => { inView = en[0].isIntersecting; if (!inView) keys.clear(); }, { threshold: 0.2 }).observe(sec);
new IntersectionObserver(en => root.classList.toggle('in-museum', en[0].intersectionRatio > 0.3), { threshold: [0, 0.3, 0.6] }).observe(sec);
if (!reduce) makePanels();   // reduced motion keeps the ordinary page below the museum
sec.classList.add('mu-on');
resize();
if (document.fonts) document.fonts.ready.then(() => setTimeout(layoutWing, 50));
requestAnimationFrame(frame);
loadAvatar().catch(err => console.warn('Museum avatar unavailable:', err)).finally(() => { loadEl.classList.add('done'); });
