/* =================================================================
   webgl.js — stage B.

   The backdrop is painted into a 2D canvas first and uploaded as a
   texture, so the fragment shader can actually sample what is behind
   the button: refract it at the rim, blur it inside, tint it, and lay
   a specular streak on the top edge that tracks the pointer.
   ================================================================= */
(function (global) {
  'use strict';

  var VERT = [
    'attribute vec2 aPos;',
    'void main(){ gl_Position = vec4(aPos, 0.0, 1.0); }'
  ].join('\n');

  var FRAG = [
    'precision highp float;',

    'uniform sampler2D uTex;',
    'uniform vec2  uStage;        // 393 x 300, stage px',
    'uniform float uDpr;',
    'uniform vec2  uCenter;       // button centre, stage px',
    'uniform vec2  uHalf;         // button half size, stage px',
    'uniform float uRadius;',
    'uniform float uPress;        // 0..1',
    'uniform float uScale;        // 1.0 -> 0.96',
    'uniform vec2  uPointer;      // stage px',
    'uniform float uRefract;      // px of outward displacement at the rim',
    'uniform float uLensDepth;    // px of rim the lens covers',
    'uniform float uBlur;         // px of blur inside the glass',
    'uniform float uRimW;         // px width of the bright rim band',
    'uniform float uBleed;        // straight RGB bleed of the backdrop',
    'uniform float uLumBleed;     // luminance-only coupling',
    'uniform float uSpec;         // specular strength',
    'uniform vec3  uFill;',
    'uniform vec3  uFillPressed;',
    'uniform vec3  uRim;',

    'const vec3 LUM = vec3(0.2126, 0.7152, 0.0722);',

    'float sdCapsule(vec2 p){',
    '  vec2 q = abs(p - uCenter) - (uHalf - vec2(uRadius));',
    '  return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - uRadius;',
    '}',

    'vec3 tap(vec2 p){',
    '  vec2 uv = vec2(p.x / uStage.x, 1.0 - p.y / uStage.y);',
    '  return texture2D(uTex, clamp(uv, 0.0, 1.0)).rgb;',
    '}',

    // 17-tap golden-angle spiral: cheap, no visible banding at r <= 12px
    'vec3 blurTap(vec2 p, float r){',
    '  if (r < 0.3) return tap(p);',
    '  vec3 acc = tap(p);',
    '  float w = 1.0;',
    '  for (int i = 1; i <= 16; i++){',
    '    float fi = float(i);',
    '    float a  = fi * 2.399963;',
    '    float rr = r * sqrt(fi / 16.0);',
    '    vec2  o  = vec2(cos(a), sin(a)) * rr;',
    '    float wi = 1.0 - 0.45 * (rr / r);',
    '    acc += tap(p + o) * wi;',
    '    w += wi;',
    '  }',
    '  return acc / w;',
    '}',

    'void main(){',
    '  vec2 p = vec2(gl_FragCoord.x / uDpr, uStage.y - gl_FragCoord.y / uDpr);',

    // inverse press-scale about the button centre
    '  vec2 q = (p - uCenter) / uScale + uCenter;',
    '  float d = sdCapsule(q);',

    '  float aa = 0.5 / uDpr / uScale;',
    '  float inside = 1.0 - smoothstep(-aa, aa, d);',

    // ---- outside: backdrop + drop shadow -------------------------
    '  float dsh = sdCapsule(vec2(q.x, q.y - 6.0));',
    '  float shadow = exp(-max(dsh, 0.0) / 14.0) * 0.095;',
    '  vec3 outside = tap(p) * (1.0 - shadow * (1.0 - inside));',

    '  if (inside < 0.001){ gl_FragColor = vec4(outside, 1.0); return; }',

    // ---- rim normal ---------------------------------------------
    '  float e = 0.6;',
    '  vec2 n = normalize(vec2(',
    '    sdCapsule(q + vec2(e, 0.0)) - sdCapsule(q - vec2(e, 0.0)),',
    '    sdCapsule(q + vec2(0.0, e)) - sdCapsule(q - vec2(0.0, e))));',

    '  float depth = -d;',                       // px inward from the edge
    '  float lens  = clamp(1.0 - depth / uLensDepth, 0.0, 1.0);',
    '  lens = lens * lens;',

    // ---- refraction + blur --------------------------------------
    '  vec2 off = n * lens * uRefract * uScale;',
    '  vec3 bg  = blurTap(p + off, uBlur * uScale);',

    // ---- tint, lifted slightly by backdrop luminance -------------
    '  float luma = dot(bg, LUM);',
    '  vec3 tint  = mix(uFill, uFillPressed, uPress);',
    // luminance-only coupling: keeps R at 0 exactly as the screenshot does
    '  vec3 glass = tint * (1.0 + (luma - 0.90) * uLumBleed);',
    '  float bleed = uBleed * (1.0 - 0.35 * uPress);',
    '  vec3 col = mix(glass, bg, bleed);',

    // ---- the 1 pt rim band (measured: linear ramp to the fill) ----
    '  float band = clamp(1.0 - depth / (uRimW * uScale), 0.0, 1.0);',
    '  col = mix(col, uRim, band * 0.95);',

    // ---- pointer-driven specular (stand-in for device tilt) ------
    '  vec2 L = normalize(vec2((uPointer.x - uCenter.x) / uHalf.x, -1.5));',
    '  float s = max(dot(n, L), 0.0);',
    '  float spec = pow(s, 8.0) * (1.0 - smoothstep(0.0, 2.4, depth));',
    '  col += vec3(1.0) * spec * uSpec * (1.0 - 0.4 * uPress);',

    '  gl_FragColor = vec4(mix(outside, col, inside), 1.0);',
    '}'
  ].join('\n');

  function compile(gl, type, src) {
    var sh = gl.createShader(type);
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
      throw new Error(gl.getShaderInfoLog(sh));
    }
    return sh;
  }

  global.GlassGL = {
    init: function (canvas, S) {
      var dpr = Math.min(global.devicePixelRatio || 1, 2);
      canvas.width = Math.round(S.W * dpr);
      canvas.height = Math.round(S.H * dpr);

      var gl = canvas.getContext('webgl', { antialias: false, alpha: false, premultipliedAlpha: false })
            || canvas.getContext('experimental-webgl');
      if (!gl) return null;

      var prog = gl.createProgram();
      gl.attachShader(prog, compile(gl, gl.VERTEX_SHADER, VERT));
      gl.attachShader(prog, compile(gl, gl.FRAGMENT_SHADER, FRAG));
      gl.linkProgram(prog);
      if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
        throw new Error(gl.getProgramInfoLog(prog));
      }
      gl.useProgram(prog);

      var buf = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
      var aPos = gl.getAttribLocation(prog, 'aPos');
      gl.enableVertexAttribArray(aPos);
      gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

      // backdrop -> texture
      var off = document.createElement('canvas');
      off.width = Math.round(S.W * dpr);
      off.height = Math.round(S.H * dpr);
      S.paintBackdrop(off.getContext('2d'), dpr);

      var tex = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, off);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

      var U = {};
      ['uTex', 'uStage', 'uDpr', 'uCenter', 'uHalf', 'uRadius', 'uPress', 'uScale',
       'uPointer', 'uRefract', 'uLensDepth', 'uBlur', 'uRimW', 'uBleed',
       'uLumBleed', 'uSpec',
       'uFill', 'uFillPressed', 'uRim'].forEach(function (n) {
        U[n] = gl.getUniformLocation(prog, n);
      });

      function n3(c) { return [c[0] / 255, c[1] / 255, c[2] / 255]; }

      gl.uniform1i(U.uTex, 0);
      gl.uniform2f(U.uStage, S.W, S.H);
      gl.uniform1f(U.uDpr, dpr);
      gl.uniform2f(U.uCenter, S.cx, S.cy);
      gl.uniform2f(U.uHalf, S.btn.w / 2, S.btn.h / 2);
      gl.uniform1f(U.uRadius, S.btn.r);
      gl.uniform1f(U.uRefract, 7.0);
      gl.uniform1f(U.uLensDepth, 9.0);
      gl.uniform1f(U.uBlur, S.backdropBlur);
      gl.uniform1f(U.uRimW, S.rimWidth);
      gl.uniform1f(U.uBleed, S.backdropBleed);
      gl.uniform1f(U.uLumBleed, S.lumBleed);
      gl.uniform1f(U.uSpec, 0.06);
      gl.uniform3fv(U.uFill, n3(S.fill));
      gl.uniform3fv(U.uFillPressed, n3(S.fillPressed));
      gl.uniform3fv(U.uRim, n3(S.rim));
      gl.viewport(0, 0, canvas.width, canvas.height);

      return {
        gl: gl,
        dpr: dpr,
        render: function (st) {
          gl.uniform1f(U.uPress, st.press);
          gl.uniform1f(U.uScale, st.scale);
          gl.uniform2f(U.uPointer, st.pointer[0], st.pointer[1]);
          gl.drawArrays(gl.TRIANGLES, 0, 3);
        },
        finish: function () { gl.finish(); },
        set: function (name, v) { if (U['u' + name]) gl.uniform1f(U['u' + name], v); },
        /* render, then sample stage-px points straight out of the back buffer */
        probe: function (st, pts, dpr) {
          this.render(st);
          var W = canvas.width, H = canvas.height;
          var px = new Uint8Array(W * H * 4);
          gl.readPixels(0, 0, W, H, gl.RGBA, gl.UNSIGNED_BYTE, px);
          return pts.map(function (p) {
            var x = Math.round(p[0] * dpr);
            var y = H - 1 - Math.round(p[1] * dpr);
            var i = (y * W + x) * 4;
            return [px[i], px[i + 1], px[i + 2]];
          });
        },
        /* render + read back in one task (no preserveDrawingBuffer needed) */
        snapshot: function (st) {
          this.render(st);
          var px = new Uint8Array(canvas.width * canvas.height * 4);
          gl.readPixels(0, 0, canvas.width, canvas.height, gl.RGBA, gl.UNSIGNED_BYTE, px);
          var cv = document.createElement('canvas');
          cv.width = canvas.width; cv.height = canvas.height;
          var c2 = cv.getContext('2d');
          var id = c2.createImageData(canvas.width, canvas.height);
          // GL origin is bottom-left; flip into image order
          var W = canvas.width, H = canvas.height;
          for (var y = 0; y < H; y++) {
            var src = (H - 1 - y) * W * 4, dst = y * W * 4;
            for (var i = 0; i < W * 4; i++) id.data[dst + i] = px[src + i];
          }
          c2.putImageData(id, 0, 0);
          return cv.toDataURL('image/png');
        }
      };
    }
  };
})(window);
