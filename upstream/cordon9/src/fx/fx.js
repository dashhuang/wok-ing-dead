var QUAD = () => {
  const g2 = new InstancedBufferGeometry();
  g2.setAttribute("position", new BufferAttribute(new Float32Array([-1, -1, 0, 1, -1, 0, 1, 1, 0, -1, 1, 0]), 3));
  g2.setIndex([0, 1, 2, 0, 2, 3]);
  g2.boundingSphere = new Sphere(new Vector3(), 1e5);
  return g2;
};
var P_VERT = (
  /* glsl */
  `
attribute vec3 iPos, iVel; attribute vec4 iPar, iCol; varying vec2 vUv; varying vec4 vCol; varying float vSpr, vSeed;
void main(){ vec4 mv = viewMatrix * vec4(iPos, 1.0); vec2 c = position.xy; float s = iPar.x; vec2 off;
  if (iPar.w > 0.0) { vec2 d = (viewMatrix * vec4(iVel, 0.0)).xy; float l = length(d); d = l > 1e-5 ? d / l : vec2(0.0, 1.0); vec2 n = vec2(-d.y, d.x); off = d * c.y * s * (1.0 + iPar.w * l) + n * c.x * s; }
  else { float cr = cos(iPar.y), sr = sin(iPar.y); off = vec2(c.x * cr - c.y * sr, c.x * sr + c.y * cr) * s; }
  mv.xy += off; gl_Position = projectionMatrix * mv; vUv = position.xy * 0.5 + 0.5; vCol = iCol; vSpr = floor(iPar.z); vSeed = fract(iPar.z) * 8.0; }`
);
var P_FRAG = (add) => (
  /* glsl */
  `
uniform sampler2D tNoise; varying vec2 vUv; varying vec4 vCol; varying float vSpr, vSeed;
void main(){ vec2 p = vUv * 2.0 - 1.0; float r = length(p), a;
  if (vSpr < 0.5) { float n = textureLod(tNoise, vUv * 0.016 + vSeed * 0.71, 0.0).r, n2 = textureLod(tNoise, vUv * 0.034 + vSeed * 0.37, 0.0).b; a = smoothstep(1.0, 0.1, r + (n - 0.5) * 0.7) * (0.45 + 0.8 * n2); }
  else if (vSpr < 1.5) { a = exp(-p.x * p.x * 26.0) * smoothstep(1.0, 0.0, abs(p.y)); }
  else if (vSpr < 2.5) { a = smoothstep(1.0, 0.88, r); }
  else if (vSpr < 3.5) { vec2 q = abs(p); a = step(max(q.x, q.y * 1.7), 0.8); }
  else { float ang = atan(p.y, p.x); float n = textureLod(tNoise, vec2(ang * 0.0085 + vSeed, vSeed * 0.53), 0.0).r; a = smoothstep(0.3 + 0.7 * n * n, 0.0, r) + exp(-r * r * 20.0); }
  ${add ? "gl_FragColor = vec4(vCol.rgb * a * vCol.a, 1.0);" : "if (a * vCol.a < 0.01) discard; gl_FragColor = vec4(vCol.rgb, clamp(a * vCol.a, 0.0, 1.0));"} }`
);
var Particles = class {
  constructor(scene, cap2, add, tNoise, order) {
    this.cap = cap2;
    this.n = 0;
    this.g = QUAD();
    this.L = [];
    const mk = (name, sz) => {
      const a = new InstancedBufferAttribute(new Float32Array(cap2 * sz), sz);
      a.setUsage(DynamicDrawUsage);
      this.g.setAttribute(name, a);
      return a;
    };
    this.aPos = mk("iPos", 3);
    this.aVel = mk("iVel", 3);
    this.aPar = mk("iPar", 4);
    this.aCol = mk("iCol", 4);
    this.mat = new ShaderMaterial({ vertexShader: P_VERT, fragmentShader: P_FRAG(add), uniforms: { tNoise: { value: tNoise } }, transparent: true, depthWrite: false, blending: add ? AdditiveBlending : NormalBlending, toneMapped: false });
    this.mesh = new Mesh(this.g, this.mat);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = order;
    this.g.instanceCount = 0;
    scene.add(this.mesh);
  }
  // o: x,y,z, vx,vy,vz, life, size, grow, col [r,g,b], alpha, spr, stretch, grav, drag, rot, spin, fade (0 = linear out, 1 = in/out)
  emit(o) {
    if (this.L.length >= this.cap) this.L.shift();
    o.t = 0;
    o.rot = o.rot ?? Math.random() * 6.28;
    o.sd = Math.random();
    this.L.push(o);
  }
  update(dt) {
    const L = this.L, P3 = this.aPos.array, V = this.aVel.array, R4 = this.aPar.array, C2 = this.aCol.array;
    let n = 0;
    for (let i = 0; i < L.length; i++) {
      const p = L[i];
      p.t += dt;
      if (p.t >= p.life) continue;
      const dr = Math.exp(-(p.drag || 0) * dt);
      p.vx *= dr;
      p.vy = p.vy * dr - (p.grav || 0) * dt;
      p.vz *= dr;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.z += p.vz * dt;
      if (p.floor != null && p.y < p.floor) {
        p.y = p.floor;
        p.vy = -p.vy * 0.3;
        p.vx *= 0.5;
        p.vz *= 0.5;
      }
      p.rot += (p.spin || 0) * dt;
      const k = p.t / p.life, a = (p.alpha ?? 1) * (p.fade ? Math.min(1, k * 6) * (1 - k) * 1.2 : 1 - k * k);
      P3[n * 3] = p.x;
      P3[n * 3 + 1] = p.y;
      P3[n * 3 + 2] = p.z;
      V[n * 3] = p.vx;
      V[n * 3 + 1] = p.vy;
      V[n * 3 + 2] = p.vz;
      R4[n * 4] = p.size + (p.grow || 0) * p.t;
      R4[n * 4 + 1] = p.rot;
      R4[n * 4 + 2] = (p.spr || 0) + p.sd * 0.98;
      R4[n * 4 + 3] = p.stretch || 0;
      C2[n * 4] = p.col[0];
      C2[n * 4 + 1] = p.col[1];
      C2[n * 4 + 2] = p.col[2];
      C2[n * 4 + 3] = Math.max(0, a) * 0.999 + 0;
      L[n] = p;
      n++;
    }
    L.length = n;
    this.g.instanceCount = n;
    this.aPos.needsUpdate = this.aVel.needsUpdate = this.aPar.needsUpdate = this.aCol.needsUpdate = true;
  }
};
var RAIN_VERT = (
  /* glsl */
  `
attribute vec4 iSeed; uniform float uTime; uniform vec3 uBox, uCam, uWind; uniform vec3 uKeyPos[2], uKeyDir[2], uKeyCol[2]; uniform vec2 uKeyCone[2]; uniform vec3 uAmb; varying vec3 vCol; varying vec2 vUv;
void main(){ float sp = 9.0 + 5.0 * iSeed.w; vec3 vel = vec3(uWind.x, -sp, uWind.z);
  vec3 p = iSeed.xyz * uBox + vel * uTime; p = mod(p - uCam + uBox * 0.5, uBox) - uBox * 0.5 + uCam;
  p.y -= 500.0 * cxRoof(p);
  vec3 dir = normalize(vel), toC = normalize(uCam - p), side = normalize(cross(dir, toC));
  float len = 0.28 + 0.3 * iSeed.w, wd = 0.0045 + 0.004 * fract(iSeed.w * 7.0);
  vec3 wp = p + dir * position.y * len + side * position.x * wd;
  vec3 c = uAmb; for (int i = 0; i < 2; i++){ vec3 L = uKeyPos[i] - p; float d = length(L); L /= d; float sc = smoothstep(uKeyCone[i].x, uKeyCone[i].y, dot(-L, uKeyDir[i])); c += uKeyCol[i] * sc / (d * d) * (0.35 + 1.6 * pow(max(dot(toC, -L), 0.0), 6.0)); }
  vCol = c * (1.0 - smoothstep(9.0, 14.0, length(p - uCam))); vUv = position.xy; gl_Position = projectionMatrix * viewMatrix * vec4(wp, 1.0); }`
);
var RAIN_FRAG = (
  /* glsl */
  `varying vec3 vCol; varying vec2 vUv; void main(){ float a = (1.0 - vUv.x * vUv.x) * (1.0 - abs(vUv.y)); gl_FragColor = vec4(vCol * a, 1.0); }`
);
var SPL_VERT = (
  /* glsl */
  `
attribute vec4 iSeed; uniform float uTime; uniform vec3 uCam; uniform vec2 uBox; uniform vec3 uTint; varying float vA; varying vec2 vUv;
void main(){ float cyc = uTime * (1.6 + iSeed.w) + iSeed.z * 9.0, ph = fract(cyc), id = floor(cyc);
  vec2 h = fract(sin(vec2(id * 12.9898 + iSeed.x * 78.2, id * 39.3 + iSeed.y * 11.7)) * 43758.5); vec2 xz = (fract(iSeed.xy + h) - 0.5) * uBox; xz = mod(xz - uCam.xz + uBox * 0.5, uBox) - uBox * 0.5 + uCam.xz;
  float gy = cxSplashY(xz); vec4 mv = viewMatrix * vec4(xz.x, gy, xz.y, 1.0);
  float s = 0.02 + 0.05 * ph; mv.x += position.x * s * 1.3; mv.y += (position.y + 1.0) * s * (1.0 + 2.0 * (1.0 - ph)); vA = (1.0 - ph) * (1.0 - ph) * step(ph, 0.5) * 2.0; vUv = position.xy; gl_Position = projectionMatrix * mv; }`
);
var SPL_FRAG = (
  /* glsl */
  `uniform vec3 uTint; varying float vA; varying vec2 vUv; void main(){ float crown = smoothstep(0.35, 0.0, abs(abs(vUv.x) - 0.55 * (vUv.y * 0.5 + 0.5))) * (1.0 - vUv.y * 0.5 - 0.5) + exp(-dot(vUv, vUv) * 5.0) * 0.5; gl_FragColor = vec4(uTint * crown * vA, 1.0); }`
);
function createFx(G4, W, phys) {
  const R4 = G4.render, scene = R4.scene, q = G4.quality, low = q.name === "low";
  const alpha = new Particles(scene, low ? 300 : 700, false, R4.tNoise, 8), add = new Particles(scene, low ? 250 : 500, true, R4.tNoise, 9);
  const rnd = Math.random, rr = (a, b) => a + (b - a) * rnd(), v = new Vector3(), n = new Vector3(), t1 = new Vector3(), t2 = new Vector3(), m4 = new Matrix4(), qt = new Quaternion(), sc2 = new Vector3();
  const rainN = low ? 2500 : q.name === "medium" ? 5e3 : 8e3, rg = QUAD(), seeds = new Float32Array(rainN * 4);
  for (let i = 0; i < seeds.length; i++) seeds[i] = rnd();
  rg.setAttribute("iSeed", new InstancedBufferAttribute(seeds, 4));
  rg.instanceCount = rainN;
  const rainU = { uTime: { value: 0 }, uBox: { value: new Vector3(22, 14, 22) }, uCam: { value: new Vector3() }, uWind: { value: new Vector3(1.6, 0, 0.7) }, uKeyPos: { value: [new Vector3(), new Vector3()] }, uKeyDir: { value: [new Vector3(), new Vector3()] }, uKeyCol: { value: [new Vector3(), new Vector3()] }, uKeyCone: { value: [new Vector2(), new Vector2()] }, uAmb: { value: new Vector3(0.012, 0.014, 0.018) } };
  const rain = new Mesh(rg, new ShaderMaterial({ vertexShader: RAIN_VERT, fragmentShader: RAIN_FRAG, uniforms: rainU, transparent: true, depthWrite: false, blending: AdditiveBlending, toneMapped: false }));
  rain.frustumCulled = false;
  rain.renderOrder = 7;
  scene.add(rain);
  const sg = QUAD(), sN = low ? 250 : 700, ss11 = new Float32Array(sN * 4);
  for (let i = 0; i < ss11.length; i++) ss11[i] = rnd();
  sg.setAttribute("iSeed", new InstancedBufferAttribute(ss11, 4));
  sg.instanceCount = sN;
  const splU = { uTime: rainU.uTime, uCam: rainU.uCam, uBox: { value: new Vector2(26, 26) }, uTint: { value: new Vector3(0.05, 0.06, 0.075) } };
  const splash = new Mesh(sg, new ShaderMaterial({ vertexShader: SPL_VERT, fragmentShader: SPL_FRAG, uniforms: splU, transparent: true, depthWrite: false, blending: AdditiveBlending, toneMapped: false }));
  splash.frustumCulled = false;
  splash.renderOrder = 7;
  scene.add(splash);
  rain.material.vertexShader = W.fx.roofGLSL + RAIN_VERT;
  splash.material.vertexShader = W.fx.splashGLSL + SPL_VERT;
  const DN = low ? 90 : 220, dg = new BufferGeometry(), dpos = new Float32Array(DN * 12), duv = new Float32Array(DN * 8), dnor = new Float32Array(DN * 12), dix = [];
  for (let i = 0; i < DN; i++) dix.push(i * 4, i * 4 + 1, i * 4 + 2, i * 4, i * 4 + 2, i * 4 + 3);
  dg.setAttribute("position", new BufferAttribute(dpos, 3).setUsage(DynamicDrawUsage));
  dg.setAttribute("uv", new BufferAttribute(duv, 2).setUsage(DynamicDrawUsage));
  dg.setAttribute("normal", new BufferAttribute(dnor, 3).setUsage(DynamicDrawUsage));
  dg.setIndex(dix);
  dg.boundingSphere = new Sphere(new Vector3(), 1e5);
  const decals = new Mesh(dg, G4.wmats.mark);
  decals.frustumCulled = false;
  decals.renderOrder = 3;
  decals.receiveShadow = true;
  scene.add(decals);
  let di = 0;
  const MK = G4.watlas.marks;
  function decal(name, x, y, z, nx, ny, nz, size, rot2 = rnd() * 6.28, aspect2 = 1) {
    const r = MK.rect(name), i = di;
    di = (di + 1) % DN;
    n.set(nx, ny, nz);
    t1.set(Math.abs(ny) > 0.9 ? 1 : 0, Math.abs(ny) > 0.9 ? 0 : 1, 0).cross(n).normalize();
    t2.crossVectors(n, t1);
    const c = Math.cos(rot2), s = Math.sin(rot2), ax2 = t1.x * c + t2.x * s, ay = t1.y * c + t2.y * s, az = t1.z * c + t2.z * s, bx3 = t2.x * c - t1.x * s, by = t2.y * c - t1.y * s, bz = t2.z * c - t1.z * s, h = size / 2, hb = h / aspect2, o = 6e-3 + i % 5 * 6e-4;
    const C2 = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
    for (let k = 0; k < 4; k++) {
      const j = (i * 4 + k) * 3;
      dpos[j] = x + nx * o + ax2 * C2[k][0] * h + bx3 * C2[k][1] * hb;
      dpos[j + 1] = y + ny * o + ay * C2[k][0] * h + by * C2[k][1] * hb;
      dpos[j + 2] = z + nz * o + az * C2[k][0] * h + bz * C2[k][1] * hb;
      dnor[j] = nx;
      dnor[j + 1] = ny;
      dnor[j + 2] = nz;
      const u = (i * 4 + k) * 2;
      duv[u] = C2[k][0] > 0 ? r[2] : r[0];
      duv[u + 1] = C2[k][1] > 0 ? r[3] : r[1];
    }
    dg.attributes.position.needsUpdate = dg.attributes.uv.needsUpdate = dg.attributes.normal.needsUpdate = true;
    api.last = { name, x, y, z, nx, ny, nz, size };
    api.decals++;
  }
  const cgeo = lathe([[0, 0], [52e-4, 0], [57e-4, 8e-4], [57e-4, 22e-4], [48e-4, 26e-4], [48e-4, 34e-4], [57e-4, 38e-4], [56e-4, 0.03], [42e-4, 0.0345], [42e-4, 0.039], [36e-4, 0.039], [36e-4, 4e-3], [0, 4e-3]], 10, { axis: "z" });
  paint(cgeo, [1, 1, 1], { jit: 0.04 });
  const CN = 48, casings = new InstancedMesh(cgeo, G4.mats.surface("w-brass", "brass", { wet: 0.02, macro: 0.05, macroScale: 20 }), CN);
  casings.frustumCulled = false;
  casings.castShadow = false;
  casings.count = CN;
  scene.add(casings);
  const CS = [];
  for (let i = 0; i < CN; i++) {
    CS.push({ on: false, p: new Vector3(0, -50, 0), vel: new Vector3(), e: new Euler(), w: new Vector3(), s: 1, rest: 0 });
    m4.makeTranslation(0, -50, 0);
    casings.setMatrixAt(i, m4);
  }
  let ci = 0;
  function casing(pos, vel, scale = 1) {
    const c = CS[ci];
    ci = (ci + 1) % CN;
    c.on = true;
    c.p.copy(pos);
    c.vel.copy(vel);
    c.e.set(rnd() * 6, rnd() * 6, rnd() * 6);
    c.w.set(rr(-20, 20), rr(-30, 30), rr(-20, 20));
    c.s = scale;
    c.rest = 0;
    c.bounces = 0;
  }
  const SURF = {
    asphalt: { dust: [0.05, 0.05, 0.052], chip: [0.03, 0.03, 0.03], hole: "holeC", sparks: 1 },
    concrete: { dust: [0.16, 0.155, 0.145], chip: [0.2, 0.2, 0.19], hole: "holeC", sparks: 1 },
    brick: { dust: [0.16, 0.08, 0.055], chip: [0.2, 0.09, 0.06], hole: "holeC", sparks: 0 },
    metal: { dust: [0.08, 0.08, 0.08], chip: null, hole: "holeM", sparks: 7 },
    car: { dust: [0.07, 0.07, 0.07], chip: [0.3, 0.3, 0.3], hole: "holeM", sparks: 5 },
    wood: { dust: [0.14, 0.11, 0.07], chip: [0.3, 0.22, 0.12], hole: "holeC", sparks: 0 },
    glass: { dust: [0.2, 0.22, 0.24], chip: [0.5, 0.56, 0.6], hole: "holeG", sparks: 0, glint: 1 },
    plastic: { dust: [0.12, 0.12, 0.12], chip: [0.4, 0.2, 0.08], hole: "holeM", sparks: 0 },
    rubber: { dust: [0.03, 0.03, 0.03], chip: [0.02, 0.02, 0.02], hole: "holeM", sparks: 0 },
    cloth: { dust: [0.14, 0.14, 0.13], chip: [0.3, 0.3, 0.28], hole: null, sparks: 0 },
    sand: { dust: [0.2, 0.17, 0.11], chip: [0.26, 0.22, 0.14], hole: null, sparks: 0 },
    mesh: { dust: [0.08, 0.08, 0.08], chip: null, hole: null, sparks: 4 }
  };
  function impact(surface, x, y, z, nx, ny, nz, mark = true) {
    const S4 = SURF[surface] || SURF.concrete;
    for (let i = 0; i < 3; i++) alpha.emit({ x, y, z, vx: nx * rr(0.5, 2.2) + rr(-0.4, 0.4), vy: ny * rr(0.5, 2.2) + rr(0, 0.6), vz: nz * rr(0.5, 2.2) + rr(-0.4, 0.4), life: rr(0.5, 1.1), size: rr(0.05, 0.09), grow: rr(0.25, 0.5), col: S4.dust, alpha: 0.55, spr: 0, drag: 3.5, grav: -0.2, fade: 1, spin: rr(-1, 1) });
    if (S4.chip) for (let i = 0; i < 6; i++) alpha.emit({ x, y, z, vx: nx * rr(1, 4) + rr(-1.6, 1.6), vy: ny * rr(1, 4) + rr(0.5, 3), vz: nz * rr(1, 4) + rr(-1.6, 1.6), life: rr(0.4, 0.9), size: rr(6e-3, 0.016), col: S4.chip, alpha: 1, spr: 3, grav: 9.8, spin: rr(-20, 20), floor: W.fx.floor(x, z) });
    for (let i = 0; i < S4.sparks; i++) add.emit({ x, y, z, vx: nx * rr(2, 9) + rr(-4, 4), vy: ny * rr(2, 9) + rr(-1, 5), vz: nz * rr(2, 9) + rr(-4, 4), life: rr(0.12, 0.4), size: rr(6e-3, 0.012), col: [2.4, 1.3, 0.45], alpha: 1, spr: 1, stretch: 0.05, grav: 9.8, drag: 1 });
    if (S4.sparks) add.emit({ x, y, z, vx: 0, vy: 0, vz: 0, life: 0.06, size: 0.1, col: [1.6, 1, 0.5], alpha: 0.8, spr: 0 });
    if (S4.glint) for (let i = 0; i < 5; i++) add.emit({ x, y, z, vx: nx * rr(0.5, 3) + rr(-1.5, 1.5), vy: rr(0, 2.5), vz: nz * rr(0.5, 3) + rr(-1.5, 1.5), life: rr(0.3, 0.7), size: rr(6e-3, 0.014), col: [0.5, 0.6, 0.7], alpha: 1, spr: 3, grav: 9.8, spin: 30 });
    if (S4.hole && mark) decal(S4.hole + (S4.hole === "holeG" ? "" : rnd() < 0.5 ? 0 : 1), x, y, z, nx, ny, nz, S4.hole === "holeG" ? rr(0.16, 0.24) : S4.hole === "holeM" ? rr(0.05, 0.075) : rr(0.08, 0.13));
  }
  function blood(x, y, z, dx, dy, dz, amt = 1, head = false) {
    const c = [0.11, 6e-3, 5e-3], c2 = [0.06, 3e-3, 3e-3], k = head ? 1.6 : 1;
    for (let i = 0; i < 9 * amt * k; i++) alpha.emit({ x, y, z, vx: dx * rr(1.5, 5) + rr(-1.4, 1.4), vy: dy * rr(1.5, 5) + rr(-0.4, 2.2), vz: dz * rr(1.5, 5) + rr(-1.4, 1.4), life: rr(0.35, 0.8), size: rr(8e-3, 0.022), col: i % 2 ? c : c2, alpha: 1, spr: 2, stretch: 0.045, grav: 9.8, drag: 0.6, floor: 8e-3 });
    for (let i = 0; i < 3 * k; i++) alpha.emit({ x, y, z, vx: dx * rr(0.4, 1.6) + rr(-0.3, 0.3), vy: rr(0, 0.5), vz: dz * rr(0.4, 1.6) + rr(-0.3, 0.3), life: rr(0.3, 0.6), size: rr(0.06, 0.1), grow: 0.5, col: [0.09, 6e-3, 5e-3], alpha: 0.5, spr: 0, drag: 3, fade: 1 });
    for (let i = 0; i < 2; i++) alpha.emit({ x, y, z, vx: -dx * rr(0.5, 2) + rr(-0.8, 0.8), vy: rr(0.3, 1.8), vz: -dz * rr(0.5, 2) + rr(-0.8, 0.8), life: 0.5, size: rr(8e-3, 0.016), col: c, alpha: 1, spr: 2, stretch: 0.04, grav: 9.8, floor: 8e-3 });
    let bx3 = dx * 0.9 + rr(-0.1, 0.1), by = dy * 0.9 - 0.35, bz = dz * 0.9 + rr(-0.1, 0.1);
    const bl = Math.hypot(bx3, by, bz) || 1;
    bx3 /= bl;
    by /= bl;
    bz /= bl;
    const h = phys.raycast(x, y, z, bx3, by, bz, 3.2, "bullet");
    if (h) {
      let sx = h.x, sy = h.y, sz = h.z, snx = h.nx, sny = h.ny, snz = h.nz, ok = true;
      if (h.col && h.col.inst != null && api.refine) {
        const ex = api.refine(h.col, x, y, z, bx3, by, bz, h.t);
        if (ex) {
          sx = ex.x;
          sy = ex.y;
          sz = ex.z;
          snx = ex.nx;
          sny = ex.ny;
          snz = ex.nz;
        } else ok = false;
      }
      if (ok) decal("splat" + Math.floor(rnd() * 4), sx, sy, sz, snx, sny, snz, rr(0.35, 0.7) * (head ? 1.3 : 1) * Math.min(1.2, 0.6 + amt * 0.5));
    }
  }
  function pool(x, z, size = 1.2) {
    decal("pool" + (rnd() < 0.5 ? 0 : 1), x, phys.groundY(x, z), z, 0, 1, 0, size);
  }
  function muzzle(pos, dir, big = 1) {
    const at = (k) => ({ x: pos.x + dir.x * k, y: pos.y + dir.y * k, z: pos.z + dir.z * k });
    t1.set(dir.z, 0, -dir.x);
    if (t1.lengthSq() < 1e-6) t1.set(1, 0, 0);
    t1.normalize();
    t2.crossVectors(t1, dir).normalize();
    add.emit({ ...at(0.06), vx: dir.x * 2, vy: dir.y * 2, vz: dir.z * 2, life: 0.05, size: 0.17 * big, col: [15, 8.5, 3], alpha: 1, spr: 4 });
    add.emit({ ...at(0.1), vx: dir.x, vy: dir.y, vz: dir.z, life: 0.07, size: 0.36 * big, col: [1.6, 0.75, 0.22], alpha: 0.9, spr: 0, fade: 0 });
    add.emit({ ...at(0.2), vx: dir.x * 8, vy: dir.y * 8, vz: dir.z * 8, life: 0.04, size: 0.06 * big, col: [3.4, 1.8, 0.6], alpha: 1, spr: 1, stretch: 0.22 });
    const jets = [[1, 0.25], [-1, 0.25], [0.35, 1], [-0.35, 1]];
    for (const [a, b] of jets) {
      const k = rr(9, 15) * big;
      add.emit({ ...at(0.03), vx: (t1.x * a + t2.x * b) * k + dir.x * 4, vy: (t1.y * a + t2.y * b) * k + dir.y * 4, vz: (t1.z * a + t2.z * b) * k + dir.z * 4, life: rr(0.03, 0.05), size: 0.034 * big, col: [9, 5, 1.7], alpha: 1, spr: 1, stretch: 0.24 });
    }
    for (let i = 0; i < 5; i++) add.emit({ x: pos.x, y: pos.y, z: pos.z, vx: dir.x * rr(8, 20) + rr(-4, 4), vy: dir.y * rr(8, 20) + rr(-3, 4), vz: dir.z * rr(8, 20) + rr(-4, 4), life: rr(0.06, 0.16), size: 5e-3, col: [2.6, 1.5, 0.5], alpha: 1, spr: 1, stretch: 0.03, drag: 4 });
    for (let i = 0; i < 2; i++) alpha.emit({ ...at(0.1), vx: dir.x * rr(0.8, 2) + rr(-0.2, 0.2), vy: dir.y * rr(0.8, 2) + rr(0.1, 0.5), vz: dir.z * rr(0.8, 2) + rr(-0.2, 0.2), life: rr(0.5, 1), size: 0.03, grow: rr(0.2, 0.4), col: [0.11, 0.11, 0.115], alpha: 0.32, spr: 0, drag: 2.5, fade: 1 });
  }
  const TN = 20, tgeo = new BufferGeometry(), tpos = new Float32Array(TN * 12), tuv = new Float32Array(TN * 8), tk = new Float32Array(TN * 4), tix = [];
  for (let i = 0; i < TN; i++) {
    tix.push(i * 4, i * 4 + 1, i * 4 + 2, i * 4, i * 4 + 2, i * 4 + 3);
    tuv.set([-1, 0, 1, 0, 1, 1, -1, 1], i * 8);
  }
  tgeo.setAttribute("position", new BufferAttribute(tpos, 3).setUsage(DynamicDrawUsage));
  tgeo.setAttribute("uv", new BufferAttribute(tuv, 2));
  tgeo.setAttribute("aK", new BufferAttribute(tk, 1).setUsage(DynamicDrawUsage));
  tgeo.setIndex(tix);
  tgeo.boundingSphere = new Sphere(new Vector3(), 1e5);
  const tracers = new Mesh(tgeo, new ShaderMaterial({
    vertexShader: "attribute float aK; varying vec2 vUv; varying float vK; void main(){ vUv = uv; vK = aK; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
    fragmentShader: "varying vec2 vUv; varying float vK; void main(){ float a = exp(-vUv.x * vUv.x * 6.0) * pow(vUv.y, 1.6) * vK; gl_FragColor = vec4(vec3(3.2, 2.0, 0.85) * a + vec3(2.0) * a * exp(-vUv.x * vUv.x * 40.0) * vUv.y, 1.0); }",
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
    toneMapped: false,
    side: DoubleSide
  }));
  tracers.frustumCulled = false;
  tracers.renderOrder = 9;
  scene.add(tracers);
  const TR = [];
  for (let i = 0; i < TN; i++) TR.push({ on: false, o: new Vector3(), d: new Vector3(), len: 0, t: 0 });
  let ti = 0;
  const TSP = 170, TTAIL = 7, hd = new Vector3(), tl = new Vector3(), sd = new Vector3();
  function tracer(from, to) {
    v.subVectors(to, from);
    const d = v.length();
    if (d < 3) return;
    const T3 = TR[ti];
    ti = (ti + 1) % TN;
    T3.on = true;
    T3.o.copy(from);
    T3.d.copy(v).multiplyScalar(1 / d);
    T3.len = d;
    T3.t = 0;
  }
  function updTracers(dt, cam) {
    for (let i = 0; i < TN; i++) {
      const T3 = TR[i], j = i * 12;
      let k = 0;
      if (T3.on) {
        const h = Math.min(T3.len, 0.9 + T3.t * TSP), tt = Math.max(0.6, 0.9 + T3.t * TSP - TTAIL);
        T3.t += dt;
        if (tt >= T3.len) T3.on = false;
        else {
          hd.copy(T3.o).addScaledVector(T3.d, h);
          tl.copy(T3.o).addScaledVector(T3.d, tt);
          sd.subVectors(cam, hd).cross(T3.d);
          if (sd.lengthSq() < 1e-8) sd.set(0, 1, 0);
          sd.normalize();
          const wh = 7e-3 + 16e-4 * cam.distanceTo(hd), wt = 5e-3 + 12e-4 * cam.distanceTo(tl);
          k = 1;
          tpos[j] = tl.x - sd.x * wt;
          tpos[j + 1] = tl.y - sd.y * wt;
          tpos[j + 2] = tl.z - sd.z * wt;
          tpos[j + 3] = tl.x + sd.x * wt;
          tpos[j + 4] = tl.y + sd.y * wt;
          tpos[j + 5] = tl.z + sd.z * wt;
          tpos[j + 6] = hd.x + sd.x * wh;
          tpos[j + 7] = hd.y + sd.y * wh;
          tpos[j + 8] = hd.z + sd.z * wh;
          tpos[j + 9] = hd.x - sd.x * wh;
          tpos[j + 10] = hd.y - sd.y * wh;
          tpos[j + 11] = hd.z - sd.z * wh;
        }
      }
      if (!k) for (let q2 = 0; q2 < 12; q2++) tpos[j + q2] = 0;
      tk[i * 4] = tk[i * 4 + 1] = tk[i * 4 + 2] = tk[i * 4 + 3] = k;
    }
    tgeo.attributes.position.needsUpdate = tgeo.attributes.aK.needsUpdate = true;
  }
  let fireT = 0;
  function update(dt, t, cam) {
    rainU.uTime.value = t;
    rainU.uCam.value.copy(cam);
    for (let i = 0; i < 2; i++) {
      const L = R4.keys[i];
      rainU.uKeyPos.value[i].setFromMatrixPosition(L.matrixWorld);
      v.setFromMatrixPosition(L.target.matrixWorld).sub(rainU.uKeyPos.value[i]).normalize();
      rainU.uKeyDir.value[i].copy(v);
      rainU.uKeyCol.value[i].set(L.color.r, L.color.g, L.color.b).multiplyScalar(L.intensity * 0.012);
      rainU.uKeyCone.value[i].set(Math.cos(L.angle), Math.cos(L.angle * (1 - L.penumbra)));
    }
    fireT += dt;
    while (fireT > 0.035) {
      fireT -= 0.035;
      for (const f3 of W.fires) {
        if (cam.distanceToSquared(v.set(f3[0], f3[1], f3[2])) > 900) continue;
        add.emit({ x: f3[0] + rr(-0.14, 0.14), y: f3[1] - 0.15, z: f3[2] + rr(-0.14, 0.14), vx: rr(-0.15, 0.15), vy: rr(0.9, 2), vz: rr(-0.15, 0.15), life: rr(0.35, 0.7), size: rr(0.12, 0.2), grow: -0.14, col: [1.5, 0.55, 0.12], alpha: 0.7, spr: 0, fade: 1, spin: rr(-2, 2) });
        if (rnd() < 0.25) add.emit({ x: f3[0] + rr(-0.1, 0.1), y: f3[1], z: f3[2] + rr(-0.1, 0.1), vx: rr(-0.5, 0.5), vy: rr(1.5, 3.2), vz: rr(-0.5, 0.5), life: rr(0.6, 1.4), size: 6e-3, col: [2.2, 0.9, 0.2], alpha: 1, spr: 2, drag: 0.6, grav: -0.6 });
        if (rnd() < 0.3) alpha.emit({ x: f3[0], y: f3[1] + 0.5, z: f3[2], vx: rr(0.1, 0.5), vy: rr(0.8, 1.4), vz: rr(0, 0.3), life: rr(1.5, 2.6), size: 0.14, grow: 0.3, col: [0.03, 0.03, 0.03], alpha: 0.3, spr: 0, fade: 1, drag: 0.3 });
      }
    }
    alpha.update(dt);
    add.update(dt);
    updTracers(dt, cam);
    for (let i = 0; i < CN; i++) {
      const c = CS[i];
      if (!c.on) continue;
      if (c.rest < 0.2) {
        c.vel.y -= 9.8 * dt;
        c.p.addScaledVector(c.vel, dt);
        c.e.x += c.w.x * dt;
        c.e.y += c.w.y * dt;
        c.e.z += c.w.z * dt;
        const gy = phys.groundY(c.p.x, c.p.z) + 6e-3;
        if (c.p.y < gy) {
          c.p.y = gy;
          if (c.bounces === 0 && api.onCasing) api.onCasing(c.p);
          c.bounces++;
          c.vel.y = -c.vel.y * 0.38;
          c.vel.x *= 0.55;
          c.vel.z *= 0.55;
          c.w.multiplyScalar(0.5);
          if (Math.abs(c.vel.y) < 0.5) {
            c.rest += 0.1;
            c.vel.y = 0;
            c.e.x = Math.PI / 2 * Math.round(c.e.x / (Math.PI / 2));
            c.e.z = 0;
          }
        }
      }
      qt.setFromEuler(c.e);
      m4.compose(c.p, qt, sc2.setScalar(c.s));
      casings.setMatrixAt(i, m4);
    }
    casings.instanceMatrix.needsUpdate = true;
    updMags(dt);
  }
  const MAGS = { rifle: [], pistol: [] }, magI = { rifle: 0, pistol: 0 }, qy = new Quaternion(), qf = new Quaternion(), ax = new Vector3();
  function magProto(kind, group, mid, n2 = 3) {
    for (let i = 0; i < n2; i++) {
      const h = new Group(), body = group.clone(true);
      body.position.copy(mid).multiplyScalar(-1);
      body.quaternion.identity();
      body.visible = true;
      body.traverse((o) => {
        o.layers.set(0);
        o.frustumCulled = false;
        o.castShadow = false;
        o.receiveShadow = true;
        o.visible = true;
      });
      h.add(body);
      h.visible = false;
      scene.add(h);
      MAGS[kind].push({ h, on: false, vel: new Vector3(), w: new Vector3(), k: 1, hits: 0, rest: 0, half: Math.max(8e-3, mid.size ? mid.size.x * 0.5 : 0.012), qr: new Quaternion() });
    }
  }
  function dropMag(kind, pos, quat, vel, k = 1) {
    const L = MAGS[kind];
    if (!L.length) return null;
    const M = L[magI[kind]];
    magI[kind] = (magI[kind] + 1) % L.length;
    M.on = true;
    M.h.visible = true;
    M.h.position.copy(pos);
    M.h.quaternion.copy(quat);
    M.vel.copy(vel);
    M.w.set(rr(-5, 5), rr(-3, 3), rr(-7, 7));
    M.k = k;
    M.hits = 0;
    M.rest = 0;
    M.h.scale.setScalar(k);
    api.mags++;
    return M;
  }
  function splashAt(x, y, z) {
    for (let i = 0; i < 6; i++) alpha.emit({ x, y: y + 0.01, z, vx: rr(-1.1, 1.1), vy: rr(0.6, 1.9), vz: rr(-1.1, 1.1), life: rr(0.2, 0.42), size: rr(5e-3, 0.011), col: [0.34, 0.37, 0.4], alpha: 0.7, spr: 2, stretch: 0.04, grav: 9.8, floor: y + 4e-3 });
    alpha.emit({ x, y: y + 0.03, z, vx: 0, vy: 0.25, vz: 0, life: 0.4, size: 0.05, grow: 0.3, col: [0.2, 0.22, 0.24], alpha: 0.18, spr: 0, fade: 1, drag: 2 });
  }
  function updMags(dt) {
    for (const kind in MAGS) for (const M of MAGS[kind]) {
      if (!M.on || M.rest >= 1) continue;
      const h = M.h;
      M.k += (1 - M.k) * Math.min(1, dt * 9);
      h.scale.setScalar(M.k);
      if (M.rest > 0) {
        M.rest = Math.min(1, M.rest + dt * 7);
        h.quaternion.slerp(M.qr, Math.min(1, dt * 16));
        if (M.rest >= 1) h.quaternion.copy(M.qr);
        continue;
      }
      M.vel.y -= 9.8 * dt;
      h.position.addScaledVector(M.vel, dt);
      const wl = M.w.length();
      if (wl > 1e-4) {
        qy.setFromAxisAngle(ax.copy(M.w).multiplyScalar(1 / wl), wl * dt);
        h.quaternion.premultiply(qy);
      }
      const gy = phys.groundY(h.position.x, h.position.z) + M.half;
      if (h.position.y < gy) {
        h.position.y = gy;
        if (api.onMagHit) api.onMagHit(kind, h.position, M.hits);
        M.hits++;
        const vy = -M.vel.y * 0.3;
        M.vel.set(M.vel.x * 0.32, vy, M.vel.z * 0.32);
        M.w.multiplyScalar(0.45);
        M.w.x += rr(-4, 4);
        M.w.z += rr(-4, 4);
        if (M.hits === 1) splashAt(h.position.x, gy - M.half, h.position.z);
        if (vy < 0.55 || M.hits >= 3) {
          M.vel.set(0, 0, 0);
          M.rest = 0.01;
          ax.set(0, 0, 1).applyQuaternion(h.quaternion);
          const yaw = Math.atan2(ax.x, ax.z);
          ax.set(1, 0, 0).applyQuaternion(h.quaternion);
          qy.setFromAxisAngle(v.set(0, 1, 0), yaw);
          qf.setFromAxisAngle(v.set(0, 0, 1), ax.y >= 0 ? Math.PI / 2 : -Math.PI / 2);
          M.qr.copy(qy).multiply(qf);
        }
      }
    }
  }
  const api = { refine: null, last: null, decals: 0, mags: 0, magProto, dropMag, MAGS, onMagHit: null, impact, blood, pool, decal, muzzle, tracer, casing, update, alpha, add, rain, splash, onCasing: null, setRain(k) {
    rain.visible = splash.visible = k > 0;
  }, clear() {
    alpha.L.length = 0;
    add.L.length = 0;
    for (const T3 of TR) T3.on = false;
    for (let i = 0; i < DN * 12; i++) dpos[i] = 0;
    dg.attributes.position.needsUpdate = true;
    for (const c of CS) {
      c.on = false;
      c.p.set(0, -50, 0);
    }
    for (const kind in MAGS) for (const M of MAGS[kind]) {
      M.on = false;
      M.h.visible = false;
    }
  } };
  return api;
}

