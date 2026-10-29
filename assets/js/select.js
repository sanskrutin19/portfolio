/* Character select: pick one of the realistic cast, type your name, enter.
   A full-screen <dialog> with a live 3D preview of the chosen person. */
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { CAST, makePerson, castOf, thumbOf } from './people.js';
import { visitor, saveVisitor, forgetVisitor, cleanName, presenceReady } from './live.js';
import { sfx } from './sfx.js';

const dlg = document.getElementById('select');
const form = dlg.querySelector('form');
const grid = dlg.querySelector('.sel-grid');
const nameIn = dlg.querySelector('#sel-name');
const shownIn = dlg.querySelector('#sel-shown');
const cv = dlg.querySelector('.sel-preview');
const status = dlg.querySelector('.sel-loading');
const caption = dlg.querySelector('.sel-caption');
const forgetBtn = dlg.querySelector('#sel-forget');
dlg.querySelectorAll('[data-live-only]').forEach(el => { el.hidden = !presenceReady; });

let chosen = 'f02', done = null, renderer = null, scene = null, cam = null, person = null, raf = 0, filter = 'all';

// the cast grid
CAST.forEach(c => {
  const lab = document.createElement('label'); lab.className = 'sel-card'; lab.dataset.body = c.body;
  const inp = document.createElement('input'); inp.type = 'radio'; inp.name = 'char'; inp.value = c.id; inp.id = 'sel-' + c.id;
  const img = document.createElement('img'); img.src = thumbOf(c.id); img.alt = ''; img.loading = 'lazy'; img.width = 120; img.height = 150;
  const cap = document.createElement('span'); cap.textContent = c.label;
  lab.htmlFor = inp.id; lab.setAttribute('aria-label', (c.body === 'f' ? 'Woman, ' : 'Man, ') + c.label);
  inp.addEventListener('change', () => pick(c.id));
  lab.append(inp, img, cap); grid.appendChild(lab);
});
dlg.querySelectorAll('.sel-tab').forEach(t => t.addEventListener('click', () => {
  filter = t.dataset.filter;
  dlg.querySelectorAll('.sel-tab').forEach(x => x.setAttribute('aria-pressed', String(x === t)));
  grid.querySelectorAll('.sel-card').forEach(card => { card.hidden = filter !== 'all' && card.dataset.body !== filter; });
}));

function pick(id) {
  chosen = id;
  const c = CAST.find(x => x.id === id);
  caption.textContent = c ? c.label : '';
  const r = dlg.querySelector('#sel-' + id); if (r && !r.checked) r.checked = true;
  if (!scene) return;
  if (person) { scene.remove(person.group); person.dispose(); }
  person = makePerson(id); scene.add(person.group);
  status.hidden = false;
  person.ready.then(() => { status.hidden = true; if (person && person.id === id) person.wave(); });
}

function startPreview() {
  if (!renderer) {
    renderer = new THREE.WebGLRenderer({ canvas: cv, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    scene = new THREE.Scene();
    scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture;
    scene.add(new THREE.HemisphereLight('#fff6ea', '#8a8073', 1.1));
    const key = new THREE.DirectionalLight('#fff1dc', 1.5); key.position.set(1.5, 3, 3); scene.add(key);
    const rim = new THREE.DirectionalLight('#ffd9b8', 0.8); rim.position.set(-2, 2, -2); scene.add(rim);
    const front = new THREE.DirectionalLight('#fff4e6', 0.9); front.position.set(0, 1.5, 4); scene.add(front);   // lights the face, no dark eye sockets
    const plinth = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.68, 0.12, 48), new THREE.MeshStandardMaterial({ color: '#e6ddcf', roughness: 0.8 }));
    plinth.position.y = -0.06; scene.add(plinth);
    cam = new THREE.PerspectiveCamera(26, 1, 0.1, 30);
  }
  pick(chosen);
  let last = 0;
  const loop = now => {
    raf = requestAnimationFrame(loop);
    const dt = Math.min(0.05, last ? (now - last) / 1000 : 0.016); last = now;
    const w = cv.clientWidth, h = cv.clientHeight;
    if (w && (cv.width !== Math.round(w * renderer.getPixelRatio()) || cv.height !== Math.round(h * renderer.getPixelRatio()))) {
      renderer.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix();
    }
    const tall = cam.aspect < 0.9;
    cam.position.set(0, 1.05, tall ? 5.6 : 4.4); cam.lookAt(0, 0.92, 0);
    if (person) { person.group.rotation.y = Math.sin(now / 2600) * 0.45; person.pose(0, 0, Math.sin(now / 1900) * 0.25, now / 1000, dt); }
    renderer.render(scene, cam);
  };
  raf = requestAnimationFrame(loop);
}
function stopPreview() { cancelAnimationFrame(raf); raf = 0; }

export function openSelect(onDone) {
  const v = visitor();
  chosen = v ? castOf(v.look) : CAST[Math.floor(Math.random() * CAST.length)].id;
  nameIn.value = v ? v.name : '';
  shownIn.checked = v ? v.shown !== false : true;
  forgetBtn.hidden = !v;
  dlg.querySelector('.sel-go').textContent = v ? 'Save  ▸' : 'Start  ▸';
  done = onDone;
  const r = dlg.querySelector('#sel-' + chosen); if (r) r.checked = true;
  dlg.showModal(); startPreview();
  setTimeout(() => nameIn.focus(), 60);
}
form.addEventListener('submit', e => {
  e.preventDefault();
  const name = cleanName(nameIn.value);
  if (!name) { nameIn.setCustomValidity('Choose the name that will float above your head.'); nameIn.reportValidity(); return; }
  const v = saveVisitor({ name, look: { char: chosen }, shown: shownIn.checked });
  dlg.close(); if (document.activeElement) document.activeElement.blur();
  if (done) done(v);
});
nameIn.addEventListener('input', () => nameIn.setCustomValidity(''));
dlg.querySelector('.sel-back').addEventListener('click', () => dlg.close());
forgetBtn.addEventListener('click', () => { forgetVisitor(); dlg.close(); if (done) done(null); });
dlg.addEventListener('close', stopPreview);
// ← → browse the cast like a game's character select
dlg.addEventListener('keydown', e => {
  if (e.target === nameIn || (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight')) return;
  if (e.target.type === 'radio') return;   // radios already do this natively
  e.preventDefault();
  const cards = [...grid.querySelectorAll('.sel-card:not([hidden]) input')], i = cards.findIndex(c => c.value === chosen);
  const n = cards[(i + (e.key === 'ArrowRight' ? 1 : -1) + cards.length) % cards.length];
  if (n) { n.checked = true; pick(n.value); n.focus(); }
});
grid.querySelectorAll('.sel-card').forEach(c => c.addEventListener('pointerenter', () => sfx.hover()));
