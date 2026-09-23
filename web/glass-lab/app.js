/* =================================================================
   app.js — wiring: press spring, rAF gating, instrumentation,
   the reference crop, and the SVG-in-backdrop-filter probe.
   ================================================================= */
(function () {
  'use strict';

  var S = window.SCENE;

  /* ---------------- 1. stage A: displacement map ---------------- */
  try {
    var mapURL = S.buildDisplacementMap(9);
    var mapEl = document.getElementById('labRefractMap');
    mapEl.setAttributeNS('http://www.w3.org/1999/xlink', 'href', mapURL);
    mapEl.setAttribute('href', mapURL);
  } catch (e) { /* non-fatal */ }

  /* ---------------- 2. stage C: crop the screenshot ------------- */
  var refCanvas = document.getElementById('refCanvas');
  var refCtx = refCanvas.getContext('2d');
  var refImgs = {};
  var refDpr = Math.min(window.devicePixelRatio || 1, 2);
  refCanvas.width = Math.round(S.W * refDpr);
  refCanvas.height = Math.round(S.H * refDpr);

  function drawRef(which) {
    var img = refImgs[which];
    if (!img) return;
    refCtx.setTransform(1, 0, 0, 1, 0, 0);
    refCtx.imageSmoothingEnabled = true;
    refCtx.imageSmoothingQuality = 'high';
    var r = S.ref;
    refCtx.drawImage(img, r.sx, r.sy, r.sw, r.sh,
                     0, 0, S.W * refDpr, S.H * refDpr);
  }

  /* The two captures turned out NOT to be idle-vs-pressed of a "Subscribe"
     button: ios26-glass-pressed.png holds the button at its resting size
     (900 x 156 device px = 300 x 52 pt, checkmark label) and
     ios26-glass-idle.png holds it mid-transition, stretched to 201 px
     (67 pt) with a spinner.  The 52 pt frame is the one whose geometry
     matches A and B, so it is the default.                              */
  var refWhich = 'pressed';
  var refLabel = { pressed: 'frame: resting 52pt', idle: 'frame: expanded 67pt' };
  var refBtn = document.getElementById('refSwap');
  refBtn.addEventListener('click', function () {
    refWhich = refWhich === 'idle' ? 'pressed' : 'idle';
    refBtn.textContent = refLabel[refWhich];
    drawRef(refWhich);
  });

  ['idle', 'pressed'].forEach(function (which) {
    var img = new Image();
    img.onload = function () { refImgs[which] = img; if (which === refWhich) drawRef(which); };
    img.src = 'ref/ios26-glass-' + which + '.png';
  });

  /* ---------------- 3. SVG-in-backdrop-filter detection --------- */
  var supportsParse = false, supportsWebkitParse = false, computedKeepsUrl = false;
  try {
    supportsParse = CSS.supports('backdrop-filter', 'url(#lab-kill)');
    supportsWebkitParse = CSS.supports('-webkit-backdrop-filter', 'url(#lab-kill)');
  } catch (e) {}
  try {
    var cs = getComputedStyle(document.querySelector('.btnA-refract'));
    var v = cs.backdropFilter || cs.webkitBackdropFilter || '';
    computedKeepsUrl = v.indexOf('url(') >= 0;
  } catch (e) {}

  if (!supportsParse) document.documentElement.classList.add('no-svg-backdrop');

  document.getElementById('svgSupport').textContent =
    'SVG filters in backdrop-filter — CSS.supports: ' + supportsParse +
    ' / -webkit: ' + supportsWebkitParse +
    ' / survives computed style: ' + computedKeepsUrl +
    '  (parsing != rendering — read the probe strip below).' +
    '  NOTE: a url() filter only reaches the backdrop when it is the WHOLE ' +
    'backdrop-filter value, and a filtered ANCESTOR becomes a backdrop root ' +
    'and starves it entirely.';

  /* ---------------- 4. press spring ----------------------------- */
  var K = 900, C = 48;          // ~167 ms to settle, faint overshoot
  var scale = 1, vel = 0, target = 1;
  var pointer = [S.cx, S.cy];
  var pressing = false;

  function stepSpring(dt) {
    dt = Math.min(dt, 0.032);
    var a = -K * (scale - target) - C * vel;
    vel += a * dt;
    scale += vel * dt;
    return Math.abs(scale - target) > 0.0002 || Math.abs(vel) > 0.002;
  }

  /* ---------------- 5. renderers -------------------------------- */
  var btnAWrap = document.getElementById('btnAWrap');
  var btnA = document.getElementById('btnA');
  var btnBLabel = document.getElementById('btnBLabel');
  var glc = document.getElementById('glCanvas');

  var GL = null;
  try { GL = window.GlassGL.init(glc, S); } catch (e) { console.error(e); }
  if (!GL) { document.getElementById('glFallback').hidden = false; }

  function press01() { return Math.min(1, Math.max(0, (1 - scale) / 0.04)); }

  function paint() {
    var p = press01();
    btnAWrap.style.transform = 'scale(' + scale + ')';
    btnA.style.setProperty('--spec-x',
      (((pointer[0] - S.btn.x) / S.btn.w) * 100).toFixed(1) + '%');
    btnA.classList.toggle('pressed', p > 0.5);
    btnBLabel.style.transform = 'scale(' + scale + ')';
    if (GL) GL.render({ press: p, scale: scale, pointer: pointer });
  }

  /* ---------------- 6. rAF only while moving / pressed ---------- */
  var running = false, last = 0, moved = false;
  var deltas = [];

  function loop(t) {
    var dt = last ? (t - last) / 1000 : 1 / 60;
    if (last && (pressing || deltas.length)) {
      deltas.push(t - last);
      if (deltas.length > 400) deltas.shift();
    }
    last = t;

    var springAlive = stepSpring(dt);
    paint();

    var keep = pressing || springAlive || moved;
    moved = false;
    if (keep) { requestAnimationFrame(loop); }
    else { running = false; last = 0; }
  }

  function kick() {
    if (running) return;
    running = true;
    last = 0;
    requestAnimationFrame(loop);
  }

  /* ---------------- 7. pointer wiring --------------------------- */
  [['stageA', true], ['stageB', true]].forEach(function (pair) {
    var el = document.getElementById(pair[0]);

    el.addEventListener('pointermove', function (ev) {
      var r = el.getBoundingClientRect();
      pointer = [ev.clientX - r.left, ev.clientY - r.top];
      moved = true;
      kick();
    });

    el.addEventListener('pointerdown', function (ev) {
      try { el.setPointerCapture(ev.pointerId); } catch (e) {}
      var r = el.getBoundingClientRect();
      pointer = [ev.clientX - r.left, ev.clientY - r.top];
      pressing = true; target = 0.96; deltas.length = 0;
      kick();
    });

    ['pointerup', 'pointercancel', 'pointerleave'].forEach(function (n) {
      el.addEventListener(n, function () {
        if (!pressing) return;
        pressing = false; target = 1;
        kick();
        reportFrames();
      });
    });
  });

  /* ---------------- 8. instrumentation -------------------------- */
  function stats(arr) {
    if (!arr.length) return null;
    var s = arr.slice().sort(function (a, b) { return a - b; });
    var sum = 0; for (var i = 0; i < s.length; i++) sum += s[i];
    return {
      n: s.length,
      mean: +(sum / s.length).toFixed(2),
      p50: +s[Math.floor(s.length * 0.5)].toFixed(2),
      p95: +s[Math.floor(s.length * 0.95)].toFixed(2),
      max: +s[s.length - 1].toFixed(2)
    };
  }

  function reportFrames() {
    var st = stats(deltas);
    if (!st) return;
    document.getElementById('frameStats').textContent =
      'frame time (B, during press): n=' + st.n +
      '  mean=' + st.mean + 'ms  p50=' + st.p50 +
      'ms  p95=' + st.p95 + 'ms  max=' + st.max +
      'ms  -> ' + (1000 / st.mean).toFixed(1) + ' fps';
  }

  var ctlBleed = document.getElementById('ctlBleed');
  var ctlRefract = document.getElementById('ctlRefract');
  ctlBleed.addEventListener('input', function () {
    var v = +ctlBleed.value;
    document.getElementById('outBleed').textContent = v.toFixed(2);
    if (GL) GL.set('Bleed', v);
    // the same knob on stage A, so the two are compared at equal opacity
    var root = document.documentElement.style;
    root.setProperty('--tint-a',  Math.max(0.25, 0.985 - v).toFixed(3));
    root.setProperty('--tint-a2', Math.max(0.22, 0.965 - v).toFixed(3));
    root.setProperty('--tint-a3', Math.max(0.24, 0.980 - v).toFixed(3));
    moved = true; kick();
  });
  var disp = document.getElementById('labRefractDisp');
  ctlRefract.addEventListener('input', function () {
    var v = +ctlRefract.value;
    document.getElementById('outRefract').textContent = v.toFixed(1) + ' px';
    if (GL) GL.set('Refract', v);
    // feDisplacementMap's scale spans the full channel range, and the map only
    // ever reaches +-127/255, so 2x matches B's "px at the rim".
    if (disp) disp.setAttribute('scale', String(v * 2));
    moved = true; kick();
  });

  document.getElementById('notes').textContent =
    'dpr=' + (window.devicePixelRatio || 1) +
    '  gl=' + (GL ? 'webgl ok @' + GL.dpr + 'x' : 'unavailable') +
    '  stage=' + S.W + 'x' + S.H + 'px (1px = 1pt)  button=' +
    S.btn.w + 'x' + S.btn.h + 'pt  ref crop=' + S.ref.sw + 'x' + S.ref.sh +
    '@(' + S.ref.sx + ',' + S.ref.sy + ')';

  /* public hooks for headless measurement */
  window.__glassLab = {
    scene: S,
    frameStats: function () { return stats(deltas); },
    rawDeltas: function () { return deltas.slice(); },
    setPressed: function (on) {
      pressing = !!on;
      target = on ? 0.96 : 1;
      if (!on) reportFrames(); else deltas.length = 0;
      kick();
    },
    setPointer: function (x, y) { pointer = [x, y]; moved = true; kick(); },
    /* synchronous GPU-inclusive timing: n draws with an explicit finish */
    bench: function (n) {
      n = n || 200;
      if (!GL) return null;
      var samples = [];
      for (var i = 0; i < n; i++) {
        var t0 = performance.now();
        GL.render({ press: 1, scale: 0.96, pointer: [S.cx + (i % 40) - 20, S.cy] });
        GL.finish();
        samples.push(performance.now() - t0);
      }
      return stats(samples);
    },
    /* sample stage-px points from B (and the same points from C) */
    probe: function (pts, pressed) {
      var st = pressed ? { press: 1, scale: 0.96, pointer: pointer }
                       : { press: 0, scale: 1, pointer: pointer };
      var b = GL ? GL.probe(st, pts, GL.dpr) : null;
      var cd = refCtx.getImageData(0, 0, refCanvas.width, refCanvas.height).data;
      var c = pts.map(function (p) {
        var x = Math.round(p[0] * refDpr), y = Math.round(p[1] * refDpr);
        var i = (y * refCanvas.width + x) * 4;
        return [cd[i], cd[i + 1], cd[i + 2]];
      });
      return { B: b, C: c };
    },
    /* PNG data URLs for offline comparison */
    snapshotB: function (pressed) {
      if (!GL) return null;
      return GL.snapshot(pressed
        ? { press: 1, scale: 0.96, pointer: pointer }
        : { press: 0, scale: 1, pointer: pointer });
    },
    snapshotC: function () { return refCanvas.toDataURL('image/png'); },
    svgInBackdrop: {
      parse: supportsParse,
      webkitParse: supportsWebkitParse,
      computedKeepsUrl: computedKeepsUrl
    }
  };

  paint();
})();
