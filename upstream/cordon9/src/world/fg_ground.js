var FM = { x0: -48, x1: 48, z0: -60, z1: 60, w: 640, h: 800 };
var PM = { x0: 17, x1: 49, z0: -64, z1: 64, w: 256, h: 1024 };
var MKF = { x0: -24, x1: 18, z0: -31, z1: 31, ppm: 26 };
var MKP = { x0: 18, x1: 50, z0: -40, z1: 40, ppm: 32 };
var g = (d, s) => Math.exp(-(d * d) / (s * s));
function segD(x, z, pts) {
  let best = 1e9;
  for (let i = 0; i < pts.length - 1; i++) {
    const ax = pts[i][0], az = pts[i][1], bx3 = pts[i + 1][0], bz = pts[i + 1][1], ux = bx3 - ax, uz = bz - az, t = clamp2(((x - ax) * ux + (z - az) * uz) / (ux * ux + uz * uz)), dx = x - ax - ux * t, dz = z - az - uz * t, d = Math.hypot(dx, dz);
    if (d < best) best = d;
  }
  return best;
}
function buildFieldMask(spec) {
  const { w, h, x0, x1, z0, z1 } = FM, data = new Uint8Array(w * h * 4), P3 = SITE.pitch, bb = spec.tracks.map((t2) => {
    let a = 1e9, b = -1e9, c = 1e9, d = -1e9;
    for (const [x, z] of t2.pts) {
      a = Math.min(a, x);
      b = Math.max(b, x);
      c = Math.min(c, z);
      d = Math.max(d, z);
    }
    return [a - 3, b + 3, c - 3, d + 3];
  });
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    const x = x0 + (i + 0.5) / w * (x1 - x0), z = z0 + (j + 0.5) / h * (z1 - z0);
    const n1 = fbm(x * 0.09 + 1.3, z * 0.09, 2.2, 4), n2 = fbm(x * 0.33, z * 0.33 + 7.1, 5.5, 4), n3 = fbm(x * 1.1 + 3, z * 1.1, 9.1, 3);
    let mud = 0.3 + 0.75 * (n1 - 0.42) + 0.4 * (n2 - 0.5) + 0.2 * (n3 - 0.5), rut = 0, water = 0.16 + 0.5 * fbm(x * 0.13 + 3.1, z * 0.13, 1.7, 4) + 0.1 * (n3 - 0.5);
    for (const gz of [P3.z0, P3.z1]) mud += 0.75 * g(Math.hypot((x - (P3.x0 + P3.x1) / 2) * 0.55, z - gz + Math.sign(gz) * 2.5), 3.4);
    mud += 0.35 * g(Math.hypot(x - (P3.x0 + P3.x1) / 2, z), 3);
    for (const [px2, pz2, r, a] of spec.mud) {
      const d = Math.hypot(x - px2, z - pz2);
      if (d < r * 2.6) mud += a * g(d, r);
    }
    for (let k = 0; k < spec.tracks.length; k++) {
      const t2 = spec.tracks[k], b = bb[k];
      if (x < b[0] || x > b[1] || z < b[2] || z > b[3]) continue;
      const d = segD(x, z, t2.pts), hw = t2.w / 2;
      const lane = g(d, hw + 0.9), wheel2 = t2.wheels ? g(Math.abs(d - hw), 0.24) : g(d, hw * 0.7);
      mud += t2.a * lane;
      rut = Math.max(rut, wheel2 * t2.a);
      water += 0.26 * wheel2 * t2.a;
    }
    for (const [px2, pz2, r, a] of spec.puddles) {
      const d = Math.hypot(x - px2, z - pz2);
      if (d < r * 2.6) water += a * g(d, r);
    }
    for (const [px2, pz2, r] of spec.dry) {
      const d = Math.hypot(x - px2, z - pz2);
      if (d < r * 2.6) {
        const k = g(d, r);
        water -= 0.5 * k;
        mud -= 0.6 * k;
      }
    }
    water += 0.1 * clamp2(mud) - 0.04;
    const o = (j * w + i) * 4;
    data[o] = clamp2(water) * 255;
    data[o + 1] = clamp2(mud) * 255;
    data[o + 2] = clamp2(rut) * 255;
    data[o + 3] = 255;
  }
  const t = new DataTexture(data, w, h, RGBAFormat);
  t.magFilter = t.minFilter = LinearFilter;
  t.wrapS = t.wrapT = ClampToEdgeWrapping;
  t.needsUpdate = true;
  return t;
}
function buildParkMask(spec) {
  const { w, h, x0, x1, z0, z1 } = PM, data = new Uint8Array(w * h * 4);
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    const x = x0 + (i + 0.5) / w * (x1 - x0), z = z0 + (j + 0.5) / h * (z1 - z0);
    let water = 0.22 + 0.5 * fbm(x * 0.16 + 3.1, z * 0.16, 1.7, 4) + 0.2 * g(x - 19.6, 0.7) + 0.16 * g(x - 36.4, 0.8);
    for (const [px2, pz2, r, a] of spec.ppuddles) water += a * g(Math.hypot(x - px2, z - pz2), r);
    let wear2 = 0.45 + 0.3 * (g(x - 22.2, 0.5) + g(x - 24.2, 0.5)) + 0.25 * g(Math.hypot((x - 30) * 0.2, z - 8), 2.2) + 0.25 * (fbm(x * 0.5, z * 0.25, 4.2, 3) - 0.5);
    let oil = 0;
    for (const [px2, pz2, r, a] of spec.oil) oil += a * g(Math.hypot(x - px2, z - pz2), r) * (0.6 + 0.8 * fbm(x * 2.3, z * 2.3, 7.7, 3));
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
var sheet = (M) => {
  const cv = document.createElement("canvas");
  cv.width = Math.round((M.x1 - M.x0) * M.ppm);
  cv.height = Math.round((M.z1 - M.z0) * M.ppm);
  const c = cv.getContext("2d");
  return { cv, c, X: (x) => (x - M.x0) * M.ppm, Z: (z) => (z - M.z0) * M.ppm, s: M.ppm };
};
var toTex = (cv) => {
  const t = new CanvasTexture(cv);
  t.colorSpace = SRGBColorSpace;
  t.anisotropy = 8;
  t.wrapS = t.wrapT = ClampToEdgeWrapping;
  t.generateMipmaps = true;
  t.minFilter = LinearMipmapLinearFilter;
  return t;
};
var sprayer = (c, X, Z, s, r) => (pts, col, wd = 0.1) => {
  c.lineCap = "round";
  c.lineJoin = "round";
  c.strokeStyle = col;
  c.lineWidth = wd * s;
  c.shadowColor = col;
  c.shadowBlur = 0.06 * s;
  c.beginPath();
  pts.forEach(([x, z], i) => i ? c.lineTo(X(x + (r() - 0.5) * 0.05), Z(z + (r() - 0.5) * 0.05)) : c.moveTo(X(x), Z(z)));
  c.stroke();
  c.shadowBlur = 0;
};
var stencil = (c, X, Z, s) => (txt, x, z, hgt, col, rot2 = 0, stretch = 1.4) => {
  c.save();
  c.translate(X(x), Z(z));
  c.rotate(rot2);
  c.scale(1, stretch);
  c.fillStyle = col;
  c.font = `bold ${hgt * s / stretch}px Arial, Helvetica, sans-serif`;
  c.textAlign = "center";
  c.textBaseline = "middle";
  c.fillText(txt, 0, 0);
  c.restore();
};
function buildPitchMarks() {
  const { cv, c, X, Z, s } = sheet(MKF), P3 = SITE.pitch, r = rng(404), LIME = "#dedfd2", ORA = "#e2661a", BLU2 = "#2a6fd0", cx = (P3.x0 + P3.x1) / 2;
  const line = (xa, za, xb, zb, wd = 0.12, col = LIME) => {
    c.strokeStyle = col;
    c.lineWidth = wd * s;
    c.lineCap = "butt";
    c.beginPath();
    c.moveTo(X(xa), Z(za));
    c.lineTo(X(xb), Z(zb));
    c.stroke();
  };
  const arc2 = (x, z, rad, a0, a1, wd = 0.12) => {
    c.strokeStyle = LIME;
    c.lineWidth = wd * s;
    c.beginPath();
    c.arc(X(x), Z(z), rad * s, a0, a1);
    c.stroke();
  };
  for (const o of [0, 0.02]) {
    c.globalAlpha = o ? 0.5 : 1;
    line(P3.x0 + o, P3.z0, P3.x1 - o, P3.z0 + o);
    line(P3.x0, P3.z1 - o, P3.x1, P3.z1);
    line(P3.x0 + o, P3.z0, P3.x0, P3.z1);
    line(P3.x1 - o, P3.z0, P3.x1, P3.z1);
    line(P3.x0, o, P3.x1, -o);
  }
  c.globalAlpha = 1;
  arc2(cx, 0, 6.4, 0, Math.PI * 2);
  c.fillStyle = LIME;
  c.beginPath();
  c.arc(X(cx), Z(0), 0.16 * s, 0, 7);
  c.fill();
  for (const sg of [-1, 1]) {
    const gz = sg < 0 ? P3.z0 : P3.z1, d = -sg;
    line(cx - 11, gz, cx - 11, gz + d * 9.2);
    line(cx + 11, gz, cx + 11, gz + d * 9.2);
    line(cx - 11, gz + d * 9.2, cx + 11, gz + d * 9.2);
    line(cx - 5, gz, cx - 5, gz + d * 3.4);
    line(cx + 5, gz, cx + 5, gz + d * 3.4);
    line(cx - 5, gz + d * 3.4, cx + 5, gz + d * 3.4);
    c.beginPath();
    c.arc(X(cx), Z(gz + d * 7), 0.15 * s, 0, 7);
    c.fill();
    const a = Math.acos(2.2 / 5.6);
    arc2(cx, gz + d * 7, 5.6, (d > 0 ? Math.PI / 2 : -Math.PI / 2) - a, (d > 0 ? Math.PI / 2 : -Math.PI / 2) + a);
    for (const sx of [-1, 1]) arc2(sx < 0 ? P3.x0 : P3.x1, gz, 0.9, sx < 0 ? d > 0 ? 0 : -Math.PI / 2 : d > 0 ? Math.PI / 2 : Math.PI, sx < 0 ? d > 0 ? Math.PI / 2 : 0 : d > 0 ? Math.PI : Math.PI * 1.5);
  }
  c.globalAlpha = 0.28;
  c.setLineDash([0.6 * s, 0.3 * s]);
  line(P3.x0, -14, P3.x1, -14, 0.08, "#d6c84a");
  line(P3.x0, 14, P3.x1, 14, 0.08, "#d6c84a");
  c.setLineDash([]);
  c.globalAlpha = 1;
  const spray = sprayer(c, X, Z, s, r), text = stencil(c, X, Z, s), H2 = SITE.heli, circ = (x, z, rad, col, wd) => {
    const pts = [];
    for (let i = 0; i <= 40; i++) {
      const a = i / 40 * Math.PI * 2;
      pts.push([x + Math.cos(a) * rad, z + Math.sin(a) * rad]);
    }
    spray(pts, col, wd);
  };
  circ(H2.x + 0.6, H2.z + 0.4, 8.6, ORA, 0.22);
  spray([[H2.x - 1.4, H2.z - 9.6], [H2.x - 1.4, H2.z - 12.4]], ORA, 0.3);
  spray([[H2.x + 2.6, H2.z - 9.6], [H2.x + 2.6, H2.z - 12.4]], ORA, 0.3);
  spray([[H2.x - 1.4, H2.z - 11], [H2.x + 2.6, H2.z - 11]], ORA, 0.3);
  text("LZ", H2.x + 9.2, H2.z + 7.2, 1.5, ORA, 0.5);
  text("KEEP CLEAR", H2.x - 8.4, H2.z + 8.4, 0.8, ORA, -0.72, 1.3);
  for (const t of SITE.tents) {
    const hw = t.w / 2 + 0.5, hd = t.d / 2 + 0.5;
    spray([[t.x - hw, t.z - hd], [t.x + hw, t.z - hd], [t.x + hw, t.z + hd], [t.x - hw, t.z + hd], [t.x - hw, t.z - hd]], BLU2, 0.07);
  }
  text("TRIAGE", -11, 4.8, 1, BLU2, 0, 1.3);
  text("WARD B", 8.8, 13.5, 0.9, BLU2, Math.PI / 2, 1.3);
  text("STORES", -9.5, 24.2, 0.8, BLU2, 0, 1.3);
  for (const [x, z, rot2] of [[9.5, 4.4, Math.PI], [3.4, 4.6, Math.PI], [-3.2, 5, Math.PI]]) {
    c.save();
    c.translate(X(x), Z(z));
    c.rotate(rot2);
    spray([[x - 1.1, z], [x + 1.1, z]], ORA, 0.12);
    c.restore();
    spray([[x - 1.1, z], [x + 1.1, z]], ORA, 0.12);
    spray([[x - 0.6, z - 0.45], [x - 1.1, z], [x - 0.6, z + 0.45]], ORA, 0.12);
  }
  for (let k = 0; k < 6; k++) {
    spray([[11.2, -3 - k * 1.5], [13.8, -3 - k * 1.5]], "#d9d9cf", 0.06);
    text(String(k + 1), 14.4, -3.7 - k * 1.5, 0.5, "#d9d9cf", 0, 1.2);
  }
  text("QUEUE HERE", 12.5, -1.2, 0.55, "#d9d9cf", 0, 1.2);
  for (const [x, z] of [[-17.5, -22.5], [10.5, 23.5], [-16, 24.6]]) {
    spray([[x - 0.6, z - 0.6], [x + 0.6, z + 0.6]], ORA);
    spray([[x - 0.6, z + 0.6], [x + 0.6, z - 0.6]], ORA);
  }
  return toTex(cv);
}
function buildParkMarks() {
  const { cv, c, X, Z, s } = sheet(MKP), r = rng(405), WHITE = "#d8d6cc", YEL2 = "#d2a51c", ORA = "#d9641a";
  const line = (xa, za, xb, zb, wd, col, dash = null) => {
    c.strokeStyle = col;
    c.lineWidth = wd * s;
    c.lineCap = "butt";
    c.setLineDash(dash ? dash.map((d) => d * s) : []);
    c.beginPath();
    c.moveTo(X(xa), Z(za));
    c.lineTo(X(xb), Z(zb));
    c.stroke();
    c.setLineDash([]);
  };
  const text = stencil(c, X, Z, s), spray = sprayer(c, X, Z, s, r);
  for (let k = 0; k <= 5; k++) line(25.6, -30 + k * 3.9, 36.2, -30 + k * 3.9, 0.12, YEL2);
  line(25.6, -30, 25.6, -10.5, 0.12, YEL2, [1.2, 0.8]);
  for (let k = 0; k < 5; k++) text("BUS", 30.6, -28.05 + k * 3.9, 1.5, YEL2, 0, 1);
  for (let k = 0; k <= 7; k++) line(31.4, 14.5 + k * 2.5, 36.2, 14.5 + k * 2.5, 0.1, WHITE);
  line(31.4, 14.5, 31.4, 32, 0.1, WHITE);
  for (const z of [15.75, 18.25]) {
    c.fillStyle = "#2a5fb0";
    c.fillRect(X(32.2), Z(z - 0.9), 3.4 * s, 1.8 * s);
    text("STAFF", 33.9, z, 0.7, WHITE, 0, 1.2);
  }
  for (let k = 0; k <= 9; k++) line(19.5, -8 + k * 2.5 + 22, 24, -8 + k * 2.5 + 22, 0.1, WHITE);
  c.save();
  c.beginPath();
  c.rect(X(30.5), Z(3.2), 6.3 * s, 9.6 * s);
  c.clip();
  c.strokeStyle = YEL2;
  c.lineWidth = 0.1 * s;
  for (let k = -20; k < 20; k++) {
    c.beginPath();
    c.moveTo(X(30.5 + k * 1.3), Z(3.2));
    c.lineTo(X(30.5 + k * 1.3 + 9.6), Z(12.8));
    c.stroke();
    c.beginPath();
    c.moveTo(X(30.5 + k * 1.3), Z(12.8));
    c.lineTo(X(30.5 + k * 1.3 + 9.6), Z(3.2));
    c.stroke();
  }
  c.restore();
  c.strokeStyle = YEL2;
  c.lineWidth = 0.14 * s;
  c.strokeRect(X(30.5), Z(3.2), 6.3 * s, 9.6 * s);
  c.fillStyle = WHITE;
  c.fillRect(X(38.2), Z(8.2), 0.45 * s, 4.4 * s);
  line(37, 8, 49, 8, 0.1, WHITE, [2, 2]);
  const arrow2 = (x, z, rot2) => {
    c.save();
    c.translate(X(x), Z(z));
    c.rotate(rot2);
    c.fillStyle = WHITE;
    c.beginPath();
    c.moveTo(0, -1.8 * s);
    c.lineTo(0.55 * s, -0.5 * s);
    c.lineTo(0.16 * s, -0.5 * s);
    c.lineTo(0.16 * s, 1.8 * s);
    c.lineTo(-0.16 * s, 1.8 * s);
    c.lineTo(-0.16 * s, -0.5 * s);
    c.lineTo(-0.55 * s, -0.5 * s);
    c.closePath();
    c.fill();
    c.restore();
  };
  arrow2(22.2, -18, 0);
  arrow2(22.2, 20, Math.PI);
  arrow2(28, 6, -Math.PI / 2);
  arrow2(28, 10, Math.PI / 2);
  text("SLOW", 27.2, 0.2, 1.6, WHITE, Math.PI / 2, 2.2);
  text("DROP OFF ONLY", 21.6, 2.5, 0.8, YEL2, Math.PI / 2, 1.5);
  line(44, -40, 44, 3, 0.1, WHITE, [2, 3]);
  line(44, 13, 44, 40, 0.1, WHITE, [2, 3]);
  line(39.4, -40, 39.4, 3, 0.12, YEL2);
  line(39.4, 13, 39.4, 40, 0.12, YEL2);
  spray([[20.2, -4.5], [24.6, -4.5]], ORA, 0.1);
  spray([[23.8, -5.1], [24.6, -4.5], [23.8, -3.9]], ORA, 0.1);
  text("MEDICAL", 22.4, -5.6, 0.6, ORA, 0, 1.2);
  text("CONVOY 2", 27.5, -7.5, 0.7, ORA, 0.05, 1.2);
  for (const [x, z] of [[29.4, -16.4], [24.4, 15.2]]) {
    spray([[x - 0.5, z - 0.5], [x + 0.5, z + 0.5]], ORA);
    spray([[x - 0.5, z + 0.5], [x + 0.5, z - 0.5]], ORA);
  }
  c.globalAlpha = 0.5;
  for (const [xa, za, xb, zb] of [[36, 9.4, 27.5, 5.2], [30, -2, 23.4, -9]]) for (const o of [-0.9, 0.9]) {
    const nx = -(zb - za), nz = xb - xa, l = Math.hypot(nx, nz);
    c.strokeStyle = "#0c0c0c";
    c.lineWidth = 0.24 * s;
    c.beginPath();
    c.moveTo(X(xa + nx / l * o), Z(za + nz / l * o));
    c.quadraticCurveTo(X((xa + xb) / 2 + nx / l * (o + 0.5)), Z((za + zb) / 2 + nz / l * (o + 0.5)), X(xb + nx / l * o), Z(zb + nz / l * o));
    c.stroke();
  }
  c.globalAlpha = 1;
  return toTex(cv);
}
var F_COMMON = (
  /* glsl */
  `
uniform sampler2D tFA, tFO, tFN; uniform vec4 uFPitch; uniform float uFT; float fMud = 0.0;
`
);
var F_MAP = (
  /* glsl */
  `
{
  vec2 gp = vCxWp.xz; vec4 gm = texture2D(tGMask, (gp - uGMaskR.xy) * uGMaskR.zw);
  float n1 = cxN3(vec3(gp * 0.9, 0.3)), n2 = cxN3(vec3(gp * 5.5, 1.7)), n3 = cxN3(vec3(gp * 37.0, 4.1));
  // mown bands on the pitch, rank yellowing grass outside it
  float inP = step(uFPitch.x, gp.x) * step(gp.x, uFPitch.z) * step(uFPitch.y, gp.y) * step(gp.y, uFPitch.w);
  float band = smoothstep(0.44, 0.56, abs(fract(gp.y / 9.0 + 0.25) - 0.5) * 2.0);
  diffuseColor.rgb *= mix(vec3(0.8, 0.76, 0.56) * (0.8 + 0.5 * n1), vec3(mix(0.84, 1.14, band)), inP);
  // lime lines and sprayed marks: washed thin by the rain, gone where the ground is churned
  vec2 muv = (gp - uGMarkR.xy) * uGMarkR.zw; vec4 mk = texture2D(tGMark, vec2(muv.x, 1.0 - muv.y)); mk.a *= step(0.0, muv.x) * step(muv.x, 1.0) * step(0.0, muv.y) * step(muv.y, 1.0);
  float mw = smoothstep(0.3, 0.8, n3 * 0.5 + n2 * 0.5 + gm.b * 0.6 + (1.0 - cxA.a) * 0.3);
  diffuseColor.rgb = mix(diffuseColor.rgb, mk.rgb * (0.55 + 0.3 * n3), mk.a * mix(0.9, 0.3, mw));
  // mud: a second baked set laid over the turf where the mask says the sward is gone; grass tufts survive on the high spots
  vec2 fuv = gp * uFT; vec4 fa = texture2D(tFA, fuv), fo = texture2D(tFO, fuv);
  fMud = smoothstep(0.36, 0.6, gm.g + (n2 - 0.5) * 0.32 + (n3 - 0.5) * 0.2 - (cxA.a - 0.5) * 0.25);
  diffuseColor.rgb = mix(diffuseColor.rgb, fa.rgb * (0.78 + 0.44 * n1) * (1.0 - 0.6 * mk.a * (1.0 - mw)) + mk.rgb * mk.a * (1.0 - mw) * 0.25, fMud); cxOrm = mix(cxOrm, fo, fMud);
  diffuseColor.rgb *= 1.0 - 0.34 * gm.b;
  // water: one height field. Turf only goes damp and glossy between the blades; mud ponds.
  float wl = gm.r + (n1 - 0.5) * 0.3 + (n2 - 0.5) * 0.1 + (1.0 - mix(cxA.a, fa.a, fMud)) * 0.2 + gm.b * 0.1 - (1.0 - uCxWet) * 0.7;
  gPud = smoothstep(0.585, 0.615, wl); gDamp = smoothstep(0.34, 0.585, wl) * (0.4 + 0.6 * fMud);
  diffuseColor.rgb *= mix(1.0, 0.7, gDamp); diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.045, 0.036, 0.027) * (0.7 + 0.6 * n1), gPud * 0.8);
  gRip = gRings(gp, uGRain.y) * uGRain.x * (gPud * 1.0 + gDamp * 0.12);
}
`
);
var F_NORMAL = (
  /* glsl */
  `
{ vec3 ft = texture2D(tFN, vCxWp.xz * uFT).xyz * 2.0 - 1.0; ft.xy *= 1.5; normal = normalize(mix(normal, normalize(vCxM * normalize(vec3(ft.x, ft.z, ft.y))), fMud)); }
`
);
function fieldMaterial(G4, base, tex, mud) {
  const m = base, inner = m.onBeforeCompile, P3 = SITE.pitch, u = {
    tGMask: { value: tex.mask },
    tGMark: { value: tex.mark },
    tGRefl: { value: null },
    uGReflM: { value: new Matrix4() },
    uGRain: { value: new Vector4(1, 0, 0, 0) },
    uGMaskR: { value: new Vector4(FM.x0, FM.z0, 1 / (FM.x1 - FM.x0), 1 / (FM.z1 - FM.z0)) },
    uGMarkR: { value: new Vector4(MKF.x0, MKF.z0, 1 / (MKF.x1 - MKF.x0), 1 / (MKF.z1 - MKF.z0)) },
    tFA: { value: mud.alb },
    tFO: { value: mud.orm },
    tFN: { value: mud.nrm },
    uFT: { value: 1 / mud.tile },
    uFPitch: { value: new Vector4(P3.x0 - 1.5, P3.z0 - 1.5, P3.x1 + 1.5, P3.z1 + 1.5) }
  };
  m.onBeforeCompile = (sh) => {
    inner(sh);
    Object.assign(sh.uniforms, u);
    const rep = (a, b) => {
      if (!sh.fragmentShader.includes(a)) console.error("[field] shader hook missing: " + a.slice(0, 40));
      sh.fragmentShader = sh.fragmentShader.replace(a, b);
    };
    rep("float cxSS(float a, float b, float x)", ROAD_GLSL.common + F_COMMON + "\nfloat cxSS(float a, float b, float x)");
    rep("roughnessFactor = clamp(roughnessFactor, 0.045, 1.0);", ROAD_GLSL.rough + "\nroughnessFactor = clamp(roughnessFactor, 0.03, 1.0);");
    rep("float cxLum = dot(diffuseColor.rgb, vec3(0.299, 0.587, 0.114));", F_MAP + "\ncxWetK = max(cxWetK, gDamp);\nfloat cxLum = dot(diffuseColor.rgb, vec3(0.299, 0.587, 0.114));");
    rep("#include <lights_fragment_end>", "#include <lights_fragment_end>\n" + ROAD_GLSL.refl);
    rep("  #ifdef CX_BEADS\n  { vec3 cxSx", F_NORMAL + ROAD_GLSL.normal + "\n  #ifdef CX_BEADS\n  { vec3 cxSx");
  };
  m.customProgramCacheKey = () => "cx-field";
  m.userData.road = u;
  return m;
}
function rects(list) {
  const gs = list.map(([xa, za, xb, zb]) => {
    const p = new PlaneGeometry(xb - xa, zb - za, 1, 1);
    p.rotateX(-Math.PI / 2);
    p.translate((xa + xb) / 2, 0, (za + zb) / 2);
    paint(p, [1, 1, 1], { jit: 0 });
    return p;
  });
  return merge(gs);
}
function edging(bucket, a, b, o = {}) {
  const dx = b[0] - a[0], dz = b[1] - a[1], len = Math.hypot(dx, dz), yaw = Math.atan2(dx, dz), L = o.len || 0.9, w = o.w || 0.15, hgt = o.h ?? 0.03, r = rng(Math.round(a[0] * 31 + a[1] * 17 + 7));
  let t = 0;
  while (t < len - 0.05) {
    const l = Math.min(L, len - t), tc = t + l / 2, gg = bevelBox(w - 6e-3, hgt + 0.2, l - 0.01, 0.014, 1);
    paint(gg, [0.84 + r() * 0.12, 0.83 + r() * 0.1, 0.8 + r() * 0.1], { jit: 0.05 });
    xf(gg, { p: [a[0] + dx / len * tc, hgt - 0.1 + (r() - 0.5) * 8e-3, a[1] + dz / len * tc], r: [(r() - 0.5) * 0.01, yaw, (r() - 0.5) * 0.012] });
    dirt(gg, () => 0.5 + r() * 0.3);
    bucket.add(o.mat || "concrete", gg);
    t += l;
  }
}
function slab(bucket, mat, xa, za, xb, zb, y = 0.02, o = {}) {
  const w = xb - xa, d = zb - za, gg = new PlaneGeometry(w, d, Math.max(1, Math.round(w / 0.8)), Math.max(1, Math.round(d / 0.8)));
  gg.rotateX(-Math.PI / 2);
  gg.translate((xa + xb) / 2, y, (za + zb) / 2);
  paint(gg, o.col || [1, 1, 1], { jit: 0.06, cell: 3 });
  dirt(gg, (px2, py2, pz2) => {
    const e = Math.min(px2 - xa, xb - px2, pz2 - za, zb - pz2);
    return clamp2(0.7 * Math.exp(-e * 2.5) + 0.35 * fbm(px2 * 0.7, pz2 * 0.7, 3.3, 3) - 0.08 + (o.dirt || 0));
  });
  bucket.add(mat, gg);
  const sk = (x0, z0, x1, z1) => {
    const s = box(Math.abs(x1 - x0) + 1e-3, y + 0.05, Math.abs(z1 - z0) + 1e-3);
    paint(s, [0.8, 0.8, 0.78], { jit: 0.04 });
    xf(s, { p: [(x0 + x1) / 2, y / 2 - 0.026, (z0 + z1) / 2] });
    bucket.add(mat, s);
  };
  sk(xa, za, xb, za + 2e-3);
  sk(xa, zb - 2e-3, xb, zb);
  sk(xa, za, xa + 2e-3, zb);
  sk(xb - 2e-3, za, xb, zb);
}
function buildFieldGround(G4, mats, spec) {
  const R4 = G4.render, P3 = SITE.park;
  const ftex = { mask: buildFieldMask(spec), mark: buildPitchMarks() }, ptex = { mask: buildParkMask(spec), mark: buildParkMarks() };
  const turf = G4.mats.surface("f-turf", "turf", { wet: 0.5, wetRough: 0.5, macro: 0.2, macroScale: 0.22, streaks: 0, dirt: 0 }), mud = G4.mats.bake("mud");
  const fmat = fieldMaterial(G4, turf, ftex, mud);
  const road = roadMaterial(G4, G4.mats.surface("f-road", "asphalt", { wet: 0.75, wetRough: 0.55, macro: 0.16, macroScale: 0.3, streaks: 0, dirt: 0 }), ptex);
  road.userData.road.uGMaskR.value.set(PM.x0, PM.z0, 1 / (PM.x1 - PM.x0), 1 / (PM.z1 - PM.z0));
  road.userData.road.uGMarkR.value.set(MKP.x0, MKP.z0, 1 / (MKP.x1 - MKP.x0), 1 / (MKP.z1 - MKP.z0));
  const E = 190, sx = 39, sx1 = 49;
  const fg = rects([[-E, -E, P3.x0, E], [P3.x0, -E, sx, P3.z0], [P3.x0, P3.z1, sx, E], [sx1, -E, E, E]]), pg = rects([[P3.x0, P3.z0, sx, P3.z1], [sx, -E, sx1, E]]);
  const field = new Mesh(fg, fmat);
  field.receiveShadow = true;
  field.name = "field";
  const park = new Mesh(pg, road);
  park.receiveShadow = true;
  park.name = "carpark";
  R4.scene.add(field, park);
  const planar = createPlanar(G4, [field, park]);
  planar.uniforms.push(fmat.userData.road, road.userData.road);
  const B2 = new Bucket();
  for (const [a, b, o] of spec.edges) edging(B2, a, b, o || {});
  for (const [mat, xa, za, xb, zb, y, o] of spec.slabs) slab(B2, mat, xa, za, xb, zb, y ?? 0.02, o || {});
  return { field, park, meshes: [field, park], planar, bucket: B2, tex: { ftex, ptex }, mats: [fmat, road], tris: 12, tick: (t) => {
    fmat.userData.road.uGRain.value.y = t;
    road.userData.road.uGRain.value.y = t;
  } };
}

