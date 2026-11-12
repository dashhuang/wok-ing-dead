var TAU6 = PI5 * 2;
var LIFT = 1;
var sp = (v, e) => Math.sign(v) * Math.pow(Math.abs(v), e);
var clamp4 = clamp2;
var lerp4 = lerp2;
var UAV = { name: "Kestrel OW-4", motor: [0.34, 0.03, 0.34], hubY: 0.04, rotorR: 0.266, yawPivot: [0, -0.11, 0.128], pitchY: -0.078, lamp: [0, -0.066, 0.03], hook: [0, -0.094, -0.18], strobe: [0, 0.088, 0.06] };
var COL = { shell: [0.6, 0.62, 0.62], belly: [0.085, 0.09, 0.1], dk: [0.1, 0.105, 0.115], org: [0.88, 0.3, 0.04], alu: [0.34, 0.35, 0.38], anod: [0.15, 0.155, 0.17], brt: [0.9, 0.9, 0.92], cu: [0.85, 0.42, 0.2], blk: [0.05, 0.05, 0.055], wht: [0.82, 0.82, 0.8] };
RECIPES.carbon = { tile: 0.064, bump: 5, glsl: (
  /* glsl */
  `
Surf surf(vec2 uv){
  vec2 g = uv * 32.0, id = floor(g), f = g - id;
  float over = step(mod(id.x + id.y, 4.0), 1.5);                              // 1 where the warp tow lies on top (fibres along y)
  float across = mix(f.y, f.x, over), along = mix(f.x, f.y, over);
  float arch = sin(across * 3.14159), dive = 0.5 - 0.5 * cos(along * 3.14159); // domed across the tow, dipping under its neighbours at both ends
  float fibA = fbm(uv, vec2(320.0, 5.0), 2, 1), fibB = fbm(uv, vec2(5.0, 320.0), 2, 2), fib = mix(fibB, fibA, over);
  float big = fbm(uv, vec2(3.0), 3, 5), pin = smoothstep(0.16, 0.0, min(min(f.x, 1.0 - f.x), min(f.y, 1.0 - f.y))) * smoothstep(0.3, 0.0, arch);
  vec3 c = mix(L(0.05, 0.052, 0.056), L(0.115, 0.12, 0.128), over) * (0.72 + 0.56 * fib) * (0.9 + 0.2 * big);
  c *= 1.0 - 0.55 * pin;
  float r = 0.3 + (fib - 0.5) * 0.16 + pin * 0.3;
  float h = 0.35 + 0.42 * pow(arch, 0.7) * (0.55 + 0.45 * dive) + (fib - 0.5) * 0.08 - pin * 0.2;
  return Surf(c, r, 0.55, 0.72 + 0.28 * arch, h, 1.0);
}`
) };
var ATL2 = null;
function droneAtlas() {
  if (ATL2) return ATL2;
  const ST4 = '"Arial Narrow", "Helvetica Neue", Arial, sans-serif', HV = 'Impact, "Arial Black", sans-serif', E = {};
  const add = (name, x, y, w, h, draw) => {
    E[name] = [x, y, w, h, draw];
  };
  add("cea", 8, 8, 480, 150, (c, w, h, r) => {
    label(c, "CEA", 0, 4, 250, 118, { color: "#14161a", font: "900", family: HV, track: 6, align: "left" });
    c.fillStyle = "#c8480c";
    c.fillRect(262, 18, 10, 104);
    label(c, "CITY EMERGENCY", 286, 16, 190, 34, { color: "#14161a", family: ST4, align: "left" });
    label(c, "AUTHORITY", 286, 52, 190, 34, { color: "#14161a", family: ST4, align: "left" });
    label(c, "AIR UNIT 4", 286, 90, 190, 30, { color: "#c8480c", family: ST4, align: "left", track: 3 });
    c.fillStyle = "#14161a";
    c.fillRect(0, 132, w, 5);
    wear(c, w, h, r, 0.3, 5);
  });
  add("idD", 8, 166, 300, 120, (c, w, h, r) => {
    label(c, "OW-4", 6, 6, w - 12, h - 12, { color: "#14161a", font: "900", family: HV, track: 8 });
    wear(c, w, h, r, 0.35, 4);
  });
  add("idL", 8, 294, 300, 120, (c, w, h, r) => {
    label(c, "OW-4", 6, 6, w - 12, h - 12, { color: "#e6e6e0", font: "900", family: HV, track: 8 });
    wear(c, w, h, r, 0.45, 5);
  });
  add("warn", 500, 8, 250, 110, (c, w, h, r) => {
    c.fillStyle = "#e6b012";
    c.beginPath();
    c.roundRect(2, 2, w - 4, h - 4, 10);
    c.fill();
    c.strokeStyle = "#15140f";
    c.lineWidth = 4;
    c.stroke();
    c.fillStyle = "#15140f";
    c.beginPath();
    c.moveTo(48, 20);
    c.lineTo(86, 88);
    c.lineTo(10, 88);
    c.closePath();
    c.fill();
    c.fillStyle = "#e6b012";
    c.fillRect(44, 42, 8, 26);
    c.fillRect(44, 73, 8, 8);
    label(c, "ROTATING BLADES", 96, 18, 144, 30, { color: "#15140f", font: "900", family: ST4, align: "left" });
    label(c, "KEEP CLEAR", 96, 50, 144, 28, { color: "#15140f", font: "900", family: ST4, align: "left" });
    label(c, "DISARM BEFORE HANDLING", 96, 82, 144, 14, { color: "#15140f", family: ST4, align: "left" });
    wear(c, w, h, r, 0.3, 4);
  });
  add("batt", 500, 126, 250, 100, (c, w, h, r) => {
    c.fillStyle = "#d9d9d2";
    c.beginPath();
    c.roundRect(2, 2, w - 4, h - 4, 6);
    c.fill();
    c.fillStyle = "#c8480c";
    c.fillRect(2, 2, 46, h - 4);
    label(c, "B", 6, 20, 38, 60, { color: "#f0efe8", font: "900", family: HV });
    label(c, "LiHV 12S  22 Ah", 58, 10, 182, 26, { color: "#17181a", font: "900", family: ST4, align: "left" });
    label(c, "44.4 V  977 Wh  UN3480", 58, 40, 182, 18, { color: "#17181a", family: ST4, align: "left" });
    c.fillStyle = "#17181a";
    for (let i = 0; i < 34; i++) c.fillRect(58 + i * 5.3, 66, 1 + i * 7 % 3, 24);
    wear(c, w, h, r, 0.25, 3);
  });
  add("plate", 760, 8, 250, 150, (c, w, h, r) => {
    const g2 = c.createLinearGradient(0, 0, w, h);
    g2.addColorStop(0, "#9a9ea3");
    g2.addColorStop(0.5, "#c2c5c8");
    g2.addColorStop(1, "#8b8f94");
    c.fillStyle = g2;
    c.beginPath();
    c.roundRect(2, 2, w - 4, h - 4, 5);
    c.fill();
    c.strokeStyle = "#2a2c2f";
    c.lineWidth = 2;
    c.strokeRect(9, 9, w - 18, h - 18);
    label(c, "KESTREL AERO", 16, 14, w - 32, 30, { color: "#1b1c1e", font: "900", family: HV, track: 4 });
    const rows = [["MODEL", "OW-4 OVERWATCH"], ["SERIAL", "0417-C9-2288"], ["MTOW", "9.2 kg"], ["RATING", "IP55  -20 / +50 C"]];
    rows.forEach(([a, b], i) => {
      const y = 52 + i * 22;
      c.fillStyle = "#2a2c2f";
      c.fillRect(16, y + 19, w - 32, 1);
      label(c, a, 18, y + 2, 60, 15, { color: "#2a2c2f", family: ST4, align: "left" });
      label(c, b, 84, y + 2, w - 102, 15, { color: "#101112", font: "900", family: ST4, align: "left" });
    });
    for (const [x, y] of [[14, 14], [w - 14, 14], [14, h - 14], [w - 14, h - 14]]) {
      c.fillStyle = "#4a4d51";
      c.beginPath();
      c.arc(x, y, 4, 0, TAU6);
      c.fill();
    }
    wear(c, w, h, r, 0.2, 6);
  });
  add("front", 760, 166, 120, 120, (c, w, h, r) => {
    c.fillStyle = "#c8480c";
    c.beginPath();
    c.moveTo(w / 2, 6);
    c.lineTo(w - 14, 62);
    c.lineTo(w / 2 + 16, 62);
    c.lineTo(w / 2 + 16, 80);
    c.lineTo(w / 2 - 16, 80);
    c.lineTo(w / 2 - 16, 62);
    c.lineTo(14, 62);
    c.closePath();
    c.fill();
    label(c, "FRONT", 8, 86, w - 16, 28, { color: "#14161a", font: "900", family: ST4, track: 3 });
    wear(c, w, h, r, 0.3, 3);
  });
  add("lens", 500, 234, 250, 50, (c, w, h, r) => {
    label(c, "EO / IR 30x   LRF 1200 m", 4, 6, w - 8, 22, { color: "#17181a", font: "900", family: ST4 });
    label(c, "DO NOT TOUCH OPTICS", 4, 30, w - 8, 14, { color: "#c8480c", family: ST4, track: 2 });
    wear(c, w, h, r, 0.25, 2);
  });
  add("chev", 320, 294, 420, 56, (c, w, h, r) => {
    c.fillStyle = "#d4540e";
    c.fillRect(0, 0, w, h);
    c.fillStyle = "#14130f";
    for (let x = -h; x < w + h; x += 56) {
      c.beginPath();
      c.moveTo(x, h);
      c.lineTo(x + 28, h);
      c.lineTo(x + 28 + h, 0);
      c.lineTo(x + h, 0);
      c.closePath();
      c.fill();
    }
    wear(c, w, h, r, 0.4, 6);
  });
  add("lift", 320, 358, 240, 56, (c, w, h, r) => {
    c.strokeStyle = "#14161a";
    c.lineWidth = 3;
    c.strokeRect(3, 3, w - 6, h - 6);
    label(c, "LIFT HERE", 50, 10, w - 100, 34, { color: "#14161a", font: "900", family: ST4, track: 3 });
    for (const x of [26, w - 26]) {
      c.fillStyle = "#14161a";
      c.beginPath();
      c.moveTo(x, 10);
      c.lineTo(x + 14, 30);
      c.lineTo(x - 14, 30);
      c.closePath();
      c.fill();
      c.fillRect(x - 4, 30, 8, 16);
    }
    wear(c, w, h, r, 0.3, 3);
  });
  const A = atlas(1024, 512, E, 41);
  A.aspect = (n) => E[n][2] / E[n][3];
  ATL2 = A;
  return A;
}
var ST3 = [[-0.238, 0.088, 0.044, 0.042, 2.6], [-0.228, 0.101, 0.052, 0.048, 3], [-0.17, 0.114, 0.061, 0.054, 3.2], [-0.07, 0.123, 0.068, 0.059, 3], [0.03, 0.125, 0.07, 0.06, 2.8], [0.12, 0.116, 0.066, 0.058, 2.6], [0.185, 0.097, 0.056, 0.053, 2.4], [0.222, 0.074, 0.043, 0.045, 2.2], [0.24, 0.05, 0.03, 0.034, 2.1]];
var SEAM = -0.014;
function station(z) {
  let i = 0;
  while (i < ST3.length - 2 && z > ST3[i + 1][0]) i++;
  const a = ST3[Math.max(0, i - 1)], b = ST3[i], c = ST3[i + 1], d = ST3[Math.min(ST3.length - 1, i + 2)], w = c[0] - b[0], t = clamp4((z - b[0]) / w), t2 = t * t, t3 = t2 * t, o = [z];
  for (let k = 1; k < 5; k++) {
    const m0 = (c[k] - a[k]) / (c[0] - a[0]) * w, m1 = (d[k] - b[k]) / (d[0] - b[0]) * w;
    o.push((2 * t3 - 3 * t2 + 1) * b[k] + (t3 - 2 * t2 + t) * m0 + (-2 * t3 + 3 * t2) * c[k] + (t3 - t2) * m1);
  }
  return o;
}
var arc = (u, n) => Math.pow(1 - Math.pow(Math.min(0.999, Math.abs(u)), n), 1 / n);
var shellX = (y, z) => {
  const s = station(z);
  return s[1] * arc(y / (y >= 0 ? s[2] : s[3]), s[4]);
};
var shellTop = (x, z) => {
  const s = station(z);
  return s[2] * arc(x / s[1], s[4]);
};
var shellBot = (x, z) => {
  const s = station(z);
  return -s[3] * arc(x / s[1], s[4]);
};
function loft(rings, capA = true, capB = true) {
  const n = rings.length, m = rings[0].length, pos = [], idx = [], cen = (r) => {
    const c2 = [0, 0, 0];
    for (const p of r) {
      c2[0] += p[0] / m;
      c2[1] += p[1] / m;
      c2[2] += p[2] / m;
    }
    return c2;
  };
  for (const r of rings) for (const p of r) pos.push(p[0], p[1], p[2]);
  const c0 = cen(rings[0]), c1 = cen(rings[n - 1]), a = rings[0][0], b = rings[0][1], c = rings[1][0];
  const nx = (b[1] - a[1]) * (c[2] - a[2]) - (b[2] - a[2]) * (c[1] - a[1]), ny = (b[2] - a[2]) * (c[0] - a[0]) - (b[0] - a[0]) * (c[2] - a[2]), nz = (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
  const out = nx * (a[0] - c0[0]) + ny * (a[1] - c0[1]) + nz * (a[2] - c0[2]) > 0;
  for (let i = 0; i < n - 1; i++) for (let j = 0; j < m; j++) {
    const A = i * m + j, B2 = i * m + (j + 1) % m, C2 = A + m, D = B2 + m;
    out ? idx.push(A, B2, C2, B2, D, C2) : idx.push(A, C2, B2, B2, C2, D);
  }
  const parts = [fromArrays(pos, null, null, idx)];
  const cap2 = (r, cc, first) => {
    const p = [cc[0], cc[1], cc[2]], ix = [];
    for (const q of r) p.push(q[0], q[1], q[2]);
    for (let j = 0; j < m; j++) {
      const A = 1 + j, B2 = 1 + (j + 1) % m;
      (first ? out : !out) ? ix.push(0, B2, A) : ix.push(0, A, B2);
    }
    return fromArrays(p, null, null, ix);
  };
  if (capA) parts.push(cap2(rings[0], c0, true));
  if (capB) parts.push(cap2(rings[n - 1], c1, false));
  return parts.length > 1 ? merge(parts) : parts[0];
}
function wrap(P3, A, name, w, at, side2) {
  const h = w / A.aspect(name), g2 = quadXY(w, h, A.rect(name), 10, 3), Q2 = g2.attributes.position;
  if (side2 === "top") g2.rotateX(-H);
  else if (side2 === "bot") {
    g2.rotateX(H);
  } else g2.rotateY(side2 * H);
  for (let i = 0; i < Q2.count; i++) {
    let x = Q2.getX(i) + at[0], y = Q2.getY(i) + at[1], z = Q2.getZ(i) + at[2];
    if (side2 === "top") y = shellTop(x, z) + 9e-4;
    else if (side2 === "bot") y = shellBot(x, z) - 9e-4;
    else x = side2 * (shellX(y, z) + 9e-4);
    Q2.setXYZ(i, x, y, z);
  }
  g2.computeVertexNormals();
  P3.add("decalUav", g2);
  return g2;
}
var shift = (P3, dy) => {
  for (const arr of P3.B.map.values()) for (const g2 of arr) g2.translate(0, dy, 0);
  return P3;
};
var done = (P3, grime = 0.55) => shift(P3.pop().finish({ grime, ground: 1e-3 }), -LIFT);
function uavBody(A) {
  const P3 = new Prop("uav", 4), C2 = COL;
  P3.push({ p: [0, LIFT, 0] });
  {
    const NZ = 28, NA = 40, rings = [];
    for (let i = 0; i < NZ; i++) {
      const z = -0.238 + 0.478 * (0.5 - 0.5 * Math.cos(PI5 * i / (NZ - 1))), s = station(z), e = 2 / s[4], r = [];
      for (let j = 0; j < NA; j++) {
        const a = j / NA * TAU6, ca = Math.cos(a), sa = Math.sin(a);
        r.push([s[1] * sp(ca, e), (sa >= 0 ? s[2] : s[3]) * sp(sa, e), z]);
      }
      rings.push(r);
    }
    P3.add("plastic", paint(loft(rings), C2.shell, { jit: 0.03, fn: (x, y) => y < SEAM ? C2.belly : null }));
    const pts = [], N = 30;
    for (let i = 0; i <= N; i++) {
      const z = -0.236 + 0.474 * i / N;
      pts.push([shellX(SEAM, z) + 6e-4, SEAM, z]);
    }
    for (let i = N; i >= 0; i--) {
      const z = -0.236 + 0.474 * i / N;
      pts.push([-shellX(SEAM, z) - 6e-4, SEAM, z]);
    }
    P3.add("rubber", tube(pts, 24e-4, 6, { closed: true, samples: 0 }), [0.45, 0.45, 0.45]);
  }
  P3.add("trim", softBox(0.07, 0.016, 0.3, 6e-3, 3), C2.dk, { p: [0, 0.064, -0.02] });
  for (const s of [-1, 1]) P3.box("plastic", 6e-3, 7e-3, 0.27, s * 0.0395, 0.0705, -0.02, { col: C2.shell, b: 2e-3 });
  P3.box("black", 0.054, 2e-3, 0.07, 0, 0.0722, -0.122, { b: 0 });
  for (let i = 0; i < 8; i++) P3.box("trim", 0.052, 26e-4, 75e-4, 0, 0.0742, -0.153 + i * 88e-4, { col: C2.blk, r: [0.55, 0, 0], b: 8e-4 });
  for (const [x, z] of [[-0.03, -0.163], [0.03, -0.163], [-0.03, -0.082], [0.03, -0.082], [-0.03, 0.118], [0.03, 0.118]]) hex(P3, x, 0.0725, z, "y", 32e-4, 3e-3, "steel", C2.brt);
  P3.cyl("trim", 0.012, 6e-3, 0, 0.075, 0.06, { seg: 14, col: C2.blk, cham: 2e-3 });
  P3.lathe("emWhiteB", [[95e-4, 0], [95e-4, 5e-3], [7e-3, 95e-4], [0, 0.0115]], { seg: 12, p: [0, 0.078, 0.06] });
  P3.cyl("trim", 0.013, 6e-3, 0, 0.075, -0.048, { seg: 14, col: C2.blk, cham: 2e-3 });
  P3.cyl("steel", 45e-4, 0.082, 0, 0.118, -0.048, { seg: 10, col: C2.anod });
  P3.lathe("plastic", [[0, 0], [0.03, 0], [0.036, 4e-3], [0.036, 0.012], [0.03, 0.018], [0, 0.02]], { seg: 22, p: [0, 0.157, -0.048], col: C2.wht });
  P3.add("plastic", ring(0.0362, 11e-4, { seg: 22, radial: 4 }), C2.org, { p: [0, 0.165, -0.048], r: [H, 0, 0] });
  P3.tube("rubber", [[6e-3, 0.157, -0.048], [0.011, 0.14, -0.05], [7e-3, 0.11, -0.046], [0.011, 0.088, -0.05], [0.016, 0.074, -0.056]], 18e-4, { col: [0.2, 0.2, 0.2] });
  {
    const fin = extrude([[-0.222, 0.05], [-0.16, 0.058], [-0.175, 0.1], [-0.205, 0.118], [-0.228, 0.112]], -3e-3, 3e-3, 12e-4);
    fin.rotateY(-H);
    P3.add("plastic", paint(fin, C2.shell, { jit: 0.03, fn: (x, y) => y > 0.1 ? C2.org : null }));
  }
  if (A) {
    P3.quad("decalUav", 0.06, 0.06 / A.aspect("idL"), A.rect("idL"), { p: [0, 0.0728, 5e-3], r: [-H, 0, PI5] });
    P3.quad("decalUav", 0.036, 0.036, A.rect("front"), { p: [0, 0.0728, 0.098], r: [-H, 0, PI5] });
  }
  for (const s of [-1, 1]) {
    const x = s * 0.041;
    P3.add("plastic", softBox(0.074, 0.058, 0.03, 8e-3, 2), [0.16, 0.165, 0.175], { p: [x, 2e-3, -0.246] });
    P3.box("plastic", 0.03, 9e-3, 8e-3, x, 0.034, -0.258, { col: C2.org, b: 2e-3 });
    P3.add("rubber", ring(0.011, 22e-4, { seg: 10, radial: 5, a0: 0, a1: PI5 }), [0.3, 0.3, 0.3], { p: [x, -0.026, -0.2605], r: [-H, 0, 0] });
    for (let i = 0; i < 4; i++) P3.cyl(i < 3 ? "ledGreen" : "black", 28e-4, 2e-3, x - 0.018 + i * 0.012, 0.02, -0.2612, { axis: "z", seg: 8, cham: 0 });
    if (A) P3.quad("decalUav", 0.052, 0.052 / A.aspect("batt"), A.rect("batt"), { p: [x, -3e-3, -0.2613], r: [0, PI5, 0] });
  }
  P3.add("glass", softBox(0.086, 0.034, 0.02, 8e-3, 2), null, { p: [0, 4e-3, 0.231] });
  P3.lathe("trim", [[0.0125, 0], [0.0125, 8e-3], [0.0105, 0.0105], [85e-4, 0.0105], [85e-4, 6e-3]], { axis: "z", seg: 14, p: [0, 4e-3, 0.2395], col: C2.blk });
  P3.lathe("glass", [[85e-4, 62e-4], [6e-3, 88e-4], [0, 98e-4]], { axis: "z", seg: 12, p: [0, 4e-3, 0.2395] });
  for (const s of [-1, 1]) {
    P3.add("trim", ring(66e-4, 13e-4, { seg: 12, radial: 4 }), C2.blk, { p: [s * 0.027, 6e-3, 0.2412] });
    P3.cyl("glass", 58e-4, 2e-3, s * 0.027, 6e-3, 0.2412, { axis: "z", seg: 10, cham: 0 });
    P3.cyl("ledRed", 17e-4, 2e-3, s * 0.0145, -6e-3, 0.2413, { axis: "z", seg: 6, cham: 0 });
  }
  P3.box("black", 0.05, 6e-3, 4e-3, 0, -0.021, 0.2335, { b: 0, r: [0.3, 0, 0] });
  for (let i = 0; i < 5; i++) P3.box("trim", 22e-4, 7e-3, 4e-3, -0.02 + i * 0.01, -0.021, 0.2345, { col: C2.dk, r: [0.3, 0, 0], b: 6e-4 });
  for (const s of [-1, 1]) {
    const x = s * (shellX(0.014, 0.03) + 2e-3);
    P3.add("trim", softBox(0.012, 0.03, 0.078, 5e-3, 2), C2.blk, { p: [x, 0.014, 0.03] });
    for (const dz of [-0.021, 0.021]) {
      P3.cyl("glass", 62e-4, 3e-3, x + s * 55e-4, 0.014, 0.03 + dz, { axis: "x", seg: 10, cham: 0 });
      P3.add("trim", ring(7e-3, 12e-4, { seg: 12, radial: 4 }), C2.dk, { p: [x + s * 62e-4, 0.014, 0.03 + dz], r: [0, H, 0] });
    }
    if (A) {
      wrap(P3, A, "cea", 0.118, [0, 0.022, -0.082], s);
      wrap(P3, A, "warn", 0.05, [0, 0.03, 0.128], s);
      wrap(P3, A, "lift", 0.05, [0, -0.034, -0.02], s);
    }
  }
  P3.cyl("black", 0.029, 2e-3, 0, -0.0572, -0.11, { seg: 18, cham: 0 });
  P3.add("trim", ring(0.03, 3e-3, { seg: 22, radial: 5 }), C2.dk, { p: [0, -0.058, -0.11], r: [H, 0, 0] });
  P3.add("trim", ring(0.016, 16e-4, { seg: 16, radial: 4 }), C2.dk, { p: [0, -0.0592, -0.11], r: [H, 0, 0] });
  for (let i = 0; i < 3; i++) {
    const a = i * PI5 / 3;
    P3.bar("trim", [Math.cos(a) * 0.029, -0.0592, -0.11 + Math.sin(a) * 0.029], [-Math.cos(a) * 0.029, -0.0592, -0.11 - Math.sin(a) * 0.029], 15e-4, { col: C2.dk, seg: 5 });
  }
  P3.cyl("trim", 7e-3, 4e-3, 0, -0.0595, -0.11, { seg: 10, col: C2.dk, cham: 1e-3 });
  for (const s of [-1, 1]) {
    P3.add("trim", ring(78e-4, 15e-4, { seg: 12, radial: 4 }), C2.dk, { p: [s * 0.021, -0.0603, 0.03], r: [H, 0, 0] });
    P3.cyl("glass", 7e-3, 2e-3, s * 0.021, -0.0602, 0.03, { seg: 10, cham: 0 });
  }
  P3.cyl("lampDim", 55e-4, 3e-3, 0, -0.0605, 0.03, { seg: 10, cham: 0 });
  P3.add("trim", softBox(0.042, 0.02, 0.046, 5e-3, 2), C2.dk, { p: [0, -0.06, -0.18] });
  P3.cyl("galv", 9e-3, 0.046, 0, -0.068, -0.18, { axis: "x", seg: 12, col: C2.anod });
  P3.add("steel", ring(0.011, 28e-4, { seg: 14, radial: 6, a0: -0.5, a1: PI5 + 1 }), C2.brt, { p: [0, -0.084, -0.18], r: [0, H, 0] });
  for (const s of [-1, 1]) hex(P3, s * 0.016, -0.0705, -0.166, "y", 3e-3, 3e-3, "steel", C2.brt);
  P3.socket("hook", [0, -0.094, -0.18]);
  if (A) {
    wrap(P3, A, "idL", 0.088, [0, 0, -0.035], "bot");
    wrap(P3, A, "plate", 0.05, [0.058, 0, -0.165], "bot");
  }
  for (const [sx, sz] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) {
    const R0 = [sx * 0.098, 0.014, sz * 0.132], M0 = [sx * UAV.motor[0], UAV.motor[1], sz * UAV.motor[2]], dx = M0[0] - R0[0], dy = M0[1] - R0[1], dz = M0[2] - R0[2], hz = Math.hypot(dx, dz), L = Math.hypot(hz, dy), yaw = Math.atan2(dx, dz);
    P3.push({ p: R0, r: [0, yaw, 0] });
    P3.push({ r: [-Math.atan2(dy, hz), 0, 0] });
    P3.add("plastic", softBox(0.064, 0.05, 0.056, 0.014, 3), C2.shell, { p: [0, 0, -0.016] });
    P3.add("galv", softBox(0.05, 0.042, 0.058, 7e-3, 2), C2.anod, { p: [0, 0, 0.022] });
    P3.cyl("steel", 72e-4, 0.05, 0, 0, 0.018, { seg: 10, col: C2.brt });
    hex(P3, 0, 0.0255, 0.018, "y", 62e-4, 4e-3, "steel", C2.brt);
    hex(P3, 0, -0.0255, 0.018, "y", 62e-4, 4e-3, "steel", C2.brt);
    P3.box("plastic", 0.011, 8e-3, 0.036, 0.029, 0.01, 0.02, { col: C2.org, b: 2e-3, r: [0, 0.2, 0] });
    for (const s of [-1, 1]) hex(P3, s * 0.0255, 2e-3, 0.04, "x", 34e-4, 3e-3, "steel", C2.brt);
    P3.bar("carbon", [0, 0, 0.045], [0, 0, L - 0.045], 0.0155, { seg: 16, caps: false });
    for (const z of [0.058, L - 0.066]) {
      P3.cyl("galv", 0.0188, 0.017, 0, 0, z, { axis: "z", seg: 16, col: C2.alu, cham: 2e-3 });
      P3.box("galv", 0.012, 0.01, 0.017, 0, 0.021, z, { col: C2.alu, b: 2e-3 });
      hex(P3, 65e-4, 0.0215, z, "x", 3e-3, 3e-3, "steel", C2.brt);
    }
    P3.add("trim", softBox(0.03, 0.015, 0.064, 4e-3, 2), C2.dk, { p: [0, -0.0235, L - 0.125] });
    for (let i = 0; i < 7; i++) P3.box("galv", 0.027, 5e-3, 18e-4, 0, -0.0325, L - 0.151 + i * 87e-4, { col: C2.alu, b: 5e-4 });
    P3.tube("rubber", [[5e-3, -0.021, 0.03], [4e-3, -0.0195, 0.09], [4e-3, -0.0195, L - 0.165], [3e-3, -0.021, L - 0.157]], 34e-4, { col: [0.22, 0.22, 0.22] });
    P3.tube("rubber", [[-6e-3, -0.026, L - 0.093], [-8e-3, -0.03, L - 0.07], [-6e-3, -0.024, L - 0.045], [0, -0.014, L - 0.03]], 26e-4, { col: [0.5, 0.12, 0.08] });
    for (const z of [0.1, 0.16]) P3.add("rubber", ring(0.0178, 13e-4, { seg: 14, radial: 4 }), [0.6, 0.6, 0.6], { p: [0, -22e-4, z] });
    if (A && sz > 0) P3.quad("decalUav", 0.05, 0.05 / A.aspect("chev"), A.rect("chev"), { p: [0, 0.0159, L * 0.52], r: [-H, 0, H] });
    P3.pop();
    P3.pop();
    P3.push({ p: M0, r: [0, yaw, 0] });
    P3.lathe("galv", [[0, -0.013], [0.028, -0.013], [0.04, -6e-3], [0.0405, 0], [0.036, 15e-4], [0, 15e-4]], { seg: 22, col: C2.alu });
    P3.add("plastic", softBox(0.042, 0.036, 0.052, 9e-3, 2), C2.org, { p: [0, -3e-3, -0.044] });
    for (let i = 0; i < 4; i++) {
      const a = PI5 / 4 + i * H;
      hex(P3, Math.cos(a) * 0.03, -0.0118, Math.sin(a) * 0.03, "y", 3e-3, 3e-3, "steel", C2.brt);
    }
    P3.cyl("galv", 0.034, 7e-3, 0, 5e-3, 0, { seg: 22, col: C2.anod, cham: 1e-3 });
    P3.cyl("steel", 0.0318, 0.015, 0, 0.014, 0, { seg: 22, col: C2.cu, cham: 0 });
    for (let i = 0; i < 12; i++) {
      const a = i * TAU6 / 12;
      P3.box("black", 3e-3, 0.0125, 22e-4, Math.cos(a) * 0.0318, 0.014, Math.sin(a) * 0.0318, { b: 0, r: [0, -a, 0] });
    }
    P3.lathe("galv", [[0.0372, 0.0135], [0.0392, 0.0145], [0.0392, 0.031], [0.036, 0.0348], [0.016, 0.0368], [0.0125, 0.04], [0, 0.04]], { seg: 24, col: C2.anod });
    for (let i = 0; i < 6; i++) {
      const a = i * TAU6 / 6 + 0.3;
      P3.cyl("black", 52e-4, 2e-3, Math.cos(a) * 0.0262, 0.0362, Math.sin(a) * 0.0262, { seg: 8, cham: 0, r: [Math.sin(a) * 0.09, 0, -Math.cos(a) * 0.09] });
    }
    P3.add("plastic", ring(0.0394, 11e-4, { seg: 24, radial: 4 }), C2.org, { p: [0, 0.029, 0], r: [H, 0, 0] });
    P3.cyl("trim", 0.0115, 4e-3, 0, -0.0145, 0, { seg: 12, col: C2.blk, cham: 1e-3 });
    P3.lathe(sz > 0 ? "emRed" : "ledGreen", [[0, 0], [9e-3, 0], [9e-3, 4e-3], [62e-4, 88e-4], [0, 0.0102]], { seg: 12, p: [0, -0.016, 0], r: [PI5, 0, 0] });
    P3.pop();
  }
  for (const s of [-1, 1]) {
    P3.add("trim", softBox(0.032, 0.03, 0.074, 6e-3, 2), C2.dk, { p: [s * 0.1, -0.044, 0] });
    P3.cyl("galv", 0.0115, 0.052, s * 0.112, -0.05, 0, { axis: "z", seg: 12, col: C2.anod });
    for (const z of [-0.028, 0.028]) hex(P3, s * 0.117, -0.036, z, "x", 32e-4, 3e-3, "steel", C2.brt);
    P3.bar("carbon", [s * 0.108, -0.05, 0], [s * 0.205, -0.285, 0], 0.0105, { seg: 14 });
    for (const z of [-0.05, 0.05]) P3.bar("galv", [s * 0.07, -0.056, z], [s * 0.162, -0.186, 0], 42e-4, { col: C2.alu, seg: 8 });
    P3.cyl("galv", 0.0135, 0.02, s * 0.162, -0.186, 0, { seg: 12, col: C2.alu, r: [0, 0, s * 0.39] });
    P3.add("trim", softBox(0.032, 0.032, 0.054, 8e-3, 2), C2.dk, { p: [s * 0.205, -0.288, 0] });
    hex(P3, s * 0.222, -0.288, 0, "x", 36e-4, 3e-3, "steel", C2.brt);
    P3.bar("carbon", [s * 0.205, -0.29, -0.176], [s * 0.205, -0.29, 0.176], 0.011, { seg: 14 });
    for (const z of [-0.132, 0.132]) {
      P3.cyl("rubber", 0.019, 0.072, s * 0.205, -0.29, z, { axis: "z", seg: 14, col: [0.2, 0.2, 0.2], cham: 6e-3 });
      P3.cyl("plastic", 0.0122, 8e-3, s * 0.205, -0.29, z + Math.sign(z) * 0.047, { axis: "z", seg: 12, col: C2.org, cham: 2e-3 });
    }
    for (const z of [-0.047, 0.047]) {
      P3.push({ p: [s * 0.124, -0.058, z], r: [0, 0, s * 0.42] });
      P3.cyl("trim", 52e-4, 0.012, 0, -4e-3, 0, { seg: 8, col: C2.dk });
      P3.add("trim", softBox(45e-4, 0.088, 0.026, 2e-3, 1), [0.07, 0.07, 0.075], { p: [0, -0.054, 0] });
      P3.box("plastic", 49e-4, 6e-3, 0.0264, 0, -0.088, 0, { col: C2.wht, b: 8e-4 });
      P3.pop();
    }
  }
  P3.add("trim", softBox(0.088, 7e-3, 0.088, 4e-3, 1), C2.dk, { p: [0, -0.061, 0.128] });
  P3.add("galv", softBox(0.08, 5e-3, 0.08, 25e-4, 1), C2.alu, { p: [0, -0.0815, 0.128] });
  for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    P3.lathe("rubber", [[0, 0], [58e-4, 8e-4], [96e-4, 7e-3], [58e-4, 0.0132], [0, 0.014]], { seg: 12, p: [x * 0.03, -0.0785, 0.128 + z * 0.03], col: [0.72, 0.2, 0.1] });
    hex(P3, x * 0.03, -0.085, 0.128 + z * 0.03, "y", 3e-3, 3e-3, "steel", C2.brt);
  }
  P3.cyl("galv", 0.0245, 0.026, 0, -0.097, 0.128, { seg: 20, col: C2.anod, cham: 3e-3 });
  P3.add("plastic", ring(0.0247, 1e-3, { seg: 20, radial: 4 }), C2.org, { p: [0, -0.09, 0.128], r: [H, 0, 0] });
  P3.tube("rubber", [[0.02, -0.062, 0.09], [0.03, -0.074, 0.084], [0.03, -0.09, 0.096], [0.022, -0.098, 0.112]], 28e-4, { col: [0.2, 0.2, 0.2] });
  return done(P3);
}
function uavRotor(dirn = 1) {
  const P3 = new Prop("uavRotor" + (dirn > 0 ? "A" : "B"), 5), C2 = COL;
  P3.push({ p: [0, LIFT, 0] });
  P3.lathe("galv", [[0, 0], [0.0125, 0], [0.0125, 4e-3], [0.019, 6e-3], [0.019, 0.018], [0.016, 0.021], [6e-3, 0.021], [6e-3, 0.027], [0, 0.027]], { seg: 18, col: [0.5, 0.5, 0.53] });
  P3.cyl("steel", 68e-4, 6e-3, 0, 0.0295, 0, { seg: 6, col: C2.brt, cham: 15e-4 });
  const FOIL = [[1, 0], [0.82, 0.03], [0.55, 0.062], [0.28, 0.076], [0.09, 0.055], [0, 0], [0.07, -0.026], [0.3, -0.033], [0.6, -0.026], [0.85, -0.011]], y0 = 0.0125, NS = 14;
  const rings = [];
  for (let i = 0; i <= NS; i++) {
    const s = i / NS, tipK = i === NS ? 0.42 : 1, r = 0.028 + 0.234 * s + (i === NS ? 4e-3 : 0), c = (0.02 + 0.021 * sstep(0, 0.3, s) - 0.024 * sstep(0.35, 1, s)) * tipK, th = 0.42 - 0.3 * s, thick = lerp4(2, 1, sstep(0, 0.14, s)) * lerp4(1, 0.75, s), sw = 0.014 * sstep(0.78, 1, s), ct = Math.cos(th), st = Math.sin(th);
    rings.push(FOIL.map(([u, v]) => {
      const cu = (u - 0.3) * c, cv = v * c * thick;
      return [r, y0 - cu * st + cv * ct, (cu * ct + cv * st + sw) * dirn];
    }));
  }
  for (const a of [0, PI5]) {
    P3.push({ r: [0, a, 0] });
    P3.add("carbon", loft(rings.slice(0, NS - 1), true, false));
    P3.add("plastic", loft(rings.slice(NS - 2), false, true), C2.org, { jit: 0.02 });
    for (const y of [68e-4, 0.0186]) P3.box("galv", 0.034, 36e-4, 0.018, 0.025, y, 0, { col: C2.anod, b: 1e-3 });
    P3.cyl("steel", 34e-4, 0.019, 0.033, 0.0127, 0, { seg: 8, col: C2.brt });
    hex(P3, 0.033, 0.0215, 0, "y", 42e-4, 3e-3, "steel", C2.brt);
    P3.pop();
  }
  return done(P3, 0.3);
}
function uavYoke() {
  const P3 = new Prop("uavYoke", 6), C2 = COL, py2 = UAV.pitchY;
  P3.push({ p: [0, LIFT, 0] });
  P3.cyl("galv", 0.0228, 7e-3, 0, -35e-4, 0, { seg: 20, col: C2.alu, cham: 15e-4 });
  P3.cyl("galv", 0.015, 0.012, 0, -0.012, 0, { seg: 14, col: C2.anod });
  P3.add("galv", softBox(0.156, 0.016, 0.03, 6e-3, 3), C2.anod, { p: [0, -0.02, 0] });
  for (const s of [-1, 1]) {
    P3.add("galv", softBox(0.012, 0.074, 0.03, 5e-3, 2), C2.anod, { p: [s * 0.072, -0.055, 0] });
    P3.box("black", 0.0125, 0.03, 0.01, s * 0.072, -0.05, 0, { b: 0 });
    hex(P3, s * 0.0785, -0.024, 9e-3, "x", 3e-3, 3e-3, "steel", C2.brt);
    hex(P3, s * 0.0785, -0.024, -9e-3, "x", 3e-3, 3e-3, "steel", C2.brt);
  }
  P3.cyl("galv", 0.0205, 0.024, 0.089, py2, 0, { axis: "x", seg: 18, col: C2.alu, cham: 3e-3 });
  P3.add("plastic", ring(0.0207, 1e-3, { seg: 18, radial: 4 }), C2.org, { p: [0.094, py2, 0], r: [0, H, 0] });
  P3.cyl("trim", 0.011, 3e-3, 0.1015, py2, 0, { axis: "x", seg: 12, col: C2.blk, cham: 1e-3 });
  P3.cyl("galv", 0.0125, 0.01, -0.082, py2, 0, { axis: "x", seg: 14, col: C2.alu, cham: 2e-3 });
  hex(P3, -0.088, py2, 0, "x", 5e-3, 3e-3, "steel", C2.brt);
  P3.tube("rubber", [[0.022, -0.012, -0.012], [0.05, -0.016, -0.028], [0.086, -0.036, -0.03], [0.094, -0.06, -0.022], [0.092, py2 + 4e-3, -0.014]], 26e-4, { col: [0.2, 0.2, 0.2] });
  return done(P3, 0.4);
}
function uavHead(A) {
  const P3 = new Prop("uavHead", 7), C2 = COL, L = UAV.lamp;
  P3.push({ p: [0, LIFT, 0] });
  P3.add("plastic", softBox(0.11, 0.07, 0.092, 0.014, 4), [0.58, 0.6, 0.6]);
  P3.add("glass", softBox(0.098, 0.058, 8e-3, 4e-3, 1), null, { p: [0, 0, 0.0455] });
  P3.lathe("galv", [[0.0215, 0], [0.0215, 0.016], [0.0198, 0.02], [0.0172, 0.02], [0.0172, 0.011]], { axis: "z", seg: 20, p: [-0.022, 2e-3, 0.049], col: C2.anod });
  P3.lathe("glass", [[0.0172, 0.0115], [0.012, 0.0152], [0, 0.0168]], { axis: "z", seg: 16, p: [-0.022, 2e-3, 0.049] });
  P3.add("plastic", ring(0.0216, 9e-4, { seg: 20, radial: 4 }), C2.org, { p: [-0.022, 2e-3, 0.0655] });
  for (let i = 0; i < 3; i++) P3.add("galv", ring(0.0217, 6e-4, { seg: 20, radial: 4 }), C2.alu, { p: [-0.022, 2e-3, 0.053 + i * 3e-3] });
  P3.lathe("galv", [[0.0148, 0], [0.0148, 8e-3], [0.013, 0.0105], [0.0115, 0.0105], [0.0115, 6e-3]], { axis: "z", seg: 16, p: [0.027, 9e-3, 0.049], col: C2.anod });
  P3.lathe("chrome", [[0.0115, 62e-4], [8e-3, 86e-4], [0, 96e-4]], { axis: "z", seg: 14, p: [0.027, 9e-3, 0.049], col: [0.42, 0.3, 0.6] });
  P3.add("trim", ring(66e-4, 14e-4, { seg: 12, radial: 4 }), C2.blk, { p: [0.03, -0.017, 0.0498] });
  P3.cyl("glass", 58e-4, 2e-3, 0.03, -0.017, 0.0498, { axis: "z", seg: 10, cham: 0 });
  for (let i = 0; i < 3; i++) P3.cyl("ledRed", 19e-4, 2e-3, 6e-3 + i * 65e-4, -0.02, 0.0498, { axis: "z", seg: 6, cham: 0 });
  for (let i = 0; i < 7; i++) P3.box("galv", 0.074, 7e-3, 24e-4, 0, 0.0365, -0.036 + i * 72e-4, { col: C2.alu, b: 6e-4 });
  P3.add("trim", softBox(0.05, 0.034, 8e-3, 3e-3, 1), C2.dk, { p: [0, 2e-3, -0.0475] });
  for (const [x, y] of [[-0.02, 0.014], [0.02, 0.014], [-0.02, -0.01], [0.02, -0.01]]) hex(P3, x, y, -0.0518, "z", 26e-4, 2e-3, "steel", C2.brt);
  for (const s of [-1, 1]) P3.cyl("galv", 0.016, 7e-3, s * 0.0575, 0, 0, { axis: "x", seg: 16, col: C2.alu, cham: 15e-4 });
  if (A) P3.quad("decalUav", 0.066, 0.066 / A.aspect("lens"), A.rect("lens"), { p: [0, 0.0353, 0.022], r: [-H, 0, PI5] });
  P3.box("galv", 0.05, 8e-3, 0.03, 0, -0.037, 2e-3, { col: C2.alu, b: 2e-3 });
  for (const s of [-1, 1]) P3.box("galv", 5e-3, 0.02, 0.022, s * 0.027, -0.05, 2e-3, { col: C2.alu, b: 15e-4 });
  P3.push({ p: [L[0], L[1], L[2] - 0.03] });
  P3.lathe("galv", [[0, -0.034], [0.02, -0.034], [0.0235, -0.03], [0.0235, -2e-3], [0.03, 6e-3], [0.031, 0.03], [0.0288, 0.034], [0.0262, 0.034], [0.0262, 0.03]], { axis: "z", seg: 22, col: C2.anod });
  for (let i = 0; i < 5; i++) P3.cyl("galv", 0.0275, 22e-4, 0, 0, -0.028 + i * 56e-4, { axis: "z", seg: 20, col: C2.alu, cham: 5e-4 });
  P3.lathe("chrome", [[0.0262, 0.03], [0.0165, 0.02], [9e-3, 0.0135], [75e-4, 0.012], [0, 0.012]], { axis: "z", seg: 22, col: C2.brt });
  P3.cyl("lampCool", 78e-4, 3e-3, 0, 0, 0.0132, { axis: "z", seg: 14, cham: 0 });
  P3.add("plastic", ring(0.0312, 1e-3, { seg: 22, radial: 4 }), C2.org, { p: [0, 0, 0.0285] });
  P3.tube("rubber", [[0.012, 0, -0.034], [0.02, 0.012, -0.044], [0.016, 0.03, -0.046]], 24e-4, { col: [0.2, 0.2, 0.2] });
  P3.pop();
  return done(P3, 0.4);
}
function droneMaterials(G4) {
  const mats = worldMaterials(G4);
  if (mats.carbon) return mats;
  mats.carbon = G4.mats.surface("w-carbon", "carbon", { coat: 1, coatRough: 0.07, wetCoat: 0.3, wet: 0.04, wetRough: 0.6, beads: 0.9, macro: 0.05, macroScale: 3, dirt: 0.5, dirtCol: [0.3, 0.28, 0.25] });
  mats.decalUav = new MeshStandardMaterial({ map: droneAtlas().tex, transparent: true, depthWrite: false, roughness: 0.62, metalness: 0, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  return mats;
}
function buildDroneModel(G4) {
  droneMaterials(G4);
  const A = droneAtlas(), root = new Group(), lean = new Group();
  root.add(lean);
  const parts = { body: uavBody(A), rotA: uavRotor(1), rotB: uavRotor(-1), yoke: uavYoke(), head: uavHead(A) };
  const body = propMeshes(G4, parts.body);
  lean.add(body);
  const discMat = new ShaderMaterial({
    transparent: true,
    depthWrite: false,
    side: DoubleSide,
    toneMapped: false,
    uniforms: { uK: { value: 1 }, uT: { value: 0 } },
    vertexShader: "varying vec2 vP; void main(){ vP = position.xz; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
    fragmentShader: "uniform float uK, uT; varying vec2 vP; void main(){ float r = length(vP) / " + UAV.rotorR.toFixed(3) + "; float a = atan(vP.y, vP.x); float body = smoothstep(0.1, 0.2, r) * smoothstep(1.0, 0.95, r); float tip = smoothstep(0.9, 0.94, r) * smoothstep(1.0, 0.975, r); float st = 0.78 + 0.22 * sin(a * 2.0 + uT) * sin(a * 3.0 - uT * 1.7); vec3 c = mix(vec3(0.012, 0.013, 0.016), vec3(0.22, 0.07, 0.01), tip); gl_FragColor = vec4(c, uK * body * (0.3 + 0.14 * (1.0 - r) + 0.2 * tip) * st); }"
  });
  const discGeo = new CircleGeometry(UAV.rotorR, 40).rotateX(-H).translate(0, 0.0125, 0), rotors = [];
  for (const [sx, sz] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) {
    const dirn = sx * sz > 0 ? 1 : -1, g2 = new Group(), blades = propMeshes(G4, dirn > 0 ? parts.rotA : parts.rotB), disc = new Mesh(discGeo, discMat);
    for (const m of blades.children) m.castShadow = false;
    disc.renderOrder = 4;
    disc.castShadow = false;
    g2.add(blades, disc);
    g2.position.set(sx * UAV.motor[0], UAV.motor[1] + UAV.hubY, sz * UAV.motor[2]);
    g2.rotation.y = (sx + sz * 2) * 0.7;
    lean.add(g2);
    rotors.push({ g: g2, dirn, disc, blades });
  }
  const yoke = new Group(), head = new Group();
  yoke.position.set(...UAV.yawPivot);
  head.position.set(0, UAV.pitchY, 0);
  yoke.add(propMeshes(G4, parts.yoke));
  head.add(propMeshes(G4, parts.head));
  yoke.add(head);
  lean.add(yoke);
  let tris = 0;
  const by = {};
  for (const k in parts) {
    const n = parts[k].tris * (k === "rotA" || k === "rotB" ? 2 : 1);
    by[k] = n;
    tris += n;
  }
  return { root, lean, body, rotors, yoke, head, discMat, parts, stats: { tris, parts: by, mats: Object.fromEntries([...parts.body.B.map].map(([k, a]) => [k, a.reduce((s, g2) => s + triCount(g2), 0)])) } };
}
function createDrone(G4, W, look, phys, o = {}) {
  const R4 = G4.render, M = buildDroneModel(G4), B2 = o.bounds, v = new Vector3(), v2 = new Vector3(), q = new Quaternion(), mInv = new Matrix4();
  R4.scene.add(M.root);
  const spot = new SpotLight(14477567, 0, 46, 0.2, 0.55, 1.1);
  spot.layers.set(LAYER_WORLD);
  spot.castShadow = false;
  spot.position.set(UAV.lamp[0], UAV.lamp[1], UAV.lamp[2] + 0.02);
  spot.target.position.set(UAV.lamp[0], UAV.lamp[1], UAV.lamp[2] + 12);
  M.head.add(spot, spot.target);
  if (look) look.addSpot(spot, { beam: o.beam ?? 0.5, range: 36 });
  const LAMP = +(G4.params.uavlamp || 620);
  const FL2 = [[UAV.motor[0], UAV.motor[1] - 0.03, UAV.motor[2], [1, 0.06, 0.03], 0.5], [-UAV.motor[0], UAV.motor[1] - 0.03, UAV.motor[2], [1, 0.06, 0.03], 0.5], [UAV.motor[0], UAV.motor[1] - 0.03, -UAV.motor[2], [0.1, 1, 0.25], 0.5], [-UAV.motor[0], UAV.motor[1] - 0.03, -UAV.motor[2], [0.1, 1, 0.25], 0.5], [...UAV.strobe, [1, 0.97, 0.9], 1.1], [0, 0, 0, [0.82, 0.9, 1], 1.5]];
  const fg = new BufferGeometry(), fp = new Float32Array(FL2.length * 3), fc = new Float32Array(FL2.length * 3), fs = new Float32Array(FL2.length);
  fg.setAttribute("position", new BufferAttribute(fp, 3));
  fg.setAttribute("color", new BufferAttribute(fc, 3));
  fg.setAttribute("fs", new BufferAttribute(fs, 1));
  fg.boundingSphere = new Sphere(new Vector3(), 1e4);
  const flareMat = new ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
    toneMapped: false,
    vertexColors: true,
    uniforms: { uScale: { value: 600 } },
    vertexShader: "attribute float fs; varying vec3 vC; uniform float uScale; void main(){ vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_Position = projectionMatrix * mv; float d = -mv.z; gl_PointSize = clamp(fs * uScale / d, 2.0, 200.0); vC = color * clamp(d / 2.0, 0.0, 1.0); }",
    fragmentShader: "varying vec3 vC; void main(){ vec2 p = gl_PointCoord * 2.0 - 1.0; float r = length(p); float a = exp(-r * r * 7.0) * 0.9 + exp(-r * 2.6) * 0.16 + exp(-abs(p.y) * 22.0) * exp(-abs(p.x) * 2.2) * 0.35; a *= smoothstep(1.0, 0.7, r); gl_FragColor = vec4(vC * a * 0.12, 1.0); }"
  });
  const flares = new Points(fg, flareMat);
  flares.frustumCulled = false;
  flares.renderOrder = 6;
  R4.scene.add(flares);
  const size = new Vector2();
  const cx = (B2.x0 + B2.x1) / 2, cz = (B2.z0 + B2.z1) / 2, ax = Math.max(1.5, (B2.x1 - B2.x0) / 2 - 4.5), az = Math.max(4, (B2.z1 - B2.z0) / 2 - 4);
  const path = (u, out) => out.set(cx + ax * Math.sin(2 * u), 0, cz + az * Math.sin(u));
  const ONE_BODY = /* @__PURE__ */ new Set(["helicopter"]);
  const boxes = [];
  let top = 0;
  for (const it of W.insts || []) {
    const pr = it.prop;
    if (!pr || !pr.min || !pr.max) continue;
    let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9, y1 = -1e9;
    for (let c = 0; c < 8; c++) {
      v.set(c & 1 ? pr.max[0] : pr.min[0], c & 2 ? pr.max[1] : pr.min[1], c & 4 ? pr.max[2] : pr.min[2]).applyMatrix4(it.M);
      x0 = Math.min(x0, v.x);
      x1 = Math.max(x1, v.x);
      z0 = Math.min(z0, v.z);
      z1 = Math.max(z1, v.z);
      y1 = Math.max(y1, v.y);
    }
    if (y1 < 4.5) continue;
    const near = !(x1 < B2.x0 - 2 || x0 > B2.x1 + 2 || z1 < B2.z0 - 2 || z0 > B2.z1 + 2);
    boxes.push({ x0: x0 - 1.2, x1: x1 + 1.2, z0: z0 - 1.2, z1: z1 + 1.2, top: y1 + 1.2, near, big: (x1 - x0) * (z1 - z0) > 40 && !ONE_BODY.has(pr.name) });
    if (near) top = Math.max(top, y1);
  }
  const inBox = (x, y, z) => boxes.some((b) => b.near && y - 0.45 < b.top && x > b.x0 && x < b.x1 && z > b.z0 && z < b.z1);
  const inPole = (x, y, z) => boxes.some((b) => !b.big && y - 0.45 < b.top && x > b.x0 && x < b.x1 && z > b.z0 && z < b.z1);
  const segBox = (xa, za, xb, zb, y) => {
    for (let i = 0; i <= 24; i++) {
      const k = i / 24;
      if (inBox(xa + (xb - xa) * k, y, za + (zb - za) * k)) return true;
    }
    return false;
  };
  const hitSeg = (ax0, ay, az0, bx3, by, bz) => {
    const dx = bx3 - ax0, dy = by - ay, dz = bz - az0, l = Math.hypot(dx, dy, dz);
    return l > 1e-4 && !!phys.raycast(ax0, ay, az0, dx / l, dy / l, dz / l, l, "bullet");
  };
  const clearAt = (x, y, z, r = 0.85) => !(inBox(x, y, z) || hitSeg(x - r, y, z, x + r, y, z) || hitSeg(x, y, z - r, x, y, z + r) || hitSeg(x, y + 0.3, z, x, y - 0.45, z) || hitSeg(x - r * 0.7, y - 0.3, z - r * 0.7, x + r * 0.7, y - 0.3, z + r * 0.7) || hitSeg(x + r * 0.7, y - 0.3, z - r * 0.7, x - r * 0.7, y - 0.3, z + r * 0.7));
  const over = Math.min(30, Math.max(7.5, top + 1.5));
  let alt = over;
  for (let h = 7.5; h < over; h += 0.5) {
    let ok = true;
    for (let i = 0; i < 160 && ok; i++) {
      path(i / 160 * TAU6, v);
      path((i + 1) / 160 * TAU6, v2);
      ok = clearAt(v.x, h, v.z) && !hitSeg(v.x, h - 0.35, v.z, v2.x, h - 0.35, v2.z);
    }
    if (ok) {
      alt = h;
      break;
    }
  }
  const columnClear = (x, z, lo, hi = alt) => {
    if (inPole(x, lo, z)) return false;
    for (const [dx, dz] of [[0, 0], [0.7, 0], [-0.7, 0], [0, 0.7], [0, -0.7]]) if (hitSeg(x + dx, hi + 0.3, z + dz, x + dx, lo - 0.5, z + dz)) return false;
    return true;
  };
  const runLevel = (xa, za, xb, zb) => segBox(xa, za, xb, zb, alt) ? over : alt;
  const S4 = { mode: "dock", menu: false, scanT: 0, scanDur: 0, col: null, colT: 0, pp: new Vector3(), depot: new Vector3(), lvl: 0, u: 0.6, pos: new Vector3(), vel: new Vector3(), yaw: 0, aim: new Vector3(), aimT: new Vector3(), lampK: 0, spin: 0, load: 0, tracking: false, alt, job: null, phase: "", phaseT: 0, t: 0, pingT: 0, events: [], hover: null, drops: 0 };
  path(S4.u, S4.pos);
  S4.pos.y = alt;
  S4.aim.set(cx, 0, cz);
  S4.aimT.copy(S4.aim);
  const carry = new Group(), fall = new Group();
  carry.position.set(UAV.hook[0], UAV.hook[1] - 0.2, UAV.hook[2] + 0.1);
  carry.visible = false;
  fall.visible = false;
  M.lean.add(carry);
  R4.scene.add(fall);
  const payloads = o.payloads || {};
  const setPayload = (grp, kind) => {
    while (grp.children.length) grp.remove(grp.children[0]);
    if (payloads[kind]) {
      const c = payloads[kind].clone(true);
      c.position.set(0, 0, 0);
      grp.add(c);
    }
  };
  const drop = { on: false, kind: "ammo", x: 0, z: 0, y: 0, vy: 0, ground: 0, spin: 0 };
  const setVis = (on) => {
    M.root.visible = on;
    flares.visible = on;
  };
  function dock() {
    S4.mode = "dock";
    S4.phase = "";
    S4.job = null;
    S4.scanT = 0;
    S4.tracking = false;
    S4.vel.set(0, 0, 0);
    S4.lampK = 0;
    spot.intensity = 0;
    carry.visible = false;
    setVis(false);
  }
  function nearest(x, z) {
    let best = 1e9;
    for (let i = 0; i < 64; i++) {
      path(i / 64 * TAU6, v2);
      const d = Math.hypot(v2.x - x, v2.z - z);
      if (d < best) {
        best = d;
        S4.u = i / 64 * TAU6;
      }
    }
    path(S4.u, v2);
    return runLevel(x, z, v2.x, v2.z);
  }
  const RING = [[0.8, 1], [1.7, 6], [2.8, 8], [4, 10], [5.5, 12], [7.5, 14]];
  function openColumn(px2, py2, pz2, fx, fz, lvl = null) {
    const a0 = Math.atan2(fx, fz), u0 = S4.u;
    for (const [r, n] of RING) for (let i = 0; i < n; i++) {
      const a = a0 + (i % 2 ? -1 : 1) * Math.ceil(i / 2) * TAU6 / n, x = px2 + Math.sin(a) * r, z = pz2 + Math.cos(a) * r;
      if (!phys.free(x, z)) continue;
      const lo = phys.groundY(x, z) + 2.4, hi = lvl === null ? nearest(x, z) : lvl;
      if (Math.abs(lo - 2.4 - py2) < 1.2 && columnClear(x, z, lo, hi) && !hitSeg(px2, py2 + 1.4, pz2, x, lo, z) && phys.los(px2, py2 + 1.5, pz2, x, lo, z) && phys.los(px2, py2 + 1.5, pz2, x, lo - 1, z)) return { x, z, lo, lvl: hi };
    }
    S4.u = u0;
    return null;
  }
  function launch(p, fwd, sec) {
    const leaving = S4.mode === "away" || S4.mode === "supply" && S4.phase === "climb";
    if (S4.mode !== "dock" && !leaving || S4.menu) return "busy";
    const c = openColumn(p.x, p.y, p.z, fwd[0], fwd[1]);
    if (!c) return "roof";
    S4.job = null;
    carry.visible = false;
    S4.col = c;
    S4.pos.set(p.x + fwd[0] * 0.7, p.y + 1.2, p.z + fwd[1] * 0.7);
    S4.vel.set(fwd[0] * 1.2, 3.2, fwd[1] * 1.2);
    S4.yaw = Math.atan2(fwd[0], fwd[1]);
    S4.aim.set(p.x + fwd[0] * 8, 0, p.z + fwd[1] * 8);
    S4.aimT.copy(S4.aim);
    M.lean.rotation.x = 0;
    M.lean.rotation.z = 0;
    S4.mode = "launch";
    S4.phase = "hop";
    S4.phaseT = 0;
    S4.lvl = c.lvl;
    S4.scanDur = sec;
    S4.scanT = sec;
    S4.lampK = 0;
    setVis(true);
    S4.events.push({ type: "launch" });
    return "ok";
  }
  function goHome(direct) {
    S4.mode = "home";
    S4.phase = direct ? "descend" : "transit";
    S4.phaseT = 0;
    S4.lvl = -1;
    S4.scanT = 0;
    S4.job = null;
    S4.tracking = false;
    S4.col = null;
    S4.colT = 0;
    carry.visible = false;
  }
  function supply(kind, x, z, sites = null) {
    if (S4.menu || S4.mode !== "dock") return null;
    const cand = [[x, z], ...sites || []].map(([sx, sz]) => [sx, sz, Math.hypot(sx - x, sz - z)]).sort((a, b) => a[2] - b[2]);
    for (const [sx, sz] of cand) {
      const gy = phys.groundY(sx, sz);
      if (sx < B2.x0 + 1 || sx > B2.x1 - 1 || sz < B2.z0 + 1 || sz > B2.z1 - 1 || !phys.free(sx, sz) || !columnClear(sx, sz, gy + 3.1, over)) continue;
      if (B2.z1 - B2.z0 >= B2.x1 - B2.x0) S4.depot.set(cx, over + 5, Math.abs(S4.pp.z - B2.z0) > Math.abs(S4.pp.z - B2.z1) ? B2.z0 - 22 : B2.z1 + 22);
      else S4.depot.set(Math.abs(S4.pp.x - B2.x0) > Math.abs(S4.pp.x - B2.x1) ? B2.x0 - 22 : B2.x1 + 22, over + 5, cz);
      S4.pos.copy(S4.depot);
      S4.vel.set(0, 0, 0);
      S4.yaw = Math.atan2(sx - S4.pos.x, sz - S4.pos.z);
      M.lean.rotation.x = 0;
      M.lean.rotation.z = 0;
      S4.job = { kind, x: sx, z: sz, low: gy + 3.1 };
      S4.mode = "supply";
      S4.phase = "transit";
      S4.phaseT = 0;
      S4.lvl = over;
      setPayload(carry, kind);
      carry.visible = true;
      setVis(true);
      return S4.job;
    }
    return null;
  }
  function rejoin() {
    S4.lvl = nearest(S4.pos.x, S4.pos.z);
    S4.mode = "join";
    S4.phase = "";
  }
  function fallStep(dt) {
    if (!drop.on) return;
    drop.vy -= 9.8 * dt;
    drop.y += drop.vy * dt;
    drop.spin += dt * 2.2;
    fall.position.set(drop.x, drop.y, drop.z);
    fall.rotation.x = Math.sin(drop.spin) * 0.25;
    if (drop.y <= drop.ground) {
      drop.on = false;
      fall.visible = false;
      S4.drops++;
      S4.events.push({ type: "landed", kind: drop.kind, x: drop.x, z: drop.z, y: drop.ground });
    }
  }
  function update(dt, t, ctx) {
    S4.t = t;
    const menu = !!ctx.menu, tgt = v;
    let tvx = 0, tvz = 0;
    if (ctx.player) S4.pp.copy(ctx.player);
    if (!menu && !S4.menu && S4.mode === "dock") {
      if (M.root.visible) setVis(false);
      fallStep(dt);
      return;
    }
    if (!menu && (S4.mode === "join" || S4.mode === "patrol")) {
      S4.scanT -= dt;
      if (S4.scanT <= 0) {
        goHome(false);
        S4.events.push({ type: "recall" });
      }
    }
    if (menu) {
      if (!S4.menu) {
        S4.menu = true;
        S4.mode = "patrol";
        S4.job = null;
        S4.scanT = 0;
        carry.visible = false;
        setVis(true);
      }
      if (S4.hover === null) {
        S4.hover = false;
        for (const [dx, dy, dz] of [[1.3, 2.7, -4.6], [-1.5, 2.8, -5.2], [1, 3.2, -6.5], [0, 3.6, -8]]) {
          const hx = W.start.p[0] + dx, hz = W.start.p[1] + dz;
          if (clearAt(hx, dy, hz, 1) && columnClear(hx, hz, dy, over)) {
            S4.hover = new Vector3(hx, dy, hz);
            S4.pos.copy(S4.hover);
            S4.vel.set(0, 0, 0);
            break;
          }
        }
      }
      if (S4.hover) tgt.set(S4.hover.x + Math.sin(t * 0.31) * 0.35, S4.hover.y + Math.sin(t * 0.53) * 0.12, S4.hover.z + Math.cos(t * 0.23) * 0.3);
      else {
        S4.u += dt * 0.12;
        path(S4.u, tgt);
        tgt.y = alt;
      }
    } else if (S4.menu) {
      S4.menu = false;
      goHome(!!S4.hover);
      S4.hover = null;
      setVis(true);
      tgt.copy(S4.pos);
    } else if (S4.mode === "launch") {
      const c = S4.col;
      S4.phaseT += dt;
      if (S4.phase === "hop") {
        tgt.set(c.x, c.lo, c.z);
        if (Math.hypot(S4.pos.x - c.x, S4.pos.z - c.z) < 0.5 && Math.abs(S4.pos.y - c.lo) < 0.7 || S4.phaseT > 2.5) {
          S4.phase = "climb";
          S4.phaseT = 0;
        }
      } else {
        tgt.set(c.x, S4.lvl, c.z);
        if (S4.lvl - S4.pos.y < 0.6 || S4.phaseT > 9) {
          rejoin();
          S4.events.push({ type: "station" });
        }
      }
    } else if (S4.mode === "home") {
      const p = ctx.player, hx = p.x + ctx.fwd[0] * 0.8, hz = p.z + ctx.fwd[1] * 0.8, hy = p.y + 1.3;
      S4.phaseT += dt;
      if (ctx.vel) {
        tvx = ctx.vel.x;
        tvz = ctx.vel.z;
      }
      if (S4.phase === "transit") {
        if (S4.lvl < 0) S4.lvl = runLevel(S4.pos.x, S4.pos.z, hx, hz);
        S4.colT -= dt;
        if (S4.colT <= 0) {
          S4.colT = 0.5;
          const u0 = S4.u;
          S4.col = openColumn(p.x, p.y, p.z, ctx.fwd[0], ctx.fwd[1], S4.lvl);
          S4.u = u0;
        }
        if (S4.col) {
          tgt.set(S4.col.x, S4.lvl, S4.col.z);
          tvx = tvz = 0;
          if (Math.hypot(S4.pos.x - S4.col.x, S4.pos.z - S4.col.z) < 1.2) {
            S4.phase = "sink";
            S4.phaseT = 0;
          }
        } else {
          tgt.set(hx, S4.lvl, hz);
          if (S4.phaseT > 9) {
            dock();
            S4.events.push({ type: "docked" });
            fallStep(dt);
            return;
          }
        }
      } else if (S4.phase === "sink") {
        tgt.set(S4.col.x, S4.col.lo, S4.col.z);
        tvx = tvz = 0;
        if (S4.pos.y - S4.col.lo < 0.5 || S4.phaseT > 8) {
          S4.phase = "descend";
          S4.phaseT = 0;
        }
      } else {
        tgt.set(hx, hy, hz);
        if (S4.pos.distanceTo(tgt) < 0.8 || S4.phaseT > 7) {
          dock();
          S4.events.push({ type: "docked" });
          fallStep(dt);
          return;
        }
      }
    } else if (S4.mode === "away") {
      S4.phaseT += dt;
      tgt.copy(S4.depot);
      if (S4.pos.distanceTo(S4.depot) < 3 || S4.phaseT > 14) {
        dock();
        fallStep(dt);
        return;
      }
    } else if (S4.mode === "supply" && S4.job) {
      const J = S4.job;
      S4.phaseT += dt;
      if (S4.phase === "transit") {
        tgt.set(J.x, S4.lvl, J.z);
        if (Math.hypot(S4.pos.x - J.x, S4.pos.z - J.z) < 0.5 && S4.vel.length() < 1.6) {
          S4.phase = "descend";
          S4.phaseT = 0;
        }
      } else if (S4.phase === "descend") {
        tgt.set(J.x, J.low, J.z);
        if (S4.pos.y - J.low < 0.25 || S4.phaseT > 9) {
          S4.phase = "release";
          S4.phaseT = 0;
        }
      } else if (S4.phase === "release") {
        tgt.set(J.x, J.low, J.z);
        if (S4.phaseT > 0.45 && carry.visible) {
          carry.visible = false;
          carry.getWorldPosition(v2);
          Object.assign(drop, { on: true, kind: J.kind, x: v2.x, z: v2.z, y: v2.y, vy: -0.4, ground: phys.groundY(v2.x, v2.z), spin: 0 });
          setPayload(fall, J.kind);
          fall.visible = true;
          fall.rotation.set(0, M.root.rotation.y, 0);
          S4.events.push({ type: "release", kind: J.kind, x: v2.x, y: v2.y, z: v2.z });
        }
        if (S4.phaseT > 1.1) {
          S4.phase = "climb";
          S4.phaseT = 0;
        }
      } else {
        tgt.set(J.x, S4.lvl, J.z);
        if (S4.lvl - S4.pos.y < 0.6 || S4.phaseT > 6) {
          S4.job = null;
          S4.mode = "away";
          S4.phase = "";
          S4.phaseT = 0;
        }
      }
    } else if (S4.mode === "join") {
      path(S4.u, tgt);
      tgt.y = S4.lvl;
      if (Math.hypot(S4.pos.x - tgt.x, S4.pos.z - tgt.z) < 1.2) S4.mode = "patrol";
    } else {
      path(S4.u, v2);
      const du = 0.01;
      path(S4.u + du, tgt);
      const sp0 = Math.max(2, Math.hypot(tgt.x - v2.x, tgt.z - v2.z) / du);
      S4.u += dt * 4.4 / sp0;
      path(S4.u, tgt);
      tgt.y = alt + Math.sin(t * 0.4) * 0.35;
    }
    const vmax = menu ? 2 : S4.mode === "supply" ? S4.phase === "transit" ? 11 : S4.phase === "release" ? 3.4 : 6.5 : S4.mode === "launch" ? S4.phase === "hop" ? 6 : 8 : S4.mode === "home" ? S4.phase === "transit" ? 12 : S4.phase === "sink" ? 7 : 9 : S4.mode === "away" ? 10 : S4.mode === "join" ? 8 : 6.5, amax = 9.5, kp = menu ? 3.2 : 2.4, kd = menu ? 3.4 : 3;
    let axx = (tgt.x - S4.pos.x) * kp - (S4.vel.x - tvx) * kd, ayy = (tgt.y - S4.pos.y) * kp - S4.vel.y * kd, azz = (tgt.z - S4.pos.z) * kp - (S4.vel.z - tvz) * kd;
    const al = Math.hypot(axx, ayy, azz);
    if (al > amax) {
      axx *= amax / al;
      ayy *= amax / al;
      azz *= amax / al;
    }
    S4.vel.x += axx * dt;
    S4.vel.y += ayy * dt;
    S4.vel.z += azz * dt;
    const sl = S4.vel.length();
    if (sl > vmax) S4.vel.multiplyScalar(vmax / sl);
    S4.pos.addScaledVector(S4.vel, dt);
    S4.pos.x += Math.sin(t * 1.9) * 6e-4;
    S4.pos.y += Math.sin(t * 2.7 + 1) * 8e-4;
    const hs = Math.hypot(S4.vel.x, S4.vel.z), wantYaw = hs > 1.2 ? Math.atan2(S4.vel.x, S4.vel.z) : Math.atan2(S4.aim.x - S4.pos.x, S4.aim.z - S4.pos.z);
    let dyaw = wantYaw - S4.yaw;
    dyaw = Math.atan2(Math.sin(dyaw), Math.cos(dyaw));
    S4.yaw += clamp4(dyaw, -1, 1) * Math.min(1, dt * 2.2);
    const cs = Math.cos(S4.yaw), sn = Math.sin(S4.yaw), af = axx * sn + azz * cs, ar = axx * cs - azz * sn, lk = Math.min(1, dt * 5);
    M.lean.rotation.x += (clamp4(af / 9.8, -0.42, 0.42) + hs * 0.012 - M.lean.rotation.x) * lk;
    M.lean.rotation.z += (clamp4(-ar / 9.8, -0.42, 0.42) - M.lean.rotation.z) * lk;
    M.root.position.copy(S4.pos);
    M.root.rotation.y = S4.yaw;
    S4.load += (clamp4(0.35 + al / amax * 0.5 + ayy * 0.03 + (carry.visible ? 0.12 : 0), 0, 1) - S4.load) * Math.min(1, dt * 4);
    S4.spin += dt;
    for (const r of M.rotors) r.g.rotation.y += r.dirn * (540 + 160 * S4.load) * dt;
    M.discMat.uniforms.uT.value = S4.spin * 37;
    let best = null, bd = 1e9;
    if (!menu && ctx.threats && (S4.mode === "join" || S4.mode === "patrol")) for (const z of ctx.threats) {
      const d = Math.hypot(z.x - ctx.player.x, z.z - ctx.player.z), dd = Math.hypot(z.x - S4.pos.x, z.z - S4.pos.z);
      if (dd < 34 && d < bd) {
        bd = d;
        best = z;
      }
    }
    if (best) {
      S4.aimT.set(best.x, (best.y || 0) + 1, best.z);
      if (!S4.tracking && S4.pingT <= 0) {
        S4.events.push({ type: "track" });
        S4.pingT = 9;
      }
      S4.tracking = true;
    } else {
      S4.tracking = false;
      const px2 = menu ? W.start.p[0] : ctx.player.x, pz2 = menu ? W.start.p[1] - 7 : ctx.player.z, fx = menu ? 0 : ctx.fwd[0], fz = menu ? -1 : ctx.fwd[1];
      S4.aimT.set(px2 + fx * 7 + Math.sin(t * 0.43) * 4.5, 0.2, pz2 + fz * 7 + Math.cos(t * 0.31) * 4.5);
    }
    if (S4.mode === "supply" && S4.job && S4.phase !== "climb") S4.aimT.set(S4.job.x, 0.1, S4.job.z);
    else if (S4.mode === "home" || S4.mode === "launch") S4.aimT.set(ctx.player.x + ctx.fwd[0] * 6, 0.2, ctx.player.z + ctx.fwd[1] * 6);
    S4.pingT -= dt;
    S4.aim.lerp(S4.aimT, Math.min(1, dt * (best ? 5 : 1.6)));
    M.root.updateMatrixWorld(true);
    mInv.copy(M.lean.matrixWorld).invert();
    v2.copy(S4.aim).applyMatrix4(mInv).sub(M.yoke.position);
    let gy = Math.atan2(v2.x, v2.z) - M.yoke.rotation.y;
    gy = Math.atan2(Math.sin(gy), Math.cos(gy));
    M.yoke.rotation.y += gy * Math.min(1, dt * 9);
    const gp = clamp4(Math.atan2(-(v2.y - UAV.pitchY), Math.hypot(v2.x, v2.z)), -0.3, 1.5);
    M.head.rotation.x += (gp - M.head.rotation.x) * Math.min(1, dt * 9);
    S4.lampK += ((o.lampOff || !(menu || S4.mode === "join" || S4.mode === "patrol" || S4.mode === "supply") ? 0 : 1) - S4.lampK) * Math.min(1, dt * 3);
    spot.intensity = LAMP * S4.lampK * (menu ? 0.7 : 1);
    fallStep(dt);
    M.root.updateMatrixWorld(true);
    const blink = t * 1.15 % 1, st = blink < 0.05 || blink > 0.14 && blink < 0.19 ? 1 : 0;
    FL2.forEach((f3, i) => {
      if (i === 5) {
        spot.getWorldPosition(v2);
      } else v2.set(f3[0], f3[1], f3[2]).applyMatrix4(M.lean.matrixWorld);
      fp[i * 3] = v2.x;
      fp[i * 3 + 1] = v2.y;
      fp[i * 3 + 2] = v2.z;
      const k = i === 4 ? st : i === 5 ? S4.lampK : 1;
      fc[i * 3] = f3[3][0] * k;
      fc[i * 3 + 1] = f3[3][1] * k;
      fc[i * 3 + 2] = f3[3][2] * k;
      fs[i] = f3[4];
    });
    fg.attributes.position.needsUpdate = true;
    fg.attributes.color.needsUpdate = true;
    R4.renderer.getDrawingBufferSize(size);
    flareMat.uniforms.uScale.value = size.y * 0.5;
  }
  return {
    update,
    supply,
    launch,
    dock,
    S: S4,
    model: M,
    spot,
    alt,
    over,
    boxes,
    get pos() {
      return S4.pos;
    },
    get yaw() {
      return S4.yaw;
    },
    get up() {
      return S4.mode !== "dock";
    },
    get scanning() {
      return S4.mode === "join" || S4.mode === "patrol";
    },
    get supplying() {
      return S4.mode === "supply" || S4.mode === "away";
    },
    get leaving() {
      return S4.mode === "away" || S4.mode === "supply" && S4.phase === "climb";
    },
    clear: columnClear,
    nearest,
    column: openColumn,
    get status() {
      const m = S4.mode;
      return m === "dock" ? "DOCKED" : m === "launch" ? "LAUNCHING" : m === "supply" ? S4.phase === "transit" ? "SUPPLY RUN" : S4.phase === "climb" ? "SUPPLY AWAY" : "DROPPING" : m === "away" ? "SUPPLY AWAY" : m === "home" ? "RETURNING" : S4.tracking ? "TRACKING" : "SCANNING";
    },
    stats: M.stats
  };
}
async function showDrone(G4) {
  stage(G4);
  const M = buildDroneModel(G4);
  M.root.position.set(0, 1.3, 0);
  G4.render.scene.add(M.root);
  M.yoke.rotation.y = 0.5;
  M.head.rotation.x = 0.35;
  if (G4.params.spin === "0") M.discMat.uniforms.uK.value = 0;
  const POSES = { front: [[0.72, 1.62, 1.05], [0, 1.24, 0], 40], side: [[1.5, 1.38, 0.05], [0, 1.24, 0], 36], top: [[0.25, 2.75, 0.5], [0, 1.3, 0], 40], under: [[0.55, 0.62, 0.8], [0, 1.2, 0.04], 40], head: [[0.22, 1.12, 0.48], [0, 1.14, 0.13], 34], motor: [[0.62, 1.52, 0.6], [0.34, 1.34, 0.34], 30], rotor: [[0.3, 1.62, 0.72], [0.34, 1.37, 0.34], 34], tail: [[-0.5, 1.5, -0.85], [0, 1.26, -0.1], 36] };
  const setPose = (n) => {
    const p = POSES[n];
    return p ? { cam: p[0], target: p[1], fov: p[2] } : null;
  }, p0 = setPose(G4.params.pose || "front");
  return { cam: p0.cam, target: p0.target, fov: p0.fov, setPose, info: { ...M.stats, poses: Object.keys(POSES) }, update: (dt, t) => {
    if (G4.params.spin === "1") for (const r of M.rotors) r.g.rotation.y += r.dirn * 600 * dt;
    M.discMat.uniforms.uT.value = t * 37;
  } };
}

