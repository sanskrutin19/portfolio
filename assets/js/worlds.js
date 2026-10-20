/* Project worlds: clicking a polaroid opens a full-screen case study with its
   own art direction (type, layout, colour) and its own 3D scene.
   Without JS the polaroids are plain links to the case studies below.
   Without WebGL the worlds still open, just without the 3D scene. */

const root = document.documentElement;
const world = document.getElementById('world');
const ui = document.getElementById('world-ui');
const closeBtn = document.getElementById('world-close');
const canvas = document.getElementById('world-canvas');
const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
if (!world) throw new Error('world markup missing');

/* ---------------- content (from the case studies; nothing new is claimed) ---------------- */
const WORLDS = {
  rag: {
    eyebrow: '01 · Flagship · 2026', title: 'Answers you can actually verify.', sub: 'Offline RAG platform for civil tender documents',
    blocks: [
      ['The problem', 'Tender documents run to hundreds of pages, and one missed clause on eligibility, EMD or penalties can sink a bid. The documents are confidential, too.'],
      ['What I built', 'A fully offline RAG platform (Ollama, ChromaDB, SQLite) that answers eligibility, EMD, scope, risk and penalty questions with the exact source sentence and page number. No document or question leaves the machine.'],
      ['Hybrid retrieval', 'Embeddings catch paraphrases; keyword search (SQLite FTS5) catches exact clause numbers and amounts. Both run, results are fused by rank, and a cross-encoder reranks the short list.'],
      ['Sentence-level evidence', 'Span selection picks the specific sentence that supports the answer, so every citation is verbatim with a page number.'],
      ['Measured, not eyeballed', 'Retrieval was checked against a golden question set: recall, rank and latency.'],
      ['Modules', 'Go / No-Go, risk finder, synopsis, pre-bid queries, contradiction finder, and Redmine through an MCP server.']
    ],
    stack: ['Python', 'FastAPI', 'Ollama', 'ChromaDB', 'SQLite FTS5', 'Cross-encoder reranking', 'MCP'],
    link: { href: 'https://promptivo.live/app', label: 'Open the live app ↗' }, caseId: 'case-rag'
  },
  chat: {
    eyebrow: '02 · 2026 – present', title: 'Privacy is an architectural decision.', sub: 'SecureChat, an end-to-end encrypted messaging platform',
    blocks: [
      ['Encryption', 'OMEMO2 (Signal Protocol) Double Ratchet encryption across messages, media and calls.'],
      ['Local-first', 'IndexedDB plus an encrypted key store for offline history and media caching, so the app stays usable without a persistent connection.'],
      ['Calls & files', 'WebRTC voice and video through coturn TURN/STUN, and encrypted file sharing up to 500 MB via chunked AES-GCM streaming.'],
      ['Ship it', 'Android and iOS builds from one React codebase with Capacitor; the full stack (ejabberd, PostgreSQL, Nginx, coturn) runs in Docker Compose.']
    ],
    stack: ['React 18', 'XMPP / ejabberd', 'OMEMO2', 'WebRTC', 'PostgreSQL', 'Docker', 'Capacitor'],
    note: 'Built on established protocols. No independent security audit or formal verification is claimed.', caseId: 'case-securechat'
  },
  geo: {
    eyebrow: '03 · 2026 – present', title: 'Finding change from above.', sub: 'Imagery-based unauthorised construction detection',
    blocks: [
      ['My contribution', 'I architected the PostGIS spatial database and Web GIS dashboard for a three-model ensemble fusing Sentinel-2, SAR and Cartosat-3 imagery to detect encroachment along pipelines.'],
      ['The cycle', 'A five-day automated monitoring cycle with SMS and email alerts.'],
      ['Pipeline', 'Satellite imagery → NDVI / NDBI preprocessing → YOLOv8 model ensemble → PostGIS spatial analysis → Web GIS dashboard → alerts.']
    ],
    metrics: [['~95%', 'accuracy · target'], ['<4%', 'false positives · target']],
    stack: ['Python', 'YOLOv8', 'Sentinel-1/2', 'SAR', 'PostGIS', 'NDVI / NDBI'],
    note: 'These are project targets, not achieved results. The project is ongoing.', caseId: 'case-geo'
  },
  plant: {
    eyebrow: '04 · Internship · Endureva Innovations · 2026', title: 'A diagnosis that shows its work.', sub: 'CNN plant-disease classifier',
    metrics: [['92%', 'accuracy'], ['50K', 'images'], ['38', 'classes'], ['<200 ms', 'latency'], ['30%', 'faster inference']],
    blocks: [
      ['What I built', 'A CNN plant-disease classifier, deployed and served via FastAPI to a Flutter mobile app.'],
      ['Explainable', 'Grad-CAM shows which region of the leaf drove each prediction.'],
      ['Optimised', 'Cut inference time by 30% with quantization and batch optimization, and owned the pipeline end to end, from preprocessing to production.']
    ],
    stack: ['Python', 'CNN', 'Grad-CAM', 'FastAPI', 'Flutter'],
    note: 'Figures as reported for that system; latency depends on hardware and load.', caseId: 'case-plant'
  },
  xai: {
    eyebrow: '05 · 2025 – 2026', title: 'AI that explains why.', sub: 'XAI-Care: explainable multimodal AI for elderly assistance',
    blocks: [
      ['What I built', 'The Flutter caregiver dashboard and the multimodal fusion logic that combines wearable sensors and camera input for real-time fall detection.'],
      ['Explainable alerts', 'Grad-CAM and SHAP turn each alert into something a non-technical caregiver can act on.'],
      ['Flow', 'Camera + wearable sensors → multimodal fusion → fall detection → caregiver alert with an explanation.']
    ],
    stack: ['Python', 'TensorFlow', 'FastAPI', 'Grad-CAM', 'SHAP', 'Flutter', 'Wearable sensors'],
    note: 'No clinical validation is claimed.', caseId: 'case-xai'
  },
  water: {
    eyebrow: '06 · 2026', title: 'Designed for the real world, not perfect connectivity.', sub: 'Water Survey, a Flutter field application',
    blocks: [
      ['Offline capture', 'Field surveyors capture water-connection data offline, with geo-tagging and structured export.'],
      ['Sync on reconnect', 'Records persist in SQLite and auto-sync through a REST API when the network comes back.'],
      ['Why it matters', 'Field networks are unreliable; the app is built so the work never depends on them.']
    ],
    stack: ['Flutter', 'SQLite', 'REST API', 'Offline-first'], caseId: 'case-water'
  }
};
const ORDER = ['rag', 'chat', 'geo', 'plant', 'xai', 'water'];

/* the interactive demos are borrowed from the hidden case-study store while a
   world is open (moved, not copied, so their event handlers keep working) */
const BORROW = {
  rag: ['#case-rag .rag-lab'],
  chat: ['#case-securechat .phone', '#case-securechat .arch'],
  geo: ['#case-geo .geo-map'],
  plant: ['#case-plant .plant-viz'],
  xai: ['#case-xai .shap'],
  water: ['#case-water .survey']
};
let borrowed = [];
function borrow(id, into) {
  (BORROW[id] || []).forEach(sel => {
    const el = document.querySelector(sel);
    if (!el) return;
    const mark = document.createComment('demo');
    el.parentNode.insertBefore(mark, el);
    borrowed.push([el, mark]);
    into.appendChild(el);
    [el, ...el.querySelectorAll('.reveal')].forEach(n => n.classList.add('in'));
  });
}
function giveBack() {
  borrowed.forEach(([el, mark]) => { mark.parentNode.insertBefore(el, mark); mark.remove(); });
  borrowed = [];
}

/* ---------------- fonts for the worlds load on first open ---------------- */
let fontsLoaded = false;
function loadFonts() {
  if (fontsLoaded) return; fontsLoaded = true;
  const l = document.createElement('link'); l.rel = 'stylesheet';
  l.href = 'https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=JetBrains+Mono:wght@400;600&family=Chakra+Petch:wght@400;600&family=Fraunces:ital,opsz,wght@0,9..144,300..700;1,9..144,300..700&family=Nunito:wght@400;700;800&family=Archivo:wdth,wght@62..125,400..800&display=swap';
  document.head.appendChild(l);
}

/* ---------------- building the UI ---------------- */
const esc = s => s.replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]);
function render(id) {
  giveBack();
  const w = WORLDS[id], n = ORDER.indexOf(id);
  const prev = ORDER[(n + ORDER.length - 1) % ORDER.length], next = ORDER[(n + 1) % ORDER.length];
  ui.innerHTML = `
    <div class="w-wrap">
      <header class="w-head">
        <p class="w-eyebrow">${esc(w.eyebrow)}</p>
        <h2 class="w-title" id="world-title">${esc(w.title)}</h2>
        <p class="w-sub">${esc(w.sub)}</p>
      </header>
      ${w.metrics ? `<dl class="w-metrics">${w.metrics.map(([v, l]) => `<div><dt>${esc(l)}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>` : ''}
      <div class="w-blocks">${w.blocks.map(([h, p], i) => `<section class="w-block" style="--i:${i}"><h3>${esc(h)}</h3><p>${esc(p)}</p></section>`).join('')}</div>
      ${BORROW[id] ? '<section class="w-lab" aria-label="Interactive demo"><h3 class="w-lab-title">Try it</h3></section>' : ''}
      <ul class="w-stack" aria-label="Stack">${w.stack.map(s => `<li>${esc(s)}</li>`).join('')}</ul>
      ${w.note ? `<p class="w-note">${esc(w.note)}</p>` : ''}
      ${w.link ? `<div class="w-actions"><a class="w-btn w-btn-main" href="${w.link.href}" target="_blank" rel="noopener">${esc(w.link.label)}</a></div>` : ''}
      <nav class="w-nav" aria-label="Other projects">
        <button class="w-btn" type="button" data-go="${prev}">← ${esc(WORLDS[prev].title.split(' ').slice(0, 3).join(' '))}…</button>
        <button class="w-btn" type="button" data-go="${next}">${esc(WORLDS[next].title.split(' ').slice(0, 3).join(' '))}… →</button>
      </nav>
    </div>`;
  const lab = ui.querySelector('.w-lab');
  if (lab) borrow(id, lab);
  ui.scrollTop = 0;
}

/* ---------------- 3D: one renderer, one scene per world ---------------- */
let THREE = null, renderer = null, current = null, raf = 0, last = 0;
const pointer = { x: 0, y: 0 };
world.addEventListener('pointermove', e => { pointer.x = e.clientX / window.innerWidth * 2 - 1; pointer.y = e.clientY / window.innerHeight * 2 - 1; });

async function ensure3D() {
  if (!root.classList.contains('webgl3d')) return false;
  if (renderer) return true;
  try {
    THREE = await import('three');
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    return true;
  } catch (e) { console.warn('World 3D unavailable:', e); return false; }
}
function size() {
  if (!renderer || !current) return;
  const w = window.innerWidth, h = window.innerHeight;
  renderer.setSize(w, h, false);
  current.cam.aspect = w / h; current.cam.updateProjectionMatrix();
  current.layout && current.layout(w, h);
}
window.addEventListener('resize', size);

function loop(now) {
  raf = requestAnimationFrame(loop);
  const dt = Math.min(0.05, last ? (now - last) / 1000 : 0.016); last = now;
  current.update(now / 1000, dt, pointer);
  renderer.render(current.scene, current.cam);
}

function canvasTex(w, h, draw) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}
function base(fov = 40, z = 10) {
  const scene = new THREE.Scene();
  const cam = new THREE.PerspectiveCamera(fov, window.innerWidth / window.innerHeight, 0.1, 200);
  cam.position.set(0, 0, z);
  return { scene, cam };
}
const wideX = (w, x) => (w > 900 ? x : 0);

const BUILD = {
  /* archival paper: a fanned stack of tender pages, one sentence lit */
  rag() {
    const { scene, cam } = base(35, 12);
    scene.add(new THREE.HemisphereLight(0xffffff, 0xd9cfbf, 1.6));
    const d = new THREE.DirectionalLight(0xffffff, 1.4); d.position.set(3, 4, 6); scene.add(d);
    const g = new THREE.Group(); scene.add(g);
    const pages = [];
    for (let i = 0; i < 9; i++) {
      const lit = i === 4;
      const tex = canvasTex(512, 680, (c, w, h) => {
        c.fillStyle = '#fbf8f1'; c.fillRect(0, 0, w, h);
        c.fillStyle = '#1b1a17'; c.font = '600 22px "Instrument Serif", Georgia, serif';
        c.fillText(`Clause ${i + 3}.${(i * 7) % 9 + 1}`, 40, 60);
        for (let y = 100, k = 0; y < h - 50; y += 26, k++) {
          const len = w - 80 - ((k * 37) % 140);
          if (lit && k === 6) { c.fillStyle = '#ffd84a'; c.fillRect(36, y - 13, len + 8, 22); }
          c.fillStyle = lit && k === 6 ? '#1b1a17' : 'rgba(27,26,23,.28)';
          c.fillRect(40, y - 5, len, 7);
        }
        c.fillStyle = '#b3261e'; c.font = '20px "JetBrains Mono", monospace'; c.fillText(`p.${i * 4 + 3}`, w - 90, h - 30);
      });
      const m = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 3.2), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.9, side: THREE.DoubleSide }));
      m.userData = { i, lit }; g.add(m); pages.push(m);
    }
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 7, 8), new THREE.MeshBasicMaterial({ color: '#b3261e', transparent: true, opacity: 0.7 }));
    beam.rotation.z = Math.PI / 2; scene.add(beam);
    return {
      scene, cam,
      layout(w) { g.position.x = wideX(w, 3.2); beam.position.x = g.position.x; g.scale.setScalar(w > 900 ? 1 : 0.8); },
      update(t, dt, p) {
        pages.forEach((m, k) => {
          const spread = (k - 4) * 0.34 + Math.sin(t * 0.6) * 0.04;
          const lift = m.userData.lit ? 0.8 + Math.sin(t * 1.4) * 0.15 : 0;
          m.position.set(spread * 1.6, -0.2 + Math.abs(k - 4) * -0.05, (k - 4) * -0.25 + lift);
          m.rotation.set(-0.25, spread * 0.6, spread * 0.25);
        });
        beam.position.y = pages[4].position.y + 0.5 + Math.sin(t * 1.4) * 0.05;
        beam.position.z = pages[4].position.z + 0.02;
        g.rotation.y = p.x * 0.25; g.rotation.x = p.y * 0.12;
      }
    };
  },
  /* terminal: two phones, a padlock, encrypted packets in flight */
  chat() {
    const { scene, cam } = base(40, 11);
    scene.add(new THREE.AmbientLight(0xffffff, 0.35));
    const pl = new THREE.PointLight(0x5effa8, 40, 30); pl.position.set(0, 3, 5); scene.add(pl);
    const mint = new THREE.MeshStandardMaterial({ color: '#5effa8', emissive: '#1d7a4c', emissiveIntensity: 0.6, roughness: 0.3, metalness: 0.4 });
    const dark = new THREE.MeshStandardMaterial({ color: '#0f1512', roughness: 0.4, metalness: 0.6 });
    const g = new THREE.Group(); scene.add(g);
    const phone = x => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(1.5, 2.9, 0.16), dark); m.position.x = x; g.add(m);
      const edge = new THREE.LineSegments(new THREE.EdgesGeometry(m.geometry), new THREE.LineBasicMaterial({ color: '#5effa8' })); m.add(edge);
      return m;
    };
    const a = phone(-3.4), b = phone(3.4);
    const lock = new THREE.Group(); g.add(lock);
    lock.add(new THREE.Mesh(new THREE.BoxGeometry(1.3, 1.0, 0.5), dark));
    const sh = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.09, 12, 32, Math.PI), mint); sh.position.y = 0.5; lock.add(sh);
    const hole = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.52, 16), mint); hole.rotation.x = Math.PI / 2; lock.add(hole);
    const packets = [];
    for (let i = 0; i < 14; i++) {
      const c = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.22, 0.22), new THREE.MeshBasicMaterial({ color: '#5effa8', wireframe: true }));
      c.userData = { o: i / 14, dir: i % 2 ? 1 : -1 }; g.add(c); packets.push(c);
    }
    const grid = new THREE.GridHelper(40, 40, 0x1d7a4c, 0x12301f); grid.position.y = -2.4; scene.add(grid);
    return {
      scene, cam,
      layout(w) { g.position.x = wideX(w, -2.6); g.scale.setScalar(w > 900 ? 0.85 : 0.55); g.position.y = w > 900 ? 0 : 1.2; },
      update(t, dt, p) {
        packets.forEach(c => {
          const u = (t * 0.25 + c.userData.o) % 1, x = (u * 2 - 1) * 3.4 * c.userData.dir;
          c.position.set(x, Math.sin(u * Math.PI) * 2.2 + (c.userData.dir > 0 ? 0.1 : -0.3), Math.sin(u * Math.PI) * 0.8);
          c.rotation.set(t * 2, t * 1.5, 0);
        });
        lock.rotation.y = Math.sin(t * 0.8) * 0.5; lock.position.y = Math.sin(t * 1.3) * 0.1;
        a.rotation.y = 0.35; b.rotation.y = -0.35;
        g.rotation.y = p.x * 0.3; g.rotation.x = p.y * 0.15;
      }
    };
  },
  /* mission control: a wireframe globe, an orbiting satellite, a scan ring */
  geo() {
    const { scene, cam } = base(40, 11);
    scene.add(new THREE.AmbientLight(0x88aaff, 0.5));
    const d = new THREE.DirectionalLight(0xffffff, 1.6); d.position.set(4, 3, 5); scene.add(d);
    const g = new THREE.Group(); scene.add(g);
    g.add(new THREE.Mesh(new THREE.SphereGeometry(2.6, 48, 32), new THREE.MeshStandardMaterial({ color: '#0b1d3a', roughness: 0.8 })));
    g.add(new THREE.Mesh(new THREE.SphereGeometry(2.62, 36, 24), new THREE.MeshBasicMaterial({ color: '#4fd8ff', wireframe: true, transparent: true, opacity: 0.22 })));
    const dots = new THREE.BufferGeometry(), pts = [];
    for (let i = 0; i < 900; i++) { const y = 1 - 2 * (i + 0.5) / 900, r = Math.sqrt(1 - y * y), ph = i * 2.39996; pts.push(Math.cos(ph) * r * 2.66, y * 2.66, Math.sin(ph) * r * 2.66); }
    dots.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    g.add(new THREE.Points(dots, new THREE.PointsMaterial({ color: '#9fe8ff', size: 0.03 })));
    const scan = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.02, 8, 48), new THREE.MeshBasicMaterial({ color: '#d9ff5a' }));
    scan.position.set(1.2, 1.4, 1.95); scan.lookAt(0, 0, 0); g.add(scan);
    const orbit = new THREE.Mesh(new THREE.TorusGeometry(3.6, 0.008, 6, 128), new THREE.MeshBasicMaterial({ color: '#4fd8ff', transparent: true, opacity: 0.5 }));
    orbit.rotation.x = 1.2; scene.add(orbit);
    const sat = new THREE.Group(); scene.add(sat);
    sat.add(new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.3, 0.45), new THREE.MeshStandardMaterial({ color: '#e8eef8', metalness: 0.7, roughness: 0.3 })));
    for (const s of [-1, 1]) { const p = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.02, 0.3), new THREE.MeshStandardMaterial({ color: '#2a4fb0', metalness: 0.5 })); p.position.x = s * 0.56; sat.add(p); }
    return {
      scene, cam,
      layout(w) { const x = wideX(w, 2.6); g.position.x = orbit.position.x = x; scene.userData.x = x; g.scale.setScalar(w > 900 ? 1 : 0.7); g.position.y = w > 900 ? 0 : 1.6; orbit.position.y = g.position.y; },
      update(t, dt, p) {
        g.rotation.y = t * 0.12 + p.x * 0.3; g.rotation.x = 0.25 + p.y * 0.1;
        const a = t * 0.5, x = scene.userData.x || 0;
        const pos = new THREE.Vector3(Math.cos(a) * 3.6, 0, Math.sin(a) * 3.6).applyAxisAngle(new THREE.Vector3(1, 0, 0), 1.2 - Math.PI / 2);
        sat.position.set(pos.x + x, pos.y + g.position.y, pos.z); sat.lookAt(x, g.position.y, 0);
        scan.scale.setScalar(1 + Math.sin(t * 3) * 0.25);
      }
    };
  },
  /* botanical lab: a leaf with a Grad-CAM heatmap, drifting spores */
  plant() {
    const { scene, cam } = base(38, 10);
    scene.add(new THREE.HemisphereLight(0xfffbea, 0x6b8f4e, 1.5));
    const d = new THREE.DirectionalLight(0xffffff, 1.5); d.position.set(2, 5, 4); scene.add(d);
    const shape = new THREE.Shape();
    shape.moveTo(0, -2.2); shape.bezierCurveTo(1.9, -1.2, 2.0, 1.4, 0, 2.6); shape.bezierCurveTo(-2.0, 1.4, -1.9, -1.2, 0, -2.2);
    const geo = new THREE.ExtrudeGeometry(shape, { depth: 0.05, bevelEnabled: true, bevelSize: 0.03, bevelThickness: 0.03, bevelSegments: 2, curveSegments: 32 });
    geo.computeBoundingBox();
    const bb = geo.boundingBox, uv = geo.attributes.uv, pos = geo.attributes.position;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, (pos.getX(i) - bb.min.x) / (bb.max.x - bb.min.x), (pos.getY(i) - bb.min.y) / (bb.max.y - bb.min.y));
    const tex = canvasTex(512, 512, (c, w, h) => {
      const gr = c.createLinearGradient(0, 0, w, h); gr.addColorStop(0, '#3f7a34'); gr.addColorStop(1, '#2a5a26');
      c.fillStyle = gr; c.fillRect(0, 0, w, h);
      c.strokeStyle = 'rgba(196,230,150,.7)'; c.lineWidth = 4; c.beginPath(); c.moveTo(w / 2, h); c.lineTo(w / 2, 0); c.stroke();
      c.lineWidth = 2;
      for (let k = 1; k < 8; k++) { const y = h - k * 60; c.beginPath(); c.moveTo(w / 2, y); c.lineTo(w * 0.15, y - 50); c.moveTo(w / 2, y); c.lineTo(w * 0.85, y - 50); c.stroke(); }
      for (const [x, y, r] of [[0.68, 0.42, 90], [0.34, 0.66, 60]]) {
        const hg = c.createRadialGradient(x * w, y * h, 2, x * w, y * h, r);
        hg.addColorStop(0, 'rgba(255,250,210,.95)'); hg.addColorStop(0.35, 'rgba(255,170,40,.75)'); hg.addColorStop(0.7, 'rgba(255,60,40,.35)'); hg.addColorStop(1, 'rgba(255,60,40,0)');
        c.fillStyle = hg; c.fillRect(0, 0, w, h);
      }
    });
    const leaf = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: tex, roughness: 0.6, side: THREE.DoubleSide }));
    const g = new THREE.Group(); g.add(leaf); scene.add(g);
    const sp = new THREE.BufferGeometry(), arr = [];
    for (let i = 0; i < 260; i++) arr.push((Math.random() - 0.5) * 14, (Math.random() - 0.5) * 9, (Math.random() - 0.5) * 6);
    sp.setAttribute('position', new THREE.Float32BufferAttribute(arr, 3));
    const spores = new THREE.Points(sp, new THREE.PointsMaterial({ color: '#c9a83c', size: 0.05, transparent: true, opacity: 0.8 }));
    scene.add(spores);
    return {
      scene, cam,
      layout(w) { g.position.x = wideX(w, -3); g.scale.setScalar(w > 900 ? 1 : 0.7); g.position.y = w > 900 ? 0 : 1.4; },
      update(t, dt, p) {
        g.rotation.y = Math.sin(t * 0.5) * 0.6 + p.x * 0.4; g.rotation.z = -0.3 + Math.sin(t * 0.7) * 0.05; g.rotation.x = p.y * 0.2;
        const a = sp.attributes.position;
        for (let i = 0; i < a.count; i++) { let y = a.getY(i) + dt * 0.3; if (y > 4.5) y = -4.5; a.setY(i, y); }
        a.needsUpdate = true;
      }
    };
  },
  /* soft care: a wearable with a live pulse, SHAP-style bars as blocks */
  xai() {
    const { scene, cam } = base(38, 10);
    scene.add(new THREE.HemisphereLight(0xffffff, 0xf3c9d8, 1.7));
    const d = new THREE.DirectionalLight(0xffffff, 1.2); d.position.set(-3, 4, 5); scene.add(d);
    const g = new THREE.Group(); scene.add(g);
    const band = new THREE.Mesh(new THREE.TorusGeometry(1.25, 0.28, 24, 64), new THREE.MeshStandardMaterial({ color: '#b9a4ff', roughness: 0.5 }));
    band.scale.set(1, 1.3, 0.6); g.add(band);
    const faceCanvas = document.createElement('canvas'); faceCanvas.width = faceCanvas.height = 256;
    const faceTex = new THREE.CanvasTexture(faceCanvas); faceTex.colorSpace = THREE.SRGBColorSpace;
    const face = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.0, 0.35, 48), [new THREE.MeshStandardMaterial({ color: '#2b2340' }), new THREE.MeshBasicMaterial({ map: faceTex }), new THREE.MeshStandardMaterial({ color: '#2b2340' })]);
    face.rotation.x = Math.PI / 2; face.position.z = 0.45; g.add(face);
    const bars = [];
    const vals = [0.88, 0.64, 0.47, 0.18];
    vals.forEach((v, i) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(0.45, 1, 0.45), new THREE.MeshStandardMaterial({ color: i === 3 ? '#ffb4a2' : '#7c6cff', roughness: 0.4 }));
      m.position.set(2.4 + i * 0.65, -1.6, 0); m.userData.v = v * 3; g.add(m); bars.push(m);
    });
    const blobs = [];
    for (let i = 0; i < 7; i++) {
      const b = new THREE.Mesh(new THREE.SphereGeometry(0.2 + Math.random() * 0.3, 24, 16), new THREE.MeshStandardMaterial({ color: ['#ffd6e0', '#d9ccff', '#ffe9c7'][i % 3], roughness: 0.3 }));
      b.position.set((Math.random() - 0.5) * 10, (Math.random() - 0.5) * 6, -2 - Math.random() * 3); b.userData.o = Math.random() * 6; scene.add(b); blobs.push(b);
    }
    return {
      scene, cam,
      layout(w) { g.position.x = wideX(w, 1.6); g.position.y = w > 900 ? 1.2 : 1.8; g.scale.setScalar(w > 900 ? 0.9 : 0.55); },
      update(t, dt, p) {
        const c = faceCanvas.getContext('2d');
        c.fillStyle = '#1f1a30'; c.fillRect(0, 0, 256, 256);
        c.strokeStyle = '#ff8fa3'; c.lineWidth = 6; c.beginPath();
        for (let x = 0; x <= 256; x += 4) { const ph = (x / 256) * 6 + t * 4; const spike = Math.abs(((ph % 6.28) - 3.14)) < 0.25 ? -60 : 0; c.lineTo(x, 128 + Math.sin(ph) * 8 + spike); }
        c.stroke(); faceTex.needsUpdate = true;
        bars.forEach((b, i) => { const h = b.userData.v * (0.6 + 0.4 * Math.min(1, t * 0.8 - i * 0.15)); b.scale.y = Math.max(0.05, h); b.position.y = -1.6 + b.scale.y / 2; });
        blobs.forEach(b => { b.position.y += Math.sin(t + b.userData.o) * 0.003; });
        g.rotation.y = Math.sin(t * 0.4) * 0.3 + p.x * 0.3; g.rotation.x = p.y * 0.15;
      }
    };
  },
  /* field & water: a moving water surface with map pins that sync */
  water() {
    const { scene, cam } = base(45, 10);
    cam.position.set(0, 4.5, 9); cam.lookAt(0, 0, 0);
    scene.add(new THREE.HemisphereLight(0xdff7ff, 0x0b3a4a, 1.5));
    const d = new THREE.DirectionalLight(0xffffff, 1.4); d.position.set(3, 6, 4); scene.add(d);
    const geo = new THREE.PlaneGeometry(24, 16, 60, 40); geo.rotateX(-Math.PI / 2);
    const base0 = Float32Array.from(geo.attributes.position.array);
    const sea = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: '#1d8fa8', roughness: 0.35, metalness: 0.1, flatShading: true }));
    scene.add(sea);
    const pins = [];
    for (let i = 0; i < 7; i++) {
      const pin = new THREE.Group();
      const m = new THREE.MeshStandardMaterial({ color: '#ff8a3d', roughness: 0.4 });
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.28, 20, 14), m); head.position.y = 0.9; pin.add(head);
      const tip = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.7, 16), m); tip.rotation.x = Math.PI; tip.position.y = 0.45; pin.add(tip);
      pin.position.set(-6 + i * 2 + (i % 2) * 0.6, 0, -1.5 + (i % 3) * 1.4);
      pin.userData = { m, at: 1.2 + i * 0.7 }; scene.add(pin); pins.push(pin);
    }
    return {
      scene, cam,
      layout(w) { scene.position.x = wideX(w, 2.4); },
      update(t, dt, p) {
        const a = geo.attributes.position;
        for (let i = 0; i < a.count; i++) {
          const x = base0[i * 3], z = base0[i * 3 + 2];
          a.setY(i, Math.sin(x * 0.6 + t * 1.2) * 0.25 + Math.cos(z * 0.8 + t) * 0.18);
        }
        a.needsUpdate = true; geo.computeVertexNormals();
        pins.forEach(pin => {
          const synced = (t % 8) > pin.userData.at;
          pin.userData.m.color.set(synced ? '#b8ff6a' : '#ff8a3d');
          pin.position.y = Math.sin(pin.position.x * 0.6 + t * 1.2) * 0.25 + (synced ? 0.4 : 0);
        });
        cam.position.x = p.x * 1.2; cam.lookAt(0, 0, 0);
      }
    };
  }
};

/* ---------------- open / close ---------------- */
let lastFocus = null, openId = null, closing = false;
async function open(id, from) {
  if (!WORLDS[id]) return;
  loadFonts();
  const switching = !!openId;
  openId = id;
  if (!switching) lastFocus = document.activeElement;
  world.dataset.world = id;
  render(id);
  world.hidden = false;
  root.classList.add('world-open');
  document.body.style.overflow = 'hidden';
  if (window.__lenis) window.__lenis.stop();
  if (!switching && !reduce) {
    const x = from ? from.x : window.innerWidth / 2, y = from ? from.y : window.innerHeight / 2;
    world.animate([{ clipPath: `circle(0px at ${x}px ${y}px)` }, { clipPath: `circle(150% at ${x}px ${y}px)` }], { duration: 800, easing: 'cubic-bezier(.7,0,.2,1)' });
  }
  closeBtn.focus({ preventScroll: true });
  if (await ensure3D()) {
    if (current && current.scene) current.scene.traverse(o => { o.geometry && o.geometry.dispose(); });
    current = BUILD[id]();
    size();
    if (reduce) { current.update(1, 0.016, pointer); renderer.render(current.scene, current.cam); }
    else if (!raf) { last = 0; raf = requestAnimationFrame(loop); }
  }
}
async function close(scrollTo) {
  if (!openId || closing) return;
  closing = true;
  if (!reduce) await world.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 320, easing: 'ease-out' }).finished;
  cancelAnimationFrame(raf); raf = 0;
  world.hidden = true; openId = null; closing = false;
  giveBack();
  root.classList.remove('world-open');
  document.body.style.overflow = '';
  if (window.__lenis) window.__lenis.start();
  if (scrollTo) {
    const el = document.getElementById(scrollTo);
    if (el) { el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' }); el.setAttribute('tabindex', '-1'); el.focus({ preventScroll: true }); }
  } else if (lastFocus) lastFocus.focus({ preventScroll: true });
}

document.addEventListener('click', e => {
  const a = e.target.closest('[data-world]');
  if (a && !world.contains(a)) {
    e.preventDefault();
    const r = a.getBoundingClientRect();
    open(a.dataset.world, { x: r.left + r.width / 2, y: r.top + r.height / 2 });
  }
});
ui.addEventListener('click', e => {
  const go = e.target.closest('[data-go]'), cs = e.target.closest('[data-case]');
  if (go) open(go.dataset.go);
  if (cs) close(cs.dataset.case);
});
closeBtn.addEventListener('click', () => close());
document.addEventListener('keydown', e => {
  if (!openId) return;
  if (e.key === 'Escape') { e.preventDefault(); close(); return; }
  if (e.key !== 'Tab') return;
  const f = Array.from(world.querySelectorAll('a[href], button')).filter(el => el.offsetParent !== null);
  if (!f.length) return;
  const first = f[0], lastEl = f[f.length - 1];
  if (e.shiftKey && document.activeElement === first) { e.preventDefault(); lastEl.focus(); }
  else if (!e.shiftKey && document.activeElement === lastEl) { e.preventDefault(); first.focus(); }
});
