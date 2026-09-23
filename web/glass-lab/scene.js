/* =================================================================
   scene.js — the one scene all three stages share.

   Every number below was measured off ios26-glass-idle.png
   (1206 x 2622, iPhone 17 @3x => 402 pt wide).  The stage is
   393 x 300 px and 1 stage px == 1 device pt, so the 300 pt button
   is exactly 300 px wide here.
   ================================================================= */
(function (global) {
  'use strict';

  var SCENE = {
    W: 393,
    H: 300,

    // ---- reference-image crop ------------------------------------
    // button centre measured at (602.5, 1353) px.  Crop 393x300 pt
    // around it: 1179 x 900 device px starting at (13, 903).
    ref: { sx: 13, sy: 903, sw: 1179, sh: 900 },

    // ---- backdrop ------------------------------------------------
    bgTop: [230, 230, 235],     // device y = 903
    bgBottom: [219, 220, 225],  // device y = 1803

    // circles are hard-edged (no blur); softness comes from alpha
    orange: { x: 106.5, y: 89.8, r: 129.8, rgb: [244, 172, 110], a: 0.55 },
    purple: { x: 303.2, y: 243.2, r: 106.5, rgb: [209, 124, 223], a: 0.55 },

    // ---- button --------------------------------------------------
    btn: { x: 46.5, y: 124, w: 300, h: 52, r: 26 },

    // ---- measured glass values -----------------------------------
    fill: [0, 131, 247],        // flat interior, #0083F7
    fillPressed: [0, 110, 224],
    // the 3 device-px ramp measured at @3x was 45,210,253 -> 33,189,252 ->
    // 21,168,250 -> fill.  Extrapolated to depth 0 that is 56,228,255
    // falling to the fill over ~1.25 pt.
    rim: [56, 228, 255],
    rimWidth: 1.25,             // pt

    // MEASURED: the interior is opaque in RGB.  Over gray, orange and purple
    // backdrops the fill reads 0,131,247 / 0,131,247 / 0,130,245 — R never
    // leaves 0, so this is not an alpha blend.  What does change tracks
    // backdrop *luminance* only, at about 10% gain.
    backdropBleed: 0.0,         // straight RGB bleed (lab slider raises it)
    lumBleed: 0.05,             // luminance-only coupling
    backdropBlur: 11            // pt; fitted to the 27 pt smear of a hard edge
  };

  SCENE.cx = SCENE.btn.x + SCENE.btn.w / 2;
  SCENE.cy = SCENE.btn.y + SCENE.btn.h / 2;

  function rgba(c, a) { return 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + a + ')'; }

  /* Paint the backdrop (gradient + two discs) into a 2D context.
     `scale` lets us render at devicePixelRatio for the GL texture.  */
  SCENE.paintBackdrop = function (ctx, scale) {
    scale = scale || 1;
    var w = SCENE.W * scale, h = SCENE.H * scale;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, w, h);
    ctx.save();
    ctx.scale(scale, scale);

    var g = ctx.createLinearGradient(0, 0, 0, SCENE.H);
    g.addColorStop(0, 'rgb(' + SCENE.bgTop.join(',') + ')');
    g.addColorStop(1, 'rgb(' + SCENE.bgBottom.join(',') + ')');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, SCENE.W, SCENE.H);

    [SCENE.orange, SCENE.purple].forEach(function (c) {
      ctx.beginPath();
      ctx.arc(c.x, c.y, c.r, 0, Math.PI * 2);
      ctx.fillStyle = rgba(c.rgb, c.a);
      ctx.fill();
    });
    ctx.restore();
  };

  /* Signed distance to the capsule, in stage px.  Negative = inside. */
  SCENE.sdCapsule = function (px, py) {
    var b = SCENE.btn;
    var qx = Math.abs(px - SCENE.cx) - (b.w / 2 - b.r);
    var qy = Math.abs(py - SCENE.cy) - (b.h / 2 - b.r);
    var mx = Math.max(qx, 0), my = Math.max(qy, 0);
    return Math.hypot(mx, my) + Math.min(Math.max(qx, qy), 0) - b.r;
  };

  /* Build the feDisplacementMap source for stage A.
     R/G encode the outward capsule normal, ramped up near the rim.
     128 == no displacement.                                          */
  SCENE.buildDisplacementMap = function (depth) {
    depth = depth || 9;                       // pt of rim the lens covers
    var b = SCENE.btn, S = 2;                 // 2x for a smoother map
    var w = b.w * S, h = b.h * S;
    var cv = document.createElement('canvas');
    cv.width = w; cv.height = h;
    var ctx = cv.getContext('2d');
    var img = ctx.createImageData(w, h);
    var d = img.data;
    var e = 0.7;

    for (var y = 0; y < h; y++) {
      for (var x = 0; x < w; x++) {
        // map back into stage coordinates
        var px = b.x + (x + 0.5) / S;
        var py = b.y + (y + 0.5) / S;
        var sd = SCENE.sdCapsule(px, py);
        var i = (y * w + x) * 4;

        if (sd > 0) { d[i] = 128; d[i + 1] = 128; d[i + 2] = 128; d[i + 3] = 255; continue; }

        var nx = SCENE.sdCapsule(px + e, py) - SCENE.sdCapsule(px - e, py);
        var ny = SCENE.sdCapsule(px, py + e) - SCENE.sdCapsule(px, py - e);
        var len = Math.hypot(nx, ny) || 1;
        nx /= len; ny /= len;

        // 1 at the rim, 0 by `depth` pt inward; squared for a tight lens
        var t = Math.max(0, 1 - (-sd) / depth);
        t = t * t;

        d[i]     = Math.round(128 + nx * 127 * t);
        d[i + 1] = Math.round(128 + ny * 127 * t);
        d[i + 2] = 128;
        d[i + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
    return cv.toDataURL('image/png');
  };

  global.SCENE = SCENE;
})(window);
