/* Work intro: a full-screen 3D retro digicam. Each press of the shutter fires
   the flash and develops a polaroid of the next project onto the "table"
   around the camera. Clicking a polaroid opens that project's 3D world
   (handled by worlds.js through the [data-world] links). */
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const lens = document.getElementById('lens');
const canvas = document.getElementById('lens-canvas');
const btn = document.getElementById('lens-shoot');
const countEl = document.getElementById('lens-count');
const hint = document.getElementById('lens-hint');
const prints = lens ? Array.from(lens.querySelectorAll('.print')) : [];
if (!lens || !canvas) throw new Error('lens markup missing');

/* ---------------- renderer + scene ---------------- */
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.setClearColor(0x000000, 0);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
const scene = new THREE.Scene();
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
const cam = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
cam.position.set(0, 1.4, 10);
cam.lookAt(0, 0.1, 0);
const keyLight = new THREE.DirectionalLight(0xffffff, 1.6); keyLight.position.set(3, 5, 6); scene.add(keyLight);
const flashLight = new THREE.PointLight(0xffffff, 0, 14); flashLight.position.set(-1.1, 0.7, 2.4); scene.add(flashLight);

/* ---------------- the camera model ---------------- */
const rig = new THREE.Group(); scene.add(rig);
const model = new THREE.Group(); rig.add(model);
const std = (color, rough = 0.45, metal = 0.2, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal, ...extra });
const accentOf = () => getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#1d3cff';
const silver = std('#cfccc3', 0.32, 0.75);
const charcoal = std('#1d1e1b', 0.55, 0.3);
const leather = std('#151614', 0.92, 0.05);
const accent = std(accentOf(), 0.35, 0.1, { emissive: accentOf(), emissiveIntensity: 0.12 });

const W = 3.4, H = 2.1, D = 1.0;
model.add(new THREE.Mesh(new RoundedBoxGeometry(W, H, D, 6, 0.3), silver));
const grip = new THREE.Mesh(new RoundedBoxGeometry(W - 0.12, 1.1, 0.06, 4, 0.03), leather);
grip.position.set(0, -0.42, D / 2); model.add(grip);
const lensG = new THREE.Group(); lensG.position.set(0.42, -0.12, D / 2); model.add(lensG);
const cyl = (rt, rb, h, m, seg = 48) => { const o = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), m); o.rotation.x = Math.PI / 2; return o; };
const mount = cyl(0.98, 0.98, 0.14, silver); mount.position.z = 0.07; lensG.add(mount);
const barrel = cyl(0.8, 0.84, 0.36, charcoal); barrel.position.z = 0.32; lensG.add(barrel);
const zoom = new THREE.Group(); zoom.position.z = 0.5; lensG.add(zoom);
const barrel2 = cyl(0.66, 0.7, 0.34, std('#111210', 0.5, 0.4)); barrel2.position.z = 0.17; zoom.add(barrel2);
const ring = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.028, 12, 64), accent); ring.position.z = 0.34; zoom.add(ring);
const irisTex = (() => {
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const g = c.getContext('2d');
  const grd = g.createRadialGradient(128, 128, 8, 128, 128, 128);
  grd.addColorStop(0, '#05070a'); grd.addColorStop(0.35, '#0d2333'); grd.addColorStop(0.62, '#2a1f4a');
  grd.addColorStop(0.8, '#103a2e'); grd.addColorStop(1, '#050605');
  g.fillStyle = grd; g.fillRect(0, 0, 256, 256);
  g.strokeStyle = 'rgba(207,224,182,.3)'; g.lineWidth = 2;
  for (const r of [60, 92, 118]) { g.beginPath(); g.arc(128, 128, r, 0, Math.PI * 2); g.stroke(); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
})();
const iris = new THREE.Mesh(new THREE.CircleGeometry(0.56, 48), new THREE.MeshBasicMaterial({ map: irisTex }));
iris.position.z = 0.33; zoom.add(iris);
const glass = new THREE.Mesh(new THREE.SphereGeometry(0.6, 48, 16, 0, Math.PI * 2, 0, Math.PI * 0.2),
  new THREE.MeshPhysicalMaterial({ color: '#0a1218', roughness: 0.04, clearcoat: 1, transparent: true, opacity: 0.45 }));
glass.rotation.x = Math.PI / 2; glass.position.z = 0.18; zoom.add(glass);
const flashMat = std('#f4f1e6', 0.2, 0, { emissive: '#ffffff', emissiveIntensity: 0.12 });
const flash = new THREE.Mesh(new RoundedBoxGeometry(0.78, 0.36, 0.08, 3, 0.04), flashMat);
flash.position.set(-1.1, 0.62, D / 2 + 0.02); model.add(flash);
const vf = new THREE.Mesh(new RoundedBoxGeometry(0.32, 0.24, 0.06, 2, 0.03), std('#0b0c0b', 0.1, 0.5));
vf.position.set(-0.4, 0.66, D / 2 + 0.01); model.add(vf);
const af = new THREE.Mesh(new THREE.SphereGeometry(0.06, 16, 12), std('#ff8a3d', 0.3, 0, { emissive: '#ff6a00', emissiveIntensity: 0.4 }));
af.position.set(-1.38, 0.12, D / 2 + 0.01); model.add(af);
(() => {
  const c = document.createElement('canvas'); c.width = 512; c.height = 96;
  const g = c.getContext('2d');
  g.fillStyle = '#d9d6cc'; g.font = '600 34px "Geist Mono", monospace'; g.textBaseline = 'middle';
  g.fillText('SN·26', 6, 48); g.fillStyle = '#8fa0ff'; g.fillText('AI ZOOM', 170, 48);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(1.25, 0.235), new THREE.MeshBasicMaterial({ map: t, transparent: true }));
  m.position.set(-0.98, -0.62, D / 2 + 0.04); model.add(m);
})();
const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.27, 0.27, 0.06, 32), silver); collar.position.set(1.12, H / 2 + 0.03, 0); model.add(collar);
const shutter = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.21, 0.14, 32), accent);
const shutterY = H / 2 + 0.1; shutter.position.set(1.12, shutterY, 0); model.add(shutter);
const dial = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.16, 20), std('#232421', 0.5, 0.5, { flatShading: true }));
dial.position.set(0.42, H / 2 + 0.08, -0.12); model.add(dial);
const printSlot = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.02, 0.07), std('#050505', 0.9, 0));
printSlot.position.set(-0.55, H / 2 + 0.005, 0.12); model.add(printSlot);
const shadow = new THREE.Mesh(new THREE.CircleGeometry(2.1, 48), new THREE.MeshBasicMaterial({ color: '#000', transparent: true, opacity: 0.12 }));
shadow.rotation.x = -Math.PI / 2; shadow.position.y = -1.55; shadow.scale.set(1, 0.42, 1); rig.add(shadow);

/* ---------------- sizing: the camera fills the screen ---------------- */
let SW = 0, SH = 0;
const narrow = () => SW < 760;
function resize() {
  SW = lens.clientWidth; SH = lens.clientHeight;
  renderer.setSize(SW, SH, false);
  cam.aspect = SW / SH; cam.updateProjectionMatrix();
  const visH = 2 * 10 * Math.tan(THREE.MathUtils.degToRad(15)), visW = visH * cam.aspect;
  const s = Math.min((narrow() ? 0.86 : 0.5) * visW / 3.6, (narrow() ? 0.36 : 0.52) * visH / 2.1);
  rig.scale.setScalar(s);
  rig.position.y = narrow() ? visH * 0.12 : 0;
}
const v = new THREE.Vector3();
function toScreen(x, y, z) {
  v.set(x, y, z); model.localToWorld(v); v.project(cam);
  return { x: (v.x + 1) / 2 * SW, y: (1 - v.y) / 2 * SH };
}

/* ---------------- polaroid slots around the camera ---------------- */
function slot(i, el) {
  const w = el.offsetWidth, h = el.offsetHeight;
  const desk = [[0.1, 0.54, -8], [0.17, 0.8, 5], [0.33, 0.87, -3], [0.67, 0.87, 4], [0.83, 0.8, -6], [0.9, 0.54, 7]];
  const mob = [[0.2, 0.72, -6], [0.5, 0.71, 3], [0.8, 0.72, -3], [0.2, 0.89, 5], [0.5, 0.88, -4], [0.8, 0.89, 6]];
  const [fx, fy, r] = (narrow() ? mob : desk)[i];
  const x = Math.min(SW - w - 8, Math.max(8, fx * SW - w / 2));
  const y = Math.min(SH - h - 8, Math.max(70, fy * SH - h / 2));
  return { x, y, r };
}
const place = (el, i) => { const s = slot(i, el); el.style.transform = `translate(${s.x}px, ${s.y}px) rotate(${s.r}deg)`; };

/* ---------------- interaction ---------------- */
const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
let shots = 0, busy = false, queued = 0, inView = false, raf = 0, last = 0;
const anims = [];
function kick() { if (!raf) { last = 0; raf = requestAnimationFrame(frame); } }
const tween = (dur, fn) => new Promise(res => { anims.push({ start: performance.now(), dur, fn, res }); kick(); });
const easeOut = t => 1 - Math.pow(1 - t, 3);
const flashEl = (() => { const d = document.createElement('div'); d.className = 'snap-flash'; document.body.appendChild(d); return d; })();
window.addEventListener('themechange', () => { accent.color.set(accentOf()); accent.emissive.set(accentOf()); kick(); });
lens.addEventListener('pointermove', e => {
  const r = lens.getBoundingClientRect();
  pointer.tx = (e.clientX - r.left) / r.width * 2 - 1;
  pointer.ty = (e.clientY - r.top) / r.height * 2 - 1;
  kick();
});

function updateUI() {
  const full = shots >= prints.length;
  countEl.textContent = `${shots} / ${prints.length} developed`;
  btn.querySelector('span').textContent = full ? 'Rewind the roll' : shots === 0 ? 'Press the shutter' : 'Develop the next one';
  hint.textContent = full ? 'Open any polaroid to step into its world' : shots === 0 ? 'Click the camera to develop my projects' : 'Keep clicking, or open a polaroid';
}

async function eject(el, i) {
  const w = el.offsetWidth, h = el.offsetHeight;
  const mid = toScreen(-0.55, 0, 0.1), top = toScreen(-0.55, H / 2, 0.12);
  const startT = `translate(${mid.x - w / 2}px, ${mid.y - h / 2}px) scale(.35)`;
  const upT = `translate(${top.x - w / 2}px, ${top.y - h * 0.62}px) scale(.62) rotate(-2deg)`;
  const s = slot(i, el);
  const endT = `translate(${s.x}px, ${s.y}px) rotate(${s.r}deg)`;
  el.classList.add('out', 'printing'); el.style.zIndex = '1';
  await el.animate([{ transform: startT }, { transform: upT }], { duration: 700, easing: 'cubic-bezier(.3,.7,.2,1)', fill: 'forwards' }).finished;
  el.style.zIndex = String(5 + i); el.classList.remove('printing');
  await el.animate([{ transform: upT }, { transform: endT }], { duration: 850, easing: 'cubic-bezier(.2,.8,.2,1.05)', fill: 'forwards' }).finished;
  el.getAnimations().forEach(a => a.cancel());
  el.style.transform = endT;
  el.classList.add('landed');
}

async function rewind() {
  const mid = toScreen(-0.55, 0, 0.1);
  await Promise.all(prints.filter(p => p.classList.contains('out')).reverse().map((el, k) => {
    const w = el.offsetWidth, h = el.offsetHeight;
    el.classList.remove('landed');
    return el.animate([{ transform: el.style.transform, opacity: 1 }, { transform: `translate(${mid.x - w / 2}px, ${mid.y - h / 2}px) scale(.3)`, opacity: 0 }],
      { duration: 550, delay: k * 60, easing: 'cubic-bezier(.6,0,.4,1)', fill: 'forwards' }).finished.then(() => {
      el.getAnimations().forEach(a => a.cancel());
      el.classList.remove('out'); el.style.transform = ''; el.style.zIndex = '';
    });
  }));
  shots = 0; updateUI();
}

async function shoot() {
  // extra clicks during a shot are queued, not lost
  if (busy) { if (shots + queued < prints.length) queued++; return; }
  busy = true;
  if (shots >= prints.length) { await rewind(); busy = false; return; }
  tween(220, t => { shutter.position.y = shutterY - 0.07 * Math.sin(Math.PI * t); });
  tween(700, t => { zoom.position.z = 0.5 + 0.3 * Math.sin(Math.PI * Math.min(1, t * 1.2)); });
  await new Promise(r => setTimeout(r, 160));
  flashEl.animate([{ opacity: 0 }, { opacity: 0.35, offset: 0.2 }, { opacity: 0 }], { duration: 600, easing: 'ease-out' });
  tween(450, t => { const k = 1 - easeOut(t); flashMat.emissiveIntensity = 0.12 + 7 * k; flashLight.intensity = 60 * k; });
  window.dispatchEvent(new CustomEvent('snap:shot', { detail: { shot: shots } }));
  await new Promise(r => setTimeout(r, 220));
  const i = shots++;
  updateUI();
  await eject(prints[i], i);
  busy = false;
  if (queued > 0) { queued--; shoot(); }
}
btn.addEventListener('click', shoot);
canvas.addEventListener('click', shoot);

/* ---------------- loop: render while visible or animating ---------------- */
function frame(now) {
  raf = 0;
  const dt = Math.min(0.05, last ? (now - last) / 1000 : 0.016); last = now;
  for (let k = anims.length - 1; k >= 0; k--) {
    const a = anims[k], t = Math.min(1, (now - a.start) / a.dur);
    a.fn(t);
    if (t >= 1) { anims.splice(k, 1); a.res(); }
  }
  const e = 1 - Math.pow(0.92, dt * 60);
  pointer.x += (pointer.tx - pointer.x) * e; pointer.y += (pointer.ty - pointer.y) * e;
  const t = now / 1000;
  model.position.y = Math.sin(t * 1.2) * 0.07;
  model.rotation.y = -0.3 + pointer.x * 0.5 + Math.sin(t * 0.5) * 0.05;
  model.rotation.x = 0.12 + pointer.y * 0.25;
  renderer.render(scene, cam);
  if (inView || anims.length) raf = requestAnimationFrame(frame);
}

lens.classList.remove('is-static');
resize();
updateUI();
window.addEventListener('resize', () => { resize(); prints.forEach((el, i) => { if (el.classList.contains('landed')) place(el, i); }); kick(); });
new IntersectionObserver(entries => { inView = entries[0].isIntersecting; if (inView) kick(); }, { threshold: 0.05 }).observe(lens);
kick();
