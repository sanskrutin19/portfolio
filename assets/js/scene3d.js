/* Sanskruti Naik — 3D background scene.
   One field of nodes that morphs between formations as you scroll:
   neural network (hero) → retrieval funnel (RAG) → globe (geospatial)
   → helix (vision / XAI) → clusters (skills) → ring (contact).
   Loaded only when WebGL is available and reduced motion is off. */
import * as THREE from 'three';

const canvas = document.getElementById('scene3d');
const narrow = window.matchMedia('(max-width: 760px)').matches;
const N = narrow ? 360 : 720;
const LAYERS = 6;
// colours follow the site theme (CSS tokens --scene-node / --scene-accent)
const LIME = new THREE.Color();   // accent: lit path
const PAPER = new THREE.Color();  // nodes and edges
const CYAN = new THREE.Color();   // a few pulses
const DIM = new THREE.Color();
function readTheme() {
  const cs = getComputedStyle(document.documentElement);
  PAPER.set(cs.getPropertyValue('--scene-node').trim() || '#1e1e1e');
  LIME.set(cs.getPropertyValue('--scene-accent').trim() || '#1d3cff');
  CYAN.copy(LIME);
  DIM.copy(PAPER);
}
readTheme();

let seed = 11;
const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
const gauss = () => Math.sqrt(-2 * Math.log(rnd() + 1e-9)) * Math.cos(6.2831 * rnd());

/* ---------------- formations ---------------- */
const forms = {};
const layerOf = new Int16Array(N);
const per = Math.floor(N / LAYERS);

forms.net = new Float32Array(N * 3);
for (let i = 0; i < N; i++) {
  const l = Math.min(LAYERS - 1, Math.floor(i / per));
  const k = i - l * per;
  layerOf[i] = l;
  const r = 2.7 * Math.sqrt((k + 0.5) / per), a = k * 2.39996;
  forms.net.set([-5 + l * (10 / (LAYERS - 1)) + (rnd() - 0.5) * 0.4, r * Math.cos(a), r * Math.sin(a)], i * 3);
}

forms.funnel = new Float32Array(N * 3);
for (let i = 0; i < N; i++) {
  const t = rnd(), a = rnd() * 6.2831;
  let x, y, z;
  if (i % 10 === 0) { // the "answer" stream leaving the narrow end
    y = -3.6 - rnd() * 2.6; x = (rnd() - 0.5) * 0.12; z = (rnd() - 0.5) * 0.12;
  } else {
    const r = 0.22 + Math.pow(1 - t, 2.2) * 4.4;
    y = 4.2 - t * 7.8; x = Math.cos(a) * r; z = Math.sin(a) * r;
  }
  forms.funnel.set([x, y, z], i * 3);
}

forms.globe = new Float32Array(N * 3);
for (let i = 0; i < N; i++) {
  const y = 1 - 2 * (i + 0.5) / N, r = Math.sqrt(1 - y * y), p = i * 2.39996, R = 3.7;
  forms.globe.set([Math.cos(p) * r * R, y * R, Math.sin(p) * r * R], i * 3);
}

forms.helix = new Float32Array(N * 3);
for (let i = 0; i < N; i++) {
  const t = rnd(), s = i % 2, ang = t * Math.PI * 6 + s * Math.PI, R = 1.8;
  let x = Math.cos(ang) * R, z = Math.sin(ang) * R;
  if (i % 7 === 0) { const u = rnd() * 2 - 1; x *= u; z *= u; } // rungs
  forms.helix.set([x + gauss() * 0.06, -5.5 + t * 11, z + gauss() * 0.06], i * 3);
}

forms.clusters = new Float32Array(N * 3);
for (let i = 0; i < N; i++) {
  const c = i % 5, a = c * 6.2831 / 5 + 0.4, R = 3.6, s = 0.55 + (c % 2) * 0.3;
  forms.clusters.set([Math.cos(a) * R + gauss() * s, Math.sin(a) * R * 0.75 + gauss() * s, gauss() * s], i * 3);
}

forms.ring = new Float32Array(N * 3);
for (let i = 0; i < N; i++) {
  const u = rnd() * 6.2831, v = rnd() * 6.2831, R = 3.9, r = 0.25 + rnd() * 0.35;
  forms.ring.set([(R + r * Math.cos(v)) * Math.cos(u), (R + r * Math.cos(v)) * Math.sin(u), r * Math.sin(v)], i * 3);
}

/* ---------------- edges (built on the network formation) ---------------- */
const edgeList = [];
const out = Array.from({ length: N }, () => []);
const byLayer = Array.from({ length: LAYERS }, () => []);
for (let i = 0; i < N; i++) byLayer[layerOf[i]].push(i);
for (let l = 0; l < LAYERS - 1; l++) {
  for (const a of byLayer[l]) {
    const ay = forms.net[a * 3 + 1], az = forms.net[a * 3 + 2];
    const near = byLayer[l + 1]
      .map(b => [b, (forms.net[b * 3 + 1] - ay) ** 2 + (forms.net[b * 3 + 2] - az) ** 2])
      .sort((p, q) => p[1] - q[1]).slice(0, 5);
    const picks = rnd() < 0.35 ? 2 : 1;
    for (let j = 0; j < picks; j++) {
      const b = near[Math.floor(rnd() * near.length)][0];
      out[a].push(edgeList.length);
      edgeList.push([a, b]);
    }
  }
}
const E = edgeList.length;

/* ---------------- three.js setup ---------------- */
const renderer = new THREE.WebGLRenderer({ canvas, antialias: !narrow, alpha: true, powerPreference: 'high-performance' });
const dpr = Math.min(window.devicePixelRatio || 1, narrow ? 1.5 : 2);
renderer.setPixelRatio(dpr);
renderer.setClearColor(0x000000, 0);
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
camera.position.set(0, 0, 14);
const group = new THREE.Group();
scene.add(group);

const pointVert = /* glsl */`
  uniform float uPixel;
  attribute float aSize;
  attribute vec3 aColor;
  varying vec3 vColor;
  varying float vFade;
  void main() {
    vColor = aColor;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = aSize * uPixel * (56.0 / -mv.z);
    vFade = smoothstep(26.0, 8.0, -mv.z);
    gl_Position = projectionMatrix * mv;
  }`;
const pointFrag = /* glsl */`
  uniform float uOpacity;
  varying vec3 vColor;
  varying float vFade;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    if (d > 0.5) discard;
    float a = pow(smoothstep(0.5, 0.0, d), 1.6);
    gl_FragColor = vec4(vColor, a * uOpacity * (0.35 + 0.65 * vFade));
  }`;
const pointMaterial = () => new THREE.ShaderMaterial({
  uniforms: { uPixel: { value: dpr }, uOpacity: { value: 1 } },
  vertexShader: pointVert, fragmentShader: pointFrag,
  transparent: true, depthWrite: false, blending: THREE.NormalBlending
});

// nodes
const pos = Float32Array.from(forms.net);
const colors = new Float32Array(N * 3);
const sizes = new Float32Array(N);
const baseSize = new Float32Array(N);
const speed = new Float32Array(N);
for (let i = 0; i < N; i++) { baseSize[i] = 0.7 + rnd() * 1.1; speed[i] = 0.02 + rnd() * 0.035; }
const nodeGeo = new THREE.BufferGeometry();
nodeGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage));
nodeGeo.setAttribute('aColor', new THREE.BufferAttribute(colors, 3).setUsage(THREE.DynamicDrawUsage));
nodeGeo.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1).setUsage(THREE.DynamicDrawUsage));
const nodeMat = pointMaterial();
group.add(new THREE.Points(nodeGeo, nodeMat));

// edges
const edgePos = new Float32Array(E * 6);
const edgeGeo = new THREE.BufferGeometry();
edgeGeo.setAttribute('position', new THREE.BufferAttribute(edgePos, 3).setUsage(THREE.DynamicDrawUsage));
const edgeMat = new THREE.LineBasicMaterial({ color: PAPER, transparent: true, opacity: 0.2, depthWrite: false });
group.add(new THREE.LineSegments(edgeGeo, edgeMat));

// lit retrieval path
const pathPos = new Float32Array((LAYERS - 1) * 6);
const pathGeo = new THREE.BufferGeometry();
pathGeo.setAttribute('position', new THREE.BufferAttribute(pathPos, 3).setUsage(THREE.DynamicDrawUsage));
const pathMat = new THREE.LineBasicMaterial({ color: LIME, transparent: true, opacity: 1, depthWrite: false });
group.add(new THREE.LineSegments(pathGeo, pathMat));

// glowing particles sampled along the lit path (WebGL lines are only 1px wide)
const PER_SEG = 26;
const C = (LAYERS - 1) * PER_SEG;
const cometPos = new Float32Array(C * 3);
const cometCol = new Float32Array(C * 3);
const cometSize = new Float32Array(C);
for (let i = 0; i < C; i++) { cometCol.set([LIME.r, LIME.g, LIME.b], i * 3); cometSize[i] = 1.5; }
const cometGeo = new THREE.BufferGeometry();
cometGeo.setAttribute('position', new THREE.BufferAttribute(cometPos, 3).setUsage(THREE.DynamicDrawUsage));
cometGeo.setAttribute('aColor', new THREE.BufferAttribute(cometCol, 3));
cometGeo.setAttribute('aSize', new THREE.BufferAttribute(cometSize, 1).setUsage(THREE.DynamicDrawUsage));
const cometMat = pointMaterial();
group.add(new THREE.Points(cometGeo, cometMat));

// pulses travelling along edges
const P = narrow ? 60 : 150;
const pulsePos = new Float32Array(P * 3);
const pulseCol = new Float32Array(P * 3);
const pulseSize = new Float32Array(P);
const pulses = [];
for (let i = 0; i < P; i++) {
  const c = rnd() < 0.2 ? CYAN : PAPER;
  pulseCol.set([c.r, c.g, c.b], i * 3);
  pulseSize[i] = 0.9;
  pulses.push({ e: Math.floor(rnd() * E), t: rnd(), v: 0.25 + rnd() * 0.5 });
}
const pulseGeo = new THREE.BufferGeometry();
pulseGeo.setAttribute('position', new THREE.BufferAttribute(pulsePos, 3).setUsage(THREE.DynamicDrawUsage));
pulseGeo.setAttribute('aColor', new THREE.BufferAttribute(pulseCol, 3));
pulseGeo.setAttribute('aSize', new THREE.BufferAttribute(pulseSize, 1));
const pulseMat = pointMaterial();
group.add(new THREE.Points(pulseGeo, pulseMat));

/* ---------------- section-driven state ---------------- */
const SCENES = {
  hero:     { form: 'net',      x: 0,                z: 13, op: 0,    edge: 0,     path: 0,   spin: 0,    rx: 0.38 },
  results:  { form: 'net',      x: 0,                z: 10, op: 0.45, edge: 0.07,  path: 0.5, spin: 0,    rx: 0.25 },
  funnel:   { form: 'funnel',   x: narrow ? 0 : 3.6, z: 13, op: 0.32, edge: 0.05, path: 0,   spin: 0.14, rx: 0.2 },
  globe:    { form: 'globe',    x: narrow ? 0 : 4.2, z: 13, op: 0.32, edge: 0.04, path: 0,   spin: 0.12, rx: 0.35 },
  helix:    { form: 'helix',    x: narrow ? 0 : 4.4, z: 13, op: 0.32, edge: 0.05, path: 0,   spin: 0.3,  rx: 0.15 },
  clusters: { form: 'clusters', x: 0,                z: 13, op: 0.45, edge: 0.03, path: 0,   spin: 0.08, rx: 0.1 },
  ring:     { form: 'ring',     x: narrow ? 0 : 3.4, z: 12, op: 0.85, edge: 0.03, path: 0,   spin: 0.1,  rx: 1.0 }
};
let active = SCENES.hero;
const cur = { x: active.x, z: active.z, op: 0, edge: active.edge, path: active.path, spin: 0, rx: active.rx };

const io = new IntersectionObserver(entries => {
  for (const en of entries) {
    if (en.isIntersecting && SCENES[en.target.dataset.scene]) active = SCENES[en.target.dataset.scene];
  }
}, { rootMargin: '-45% 0px -45% 0px' });
document.querySelectorAll('[data-scene]').forEach(el => io.observe(el));

/* ---------------- retrieval path ---------------- */
let path = [], pathT = 0, pathHold = 0;
function newPath() {
  let n = byLayer[0][Math.floor(Math.random() * byLayer[0].length)];
  path = [n];
  while (out[n].length) { n = edgeList[out[n][Math.floor(Math.random() * out[n].length)]][1]; path.push(n); }
  pathT = 0; pathHold = 0;
}
newPath();

const v3 = new THREE.Vector3();

/* ---------------- input ---------------- */
const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
window.addEventListener('pointermove', e => {
  pointer.tx = (e.clientX / window.innerWidth) * 2 - 1;
  pointer.ty = (e.clientY / window.innerHeight) * 2 - 1;
}, { passive: true });

let W = 0, H = 0;
function resize() {
  W = window.innerWidth; H = window.innerHeight;
  renderer.setSize(W, H, false);
  camera.aspect = W / H;
  camera.updateProjectionMatrix();
}
resize();
window.addEventListener('resize', resize);

const covers = Array.from(document.querySelectorAll('.paper, .band')).filter(el => !el.classList.contains('case-water'));
function covered() {
  for (const el of covers) { const r = el.getBoundingClientRect(); if (r.top <= 0 && r.bottom >= H) return true; }
  return false;
}

/* ---------------- loop ---------------- */
let last = 0, spinAngle = 0, first = true;
const ease = (k, dt) => 1 - Math.pow(1 - k, dt * 60);

function frame(now) {
  requestAnimationFrame(frame);

window.addEventListener('themechange', () => {
  readTheme();
  edgeMat.color.copy(PAPER);
  pathMat.color.copy(LIME);
  for (let i = 0; i < C; i++) cometCol.set([LIME.r, LIME.g, LIME.b], i * 3);
  for (let i = 0; i < P; i++) { const c = i % 5 === 0 ? CYAN : PAPER; pulseCol.set([c.r, c.g, c.b], i * 3); }
  cometGeo.attributes.aColor.needsUpdate = true;
  pulseGeo.attributes.aColor.needsUpdate = true;
});
  const dt = Math.min(0.05, last ? (now - last) / 1000 : 0.016);
  last = now;
  if (!first && covered()) return;

  const target = forms[active.form];
  const kk = ease(0.04, dt);
  for (const key of ['x', 'z', 'op', 'edge', 'path', 'spin', 'rx']) cur[key] += (active[key] - cur[key]) * kk;

  // morph nodes, each at its own pace for an organic transition
  for (let i = 0; i < N * 3; i++) pos[i] += (target[i] - pos[i]) * ease(speed[(i / 3) | 0], dt);

  // path animation
  const segs = path.length - 1;
  if (pathT < segs) pathT = Math.min(segs, pathT + dt * 2.2);
  else { pathHold += dt; if (pathHold > 2.6) newPath(); }
  const fade = pathT >= segs ? Math.max(0, 1 - Math.max(0, pathHold - 1.8) / 0.8) : 1;
  const litStrength = fade * cur.path;

  for (let i = 0; i < N; i++) {
    const pi = path.indexOf(i);
    const lit = pi >= 0 && pathT >= pi - 0.02 ? litStrength : 0;
    const c = lit > 0 ? DIM.clone().lerp(LIME, lit) : DIM;
    colors[i * 3] = c.r; colors[i * 3 + 1] = c.g; colors[i * 3 + 2] = c.b;
    sizes[i] = baseSize[i] + lit * 3.6;
  }

  for (let e = 0; e < E; e++) {
    const a = edgeList[e][0] * 3, b = edgeList[e][1] * 3, o = e * 6;
    edgePos[o] = pos[a]; edgePos[o + 1] = pos[a + 1]; edgePos[o + 2] = pos[a + 2];
    edgePos[o + 3] = pos[b]; edgePos[o + 4] = pos[b + 1]; edgePos[o + 5] = pos[b + 2];
  }

  pathPos.fill(0);
  for (let s = 0; s < segs; s++) {
    if (pathT <= s) break;
    const p = Math.min(1, pathT - s), a = path[s] * 3, b = path[s + 1] * 3, o = s * 6;
    pathPos[o] = pos[a]; pathPos[o + 1] = pos[a + 1]; pathPos[o + 2] = pos[a + 2];
    pathPos[o + 3] = pos[a] + (pos[b] - pos[a]) * p;
    pathPos[o + 4] = pos[a + 1] + (pos[b + 1] - pos[a + 1]) * p;
    pathPos[o + 5] = pos[a + 2] + (pos[b + 2] - pos[a + 2]) * p;
  }

  // comet: points along drawn path; the head is brightest
  for (let s = 0; s < LAYERS - 1; s++) {
    const a = path[s] * 3, b = (path[s + 1] ?? path[s]) * 3;
    for (let j = 0; j < PER_SEG; j++) {
      const idx = s * PER_SEG + j, f = j / PER_SEG, along = s + f;
      const shown = along <= pathT;
      cometPos[idx * 3] = pos[a] + (pos[b] - pos[a]) * f;
      cometPos[idx * 3 + 1] = pos[a + 1] + (pos[b + 1] - pos[a + 1]) * f;
      cometPos[idx * 3 + 2] = pos[a + 2] + (pos[b + 2] - pos[a + 2]) * f;
      const head = Math.max(0, 1 - (pathT - along) * 1.5);
      cometSize[idx] = shown ? 1.6 + head * 3 + 0.25 * Math.sin(now / 160 + idx) : 0;
    }
  }
  cometGeo.attributes.position.needsUpdate = true;
  cometGeo.attributes.aSize.needsUpdate = true;
  cometMat.uniforms.uOpacity.value = litStrength * 0.9;

  for (let i = 0; i < P; i++) {
    const q = pulses[i];
    q.t += q.v * dt;
    if (q.t >= 1) { q.t = 0; q.e = Math.floor(Math.random() * E); }
    const a = edgeList[q.e][0] * 3, b = edgeList[q.e][1] * 3;
    pulsePos[i * 3] = pos[a] + (pos[b] - pos[a]) * q.t;
    pulsePos[i * 3 + 1] = pos[a + 1] + (pos[b + 1] - pos[a + 1]) * q.t;
    pulsePos[i * 3 + 2] = pos[a + 2] + (pos[b + 2] - pos[a + 2]) * q.t;
  }

  nodeGeo.attributes.position.needsUpdate = true;
  nodeGeo.attributes.aColor.needsUpdate = true;
  nodeGeo.attributes.aSize.needsUpdate = true;
  edgeGeo.attributes.position.needsUpdate = true;
  pathGeo.attributes.position.needsUpdate = true;
  pulseGeo.attributes.position.needsUpdate = true;

  nodeMat.uniforms.uOpacity.value = cur.op;
  pulseMat.uniforms.uOpacity.value = cur.op * Math.min(1, 0.25 + cur.edge * 4);
  edgeMat.opacity = cur.edge * Math.min(1, cur.op * 1.4);
  pathMat.opacity = litStrength;

  // rotation: networks hold a readable angle, other formations spin
  spinAngle += cur.spin * dt;
  if (active.spin === 0) spinAngle += (Math.round(spinAngle / Math.PI) * Math.PI - spinAngle) * ease(0.03, dt);
  const t = now / 1000;
  group.rotation.y = -0.85 + Math.sin(t * 0.18) * 0.22 + spinAngle + window.scrollY * 0.00012;
  group.rotation.x = cur.rx + Math.sin(t * 0.13) * 0.05;
  group.position.x = cur.x;

  pointer.x += (pointer.tx - pointer.x) * ease(0.05, dt);
  pointer.y += (pointer.ty - pointer.y) * ease(0.05, dt);
  camera.position.set(pointer.x * 1.2, -pointer.y * 0.8, cur.z);
  camera.lookAt(cur.x * 0.35, 0, 0);

  renderer.render(scene, camera);

  if (first) { first = false; document.documentElement.classList.add('scene-ready'); }
}
requestAnimationFrame(frame);
