/* The avatar dialog: name + look, with a live 3D preview. */
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { makeFigure, BODIES, STYLES, SKINS, OUTFITS, ACCS } from './visitors.js';
import { visitor, saveVisitor, forgetVisitor, cleanName, LOOK_DEFAULT, presenceReady } from './live.js';

const dlg = document.getElementById('creator');
const form = dlg.querySelector('form');
const nameIn = dlg.querySelector('#cr-name');
const shownIn = dlg.querySelector('#cr-shown');
const cv = dlg.querySelector('.cr-preview');
const forgetBtn = dlg.querySelector('#cr-forget');
let look = { ...LOOK_DEFAULT }, renderer = null, fig = null, raf = 0, done = null;
dlg.querySelectorAll('[data-live-only]').forEach(el => { el.hidden = !presenceReady; });

// option rows
function row(sel, items, key, paint) {
  const box = dlg.querySelector(sel);
  items.forEach((it, i) => {
    const id = `cr-${key}-${i}`;
    const lab = document.createElement('label'); lab.className = 'cr-opt'; lab.htmlFor = id;
    const inp = document.createElement('input'); inp.type = 'radio'; inp.name = key; inp.id = id; inp.value = i;
    inp.addEventListener('change', () => { look[key] = i; if (fig) fig.setLook(look); });
    const sw = document.createElement('span'); sw.className = 'cr-sw'; paint(sw, it, i);
    lab.append(inp, sw); box.appendChild(lab);
  });
}
row('#cr-body', BODIES, 'body', (s, it) => { s.textContent = it; });
row('#cr-style', STYLES, 'style', (s, it) => { s.textContent = it; });
row('#cr-skin', SKINS, 'skin', (s, it, i) => { s.style.background = it; s.setAttribute('aria-label', 'Skin tone ' + (i + 1)); s.title = 'Skin tone ' + (i + 1); });
row('#cr-outfit', OUTFITS, 'outfit', (s, it) => { s.style.background = `linear-gradient(${it.top} 0 58%, ${it.low} 58%)`; s.setAttribute('aria-label', it.name); s.title = it.name; });
row('#cr-acc', ACCS, 'acc', (s, it) => { s.textContent = it; });
function sync() { ['body', 'style', 'skin', 'outfit', 'acc'].forEach(k => { const r = dlg.querySelector(`#cr-${k}-${look[k]}`); if (r) r.checked = true; }); }

function startPreview() {
  if (!renderer) {
    renderer = new THREE.WebGLRenderer({ canvas: cv, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
  }
  const scene = new THREE.Scene();
  scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture;
  scene.add(new THREE.HemisphereLight('#fff6ea', '#8a8073', 1.3));
  const key = new THREE.DirectionalLight('#fff1dc', 1.2); key.position.set(2, 4, 3); scene.add(key);
  const cam = new THREE.PerspectiveCamera(30, 1, 0.1, 20); cam.position.set(0, 1.15, 4.2); cam.lookAt(0, 0.88, 0);
  fig = makeFigure(look); scene.add(fig.group);
  const plinth = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.6, 0.12, 40), new THREE.MeshStandardMaterial({ color: '#e6ddcf', roughness: 0.8 }));
  plinth.position.y = -0.06; scene.add(plinth);
  const loop = t => {
    raf = requestAnimationFrame(loop);
    const w = cv.clientWidth, h = cv.clientHeight;
    if (cv.width !== Math.round(w * renderer.getPixelRatio())) { renderer.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix(); }
    fig.group.rotation.y = Math.sin(t / 1600) * 0.6;
    fig.pose(0, 0, 0, t / 1000);
    renderer.render(scene, cam);
  };
  raf = requestAnimationFrame(loop);
}
function stopPreview() { cancelAnimationFrame(raf); raf = 0; }

export function openCreator(onDone) {
  const v = visitor();
  look = v ? { ...LOOK_DEFAULT, ...v.look } : { ...LOOK_DEFAULT, skin: Math.floor(Math.random() * 6), outfit: Math.floor(Math.random() * 6) };
  nameIn.value = v ? v.name : '';
  shownIn.checked = v ? v.shown !== false : true;
  forgetBtn.hidden = !v;
  dlg.querySelector('.cr-submit').textContent = v ? 'Save and go back in' : 'Enter the museum';
  sync(); done = onDone;
  dlg.showModal(); startPreview();
  setTimeout(() => nameIn.focus(), 50);
}
form.addEventListener('submit', e => {
  e.preventDefault();
  const name = cleanName(nameIn.value);
  if (!name) { nameIn.setCustomValidity('Choose a name to show above your avatar.'); nameIn.reportValidity(); return; }
  const v = saveVisitor({ name, look, shown: shownIn.checked });
  dlg.close(); if (document.activeElement) document.activeElement.blur();   // so WASD walks straight away
  if (done) done(v);
});
nameIn.addEventListener('input', () => nameIn.setCustomValidity(''));
dlg.querySelector('.cr-cancel').addEventListener('click', () => dlg.close());
forgetBtn.addEventListener('click', () => { forgetVisitor(); dlg.close(); if (done) done(null); });
dlg.addEventListener('close', stopPreview);
