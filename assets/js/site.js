/* Sanskruti Naik — portfolio interactions. No dependencies. */
(function () {
  'use strict';

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  /* ------------------------------------------------------------------
     Navigation: scrolled state, mobile menu, active section
     ------------------------------------------------------------------ */
  function nav() {
    var navEl = $('#nav'), btn = $('#menu-btn'), list = $('#nav-links');
    var toTop = $('#to-top'), ring = $('#to-top-ring');
    var C = 125.7;

    function onScroll() {
      var y = window.scrollY;
      navEl.classList.toggle('scrolled', y > 40);
      var max = document.documentElement.scrollHeight - window.innerHeight;
      var p = max > 0 ? y / max : 0;
      toTop.classList.toggle('show', y > window.innerHeight * 0.9);
      ring.style.strokeDashoffset = String(C * (1 - p));
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    function setMenu(open) {
      btn.setAttribute('aria-expanded', String(open));
      list.classList.toggle('open', open);
      document.body.classList.toggle('menu-open', open);
      $('.menu-label', btn).textContent = open ? 'Close' : 'Menu';
      if (open) { var f = $('a', list); if (f) f.focus(); }
    }
    btn.addEventListener('click', function () { setMenu(btn.getAttribute('aria-expanded') !== 'true'); });
    $$('a', list).forEach(function (a) { a.addEventListener('click', function () { if (list.classList.contains('open')) setMenu(false); }); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && list.classList.contains('open')) { setMenu(false); btn.focus(); }
    });

    if (!('IntersectionObserver' in window)) return;
    var links = $$('[data-nav]');
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        links.forEach(function (a) {
          var on = a.getAttribute('href') === '#' + en.target.id;
          a.classList.toggle('active', on);
          if (on) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current');
        });
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    links.forEach(function (a) { var s = $(a.getAttribute('href')); if (s) io.observe(s); });
  }

  /* ------------------------------------------------------------------
     Reveals + metric count-up
     ------------------------------------------------------------------ */
  function reveals() {
    var els = $$('.reveal');
    if (!('IntersectionObserver' in window) || reduceMotion) {
      els.forEach(function (el) { el.classList.add('in'); });
      return;
    }
    // stagger siblings that enter together
    var io = new IntersectionObserver(function (entries) {
      var batch = entries.filter(function (e) { return e.isIntersecting; });
      batch.forEach(function (en, i) {
        en.target.style.setProperty('--rd', (i * 0.08) + 's');
        en.target.classList.add('in');
        io.unobserve(en.target);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    els.forEach(function (el) { io.observe(el); });
  }

  function counters() {
    var els = $$('.count');
    if (reduceMotion || !('IntersectionObserver' in window)) return;
    els.forEach(function (el) { el.textContent = '0'; });
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        io.unobserve(en.target);
        var el = en.target, to = +el.dataset.to, t0 = performance.now(), dur = 1600;
        (function step(t) {
          var p = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - p, 4);
          el.textContent = String(Math.round(to * e));
          if (p < 1) requestAnimationFrame(step);
        })(t0);
      });
    }, { threshold: 0.6 });
    els.forEach(function (el) { io.observe(el); });
  }

  /* ------------------------------------------------------------------
     RAG pipeline lab
     ------------------------------------------------------------------ */
  function ragLab() {
    var lab = $('#rag-lab');
    if (!lab) return;
    var stages = $$('.stage', lab), panel = $('#stage-panel'), demo = $('.rag-demo', lab), pipe = $('.pipeline', lab), run = $('#rag-run');
    var STEPS = [
      { t: 'Ingest', c: ['Tender documents are loaded and processed on the local machine. Nothing is uploaded to a third-party API.'] },
      { t: 'Parse & index', c: ['Text is split into passages that keep their page numbers. Each passage is indexed twice: as embeddings in <code>ChromaDB</code> for meaning, and in <code>SQLite FTS5</code> for exact words.'] },
      { t: 'Hybrid retrieval', c: ['The question runs against both indexes at once. Dense search finds paraphrases ("security deposit" vs "EMD"), and keyword search pins exact amounts and clause numbers.', 'The two result lists are <strong>fused by rank</strong>, so neither retriever has to be perfect.'] },
      { t: 'Rerank', c: ['A <code>cross-encoder</code> reads the question and each candidate passage together and re-scores them. It is slower than vector search but far more precise, so it only runs on the short list.'] },
      { t: 'Evidence select', c: ['Sentence-level span selection picks the sentence that actually supports the answer, not just the chunk it sits in. That sentence becomes the verbatim citation.'] },
      { t: 'Cited answer', c: ['A local model served by <code>Ollama</code> writes the answer from the selected evidence and returns it with the source sentence and page number.', 'Retrieval quality is checked against a golden question set: recall, rank and latency.'] }
    ];
    var timer = null;

    function select(i, fromUser) {
      stages.forEach(function (s, k) {
        s.setAttribute('aria-selected', String(k === i));
        s.tabIndex = k === i ? 0 : -1;
        s.classList.toggle('done', k < i);
      });
      pipe.style.setProperty('--prog', ((i + 0.5) / stages.length * 100) + '%');
      panel.innerHTML = '<h5 class="stage-title">' + STEPS[i].t.replace('&', '&amp;') + '</h5>' +
        STEPS[i].c.map(function (c) { return '<p class="stage-copy">' + c + '</p>'; }).join('');
      if (!reduceMotion) { panel.classList.remove('swap'); void panel.offsetWidth; panel.classList.add('swap'); }
      demo.setAttribute('data-step', String(i));
      if (fromUser) stopRun();
    }
    function stopRun() { clearInterval(timer); timer = null; $('span', run).textContent = 'Run query'; }

    stages.forEach(function (s, i) {
      s.addEventListener('click', function () { select(i, true); });
      s.addEventListener('keydown', function (e) {
        var k = e.key, n = null;
        if (k === 'ArrowRight' || k === 'ArrowDown') n = (i + 1) % stages.length;
        if (k === 'ArrowLeft' || k === 'ArrowUp') n = (i - 1 + stages.length) % stages.length;
        if (k === 'Home') n = 0;
        if (k === 'End') n = stages.length - 1;
        if (n !== null) { e.preventDefault(); select(n, true); stages[n].focus(); }
      });
    });
    run.addEventListener('click', function () {
      if (timer) { stopRun(); return; }
      var i = 0; select(0);
      $('span', run).textContent = 'Stop';
      timer = setInterval(function () {
        i++;
        if (i >= stages.length) { stopRun(); return; }
        select(i);
      }, reduceMotion ? 900 : 1700);
    });
    select(0);
  }

  /* ------------------------------------------------------------------
     SecureChat: chunked encryption visual
     ------------------------------------------------------------------ */
  function chunks() {
    var box = $('#chunks'), label = $('#chunk-label');
    if (!box) return;
    var N = 32, cells = [];
    for (var i = 0; i < N; i++) { var c = document.createElement('i'); box.appendChild(c); cells.push(c); }
    if (reduceMotion) { cells.forEach(function (c) { c.classList.add('enc'); }); label.textContent = 'chunked AES-GCM · sent'; return; }
    var k = 0, active = false, t;
    function tick() {
      if (!active) return;
      if (k < N) { cells[k++].classList.add('enc'); label.textContent = 'chunked AES-GCM · chunk ' + k + '/' + N; t = setTimeout(tick, 110); }
      else { label.textContent = 'chunked AES-GCM · sent'; t = setTimeout(function () { cells.forEach(function (c) { c.classList.remove('enc'); }); k = 0; tick(); }, 2400); }
    }
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (en) {
        active = en[0].isIntersecting; clearTimeout(t); if (active) tick();
      }).observe(box);
    } else { active = true; tick(); }
  }

  /* ------------------------------------------------------------------
     Geo map: generated parcels + layer toggle
     ------------------------------------------------------------------ */
  function geo() {
    var svg = $('#geo-svg'), g = $('#geo-parcels');
    if (!svg || !g) return;
    var s = 42;
    function r() { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }
    var html = '';
    var optical = ['#2d3a26', '#3b4a2c', '#4a4b35', '#5b5442', '#34402e', '#6b6352'];
    var cols = 12, rows = 8, cw = 600 / cols, ch = 400 / rows;
    for (var y = 0; y < rows; y++) {
      for (var x = 0; x < cols; x++) {
        var built = r() < 0.28;
        var w = cw * (0.82 + r() * 0.16), h = ch * (0.8 + r() * 0.18);
        var px = x * cw + (cw - w) / 2, py = y * ch + (ch - h) / 2;
        var o = built ? '#77746a' : optical[Math.floor(r() * optical.length)];
        var sv = Math.floor((built ? 150 : 50) + r() * 50);
        var sar = 'rgb(' + sv + ',' + sv + ',' + sv + ')';
        var veg = built ? 'rgba(59,226,255,' + (0.45 + r() * 0.4).toFixed(2) + ')' : 'rgba(198,244,50,' + (0.25 + r() * 0.55).toFixed(2) + ')';
        html += '<rect class="parcel" x="' + px.toFixed(1) + '" y="' + py.toFixed(1) + '" width="' + w.toFixed(1) + '" height="' + h.toFixed(1) +
          '" style="--o:' + o + ';--s:' + sar + ';--n:' + veg + '"/>';
      }
    }
    g.innerHTML = html;
    $$('[data-layer]').forEach(function (b, _, all) {
      b.addEventListener('click', function () {
        all.forEach(function (x) { x.classList.toggle('is-on', x === b); x.setAttribute('aria-pressed', String(x === b)); });
        svg.setAttribute('class', 'layer-' + b.dataset.layer);
      });
    });
  }

  /* ------------------------------------------------------------------
     Plant: Grad-CAM overlay slider
     ------------------------------------------------------------------ */
  function plant() {
    var range = $('#heat-range'), heat = $('#heat');
    if (!range || !heat) return;
    function set() { heat.style.setProperty('--heat', String(range.value / 100)); }
    range.addEventListener('input', set); set();
  }

  /* ------------------------------------------------------------------
     Water Survey: offline → sync
     ------------------------------------------------------------------ */
  function water() {
    var btn = $('#net-toggle'), state = $('#net-state'), items = $$('#records li');
    if (!btn) return;
    var timers = [];
    btn.addEventListener('click', function () {
      var online = btn.getAttribute('aria-pressed') !== 'true';
      btn.setAttribute('aria-pressed', String(online));
      timers.forEach(clearTimeout); timers = [];
      state.className = 'net ' + (online ? 'on' : 'off');
      state.textContent = online ? '● Online · syncing' : '● Offline';
      btn.textContent = online ? 'Drop network' : 'Restore network';
      items.forEach(function (li, i) {
        if (online) {
          timers.push(setTimeout(function () {
            li.classList.add('synced'); $('b', li).textContent = 'synced ✓';
            if (i === items.length - 1) state.textContent = '● Online · all synced';
          }, reduceMotion ? 0 : 500 + i * 550));
        } else { li.classList.remove('synced'); $('b', li).textContent = 'queued'; }
      });
    });
  }

  /* ------------------------------------------------------------------
     Skills map filter
     ------------------------------------------------------------------ */
  function skills() {
    var map = $('#skill-map'), btns = $$('.skill-filter .chip');
    if (!map) return;
    var items = $$('li', map);
    btns.forEach(function (b) {
      b.addEventListener('click', function () {
        var p = b.dataset.p;
        btns.forEach(function (x) { x.classList.toggle('is-on', x === b); x.setAttribute('aria-pressed', String(x === b)); });
        map.classList.toggle('filtered', p !== 'all');
        items.forEach(function (li) {
          var ps = (li.dataset.p || '').split(' ');
          li.classList.toggle('hit', p !== 'all' && ps.indexOf(p) >= 0);
        });
      });
    });
  }

  /* ------------------------------------------------------------------
     Contact: copy email
     ------------------------------------------------------------------ */
  function copyEmail() {
    var b = $('#copy-email'), status = $('#copy-status');
    if (!b) return;
    if (!navigator.clipboard) { b.hidden = true; return; }
    b.addEventListener('click', function () {
      navigator.clipboard.writeText(b.dataset.email).then(function () {
        status.textContent = 'Copied ✓';
        setTimeout(function () { status.textContent = ''; }, 2400);
      }, function () { status.textContent = 'Copy failed. Select the address above.'; });
    });
  }

  /* ------------------------------------------------------------------
     Smooth, inertial scrolling (Lenis). Native scrolling is kept for
     reduced-motion users or if the library fails to load.
     ------------------------------------------------------------------ */
  function smooth() {
    if (reduceMotion || !window.Lenis) return;
    var lenis = new window.Lenis({ lerp: 0.085, smoothWheel: true, wheelMultiplier: 0.9 });
    window.__lenis = lenis;
    (function raf(t) { lenis.raf(t); requestAnimationFrame(raf); })(performance.now());
    document.addEventListener('click', function (e) {
      var a = e.target.closest('a[href^="#"]');
      if (!a || a.closest('[data-world]')) return;
      var id = a.getAttribute('href');
      var el = id.length > 1 && document.querySelector(id);
      if (!el) return;
      e.preventDefault();
      lenis.scrollTo(el, { offset: id === '#home' ? 0 : -64, duration: 1.4 });
      history.replaceState(null, '', id);
    });
  }

  /* ------------------------------------------------------------------
     Opening scene fail-safe: mini-me (minime.js) plays the curtain intro.
     If the 3D module can't load, the curtain must never block the page.
     ------------------------------------------------------------------ */
  function introGuard() {
    var root = document.documentElement;
    if (!root.classList.contains('intro')) { root.classList.add('hero-in'); return; }
    if (window.__lenis) window.__lenis.stop();
    setTimeout(function () {
      if (root.classList.contains('intro') && !root.classList.contains('intro-running')) {
        root.classList.remove('intro');
        root.classList.add('hero-in');
        if (window.__lenis) window.__lenis.start();
      }
    }, 6000);
  }

  /* ------------------------------------------------------------------
     Graphic typography
     - the name is split into letters; some are outlined, and each one
       stretches (variable width + weight) as the cursor comes near
     - the stretch is a transform, so it never moves the layout
     - headings rise word by word; the type band skews with scroll speed
     ------------------------------------------------------------------ */
  function typography() {
    var name = $('#hero-title');
    var OUTLINED = { 0: [4, 5, 6], 1: [0] };   // K R U in SANSKRUTI, N in NAIK
    var letters = [];
    if (name) {
      $$('.hn-line', name).forEach(function (line, li) {
        var text = line.textContent;
        line.textContent = '';
        line.setAttribute('aria-hidden', 'true');
        Array.prototype.forEach.call(text, function (c, i) {
          var s = document.createElement('span');
          s.className = 'ch' + ((OUTLINED[li] || []).indexOf(i) >= 0 ? ' o' : '');
          s.textContent = c;
          line.appendChild(s);
          letters.push({ el: s, f: 0 });
        });
      });
    }

    // kinetic headings: wrap every word (keeping inner spans such as .serif)
    $$('.kin').forEach(function (h) {
      var i = 0;
      (function walk(node) {
        Array.prototype.slice.call(node.childNodes).forEach(function (n) {
          if (n.nodeType === 3) {
            var frag = document.createDocumentFragment();
            n.textContent.split(/(\s+)/).forEach(function (part) {
              if (!part) return;
              if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(part)); return; }
              var w = document.createElement('span'); w.className = 'w';
              var wi = document.createElement('span'); wi.className = 'wi'; wi.style.setProperty('--i', i++);
              wi.textContent = part; w.appendChild(wi); frag.appendChild(w);
            });
            n.parentNode.replaceChild(frag, n);
          } else if (n.nodeType === 1) walk(n);
        });
      })(h);
    });

    if (reduceMotion) return;

    // the stretch
    var fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    var px = -9999, py = -9999, hero = $('#home');
    window.addEventListener('pointermove', function (e) { px = e.clientX; py = e.clientY; }, { passive: true });
    var band = $('.tb-skew'), lastY = window.scrollY, skew = 0;
    (function loop(t) {
      requestAnimationFrame(loop);
      // band: skew with scroll velocity
      if (band) {
        var dy = window.scrollY - lastY; lastY = window.scrollY;
        skew += (Math.max(-12, Math.min(12, -dy * 0.35)) - skew) * 0.12;
        band.style.transform = 'skewX(' + skew.toFixed(2) + 'deg)';
      }
      if (!letters.length || !hero || window.scrollY > hero.offsetHeight) return;
      var sec = t / 1000;
      letters.forEach(function (l, i) {
        var target;
        if (fine) {
          var r = l.el.getBoundingClientRect();
          var cx = r.left + r.width / 2, cy = r.top + r.height / 2;
          var R = r.height * 0.9, d2 = ((px - cx) * (px - cx)) / (R * R) + ((py - cy) * (py - cy)) / (R * R * 1.6);
          target = Math.exp(-d2);
        } else {
          target = (Math.sin(sec * 1.5 - i * 0.55) + 1) / 2 * 0.55;   // a slow wave on touch screens
        }
        l.f += (target - l.f) * 0.14;
        var f = l.f;
        l.el.style.setProperty('--sx', (1 + 0.45 * f).toFixed(3));
        l.el.style.setProperty('--g', (850 + 50 * f).toFixed(0));
        l.el.style.setProperty('--sy', (1 + 0.2 * f).toFixed(3));
        l.el.style.setProperty('--sk', (-8 * f).toFixed(2) + 'deg');
      });
    })(performance.now());
  }

  /* ------------------------------------------------------------------
     Theme swatches: grey / blue / black / sage, remembered per visitor
     ------------------------------------------------------------------ */
  function theme() {
    var root = document.documentElement, btns = $$('[data-theme-set]');
    function apply(name, save) {
      root.setAttribute('data-theme', name);
      btns.forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.themeSet === name)); });
      var meta = $('meta[name="theme-color"]');
      if (meta) meta.setAttribute('content', getComputedStyle(root).getPropertyValue('--bg').trim());
      if (save) { try { localStorage.setItem('site-theme', name); } catch (e) {} }
      window.dispatchEvent(new CustomEvent('themechange', { detail: { theme: name } }));
    }
    btns.forEach(function (b) { b.addEventListener('click', function () { apply(b.dataset.themeSet, true); }); });
    apply(root.getAttribute('data-theme') || 'paper', false);
  }

  var y = $('#year'); if (y) y.textContent = String(new Date().getFullYear());

  typography(); theme(); nav(); reveals(); counters(); ragLab(); chunks(); geo(); plant(); water(); skills(); copyEmail(); smooth(); introGuard();
})();
