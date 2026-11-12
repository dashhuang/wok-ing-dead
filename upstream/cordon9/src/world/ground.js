var ROAD = { hw: 6, kerb: 0.3, walk: 3.3, walkY: 0.15, z0: -64, z1: 64, mark: { x0: -6, x1: 6, z0: -32, z1: 32, ppm: 64 }, mask: { x0: -8, x1: 8, z0: -32, z1: 32, w: 256, h: 1024 } };
function buildMask(spec) {
  const { w, h, x0, x1, z0, z1 } = ROAD.mask, data = new Uint8Array(w * h * 4), g2 = (d, s) => Math.exp(-(d * d) / (s * s));
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    const x = x0 + (i + 0.5) / w * (x1 - x0), z = z0 + (j + 0.5) / h * (z1 - z0), ax = Math.abs(x);
    let water = 0.2 + 0.5 * fbm(x * 0.16 + 3.1, z * 0.16, 1.7, 4) + 0.22 * g2(ax - 5.5, 0.55) - 0.12 * g2(x, 2);
    for (const [px2, pz2, r, a] of spec.puddles) water += a * g2(Math.hypot(x - px2, z - pz2), r);
    let wear2 = 0.5 + 0.3 * (g2(ax - 1.5, 0.45) + g2(ax - 3.9, 0.45)) - 0.2 * g2(ax - 5.6, 0.5) + 0.25 * (fbm(x * 0.9, z * 0.25, 4.2, 3) - 0.5);
    let oil = 0;
    for (const [px2, pz2, r, a] of spec.oil) oil += a * g2(Math.hypot(x - px2, z - pz2), r) * (0.6 + 0.8 * fbm(x * 2.3, z * 2.3, 7.7, 3));
    let patch = 0;
    for (const [px2, pz2, hx, hz, rot2] of spec.patches) {
      const c = Math.cos(rot2), s = Math.sin(rot2), dx = (x - px2) * c + (z - pz2) * s, dz = -(x - px2) * s + (z - pz2) * c, d = Math.max(Math.abs(dx) - hx, Math.abs(dz) - hz);
      patch = Math.max(patch, clamp2(0.5 - d / 0.12));
    }
    const o = (j * w + i) * 4;
    data[o] = clamp2(water) * 255;
    data[o + 1] = clamp2(wear2) * 255;
    data[o + 2] = clamp2(oil) * 255;
    data[o + 3] = clamp2(patch) * 255;
  }
  const t = new DataTexture(data, w, h, RGBAFormat);
  t.magFilter = t.minFilter = LinearFilter;
  t.wrapS = t.wrapT = ClampToEdgeWrapping;
  t.needsUpdate = true;
  return t;
}
function buildMarkings(spec) {
  const { x0, x1, z0, z1, ppm } = ROAD.mark, W = Math.round((x1 - x0) * ppm), Hh = Math.round((z1 - z0) * ppm), cv = document.createElement("canvas");
  cv.width = W;
  cv.height = Hh;
  const c = cv.getContext("2d"), r = rng(77);
  const X = (x) => (x - x0) * ppm, Z = (z) => (z - z0) * ppm, WHITE = "#d8d6cc", YEL2 = "#d2a51c", ORA = "#d9641a";
  const line = (xa, za, xb, zb, wd, col, dash = null) => {
    c.strokeStyle = col;
    c.lineWidth = wd * ppm;
    c.setLineDash(dash ? dash.map((d) => d * ppm) : []);
    c.beginPath();
    c.moveTo(X(xa), Z(za));
    c.lineTo(X(xb), Z(zb));
    c.stroke();
    c.setLineDash([]);
  };
  const rect2 = (xa, za, xb, zb, col) => {
    c.fillStyle = col;
    c.fillRect(X(xa), Z(za), (xb - xa) * ppm, (zb - za) * ppm);
  };
  const text = (s, x, z, hgt, col, rot2 = 0, stretch = 2.6) => {
    c.save();
    c.translate(X(x), Z(z));
    c.rotate(rot2);
    c.scale(1, stretch);
    c.fillStyle = col;
    c.font = `bold ${hgt * ppm / stretch}px Arial, Helvetica, sans-serif`;
    c.textAlign = "center";
    c.textBaseline = "middle";
    c.fillText(s, 0, 0);
    c.restore();
  };
  for (const [a, b] of [[-32, -7], [7, 32]]) {
    line(-0.09, a, -0.09, b, 0.1, YEL2);
    line(0.09, a, 0.09, b, 0.1, YEL2);
    for (const s of [-1, 1]) {
      line(s * 5.45, a, s * 5.45, b, 0.12, WHITE);
      line(s * 3, a, s * 3, b, 0.1, WHITE, [2, 3]);
    }
  }
  rect2(-5.4, -7.4, -0.3, -6.95, WHITE);
  rect2(0.3, 6.95, 5.4, 7.4, WHITE);
  text("STOP", -2.9, -9.6, 2.6, WHITE, PI_);
  text("STOP", 2.9, 9.6, 2.6, WHITE, 0);
  c.save();
  c.beginPath();
  c.rect(X(-5.4), Z(-6.4), 10.8 * ppm, 12.8 * ppm);
  c.clip();
  c.strokeStyle = YEL2;
  c.lineWidth = 0.1 * ppm;
  for (let k = -30; k < 30; k++) {
    c.beginPath();
    c.moveTo(X(-5.4 + k * 1.4), Z(-6.4));
    c.lineTo(X(-5.4 + k * 1.4 + 12.8), Z(6.4));
    c.stroke();
    c.beginPath();
    c.moveTo(X(-5.4 + k * 1.4), Z(6.4));
    c.lineTo(X(-5.4 + k * 1.4 + 12.8), Z(-6.4));
    c.stroke();
  }
  c.restore();
  c.strokeStyle = YEL2;
  c.lineWidth = 0.14 * ppm;
  c.strokeRect(X(-5.4), Z(-6.4), 10.8 * ppm, 12.8 * ppm);
  for (let k = 0; k < 10; k++) rect2(-5.3 + k * 1.1, -20.6, -5.3 + k * 1.1 + 0.6, -17.8, WHITE);
  const arrow2 = (x, z, dir) => {
    c.save();
    c.translate(X(x), Z(z));
    c.scale(1, dir);
    c.fillStyle = WHITE;
    c.beginPath();
    c.moveTo(0, -1.9 * ppm);
    c.lineTo(0.55 * ppm, -0.5 * ppm);
    c.lineTo(0.16 * ppm, -0.5 * ppm);
    c.lineTo(0.16 * ppm, 1.9 * ppm);
    c.lineTo(-0.16 * ppm, 1.9 * ppm);
    c.lineTo(-0.16 * ppm, -0.5 * ppm);
    c.lineTo(-0.55 * ppm, -0.5 * ppm);
    c.closePath();
    c.fill();
    c.restore();
  };
  arrow2(-1.5, -14.5, -1);
  arrow2(-4.3, -14.5, -1);
  arrow2(1.5, 14.5, 1);
  arrow2(4.3, 14.5, 1);
  arrow2(1.5, -26, 1);
  arrow2(-1.5, 26, -1);
  for (let k = 0; k < 4; k++) {
    line(-5.4, -17 + k * 0 + 12.6 + k * 2.3, -3.4, -17 + 12.6 + k * 2.3, 0.1, WHITE);
  }
  line(-3.4, -4.4, -3.4, 2.5, 0.1, WHITE, [0.6, 0.6]);
  c.strokeStyle = YEL2;
  c.lineWidth = 0.12 * ppm;
  c.setLineDash([0.9 * ppm, 0.5 * ppm]);
  c.strokeRect(X(3.2), Z(12.2), 2.2 * ppm, 7.6 * ppm);
  c.setLineDash([]);
  text("BUS", 4.3, 14.4, 1.6, YEL2, 0, 2.2);
  text("STOP", 4.3, 17.4, 1.6, YEL2, 0, 2.2);
  c.lineCap = "round";
  const spray = (pts, col, wd = 0.09) => {
    c.strokeStyle = col;
    c.lineWidth = wd * ppm;
    c.shadowColor = col;
    c.shadowBlur = 0.05 * ppm;
    c.beginPath();
    pts.forEach(([x, z], i) => i ? c.lineTo(X(x + (r() - 0.5) * 0.04), Z(z + (r() - 0.5) * 0.04)) : c.moveTo(X(x), Z(z)));
    c.stroke();
    c.shadowBlur = 0;
  };
  spray([[-0.8, 8.4], [-2.2, 8], [-1.9, 7.5]], ORA);
  spray([[-2.2, 8], [-1.8, 8.5]], ORA);
  text("DECON", -1.3, 9.3, 0.7, ORA, -0.1, 1.2);
  text("LANE 1", 2.6, 4.6, 0.6, ORA, 0.04, 1.2);
  spray([[1.2, 3.9], [4.2, 4.05]], ORA, 0.07);
  for (const [x, z] of spec.xmarks) {
    spray([[x - 0.5, z - 0.5], [x + 0.5, z + 0.5]], ORA);
    spray([[x - 0.5, z + 0.5], [x + 0.5, z - 0.5]], ORA);
  }
  c.globalAlpha = 0.5;
  for (const [xa, za, xb, zb] of spec.skids) for (const o of [-0.75, 0.75]) {
    const nx = -(zb - za), nz = xb - xa, l = Math.hypot(nx, nz);
    c.strokeStyle = "#0c0c0c";
    c.lineWidth = 0.19 * ppm;
    c.beginPath();
    c.moveTo(X(xa + nx / l * o), Z(za + nz / l * o));
    c.quadraticCurveTo(X((xa + xb) / 2 + nx / l * (o + 0.4)), Z((za + zb) / 2 + nz / l * (o + 0.4)), X(xb + nx / l * o), Z(zb + nz / l * o));
    c.stroke();
  }
  c.globalAlpha = 1;
  const t = new CanvasTexture(cv);
  t.colorSpace = SRGBColorSpace;
  t.anisotropy = 8;
  t.wrapS = t.wrapT = ClampToEdgeWrapping;
  t.generateMipmaps = true;
  t.minFilter = LinearMipmapLinearFilter;
  return t;
}
var PI_ = Math.PI;
var G_FRAG_COMMON = (
  /* glsl */
  `
uniform sampler2D tGMask, tGMark, tGRefl; uniform vec4 uGMaskR, uGMarkR; uniform mat4 uGReflM; uniform vec4 uGRain; // rain: amount, time, planar on, -
uniform vec4 uGLook; // look knobs: roughness multiplier on soaked stone, added water level, reflection gain, -
float gPud = 0.0, gDamp = 0.0, gOil = 0.0, gTar = 0.0; vec2 gRip = vec2(0.0);
vec3 gHash(vec2 p){ return textureLod(tCxNoise, (p + 0.5) / 256.0, 0.0).rgb; }
// expanding rain rings: one drop per cell per cycle, thin crest that fades as it grows. Returns the surface slope.
vec2 gRings(vec2 p, float t){ vec2 acc = vec2(0.0);
  for (int k = 0; k < 2; k++){ float fk = float(k); vec2 q = p * (5.0 + fk * 3.3) + fk * 17.3; vec2 id = floor(q), f = fract(q); vec3 h = gHash(id + fk * 31.0);
    float ph = fract(t * (0.75 + 0.5 * h.z) + h.x * 7.0); vec2 c = 0.25 + 0.5 * gHash(id + floor(t * (0.75 + 0.5 * h.z) + h.x * 7.0) * 13.0 + 5.0).xy; vec2 d = f - c; float r = length(d), R = ph * 0.42;
    float w = (r - R) / 0.035; acc += (d / max(r, 1e-3)) * sin(w * 3.1416) * exp(-w * w) * (1.0 - ph) * (1.0 - ph); }
  return acc; }
`
);
var G_FRAG_MAP = (
  /* glsl */
  `
{
  vec2 gp = vCxWp.xz; vec4 gm = texture2D(tGMask, (gp - uGMaskR.xy) * uGMaskR.zw);
  float n1 = cxN3(vec3(gp * 0.9, 0.3)), n2 = cxN3(vec3(gp * 5.5, 1.7)), n3 = cxN3(vec3(gp * 37.0, 4.1));
  // repair patches: newer, darker, tighter stone; tar seal band around the cut
  float pk = smoothstep(0.42, 0.5, gm.a + (n2 - 0.5) * 0.06); gTar = smoothstep(0.24, 0.34, gm.a + (n2 - 0.5) * 0.1) * (1.0 - smoothstep(0.5, 0.6, gm.a + (n2 - 0.5) * 0.1));
  diffuseColor.rgb *= mix(1.0, 0.7, pk); diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.012), gTar * 0.9);
  // sealed crack lines wandering along the carriageway
  float cr = abs(fract(gp.x * 0.19 + 0.31 * sin(gp.y * 0.21) + 0.07 * sin(gp.y * 1.7 + 2.0)) - 0.5); float crk = (1.0 - smoothstep(0.004, 0.011, cr)) * step(0.45, cxN3(vec3(gp.y * 0.12, floor(gp.x * 0.19 + 0.5), 3.0)));
  diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.014), crk * 0.85); gTar = max(gTar, crk);
  // polished wheel paths, dusty verges
  diffuseColor.rgb *= 0.86 + 0.34 * gm.g;
  // markings: thermoplastic worn off the high stones, almost gone in the wheel paths
  vec2 muv = (gp - uGMarkR.xy) * uGMarkR.zw; vec4 mk = texture2D(tGMark, vec2(muv.x, 1.0 - muv.y)); mk.a *= step(0.0, muv.x) * step(muv.x, 1.0) * step(0.0, muv.y) * step(muv.y, 1.0);
  float mw = smoothstep(0.3, 0.75, n3 * 0.55 + n2 * 0.45 + (gm.g - 0.5) * 0.7 + (1.0 - cxOrm.r) * 0.3);
  float ma = mk.a * mix(1.0, 0.22, mw) * (1.0 - gTar);
  diffuseColor.rgb = mix(diffuseColor.rgb, mk.rgb * (0.62 + 0.3 * n3) * mix(1.0, 0.75, 1.0 - gm.g), ma * 0.92);
  // oil
  gOil = smoothstep(0.25, 0.7, gm.b + (n2 - 0.5) * 0.25); diffuseColor.rgb *= 1.0 - 0.62 * gOil;
  // water: standing -> soaked -> damp from one height field, shoreline broken up by world noise
  float wl = gm.r + (n1 - 0.5) * 0.3 + (n2 - 0.5) * 0.1 + (1.0 - cxOrm.r) * 0.08 - (1.0 - uCxWet) * 0.7 + uGLook.y;
  gPud = smoothstep(0.585, 0.615, wl); gDamp = smoothstep(0.34, 0.585, wl);
  diffuseColor.rgb *= mix(1.0, 0.66, gDamp); diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * 0.45, gPud * 0.9);
  gRip = gRings(gp, uGRain.y) * uGRain.x * (gPud * 1.0 + gDamp * 0.12);
}
`
);
var G_FRAG_ROUGH = (
  /* glsl */
  `
roughnessFactor = mix(roughnessFactor, 0.34, gTar * 0.8);
roughnessFactor = mix(roughnessFactor, 0.2, gOil * 0.7);
roughnessFactor = mix(roughnessFactor, roughnessFactor * uGLook.x, gDamp * 0.85);
roughnessFactor = mix(roughnessFactor, 0.035, gPud);
`
);
var G_FRAG_NORMAL = (
  /* glsl */
  `
{
  vec3 gUp = normalize(vCxM * vec3(0.0, 1.0, 0.0));
  normal = normalize(mix(normal, gUp, max(gPud, 0.25 + gDamp * 0.45)));
  normal = normalize(normal + vCxM * vec3(gRip.x, 0.0, gRip.y) * 0.55);
}
`
);
var G_FRAG_REFL = (
  /* glsl */
  `
if (uGRain.z > 0.5) {
  vec4 gq = uGReflM * vec4(vCxWp.x, 0.0, vCxWp.z, 1.0); vec2 guv = gq.xy / gq.w + gRip * 0.02 + (normal.xy - normalize(vCxM * vec3(0.0, 1.0, 0.0)).xy) * 0.012 * (1.0 - gPud);
  float gk = max(gPud, gDamp * 0.75 + gOil * 0.3), gl = 1.2 * (1.0 - gPud) + material.roughness * 7.0;
  // rough wet stone stretches reflections towards the viewer: a short vertical fan of taps
  vec3 gr = textureLod(tGRefl, guv, gl).rgb; float gs = (1.0 - gPud) * material.roughness * 0.22;
  gr = gr * 0.4 + 0.2 * (textureLod(tGRefl, guv + vec2(0.0, gs), gl).rgb + textureLod(tGRefl, guv + vec2(0.0, -gs * 0.6), gl).rgb + textureLod(tGRefl, guv + vec2(0.0, gs * 2.2), gl + 1.0).rgb);
  float gnv = saturate(dot(normal, normalize(vViewPosition))); float gF = 0.025 + 0.975 * pow(1.0 - gnv, 5.0);
  gF = max(gF, 0.1 * gPud);
  reflectedLight.indirectSpecular = mix(reflectedLight.indirectSpecular, gr * gF * mix(0.7, 1.6, gPud) * uGLook.z, clamp(gk, 0.0, 1.0));
}
`
);
function roadMaterial(G4, base, tex) {
  const m = base, inner = m.onBeforeCompile, u = {
    tGMask: { value: tex.mask },
    tGMark: { value: tex.mark },
    tGRefl: { value: null },
    uGReflM: { value: new Matrix4() },
    uGRain: { value: new Vector4(1, 0, 0, 0) },
    uGLook: { value: new Vector4(0.5, 0, 1, 0) },
    uGMaskR: { value: new Vector4(ROAD.mask.x0, ROAD.mask.z0, 1 / (ROAD.mask.x1 - ROAD.mask.x0), 1 / (ROAD.mask.z1 - ROAD.mask.z0)) },
    uGMarkR: { value: new Vector4(ROAD.mark.x0, ROAD.mark.z0, 1 / (ROAD.mark.x1 - ROAD.mark.x0), 1 / (ROAD.mark.z1 - ROAD.mark.z0)) }
  };
  m.onBeforeCompile = (sh) => {
    inner(sh);
    Object.assign(sh.uniforms, u);
    const rep = (a, b) => {
      if (!sh.fragmentShader.includes(a)) console.error("[ground] shader hook missing: " + a.slice(0, 40));
      sh.fragmentShader = sh.fragmentShader.replace(a, b);
    };
    rep("float cxSS(float a, float b, float x)", G_FRAG_COMMON + "\nfloat cxSS(float a, float b, float x)");
    rep("roughnessFactor = clamp(roughnessFactor, 0.045, 1.0);", G_FRAG_ROUGH + "\nroughnessFactor = clamp(roughnessFactor, 0.03, 1.0);");
    rep("float cxLum = dot(diffuseColor.rgb, vec3(0.299, 0.587, 0.114));", G_FRAG_MAP + "\ncxWetK = max(cxWetK, gDamp);\nfloat cxLum = dot(diffuseColor.rgb, vec3(0.299, 0.587, 0.114));");
    rep("#include <lights_fragment_end>", "#include <lights_fragment_end>\n" + G_FRAG_REFL);
    rep("  #ifdef CX_BEADS\n  { vec3 cxSx", G_FRAG_NORMAL + "\n  #ifdef CX_BEADS\n  { vec3 cxSx");
  };
  m.customProgramCacheKey = () => "cx-road";
  m.userData.road = u;
  return m;
}
function createPlanar(G4, hide) {
  const R4 = G4.render, q = G4.quality, on = q.name !== "low" && G4.params.planar !== "0";
  const rt = new WebGLRenderTarget(512, 288, { type: HalfFloatType, generateMipmaps: true, minFilter: LinearMipmapLinearFilter, magFilter: LinearFilter, depthBuffer: true });
  const cam = new PerspectiveCamera(), M = new Matrix4(), bias = new Matrix4().set(0.5, 0, 0, 0.5, 0, 0.5, 0, 0.5, 0, 0, 0.5, 0.5, 0, 0, 0, 1), p = new Vector3(), t = new Vector3(), up = new Vector3(), size = new Vector2();
  const api = { rt, on, matrix: M, uniforms: [], skip: 0 };
  R4.prepasses.push((renderer, scene, camera) => {
    for (const u of api.uniforms) {
      u.uGRain.value.z = api.on ? 1 : 0;
      u.tGRefl.value = rt.texture;
      u.uGReflM.value.copy(M);
    }
    if (!api.on) return;
    renderer.getDrawingBufferSize(size);
    const w = Math.max(64, Math.round(size.x * 0.5)), h = Math.max(36, Math.round(size.y * 0.5));
    if (rt.width !== w || rt.height !== h) rt.setSize(w, h);
    camera.getWorldPosition(p);
    camera.getWorldDirection(t);
    t.add(p);
    up.set(0, 1, 0).applyQuaternion(camera.quaternion);
    cam.position.set(p.x, -p.y, p.z);
    cam.up.set(up.x, -up.y, up.z);
    cam.lookAt(t.x, -t.y, t.z);
    cam.fov = camera.fov;
    cam.aspect = camera.aspect;
    cam.near = 0.1;
    cam.far = 220;
    cam.updateProjectionMatrix();
    cam.updateMatrixWorld(true);
    cam.layers.mask = camera.layers.mask;
    M.copy(bias).multiply(cam.projectionMatrix).multiply(cam.matrixWorldInverse);
    const vis = hide.map((o) => o.visible);
    hide.forEach((o) => o.visible = false);
    const prevT = renderer.getRenderTarget();
    renderer.shadowMap.needsUpdate = true;
    renderer.setRenderTarget(rt);
    renderer.clear(true, true, false);
    renderer.render(scene, cam);
    renderer.setRenderTarget(prevT);
    R4.shadowFresh = true;
    hide.forEach((o, i) => o.visible = vis[i]);
  });
  return api;
}
function kerbs(bucket, x, z0, z1, side2, drops = []) {
  const r = rng(Math.round(x * 31 + 7)), L = 0.9;
  let z = z0, i = 0;
  while (z < z1 - 0.05) {
    const len = Math.min(L, z1 - z), zc = z + len / 2, low = drops.some(([a, b]) => zc > a && zc < b), hgt = low ? 0.045 : ROAD.walkY + 0.012;
    const g2 = bevelBox(ROAD.kerb - 6e-3, hgt + 0.2, len - 8e-3, 0.016, 1);
    paint(g2, [0.86 + r() * 0.12, 0.85 + r() * 0.1, 0.82 + r() * 0.1], { jit: 0.05 });
    xf(g2, { p: [x + side2 * (ROAD.kerb / 2), hgt / 2 - 0.1 + (r() - 0.5) * 6e-3, zc], r: [0, (r() - 0.5) * 6e-3, (r() - 0.5) * 8e-3] });
    dirt(g2, (px2, py2) => clamp2(1 - py2 / 0.14) * 0.9);
    bucket.add("concrete", g2);
    z += len;
    i++;
  }
}
function buildGround(G4, mats, spec) {
  const tex = { mask: buildMask(spec), mark: buildMarkings(spec) }, R4 = G4.render;
  const base = G4.mats.surface("w-road", "asphalt", { wet: 0.75, wetRough: 0.55, macro: 0.16, macroScale: 0.3, streaks: 0, dirt: 0 });
  const mat = roadMaterial(G4, base, tex);
  const rg = new PlaneGeometry(ROAD.hw * 2 + 0.02, ROAD.z1 - ROAD.z0, 1, 1);
  rg.rotateX(-Math.PI / 2);
  rg.translate(0, 0, (ROAD.z0 + ROAD.z1) / 2);
  paint(rg, [1, 1, 1], { jit: 0 });
  const road = new Mesh(rg, mat);
  road.receiveShadow = true;
  road.castShadow = false;
  road.name = "road";
  R4.scene.add(road);
  const planar = createPlanar(G4, [road]);
  planar.uniforms.push(mat.userData.road);
  const B2 = new Bucket(), xk = ROAD.hw, xw = ROAD.hw + ROAD.kerb;
  for (const s of [-1, 1]) {
    kerbs(B2, s * xk, ROAD.z0, ROAD.z1, s, spec.drops.filter((d) => d[2] === s));
    const nz = Math.round((ROAD.z1 - ROAD.z0) / 1), g2 = new PlaneGeometry(ROAD.walk + 0.6, ROAD.z1 - ROAD.z0, 6, nz);
    g2.rotateX(-Math.PI / 2);
    g2.translate(s * (xw + (ROAD.walk + 0.6) / 2 - 0.01), ROAD.walkY, (ROAD.z0 + ROAD.z1) / 2);
    paint(g2, [1, 1, 1], { jit: 0.06, cell: 3 });
    const P3 = g2.attributes.position;
    dirt(g2, (px2, py2, pz2) => {
      const d = Math.abs(px2) - xw;
      return clamp2(0.75 * Math.exp(-d * 3.5) + 0.85 * Math.exp(-(ROAD.walk - d) * 2.2) + 0.3 * fbm(px2 * 0.7, pz2 * 0.7, 3.3, 3) - 0.1);
    });
    for (let i = 0; i < P3.count; i++) {
      const zc = P3.getZ(i), dr = spec.drops.find((d) => d[2] === s && zc > d[0] - 0.6 && zc < d[1] + 0.6);
      if (dr) {
        const d = Math.abs(P3.getX(i)) - xw, k = clamp2(1 - d / 1.2) * sstep(dr[0] - 0.6, dr[0], zc) * (1 - sstep(dr[1], dr[1] + 0.6, zc));
        P3.setY(i, ROAD.walkY - k * (ROAD.walkY - 0.05));
      }
    }
    g2.computeVertexNormals();
    B2.add("pavers", g2);
  }
  return { road, planar, bucket: B2, tex, mat, drops: spec.drops };
}
var ROAD_GLSL = { common: G_FRAG_COMMON, map: G_FRAG_MAP, rough: G_FRAG_ROUGH, normal: G_FRAG_NORMAL, refl: G_FRAG_REFL };

