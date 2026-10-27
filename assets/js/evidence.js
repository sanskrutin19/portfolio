/* "Don't take my word for it. Ask."
   A tiny retrieval engine over Sanskruti's real work, run in the browser.
   Query → Retrieve (BM25 over evidence sentences, with synonym expansion)
         → Rerank (phrase and project boosts) → Cite (source shown with each quote).
   It only ever quotes the corpus below; it never writes new claims. */
(function () {
  'use strict';
  var form = document.getElementById('ask-form');
  if (!form) return;
  var input = document.getElementById('ask-input');
  var out = document.getElementById('ask-results');
  var pipe = document.getElementById('ask-pipe');
  var archive = document.getElementById('archive');
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var SRC = {
    rag: 'Tender Intelligence (offline RAG)', chat: 'SecureChat', geo: 'Unauthorised construction detection',
    plant: 'Crop-disease AI · Endureva internship', xai: 'XAI-Care', water: 'Water Survey',
    pos: 'Restaurant POS · Endureva internship', exp: 'Endureva Innovations internship',
    lead: 'Leadership', edu: 'Education & certifications', web: '3D portfolio'
  };
  // every sentence here is taken from her résumé, portfolio case studies or certificates
  var CORPUS = [
    ['rag', 'Built a fully offline RAG platform that answers eligibility, EMD, scope, risk and penalty questions about tender documents.'],
    ['rag', 'Every answer cites the exact source sentence and page number, so a reviewer can verify it.'],
    ['rag', 'Cut tender analysis from hours to minutes.'],
    ['rag', 'Combined vector search and keyword search (SQLite FTS5) with rank fusion and cross-encoder reranking.'],
    ['rag', 'Evaluated retrieval against a golden question set on recall, rank and latency.'],
    ['rag', 'Built Go/No-Go, risk-finder, synopsis, pre-bid and contradiction-finder modules on the retrieval layer.'],
    ['rag', 'Integrated Redmine through an MCP server; runs on local models with Ollama, LangChain, ChromaDB and FastAPI.'],
    ['rag', 'The platform is live at promptivo.live.'],
    ['chat', 'Architected end-to-end encrypted messaging with OMEMO2 (Signal Protocol) Double Ratchet encryption across messages, media and calls.'],
    ['chat', 'Built a local-first storage layer (IndexedDB and an encrypted key store) so the app works offline.'],
    ['chat', 'Implemented WebRTC voice and video calls and encrypted file sharing up to 500 MB with chunked AES-GCM streaming.'],
    ['chat', 'Shipped Android and iOS builds from one React codebase with Capacitor and ran the stack with Docker Compose.'],
    ['geo', 'Architected the PostGIS spatial database and Web GIS dashboard for a three-model ensemble fusing Sentinel-2, SAR and Cartosat-3 imagery.'],
    ['geo', 'Designed a five-day automated satellite monitoring cycle with SMS and email alerts for pipeline encroachment.'],
    ['geo', 'Uses YOLOv8 object detection with NDVI and NDBI indices; targets about 95% accuracy and under 4% false positives (targets, in progress).'],
    ['plant', 'Shipped an AI crop-disease diagnosis feature end to end: data pipeline, CNN training, a FastAPI service and a Flutter app.'],
    ['plant', 'The CNN reaches 92% accuracy across 38 diseases, trained on 50,000 images.'],
    ['plant', 'Serves predictions in under 200 ms; quantization and batching made inference 30% faster.'],
    ['plant', 'Grad-CAM heatmaps show users which part of the leaf drove each diagnosis.'],
    ['xai', 'Built multimodal fusion of wearable sensors and camera input for real-time fall detection.'],
    ['xai', 'Grad-CAM and SHAP explain every alert to non-technical caregivers in a Flutter dashboard.'],
    ['water', 'Built a Flutter field app that captures water-connection data offline with geo-tagging and structured export.'],
    ['water', 'Records persist in SQLite and auto-sync through a REST API when the network returns.'],
    ['pos', 'Built an offline-first restaurant POS with Flutter, FastAPI and SQLite, JWT role-based access, inventory alerts and live analytics.'],
    ['exp', 'AI/ML intern at Endureva Innovations LLP from January to June 2026.'],
    ['exp', 'Owned the ML pipeline end to end, from preprocessing to deployment in production.'],
    ['exp', 'Presented model results and technical trade-offs to non-technical stakeholders.'],
    ['lead', 'Management Team Lead for Prabal, a 40-hour national hackathon with 600+ participants (GDG SGU).'],
    ['lead', 'Core member of Google Developer Group SGU, running AI/ML workshops, design sprints and peer learning.'],
    ['lead', 'Won 3rd prize at the Smart India Hackathon (college level) for a sign-language learning app.'],
    ['edu', 'B.Tech in Artificial Intelligence and Machine Learning, Sanjay Ghodawat University, CGPA 8.36, graduating October 2026.'],
    ['edu', 'Certified: NPTEL AI for Management, ISRO Remote Sensing and Digital Image Analysis, and an international workshop on cloud and edge computing.'],
    ['web', 'Built this portfolio in Three.js: a motion-captured 3D avatar, procedural animation and a 3D world for every project.']
  ].map(function (r, i) { return { id: i, p: r[0], t: r[1] }; });

  // light synonym expansion so plain questions find technical evidence
  var SYN = {
    production: ['deployed', 'shipped', 'deployment', 'live', 'serves'], deploy: ['deployed', 'shipped', 'deployment', 'live'],
    shipped: ['shipped', 'deployed', 'live'], ship: ['shipped', 'deployed'],
    llm: ['rag', 'ollama', 'langchain', 'models', 'retrieval'], llms: ['rag', 'ollama', 'langchain', 'retrieval'], genai: ['rag', 'ollama', 'langchain'],
    generative: ['rag', 'ollama', 'langchain'], ai: ['ai'], chatbot: ['rag', 'answers'], search: ['retrieval', 'search', 'reranking'],
    security: ['encrypted', 'encryption', 'signal', 'aes', 'secure'], secure: ['encrypted', 'encryption', 'signal'], privacy: ['encrypted', 'offline', 'local'],
    encryption: ['encrypted', 'aes', 'signal', 'omemo2'], vision: ['cnn', 'grad', 'yolov8', 'camera', 'imagery'], cv: ['cnn', 'grad', 'yolov8'],
    image: ['cnn', 'imagery', 'images'], explainable: ['grad', 'shap', 'explain', 'heatmaps'], xai: ['grad', 'shap', 'explain'],
    mobile: ['flutter', 'android', 'ios', 'app'], app: ['flutter', 'app'], apps: ['flutter', 'app', 'builds'], offline: ['offline', 'local', 'sync'],
    lead: ['lead', 'management', 'core', 'workshops'], leadership: ['lead', 'management', 'core', 'hackathon'], team: ['lead', 'management', 'participants'],
    stakeholders: ['stakeholders', 'presented'], communicate: ['presented', 'stakeholders', 'workshops'], fast: ['ms', 'faster', 'latency'],
    performance: ['ms', 'faster', 'latency', 'quantization'], optimize: ['quantization', 'faster'], data: ['pipeline', 'database', 'postgis', 'sqlite'],
    backend: ['fastapi', 'api', 'postgis', 'docker'], api: ['fastapi', 'api'], cloud: ['cloud', 'docker'], geospatial: ['postgis', 'satellite', 'gis'],
    satellite: ['satellite', 'sentinel', 'sar', 'imagery'], eval: ['evaluated', 'recall'], evaluation: ['evaluated', 'recall', 'golden'],
    experience: ['intern', 'internship', 'endureva'], internship: ['intern', 'endureva'], degree: ['tech', 'university', 'cgpa'], education: ['university', 'cgpa', 'certified']
  };
  var STOP = /^(a|an|the|she|her|has|have|had|is|are|was|do|does|did|can|could|and|or|of|to|in|on|for|with|any|that|this|what|how|it|be|built|build|work|worked|anything|about|me|you|your|i)$/;
  function tokens(s) {
    return (s.toLowerCase().match(/[a-z0-9]+/g) || []).map(function (w) {
      return w.length > 4 ? w.replace(/(ing|ed|es|s)$/, '') : w;
    });
  }
  var docs = CORPUS.map(function (d) { return tokens(d.t); });
  var avgdl = docs.reduce(function (a, d) { return a + d.length; }, 0) / docs.length;
  var df = {};
  docs.forEach(function (d) { Object.keys(d.reduce(function (m, w) { m[w] = 1; return m; }, {})).forEach(function (w) { df[w] = (df[w] || 0) + 1; }); });
  function idf(w) { var n = df[w] || 0; return Math.log(1 + (docs.length - n + 0.5) / (n + 0.5)); }

  function retrieve(q) {
    var raw = (q.toLowerCase().match(/[a-z0-9]+/g) || []).filter(function (w) { return !STOP.test(w); });
    var terms = {};
    raw.forEach(function (w) { terms[tokens(w)[0]] = 1; (SYN[w] || []).forEach(function (s) { terms[tokens(s)[0]] = 0.7; }); });
    var keys = Object.keys(terms);
    if (!keys.length) return [];
    // 1) retrieve: BM25
    var scored = docs.map(function (d, i) {
      var tf = {}; d.forEach(function (w) { tf[w] = (tf[w] || 0) + 1; });
      var s = 0;
      keys.forEach(function (w) { if (tf[w]) s += terms[w] * idf(w) * (tf[w] * 2.2) / (tf[w] + 1.2 * (0.25 + 0.75 * d.length / avgdl)); });
      return { d: CORPUS[i], s: s };
    }).filter(function (x) { return x.s > 0; });
    // 2) rerank: favour exact query words and keep the list varied across projects
    scored.forEach(function (x) {
      var exact = raw.filter(function (w) { return x.d.t.toLowerCase().indexOf(w) >= 0; }).length;
      x.s *= 1 + 0.25 * exact;
    });
    scored.sort(function (a, b) { return b.s - a.s; });
    var seen = {}, top = [];
    scored.forEach(function (x) { var c = seen[x.d.p] || 0; if (c < 2 && top.length < 4) { top.push(x); seen[x.d.p] = c + 1; } });
    return top;
  }

  var esc = function (s) { return s.replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
  var WORLD = { rag: 1, chat: 1, geo: 1, plant: 1, xai: 1, water: 1 };
  function render(q, hits) {
    if (!hits.length) {
      out.innerHTML = '<p class="ask-none">No evidence for that one, and I won\'t make something up. Try one of the suggestions, or <a href="mailto:naiksanskruti03@gmail.com">ask me directly</a>.</p>';
      return;
    }
    out.innerHTML = '<p class="ask-q mono">Evidence for: “' + esc(q) + '”</p>' + hits.map(function (h, i) {
      var link = WORLD[h.d.p] ? ' <a href="#" class="ask-open" data-world="' + h.d.p + '">Open the project →</a>' : '';
      return '<blockquote class="ask-hit" style="--i:' + i + '"><p>“' + esc(h.d.t) + '”</p><footer class="mono">— ' + esc(SRC[h.d.p]) + link + '</footer></blockquote>';
    }).join('');
  }

  function arrange(hits) {
    var rank = {};
    var n = 0;   // only projects that have a dossier card take a place in the line-up
    hits.forEach(function (h) { if (WORLD[h.d.p] && rank[h.d.p] === undefined) rank[h.d.p] = n++; });
    if (!n) hits = [];
    var cards = Array.prototype.slice.call(archive.querySelectorAll('.dossier'));
    archive.classList.toggle('ranked', hits.length > 0);
    cards.forEach(function (c) {
      var r = rank[c.dataset.p];
      c.classList.toggle('hit', r !== undefined);
      c.style.setProperty('--r', r === undefined ? 9 : r);
    });
  }

  var running = 0;
  function ask(q) {
    q = (q || '').trim();
    if (!q) return;
    var run = ++running;
    var hits = retrieve(q);
    var steps = Array.prototype.slice.call(pipe.children);
    steps.forEach(function (s) { s.classList.remove('on'); });
    out.classList.add('busy');
    var delay = reduce ? 0 : 260;
    steps.forEach(function (s, i) { setTimeout(function () { if (run === running) s.classList.add('on'); }, delay * i); });
    setTimeout(function () { if (run === running) arrange(hits); }, delay * 2);
    setTimeout(function () {
      if (run !== running) return;
      out.classList.remove('busy');
      render(q, hits);
      window.dispatchEvent(new CustomEvent('ask:answer', { detail: { found: hits.length } }));
    }, delay * 4);
  }

  form.addEventListener('submit', function (e) { e.preventDefault(); ask(input.value); });
  Array.prototype.forEach.call(document.querySelectorAll('.ask-chips [data-q]'), function (b) {
    b.addEventListener('click', function () { input.value = b.dataset.q; ask(b.dataset.q); });
  });
  // gentle parallax on the archive
  if (!reduce && window.matchMedia('(hover: hover)').matches) {
    archive.addEventListener('pointermove', function (e) {
      var r = archive.getBoundingClientRect();
      archive.style.setProperty('--rx', ((e.clientY - r.top) / r.height - 0.5) * -10 + 'deg');
      archive.style.setProperty('--ry', ((e.clientX - r.left) / r.width - 0.5) * 14 + 'deg');
    });
    archive.addEventListener('pointerleave', function () { archive.style.setProperty('--rx', '0deg'); archive.style.setProperty('--ry', '0deg'); });
  }
})();
