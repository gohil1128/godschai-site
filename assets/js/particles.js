/* God's Chai — particle stage.

   A cloud of a few thousand points that flies apart and re-forms into a new
   shape for each step: the brew steps, the iced-chai steps, and the signup
   box's sending/done light. One file, no libraries — WebGL where the browser
   has it, a lighter canvas version where it doesn't, and nothing at all with
   JavaScript off (every stage starts out hidden).

   It only animates while it is on screen, and for anyone who has asked their
   device to reduce motion it switches shapes instantly and holds still.

   Markup (see _includes/particle-stage.html):
     <div data-gc-particles hidden>
       <button data-gc-ptab="boil">…</button> …   one per step, in order
       <canvas></canvas>
     </div>
   and, anywhere in the same <section>, cards marked data-gc-pcard in the same
   order — the one for the shape on show gets the class "is-on".

   A step's shape is chosen by its label (boil, blend, rise, strain, …) in
   PRESETS below, so reordering the steps in _data/*.yml keeps each shape with
   its step. An unknown label falls back to the sphere. */
(function () {
  'use strict';
  if (window.GCParticles) return;

  var d = document, W = window;
  var REDUCE = !!(W.matchMedia && W.matchMedia('(prefers-reduced-motion: reduce)').matches);
  var TAU = Math.PI * 2;

  /* ---------- the shapes ---------- */

  // Seeded, so every visitor sees the same shape and nothing reflows on reload.
  function rng(seed) {
    var s = (seed | 0) || 0x2545f491;
    return function () {
      s ^= s << 13; s ^= s >>> 17; s ^= s << 5;
      return (s >>> 0) / 4294967296;
    };
  }
  function hash(str) {
    var h = 2166136261;
    for (var i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h | 0;
  }
  function gauss(r) {
    return Math.sqrt(-2 * Math.log(r() || 1e-9)) * Math.cos(TAU * r());
  }
  function put(a, i, x, y, z) { a[i * 3] = x; a[i * 3 + 1] = y; a[i * 3 + 2] = z; }
  function dir(r, o) {
    var x = gauss(r), y = gauss(r), z = gauss(r), l = Math.sqrt(x * x + y * y + z * z) || 1;
    o[0] = x / l; o[1] = y / l; o[2] = z / l;
    return o;
  }
  function rotor(ax, ay, az) {
    var ca = Math.cos(ax), sa = Math.sin(ax), cb = Math.cos(ay), sb = Math.sin(ay), cc = Math.cos(az), sc = Math.sin(az);
    return function (x, y, z, o) {
      var y1 = ca * y - sa * z, z1 = sa * y + ca * z;          // about X
      var x2 = cb * x + sb * z1, z2 = -sb * x + cb * z1;       // about Y
      o[0] = cc * x2 - sc * y1; o[1] = sc * x2 + cc * y1; o[2] = z2; // about Z
      return o;
    };
  }
  // Points on the edges and faces of a cube — edges weighted so it reads as a cube.
  function cube(a, from, count, cx, cy, cz, h, rot, r) {
    var o = [0, 0, 0];
    for (var i = 0; i < count; i++) {
      var x, y, z, ax = (r() * 3) | 0;
      if (r() < 0.55) {
        var s1 = r() < 0.5 ? -h : h, s2 = r() < 0.5 ? -h : h, t = (r() * 2 - 1) * h;
        if (ax === 0) { x = t; y = s1; z = s2; } else if (ax === 1) { x = s1; y = t; z = s2; } else { x = s1; y = s2; z = t; }
      } else {
        var s = r() < 0.5 ? -h : h, u = (r() * 2 - 1) * h, v = (r() * 2 - 1) * h;
        if (ax === 0) { x = s; y = u; z = v; } else if (ax === 1) { x = u; y = s; z = v; } else { x = u; y = v; z = s; }
      }
      rot(x, y, z, o);
      put(a, from + i, cx + o[0], cy + o[1], cz + o[2]);
    }
  }
  // Split n into parts by weight; the last part takes the rounding.
  function parts(n, w) {
    var out = [], used = 0, sum = 0, i;
    for (i = 0; i < w.length; i++) sum += w[i];
    for (i = 0; i < w.length - 1; i++) { var k = Math.round(n * w[i] / sum); out.push(k); used += k; }
    out.push(n - used);
    return out;
  }

  // Every shape fits roughly inside a unit sphere, centred on the origin.
  var SHAPES = {
    // A dust ball, dense at the skin. The breathing comes from the wobble.
    sphere: function (n, r) {
      var a = new Float32Array(n * 3), v = [0, 0, 0];
      for (var i = 0; i < n; i++) {
        dir(r, v);
        var k = 0.8 + 0.2 * Math.sqrt(r());
        put(a, i, v[0] * k, v[1] * k, v[2] * k);
      }
      return a;
    },
    // Double-strength: the same ball, packed into a smaller, solid core.
    solid: function (n, r) {
      var a = new Float32Array(n * 3), v = [0, 0, 0];
      for (var i = 0; i < n; i++) {
        dir(r, v);
        var k = 0.6 * Math.pow(r(), 0.45);
        put(a, i, v[0] * k, v[1] * k, v[2] * k);
      }
      return a;
    },
    // A five-lobed knot drawn as a flat ribbon — spice swirling into the pot.
    knot: function (n, r) {
      var a = new Float32Array(n * 3);
      function f(u, o) {
        var q = 0.68 + 0.3 * Math.cos(5 * u);
        o[0] = q * Math.cos(2 * u); o[1] = q * Math.sin(2 * u); o[2] = 0.26 * Math.sin(5 * u);
        return o;
      }
      var p = [0, 0, 0], p1 = [0, 0, 0], p2 = [0, 0, 0], q3 = [0, 0, 0], tilt = rotor(1.05, 0, 0.3);
      for (var i = 0; i < n; i++) {
        var u = r() * TAU;
        f(u, p); f(u + 0.002, p1); f(u - 0.002, p2);
        var tx = p1[0] - p2[0], ty = p1[1] - p2[1], tz = p1[2] - p2[2];
        var tl = Math.sqrt(tx * tx + ty * ty + tz * tz) || 1; tx /= tl; ty /= tl; tz /= tl;
        var nx = ty, ny = -tx, nl = Math.sqrt(nx * nx + ny * ny) || 1; nx /= nl; ny /= nl; // T × Z
        var bx = -tz * ny, by = tz * nx, bz = tx * ny - ty * nx;                         // T × N
        var v = r() * TAU, cw = Math.cos(v) * 0.12, sw = Math.sin(v) * 0.028;
        // laid back at an angle, so spinning never shows it edge-on
        tilt(p[0] + nx * cw + bx * sw, p[1] + ny * cw + by * sw, p[2] + bz * sw, q3);
        put(a, i, q3[0], q3[1], q3[2]);
      }
      return a;
    },
    // Four stacked rings in the outline of a pot; the wave makes them climb.
    rings: function (n, r) {
      var a = new Float32Array(n * 3), ys = [-0.72, -0.24, 0.24, 0.72], rs = [0.62, 0.92, 0.92, 0.62];
      var cnt = parts(n, rs), i0 = 0;
      for (var k = 0; k < 4; k++) {
        for (var i = 0; i < cnt[k]; i++) {
          var t = r() * TAU, rad = rs[k] + gauss(r) * 0.022;
          put(a, i0 + i, Math.cos(t) * rad, ys[k] + gauss(r) * 0.018, Math.sin(t) * rad);
        }
        i0 += cnt[k];
      }
      return a;
    },
    // A cutting-chai glass: ridged, tapered, filled, with steam coming off it.
    cup: function (n, r) {
      var a = new Float32Array(n * 3);
      var c = parts(n, [56, 7, 13, 6, 18]), i = 0, k;
      var Y0 = -1.0, Y1 = 0.25; // base and rim, already shifted to centre the whole thing
      function rad(y) { return 0.4 + (y - Y0) / (Y1 - Y0) * 0.2; }
      for (k = 0; k < c[0]; k++, i++) {                      // wall, 14 ridges
        var y = Y0 + r() * (Y1 - Y0);
        var t = r() < 0.6 ? Math.floor(r() * 14) / 14 * TAU + gauss(r) * 0.02 : r() * TAU;
        put(a, i, Math.cos(t) * rad(y), y, Math.sin(t) * rad(y));
      }
      for (k = 0; k < c[1]; k++, i++) {                      // base
        var tb = r() * TAU, rb = 0.4 * Math.sqrt(r());
        put(a, i, Math.cos(tb) * rb, Y0, Math.sin(tb) * rb);
      }
      for (k = 0; k < c[2]; k++, i++) {                      // the chai
        var tl = r() * TAU, rl = rad(-0.02) * Math.sqrt(r());
        put(a, i, Math.cos(tl) * rl, -0.02, Math.sin(tl) * rl);
      }
      for (k = 0; k < c[3]; k++, i++) {                      // rim
        var tr = r() * TAU, rr = rad(Y1) + gauss(r) * 0.012;
        put(a, i, Math.cos(tr) * rr, Y1 + gauss(r) * 0.01, Math.sin(tr) * rr);
      }
      for (k = 0; k < c[4]; k++, i++) {                      // steam, three wisps, thinning upward
        var w = (r() * 3) | 0, s = Math.pow(r(), 1.35), ys = 0.36 + s * 0.62;
        put(a, i,
          (w - 1) * 0.17 + (0.03 + 0.05 * s) * Math.sin(s * 7 + w * 2.4) + gauss(r) * (0.014 + 0.02 * s),
          ys,
          0.04 * Math.cos(s * 6 + w * 1.7) + gauss(r) * 0.014);
      }
      return a;
    },
    // Sugar falling as a loose column of grains. The flow keeps it falling, so
    // the column has to be the same width top to bottom — a particle keeps its
    // distance from the middle as it wraps round from the bottom to the top.
    stream: function (n, r) {
      var a = new Float32Array(n * 3);
      for (var i = 0; i < n; i++) {
        var t = r() * TAU, k = Math.abs(gauss(r)) * 0.13;
        put(a, i, Math.cos(t) * k, r() * 2 - 1, Math.sin(t) * k);
      }
      return a;
    },
    // Four ice cubes, each knocked to a different angle.
    cubes: function (n, r) {
      var a = new Float32Array(n * 3);
      var C = [[-0.42, -0.34, 0.12, 0.4], [0.4, -0.38, -0.14, 0.36], [-0.02, 0.36, 0.02, 0.38], [0.5, 0.42, 0.3, 0.26]];
      var c = parts(n, [4, 3.4, 3.6, 2]), i0 = 0;
      for (var k = 0; k < 4; k++) {
        cube(a, i0, c[k], C[k][0], C[k][1], C[k][2], C[k][3] / 2, rotor(r() * TAU, r() * TAU, r() * TAU), r);
        i0 += c[k];
      }
      return a;
    },
    // A tall glass of iced chai with cubes floating in it.
    glass: function (n, r) {
      var a = new Float32Array(n * 3);
      var c = parts(n, [42, 6, 5, 12, 35]), i = 0, k, R = 0.5, Y0 = -0.95, Y1 = 0.8, L = 0.42;
      for (k = 0; k < c[0]; k++, i++) { var t = r() * TAU, y = Y0 + r() * (Y1 - Y0); put(a, i, Math.cos(t) * R, y, Math.sin(t) * R); }
      for (k = 0; k < c[1]; k++, i++) { var tb = r() * TAU, rb = R * Math.sqrt(r()); put(a, i, Math.cos(tb) * rb, Y0, Math.sin(tb) * rb); }
      for (k = 0; k < c[2]; k++, i++) { var tr = r() * TAU; put(a, i, Math.cos(tr) * R, Y1 + gauss(r) * 0.01, Math.sin(tr) * R); }
      for (k = 0; k < c[3]; k++, i++) { var tl = r() * TAU, rl = R * 0.96 * Math.sqrt(r()); put(a, i, Math.cos(tl) * rl, L, Math.sin(tl) * rl); }
      var q = parts(c[4], [1, 1, 1]), P = [[-0.14, 0.32, 0.08], [0.16, 0.02, -0.1], [-0.08, -0.34, 0.12]];
      for (k = 0; k < 3; k++) {
        cube(a, i, q[k], P[k][0], P[k][1], P[k][2], 0.15, rotor(r() * TAU, r() * TAU, r() * TAU), r);
        i += q[k];
      }
      return a;
    },
    // The finish: a tick inside a ring, facing straight out.
    check: function (n, r) {
      var a = new Float32Array(n * 3), c = parts(n, [55, 45]), i = 0, k;
      for (k = 0; k < c[0]; k++, i++) {
        var t = r() * TAU, rad = 0.95 + gauss(r) * 0.028;
        put(a, i, Math.cos(t) * rad, Math.sin(t) * rad, gauss(r) * 0.03);
      }
      var A = [-0.42, 0.02], B = [-0.12, -0.3], C = [0.46, 0.34];
      var l1 = Math.hypot(B[0] - A[0], B[1] - A[1]), l2 = Math.hypot(C[0] - B[0], C[1] - B[1]);
      for (k = 0; k < c[1]; k++, i++) {
        var s = r() * (l1 + l2), P, Q, f;
        if (s < l1) { P = A; Q = B; f = s / l1; } else { P = B; Q = C; f = (s - l1) / l2; }
        put(a, i, P[0] + (Q[0] - P[0]) * f + gauss(r) * 0.026, P[1] + (Q[1] - P[1]) * f + gauss(r) * 0.026, gauss(r) * 0.03);
      }
      return a;
    }
  };

  /* ---------- what each step looks like ---------- */
  var PRESETS = {
    // brew guide — Boil, Blend, Rise, Strain
    boil:        { shape: 'sphere', color: '#F3E8D3', spin: 0.22, wobble: 0.016 },
    blend:       { shape: 'knot',   color: '#F2A93C', spin: 0.5 },
    rise:        { shape: 'rings',  color: '#FF7A66', spin: 0.3, wave: 0.075 },
    strain:      { shape: 'cup',    color: '#FFBA55', spin: 0.34 },
    // iced guide — Concentrate, Sweeten, Chill, Pour
    concentrate: { shape: 'solid',  color: '#F2A93C', spin: 0.3, wobble: 0.02 },
    sweeten:     { shape: 'stream', color: '#F3E8D3', spin: 0.12, flow: 0.34 },
    chill:       { shape: 'cubes',  color: '#FFFAF3', spin: 0.28 },
    pour:        { shape: 'glass',  color: '#FFBA55', spin: 0.3 },
    // the signup box
    idle:        { shape: 'sphere', color: '#F2A93C', spin: 0.25, wobble: 0.02 },
    sending:     { shape: 'knot',   color: '#FFBA55', spin: 1.5 },
    done:        { shape: 'check',  color: '#F2A93C', flat: true, wobble: 0.005 },
    error:       { shape: 'sphere', color: '#FF7A66', spin: 0.25, wobble: 0.03 }
  };
  var DEF = { spin: 0.35, wobble: 0.012, wave: 0, flow: 0, flat: false, scatter: 0.55 };
  function preset(name) {
    var p = PRESETS[name] || PRESETS.boil, o = {}, k;
    for (k in DEF) o[k] = DEF[k];
    for (k in p) o[k] = p[k];
    var h = parseInt(o.color.slice(1), 16);
    o.rgb = [(h >> 16 & 255) / 255, (h >> 8 & 255) / 255, (h & 255) / 255];
    o.tilt = o.flat ? 0 : 0.34;
    return o;
  }

  /* ---------- the stage ---------- */

  var VS = [
    'attribute vec3 aFrom; attribute vec3 aTo; attribute vec4 aSeed;',
    'uniform float uG, uTime, uAngle, uTilt, uAspect, uScale, uSize, uWobble, uWave, uFlowW, uFlowOff, uScatter, uAlpha;',
    'varying float vA;',
    'void main(){',
    '  float t = clamp((uG - 0.35 * aSeed.x) / 0.65, 0.0, 1.0);',
    '  t = t * t * (3.0 - 2.0 * t);',
    '  vec3 p = mix(aFrom, aTo, t) + aSeed.yzw * (sin(3.14159265 * t) * uScatter);',
    '  p += uWobble * vec3(sin(uTime * 1.3 + aSeed.y * 37.0), sin(uTime * 1.7 + aSeed.z * 41.0), sin(uTime * 1.1 + aSeed.w * 29.0));',
    '  p.y += uWave * sin(uTime * 2.6 - p.y * 2.4);',
    '  float a = uAlpha;',
    '  if (uFlowW > 0.0) {',
    '    float wy = mod(p.y + 1.0 - uFlowOff, 2.0) - 1.0;',
    '    p.y = mix(p.y, wy, uFlowW);',
    '    a *= mix(1.0, smoothstep(1.0, 0.72, abs(wy)), uFlowW);',
    '  }',
    '  float c = cos(uAngle), s = sin(uAngle);',
    '  p = vec3(c * p.x + s * p.z, p.y, -s * p.x + c * p.z);',
    '  float ct = cos(uTilt), st = sin(uTilt);',
    '  p = vec3(p.x, ct * p.y - st * p.z, st * p.y + ct * p.z);',
    '  float k = 3.0 / (3.4 - p.z);',
    '  gl_Position = vec4(p.x * k * uScale / uAspect, p.y * k * uScale, 0.0, 1.0);',
    '  gl_PointSize = uSize * k;',
    '  vA = a * (0.4 + 0.6 * clamp((p.z + 1.0) * 0.5, 0.0, 1.0));',
    '}'
  ].join('\n');
  var FS = [
    'precision mediump float;',
    'uniform vec3 uColor; varying float vA;',
    'void main(){',
    '  vec2 q = gl_PointCoord - 0.5; float r = dot(q, q);',
    '  if (r > 0.25) discard;',
    '  float f = vA * (1.0 - r * 4.0);',
    '  gl_FragColor = vec4(uColor * f, f);',
    '}'
  ].join('\n');

  function ease(t) { return t * t * (3 - 2 * t); }
  function lerp(a, b, t) { return a + (b - a) * t; }

  function Stage(canvas, names, opt) {
    opt = opt || {};
    this.canvas = canvas;
    this.names = names;
    this.presets = names.map(preset);
    this.opt = opt;
    this.dur = 1.5;
    this.cache = {};
    var w = canvas.clientWidth || 300, h = canvas.clientHeight || 300;
    var n = opt.count || Math.max(3000, Math.min(12000, Math.round(w * h / 11)));

    if (!this.initGL(n) && !this.init2D(Math.min(n, 2400))) { this.dead = true; return; }

    var r = rng(99);
    this.seed = new Float32Array(this.n * 4);
    var v = [0, 0, 0];
    for (var i = 0; i < this.n; i++) {
      dir(r, v);
      var m = 0.35 + 0.65 * r();
      this.seed.set([r(), v[0] * m, v[1] * m, v[2] * m], i * 4);
    }
    this.cur = this.prev = 0;
    this.g = 1;
    this.from = this.shape(0).slice();
    this.to = this.shape(0);
    this.angle = 0.6; this.time = 0; this.flowOff = 0; this.hold = 0;
    this.auto = opt.auto || 0;
    this.pinned = false;
    if (this.gl) this.upload(true);

    var self = this;
    this._frame = function (ts) { self.frame(ts); };
    this.resize();
    if (W.ResizeObserver) new ResizeObserver(function () { self.resize(); }).observe(canvas);
    else W.addEventListener('resize', function () { self.resize(); });
    if (W.IntersectionObserver) {
      new IntersectionObserver(function (es) {
        self.visible = es[es.length - 1].isIntersecting;
        self.wake();
      }, { rootMargin: '80px' }).observe(canvas);
    } else { this.visible = true; }
    d.addEventListener('visibilitychange', function () { self.wake(); });
    this.wake();
  }

  Stage.prototype.initGL = function (n) {
    var gl;
    try { gl = this.canvas.getContext('webgl', { alpha: true, antialias: false, premultipliedAlpha: true }); } catch (e) {}
    if (!gl) return false;
    function sh(type, src) {
      var s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
      return gl.getShaderParameter(s, gl.COMPILE_STATUS) ? s : null;
    }
    var vs = sh(gl.VERTEX_SHADER, VS), fs = sh(gl.FRAGMENT_SHADER, FS);
    if (!vs || !fs) return false;
    var pr = gl.createProgram();
    gl.attachShader(pr, vs); gl.attachShader(pr, fs); gl.linkProgram(pr);
    if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) return false;
    gl.useProgram(pr);
    this.gl = gl; this.pr = pr; this.n = n;
    this.u = {};
    var us = ['uG', 'uTime', 'uAngle', 'uTilt', 'uAspect', 'uScale', 'uSize', 'uWobble', 'uWave', 'uFlowW', 'uFlowOff', 'uScatter', 'uAlpha', 'uColor'];
    for (var i = 0; i < us.length; i++) this.u[us[i]] = gl.getUniformLocation(pr, us[i]);
    this.b = { aFrom: gl.createBuffer(), aTo: gl.createBuffer(), aSeed: gl.createBuffer() };
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE);
    var self = this;
    this.canvas.addEventListener('webglcontextlost', function (e) { e.preventDefault(); self.dead = true; });
    return true;
  };
  Stage.prototype.init2D = function (n) {
    var cx = this.canvas.getContext('2d');
    if (!cx) return false;
    this.cx = cx; this.n = n;
    return true;
  };

  Stage.prototype.shape = function (i) {
    var name = this.presets[i].shape;
    return this.cache[name] || (this.cache[name] = SHAPES[name](this.n, rng(hash(name))));
  };

  Stage.prototype.upload = function (first) {
    var gl = this.gl, pr = this.pr, self = this;
    function attr(name, data, size) {
      gl.bindBuffer(gl.ARRAY_BUFFER, self.b[name]);
      gl.bufferData(gl.ARRAY_BUFFER, data, first || name === 'aSeed' ? gl.STATIC_DRAW : gl.DYNAMIC_DRAW);
      var loc = gl.getAttribLocation(pr, name);
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, size, gl.FLOAT, false, 0, 0);
    }
    if (first) attr('aSeed', this.seed, 4);
    attr('aFrom', this.from, 3);
    attr('aTo', this.to, 3);
  };

  // Where particle i is right now, minus the wobble — so a new morph can start
  // from wherever the last one had got to.
  Stage.prototype.where = function (i, o) {
    var s = this.seed, t = Math.min(1, Math.max(0, (this.g - 0.35 * s[i * 4]) / 0.65));
    t = ease(t);
    var sc = Math.sin(Math.PI * t) * this.P().scatter, f = this.from, g = this.to, j = i * 3;
    o[0] = f[j] + (g[j] - f[j]) * t + s[i * 4 + 1] * sc;
    o[1] = f[j + 1] + (g[j + 1] - f[j + 1]) * t + s[i * 4 + 2] * sc;
    o[2] = f[j + 2] + (g[j + 2] - f[j + 2]) * t + s[i * 4 + 3] * sc;
    return o;
  };
  Stage.prototype.P = function () { return this.presets[this.cur]; };

  Stage.prototype.show = function (i, auto) {
    if (typeof i === 'string') i = this.names.indexOf(i);
    if (this.dead || i < 0 || i >= this.presets.length) return;
    if (!auto) this.pinned = true;
    if (i === this.cur && this.g >= 1) return;
    var now = new Float32Array(this.n * 3), o = [0, 0, 0];
    for (var k = 0; k < this.n; k++) { this.where(k, o); now[k * 3] = o[0]; now[k * 3 + 1] = o[1]; now[k * 3 + 2] = o[2]; }
    this.from = now;
    this.prev = this.cur;
    this.cur = i;
    this.to = this.shape(i);
    this.g = REDUCE ? 1 : 0;
    this.hold = 0;
    if (this.gl) this.upload(false);
    if (this.opt.onChange) this.opt.onChange(i);
    if (REDUCE) this.draw(); else this.wake();
  };

  Stage.prototype.resize = function () {
    var c = this.canvas, dpr = Math.min(2, W.devicePixelRatio || 1);
    var w = Math.max(1, Math.round(c.clientWidth * dpr)), h = Math.max(1, Math.round(c.clientHeight * dpr));
    if (c.width !== w || c.height !== h) { c.width = w; c.height = h; }
    this.dpr = dpr;
    this.draw();
  };

  Stage.prototype.wake = function () {
    var on = !this.dead && !REDUCE && this.visible && !d.hidden;
    if (on && !this.running) { this.running = true; this.last = 0; requestAnimationFrame(this._frame); }
    if (!on) this.running = false;
  };

  Stage.prototype.frame = function (ts) {
    if (!this.running || this.dead) { this.running = false; return; }
    // Motion steps are capped so a slow frame doesn't make particles jump; the
    // pause between shapes runs on the real clock, so a slow phone still moves on.
    var real = this.last ? Math.min(1, (ts - this.last) / 1000) : 0.016;
    var dt = Math.min(0.05, real);
    this.last = ts;
    this.time = (this.time + dt) % 1000;
    if (this.g < 1) {
      this.g = Math.min(1, this.g + dt / this.dur);
    } else if (this.auto && !this.pinned) {
      this.hold += real;
      if (this.hold >= this.auto) this.show((this.cur + 1) % this.presets.length, true);
    }
    var P = this.presets[this.prev], C = this.P(), e = ease(this.g);
    if (C.flat) {
      var target = Math.round(this.angle / TAU) * TAU;
      this.angle += (target - this.angle) * Math.min(1, dt * 2.4);
    } else {
      this.angle += lerp(P.spin, C.spin, e) * dt;
    }
    this.flowOff += lerp(P.flow, C.flow, e) * dt;
    this.draw();
    requestAnimationFrame(this._frame);
  };

  Stage.prototype.uniforms = function () {
    var P = this.presets[this.prev], C = this.P(), e = ease(this.g), c = this.canvas;
    var still = REDUCE ? 0 : 1;
    return {
      g: this.g,
      angle: REDUCE ? 0.6 * (C.flat ? 0 : 1) : this.angle,
      tilt: lerp(P.tilt, C.tilt, e),
      aspect: c.width / c.height,
      scale: this.opt.scale || 0.86,
      size: (this.opt.size || 1.9) * this.dpr,
      wobble: lerp(P.wobble, C.wobble, e) * still,
      wave: lerp(P.wave, C.wave, e) * still,
      flowW: lerp(P.flow ? 1 : 0, C.flow ? 1 : 0, e),
      scatter: C.scatter,
      alpha: (this.opt.alpha || 0.62) * Math.min(1, Math.max(0.68, 7000 / this.n)),
      color: [lerp(P.rgb[0], C.rgb[0], e), lerp(P.rgb[1], C.rgb[1], e), lerp(P.rgb[2], C.rgb[2], e)]
    };
  };

  Stage.prototype.draw = function () {
    if (this.dead) return;
    var U = this.uniforms();
    if (this.gl) {
      var gl = this.gl, u = this.u;
      gl.viewport(0, 0, this.canvas.width, this.canvas.height);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.uniform1f(u.uG, U.g); gl.uniform1f(u.uTime, this.time);
      gl.uniform1f(u.uAngle, U.angle); gl.uniform1f(u.uTilt, U.tilt);
      gl.uniform1f(u.uAspect, U.aspect); gl.uniform1f(u.uScale, U.scale);
      gl.uniform1f(u.uSize, U.size); gl.uniform1f(u.uWobble, U.wobble);
      gl.uniform1f(u.uWave, U.wave); gl.uniform1f(u.uFlowW, U.flowW);
      gl.uniform1f(u.uFlowOff, this.flowOff); gl.uniform1f(u.uScatter, U.scatter);
      gl.uniform1f(u.uAlpha, U.alpha); gl.uniform3fv(u.uColor, U.color);
      gl.drawArrays(gl.POINTS, 0, this.n);
      return;
    }
    // Canvas fallback: the same maths as the shader, on fewer points.
    var cx = this.cx, cw = this.canvas.width, ch = this.canvas.height, o = [0, 0, 0], s = this.seed;
    cx.clearRect(0, 0, cw, ch);
    cx.globalCompositeOperation = 'lighter';
    cx.fillStyle = 'rgb(' + U.color.map(function (v) { return Math.round(v * 255); }).join(',') + ')';
    var ca = Math.cos(U.angle), sa = Math.sin(U.angle), ct = Math.cos(U.tilt), st = Math.sin(U.tilt), T = this.time;
    for (var i = 0; i < this.n; i++) {
      this.where(i, o);
      var x = o[0] + U.wobble * Math.sin(T * 1.3 + s[i * 4 + 1] * 37);
      var y = o[1] + U.wobble * Math.sin(T * 1.7 + s[i * 4 + 2] * 41);
      var z = o[2] + U.wobble * Math.sin(T * 1.1 + s[i * 4 + 3] * 29);
      y += U.wave * Math.sin(T * 2.6 - y * 2.4);
      var a = U.alpha * 1.6;
      if (U.flowW > 0) {
        var wy = ((y + 1 - this.flowOff) % 2 + 2) % 2 - 1;
        y = lerp(y, wy, U.flowW);
        var edge = Math.min(1, Math.max(0, (1 - Math.abs(wy)) / 0.28));
        a *= lerp(1, edge * edge * (3 - 2 * edge), U.flowW);
      }
      var x1 = ca * x + sa * z, z1 = -sa * x + ca * z;
      var y2 = ct * y - st * z1, z2 = st * y + ct * z1;
      var k = 3 / (3.4 - z2);
      cx.globalAlpha = Math.min(1, a * (0.4 + 0.6 * Math.min(1, Math.max(0, (z2 + 1) / 2))));
      var px = (x1 * k * U.scale / U.aspect + 1) / 2 * cw, py = (1 - y2 * k * U.scale) / 2 * ch, sz = U.size * k;
      cx.fillRect(px - sz / 2, py - sz / 2, sz, sz);
    }
    cx.globalAlpha = 1;
  };

  /* ---------- wiring ---------- */

  function init(root) {
    var tabs = [].slice.call(root.querySelectorAll('[data-gc-ptab]'));
    var canvas = root.querySelector('canvas');
    if (!tabs.length || !canvas) return;
    var scope = (root.closest && root.closest('section')) || d;
    var cards = [].slice.call(scope.querySelectorAll('[data-gc-pcard]'));
    var names = tabs.map(function (t) { return (t.getAttribute('data-gc-ptab') || '').toLowerCase(); });
    root.hidden = false; // it needs a size before the stage can measure it
    var stage = new Stage(canvas, names, {
      auto: 2.6,
      onChange: function (i) {
        tabs.forEach(function (t, k) { t.setAttribute('aria-pressed', k === i ? 'true' : 'false'); });
        cards.forEach(function (c, k) { c.classList.toggle('is-on', k === i); });
      }
    });
    if (stage.dead) { root.hidden = true; return; }
    stage.opt.onChange(0);
    tabs.forEach(function (t, k) { t.addEventListener('click', function () { stage.show(k); }); });
    cards.forEach(function (c, k) { c.addEventListener('click', function () { stage.show(k); }); });
  }

  window.GCParticles = {
    // The signup box's light: idle, sending, done, error.
    status: function (canvas) {
      var s = new Stage(canvas, ['idle', 'sending', 'done', 'error'], { count: 3200, size: 1.5, scale: 0.8, alpha: 0.55 });
      return s.dead ? null : s;
    },
    stage: function (canvas, names, opt) {
      var s = new Stage(canvas, names, opt);
      return s.dead ? null : s;
    }
  };

  function boot() { [].forEach.call(d.querySelectorAll('[data-gc-particles]'), init); }
  if (d.readyState === 'loading') d.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
