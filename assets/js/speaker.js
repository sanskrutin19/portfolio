/* About: a glass speaker that plays the story as kinetic lyrics.
   Verse 0 is the intro; verses 1–4 are the four principles (tracklist).
   Each verse has its own typographic move: ribbon, drop, orbit, stretch, type. */
(function () {
  'use strict';
  var speaker = document.getElementById('speaker');
  var stage = document.getElementById('sp-stage');
  if (!speaker || !stage) return;
  var now = document.getElementById('sp-now');
  var tracks = Array.prototype.slice.call(document.querySelectorAll('.track'));
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var NS = 'http://www.w3.org/2000/svg';

  var VERSES = [
    { kind: 'ribbon', label: 'Intro', text: 'I CARE ABOUT WHAT HAPPENS AFTER THE DEMO · ' },
    { kind: 'drop', label: '01', words: ['evidence', 'over', 'eloquence.'], aside: '(cite, cite, cite)' },
    { kind: 'orbit', label: '02', text: 'PRIVACY BY ARCHITECTURE · STAYS ON THE DEVICE · ', core: 'local' },
    { kind: 'stretch', label: '03', lines: ['EXPLAIN', 'IT TO', 'REAL PEOPLE'] },
    { kind: 'type', label: '04', text: 'deployment is part of the model.', sub: 'latency · quantization · offline sync · APIs' }
  ];
  var DUR = 5200;
  var idx = 0, timer = 0, playing = false;

  function el(tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
  function svg(tag, attrs) { var e = document.createElementNS(NS, tag); for (var k in attrs) e.setAttribute(k, attrs[k]); return e; }

  var BUILD = {
    ribbon: function (v) {
      var s = svg('svg', { viewBox: '0 0 800 360', class: 'v-ribbon' });
      var path = svg('path', { id: 'sp-rib', d: 'M-120 300 C 120 300, 180 40, 400 150 S 640 360, 920 60', fill: 'none' });
      s.appendChild(path);
      var t = svg('text', {}); var tp = svg('textPath', { href: '#sp-rib', startOffset: '0' });
      tp.textContent = v.text + v.text + v.text; t.appendChild(tp); s.appendChild(t);
      if (!reduce) tp.animate([{ startOffset: '0%' }, { startOffset: '-60%' }], { duration: DUR * 1.6, iterations: Infinity, easing: 'linear' });
      return s;
    },
    drop: function (v) {
      var box = el('div', 'v-drop');
      v.words.forEach(function (w, i) { var span = el('span', 'dw', w); span.style.setProperty('--i', i); box.appendChild(span); });
      var a = el('span', 'aside', v.aside); box.appendChild(a);
      return box;
    },
    orbit: function (v) {
      var box = el('div', 'v-orbit');
      box.appendChild(el('span', 'disc', '<b>' + v.core + '</b>'));
      var s = svg('svg', { viewBox: '0 0 300 300', class: 'ring' });
      s.appendChild(svg('path', { id: 'sp-orb', d: 'M150 150 m -118 0 a 118 118 0 1 1 236 0 a 118 118 0 1 1 -236 0', fill: 'none' }));
      var t = svg('text', {}); var tp = svg('textPath', { href: '#sp-orb' }); tp.textContent = v.text + v.text; t.appendChild(tp); s.appendChild(t);
      box.appendChild(s);
      return box;
    },
    stretch: function (v) {
      var box = el('div', 'v-stretch');
      v.lines.forEach(function (l, i) { var s = el('span', 'sl', l); s.style.setProperty('--i', i); box.appendChild(s); });
      return box;
    },
    type: function (v) {
      var box = el('div', 'v-type');
      var line = el('span', 'tl'); box.appendChild(line);
      box.appendChild(el('span', 'ts mono', v.sub));
      var chars = v.text.split('');
      if (reduce) line.textContent = v.text;
      else chars.forEach(function (c, i) { setTimeout(function () { line.textContent += c; }, 220 + i * 45); });
      return box;
    }
  };

  function show(i) {
    idx = (i + VERSES.length) % VERSES.length;
    var v = VERSES[idx];
    var old = stage.firstChild;
    var next = el('div', 'verse v-' + v.kind);
    next.appendChild(BUILD[v.kind](v));
    stage.appendChild(next);
    requestAnimationFrame(function () { next.classList.add('in'); });
    if (old) { old.classList.add('out'); setTimeout(function () { if (old.parentNode) old.parentNode.removeChild(old); }, 600); }
    if (now) now.textContent = 'Now playing · ' + (v.label === 'Intro' ? 'Intro' : v.label);
    tracks.forEach(function (t) { t.classList.toggle('on', +t.dataset.track === idx); t.setAttribute('aria-pressed', String(+t.dataset.track === idx)); });
  }
  function play() {
    if (playing || reduce) return;
    playing = true; speaker.classList.add('playing');
    clearInterval(timer); timer = setInterval(function () { show(idx + 1); }, DUR);
  }
  function stop() { playing = false; speaker.classList.remove('playing'); clearInterval(timer); }

  tracks.forEach(function (t) {
    t.addEventListener('click', function () { show(+t.dataset.track); if (playing) { stop(); play(); } });
  });

  // 3D: the box leans toward the cursor, the glare follows
  if (!reduce && window.matchMedia('(hover: hover)').matches) {
    speaker.addEventListener('pointermove', function (e) {
      var r = speaker.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
      speaker.style.setProperty('--ry', (x * 14).toFixed(2) + 'deg');
      speaker.style.setProperty('--rx', (-y * 9).toFixed(2) + 'deg');
      speaker.style.setProperty('--gx', ((x + 0.5) * 100).toFixed(1) + '%');
    });
    speaker.addEventListener('pointerleave', function () { speaker.style.setProperty('--ry', '-8deg'); speaker.style.setProperty('--rx', '3deg'); });
  }

  show(0);
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (en) { en[0].isIntersecting ? play() : stop(); }, { threshold: 0.35 }).observe(speaker);
  } else play();
})();
