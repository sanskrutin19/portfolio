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

const wall = new THREE.Mesh(new THREE.CylinderGeometry(R, R, H, 128, 1, true), std('#efe7da', 0.95, 0, { side: THREE.BackSide }));
wall.position.y = H / 2; scene.add(wall);
const trim = std('#d9cdbb', 0.6);
[0.18, H - 0.25].forEach(y => { const t = new THREE.Mesh(new THREE.TorusGeometry(R - 0.06, 0.12, 8, 128), trim); t.rotation.x = Math.PI / 2; t.position.y = y; scene.add(t); });
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
let rig = null;   // { model, bones, rest, hips, hipsRest, mixer, clips }
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

// pose a bone by a rotation expressed in the character's frame (same method as minime.js)
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
const conj = (outer, inner) => outer.clone().multiply(inner).multiply(outer.clone().invert());

/* ---------------- game state ---------------- */
const P = { pos: new THREE.Vector3(0, 0, 8), heading: Math.PI, vel: 0, target: null, focus: null };
const keys = new Set();
let camYaw = Math.PI, camYawUser = 0, phase = 0, walkAmt = 0, idleT = 0, waveT = -1, active = null, tour = null, introT = 0, started = false;
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

/* ---------------- input ---------------- */
let inView = false;
const MOVE = { KeyW: [0, 1], ArrowUp: [0, 1], KeyS: [0, -1], ArrowDown: [0, -1], KeyA: [-1, 0], ArrowLeft: [-1, 0], KeyD: [1, 0], ArrowRight: [1, 0] };
window.addEventListener('keydown', e => {
  if (!inView || root.classList.contains('world-open') || /INPUT|TEXTAREA|SELECT/.test(e.target.tagName) || e.metaKey || e.ctrlKey || e.altKey) return;
  if (MOVE[e.code]) { keys.add(e.code); e.preventDefault(); stopTour(); P.target = null; begin(); }
  if ((e.code === 'KeyE' || e.code === 'Enter') && active && e.target === document.body) { e.preventDefault(); enter(active); }
});
window.addEventListener('keyup', e => keys.delete(e.code));
window.addEventListener('blur', () => keys.clear());

const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
let down = null;
canvas.addEventListener('pointerdown', e => { down = { x: e.clientX, y: e.clientY, yaw: camYawUser, drag: false }; canvas.setPointerCapture(e.pointerId); });
canvas.addEventListener('pointermove', e => {
  if (!down) return;
  const dx = e.clientX - down.x;
  if (Math.abs(dx) > 6) down.drag = true;
  if (down.drag) camYawUser = down.yaw - dx * 0.006;
});
canvas.addEventListener('pointerup', e => {
  const d = down; down = null;
  if (!d || d.drag) return;
  const r = canvas.getBoundingClientRect();
  ndc.set((e.clientX - r.left) / r.width * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
  ray.setFromCamera(ndc, cam);
  stopTour();
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
  window.dispatchEvent(new CustomEvent('museum:exhibit', { detail: { id: e.id } }));
}
function enter(e) {
  if (e.about) { stopTour(); const el = document.getElementById('about'); window.__lenis ? window.__lenis.scrollTo(el, { duration: 1.6 }) : el.scrollIntoView({ behavior: 'smooth' }); return; }
  pEnter.click();
}
pEnter.addEventListener('click', ev => { if (active && active.about) { ev.preventDefault(); enter(active); } });

function startTour() { begin(); tour = { i: 0, wait: 0 }; goExhibit(byId(TOUR[0])); tourBtn.textContent = 'Stop the tour'; tourBtn.setAttribute('aria-pressed', 'true'); }
function stopTour() { if (!tour) return; tour = null; tourBtn.textContent = 'Guided tour'; tourBtn.setAttribute('aria-pressed', 'false'); }
tourBtn.addEventListener('click', () => (tour ? stopTour() : startTour()));
sec.querySelectorAll('[data-goto]').forEach(b => b.addEventListener('click', () => { stopTour(); goExhibit(byId(b.dataset.goto)); }));

const mctx = mapCv.getContext('2d');
function drawMap() {
  const s = mapCv.width, c = s / 2, k = (s / 2 - 8) / R;
  mctx.clearRect(0, 0, s, s);
  mctx.fillStyle = 'rgba(246,241,232,.92)'; mctx.beginPath(); mctx.arc(c, c, s / 2 - 2, 0, Math.PI * 2); mctx.fill();
  mctx.strokeStyle = 'rgba(42,36,28,.5)'; mctx.lineWidth = 1.5; mctx.stroke();
  EXHIBITS.forEach(e => {
    const on = active === e;
    mctx.fillStyle = on ? '#9b3d22' : '#2a241c';
    mctx.fillRect(c + e.pos.x * k - 5, c + e.pos.z * k - 5, 10, 10);
    mctx.fillStyle = on ? '#9b3d22' : 'rgba(42,36,28,.7)'; mctx.font = `600 10px ${MONO}`; mctx.textAlign = 'center';
    mctx.fillText(e.no, c + e.pos.x * k * 0.78, c + e.pos.z * k * 0.78 + 4);
  });
  const px = c + P.pos.x * k, pz = c + P.pos.z * k;
  mctx.save(); mctx.translate(px, pz); mctx.rotate(-P.heading + Math.PI);
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
function resize() {
  const w = sec.clientWidth, h = sec.clientHeight;
  renderer.setSize(w, h, false); cam.aspect = w / h; cam.fov = w / h < 0.8 ? 62 : 48; cam.updateProjectionMatrix();
  mapCv.width = mapCv.height = Math.round(mapCv.clientWidth * Math.min(2, window.devicePixelRatio || 1)) || 240;
}
window.addEventListener('resize', resize);

let last = 0, raf = 0;
function frame(now) {
  raf = requestAnimationFrame(frame);
  if (!inView || root.classList.contains('world-open')) { last = 0; return; }
  const dt = Math.min(0.05, last ? (now - last) / 1000 : 0.016); last = now;
  const t = now / 1000;
  EXHIBITS.forEach(e => e.update(reduce ? 0 : t));

  // movement
  let mv = new THREE.Vector3();
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
  if (speed) {
    if (clip.action) stopClip();
    P.pos.addScaledVector(mv, speed * dt);
    const want = Math.atan2(mv.x, mv.z);
    let dh = want - P.heading; while (dh > Math.PI) dh -= 2 * Math.PI; while (dh < -Math.PI) dh += 2 * Math.PI;
    P.heading += dh * (1 - Math.pow(0.0005, dt));
  } else if (P.focus) {
    const want = Math.atan2(P.focus.pos.x - P.pos.x, P.focus.pos.z - P.pos.z);
    let dh = want - P.heading; while (dh > Math.PI) dh -= 2 * Math.PI; while (dh < -Math.PI) dh += 2 * Math.PI;
    P.heading += dh * (1 - Math.pow(0.02, dt));
  }
  // walls and plinths
  const r = Math.hypot(P.pos.x, P.pos.z); if (r > R - 1.6) P.pos.multiplyScalar((R - 1.6) / r);
  EXHIBITS.forEach(e => { tmp.subVectors(P.pos, e.pos); tmp.y = 0; const d = tmp.length(); if (d < 1.45) P.pos.addScaledVector(tmp.normalize(), 1.45 - d); });

  walkAmt += ((speed ? Math.min(1, speed / 2.2) : 0) - walkAmt) * (1 - Math.pow(0.002, dt));
  phase += dt * 9.5 * Math.min(1, walkAmt * 3) * (0.75 + 0.25 * walkAmt);
  idleT = speed ? 0 : idleT + dt;
  if (idleT > 10 && !tour && !clip.action && !reduce) { playClip(Math.random() < 0.6 ? 'dance' : 'excited'); idleT = -8; }

  char.position.copy(P.pos); char.rotation.y = P.heading;

  // pose
  if (rig) {
    for (const [b, q] of rig.rest) b.quaternion.copy(q);
    if (rig.hips) rig.hips.position.copy(rig.hipsRest);
    const sw = Math.sin(phase) * walkAmt;
    rig.wrap.position.y = Math.abs(Math.cos(phase)) * 0.03 * walkAmt + Math.sin(t * 2.1) * 0.003 * (1 - walkAmt);
    rig.wrap.rotation.set(0.04 * walkAmt, 0, Math.sin(t * 1.1) * 0.012 * (1 - walkAmt));
    // legs: hip swing + knee bend (her right = character's −x)
    const hipR = qx(-sw * 0.55), hipL = qx(sw * 0.55);
    drive('RightUpLeg', hipR); drive('RightLeg', conj(hipR, qx(Math.max(0, Math.sin(phase + 1.6)) * 0.9 * walkAmt)));
    drive('LeftUpLeg', hipL); drive('LeftLeg', conj(hipL, qx(Math.max(0, Math.sin(phase + 1.6 + Math.PI)) * 0.9 * walkAmt)));
    // arms: opposite swing, arms in from the rest pose; a wave on arrival
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
    // head looks toward the exhibit she's at
    let hy = 0; if (active && !speed) { const a = Math.atan2(active.pos.x - P.pos.x, active.pos.z - P.pos.z) - P.heading; hy = Math.max(-0.5, Math.min(0.5, Math.atan2(Math.sin(a), Math.cos(a)))); }
    const hq = qe(0.05, hy, 0), half = Q().slerp(hq, 0.45);
    drive('Neck', half); drive('Head', half.clone().invert().multiply(hq));
    // mocap clip blended over the pose
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

  // nearest exhibit → placard
  let near = null, nd = 3.3;
  EXHIBITS.forEach(e => { const d = Math.hypot(e.pos.x - P.pos.x, e.pos.z - P.pos.z); if (d < nd) { nd = d; near = e; } });
  showPlacard(near);
  EXHIBITS.forEach(e => { const k = e === near ? 1.08 : 1; e.obj.scale.lerp(tmp.set(k, k, k), 0.08); });

  // the tour
  if (tour && !P.target) {
    tour.wait += dt;
    if (tour.wait > 4.2) { tour.i++; tour.wait = 0; if (tour.i >= TOUR.length) stopTour(); else goExhibit(byId(TOUR[tour.i])); }
  }

  // camera: an overhead reveal, then a follow camera behind her
  if (rig || introT > 0) introT = Math.min(1, introT + dt / (reduce ? 0.01 : 3.2));
  if (speed && mv.dot(camFwd) > -0.3) { let d = (P.heading + Math.PI) - camYaw; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; camYaw += d * (1 - Math.pow(0.25, dt)); }
  if (!down) camYawUser *= Math.pow(0.4, dt);
  const yaw = camYaw + camYawUser, dist = small() ? 6.2 : 5.4, height = small() ? 3.1 : 2.5;
  const follow = tmp.set(P.pos.x + Math.sin(yaw) * dist, height, P.pos.z + Math.cos(yaw) * dist);
  const fr = Math.hypot(follow.x, follow.z); if (fr > R - 0.6) { follow.x *= (R - 0.6) / fr; follow.z *= (R - 0.6) / fr; }
  const e3 = 1 - Math.pow(1 - introT, 3);
  const goal = new THREE.Vector3(0, 5.6, 12.6).lerp(follow, e3);
  camPos.lerp(goal, 1 - Math.pow(0.02, dt));
  const lookGoal = new THREE.Vector3(0, 1.4, -4).lerp(new THREE.Vector3(P.pos.x, 1.15, P.pos.z), e3);
  if (active && !speed) lookGoal.lerp(tmp.set(active.pos.x, 1.4, active.pos.z), 0.35 * e3);
  camLook.lerp(lookGoal, 1 - Math.pow(0.01, dt));
  cam.position.copy(camPos); cam.lookAt(camLook);

  renderer.render(scene, cam);
  drawMap();
}

/* ---------------- start ---------------- */
resize();
new IntersectionObserver(en => { inView = en[0].isIntersecting; if (!inView) keys.clear(); }, { threshold: 0.2 }).observe(sec);
new IntersectionObserver(en => root.classList.toggle('in-museum', en[0].intersectionRatio > 0.3), { threshold: [0, 0.3, 0.6] }).observe(sec);
sec.classList.add('mu-on');
raf = requestAnimationFrame(frame);
loadAvatar().catch(err => console.warn('Museum avatar unavailable:', err)).finally(() => { loadEl.classList.add('done'); });
