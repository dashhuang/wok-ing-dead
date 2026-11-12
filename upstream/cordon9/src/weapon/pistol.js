var PISTOL = { name: "M11 Compact", muzzle: [0, 5e-4, -0.118], eject: [0.014, 0.012, 0.02], sightY: 0.0252, slideTravel: 0.044, magPos: [0, -0.04, 0.062], magDrop: [0, -0.16, 0.045], boreY: 5e-4 };
var GUN2 = [0.9, 0.9, 0.93];
var GUN_D2 = [0.7, 0.7, 0.74];
var POLY2 = [0.052, 0.05, 0.048];
var POLY_L = [0.075, 0.072, 0.066];
var BARE2 = [1, 1, 1];
var BARE_D2 = [0.5, 0.5, 0.52];
var P2 = (g2, c, jit = 0.05) => paint(g2, c, { jit });
var bx2 = (w, h, d, b, x, y, f3, c, rot2 = null) => {
  const g2 = bevelBox(w, h, d, b, 1);
  P2(g2, c);
  if (rot2) xf(g2, { r: rot2 });
  g2.translate(x, y, -f3);
  return g2;
};
var es2 = (prof, x0, x1, bev, c, holes = null, o = {}) => P2(extrudeSide(prof, x0, x1, bev, holes, o), c);
var lz2 = (prof, seg, c, x = 0, y = 0, o = {}) => {
  const g2 = lathe(prof, seg, { axis: "-z", ...o });
  P2(g2, c);
  g2.translate(x, y, 0);
  return g2;
};
var lx2 = (prof, seg, c, y, f3, o = {}) => {
  const g2 = lathe(prof, seg, { axis: "x", ...o });
  P2(g2, c);
  g2.translate(0, y, -f3);
  return g2;
};
var pin2 = (r, hw, y, f3, c, proud = 6e-4) => lx2([[0, -hw - proud], [r * 0.7, -hw - proud], [r, -hw - proud * 0.3], [r, hw + proud * 0.3], [r * 0.7, hw + proud], [0, hw + proud]], 10, c, y, f3);
function buildPistol({ rect: rect2 = null } = {}) {
  const body = new Bucket(), slide = new Bucket(), mag = new Bucket(), trig = new Bucket();
  const SY0 = -0.0125, SY1 = 0.0205, SF0 = -0.094, SF1 = 0.112, SW = 0.0128;
  const grip = [
    [-0.026, -0.0135],
    [-0.0285, -0.0365],
    [-0.0325, -0.05],
    [-0.0375, -0.0655],
    [-0.0362, -0.0782],
    [-0.0425, -0.094],
    [-0.0418, -0.108],
    [-0.0492, -0.128],
    [-0.0535, -0.1455],
    [-0.0585, -0.1525],
    [-0.101, -0.158],
    [-0.1042, -0.151],
    [-0.0995, -0.131],
    [-0.0952, -0.108],
    [-0.0905, -0.084],
    [-0.0868, -0.06],
    [-0.0868, -0.043],
    [-0.0905, -0.031],
    [-0.0985, -0.0245],
    [-0.0985, -0.0175],
    [-0.088, -0.0135]
  ];
  body.add("poly", es2(grip, -0.0142, 0.0142, 42e-4, POLY2, null, { smooth: 46 }));
  const dust = [[-0.03, -0.0135], [0.1, -0.0135], [0.104, -0.0165], [0.104, -0.0285], [0.1, -0.0315], [0.045, -0.0315], [0.04, -0.0345], [-0.03, -0.0345]];
  body.add("poly", es2(dust, -0.0128, 0.0128, 2e-3, POLY2));
  for (const [a, b] of [[0.048, 0.059], [0.065, 0.076], [0.082, 0.098]]) for (const s of [-1, 1]) body.add("poly", bx2(32e-4, 56e-4, b - a, 8e-4, s * 0.0138, -0.0262, (a + b) / 2, POLY_L));
  for (const s of [-1, 1]) body.add("poly", bx2(16e-4, 22e-4, 0.066, 5e-4, s * 0.0132, -0.0205, 0.068, POLY_L));
  const tgPath = [[0, -0.0345, -0.044], [0, -0.049, -0.0475], [0, -0.066, -0.043], [0, -0.0715, -0.02], [0, -0.0712, 6e-3], [0, -0.066, 0.02], [0, -0.049, 0.0235], [0, -0.0385, 0.0285]];
  body.add("poly", P2(sweep(roundRect(-62e-4, -26e-4, 62e-4, 26e-4, 14e-4, 2), tgPath, { samples: 30, up: [1, 0, 0], crease: 60, tension: 0.35 }), POLY2));
  for (let i = 0; i < 5; i++) body.add("poly", bx2(0.0118, 14e-4, 14e-4, 4e-4, 0, -0.043 - i * 42e-4, 0.0468 - i * 4e-4, POLY_L));
  for (const s of [-1, 1]) {
    for (let j = 0; j < 13; j++) for (let i = 0; i < 6; i++) {
      const t = j / 12, y = -0.052 - t * 0.088, f0 = -0.045 - t * 0.016, f3 = f0 - i * 66e-4 - j % 2 * 33e-4;
      if (f3 < -0.089 - t * 0.012) continue;
      const g2 = lathe([[21e-4, 0], [17e-4, 7e-4], [8e-4, 11e-4], [0, 11e-4]], 5, { axis: "x" });
      P2(g2, POLY_L, 0.12);
      if (s < 0) g2.rotateY(Math.PI);
      g2.translate(s * 0.0141, y, -f3);
      body.add("poly", g2);
    }
    body.add("poly", bx2(16e-4, 6e-3, 0.03, 8e-4, s * 0.0138, -0.027, -0.052, POLY_L, [0, 0, 0]));
    body.add("poly", bx2(12e-4, 0.094, 22e-4, 5e-4, s * 0.0139, -0.098, -0.0935 - 4e-3, POLY_L, [0.105, 0, 0]));
  }
  for (let i = 0; i < 12; i++) {
    const t = i / 11;
    body.add("poly", bx2(0.0206, 17e-4, 16e-4, 5e-4, 0, -0.058 - t * 0.085, -0.0362 - t * 0.0155 + 8e-4, POLY_L, [0.16, 0, 0]));
    body.add("poly", bx2(0.0206, 17e-4, 16e-4, 5e-4, 0, -0.05 - t * 0.092, -0.0883 - t * 0.0125 - 6e-4, POLY_L, [0.13, 0, 0]));
  }
  body.add("poly", es2([[-0.052, -0.146], [-0.058, -0.1575], [-0.103, -0.1635], [-0.1065, -0.152]], -0.0158, 0.0158, 22e-4, POLY_L));
  body.add("bare", P2(tube([[-4e-3, -0.158, 0.1], [-4e-3, -0.166, 0.103], [4e-3, -0.166, 0.103], [4e-3, -0.158, 0.1]], 11e-4, 6, { samples: 12 }), BARE_D2));
  body.add("bare", pin2(19e-4, 0.0128, -0.0225, 0.012, BARE_D2), pin2(16e-4, 0.0128, -0.0285, -0.012, BARE_D2), pin2(19e-4, 0.0142, -0.028, -0.079, BARE_D2));
  body.add("bare", bx2(0.02, 8e-4, 0.016, 2e-4, 0, -0.0318, 0.072, BARE_D2));
  body.add("gun", es2([[0.018, -0.0185], [-0.012, -0.0185], [-0.02, -0.0165], [-0.02, -0.0132], [-6e-3, -0.0132], [0.018, -0.0152]], -0.0152, -0.0136, 5e-4, GUN_D2));
  for (let i = 0; i < 4; i++) body.add("gun", bx2(12e-4, 36e-4, 11e-4, 3e-4, -0.0158, -0.0149, -0.0185 + i * 2e-3, GUN_D2));
  for (const s of [-1, 1]) {
    body.add("gun", bx2(16e-4, 42e-4, 85e-4, 6e-4, s * 0.0136, -0.0198, 0.03, GUN_D2));
    for (let i = 0; i < 3; i++) body.add("gun", bx2(8e-4, 36e-4, 9e-4, 2e-4, s * 0.0147, -0.0198, 0.0275 + i * 25e-4, GUN_D2));
  }
  {
    const g2 = lathe([[44e-4, 0], [44e-4, 26e-4], [36e-4, 32e-4], [0, 32e-4]], 12, { axis: "x" });
    P2(g2, POLY_L);
    g2.rotateY(Math.PI);
    g2.translate(-0.0142, -0.0462, 0.0345);
    body.add("poly", g2);
    for (let i = -1; i <= 1; i++) body.add("poly", bx2(6e-4, 6e-3, 8e-4, 2e-4, -0.0176, -0.0462, -0.0345 + i * 2e-3, POLY2));
  }
  for (const s of [-1, 1]) body.add("bare", bx2(12e-4, 16e-4, 0.15, 3e-4, s * 0.0118, -0.0128, 0.012, BARE_D2));
  const sp2 = [[-SW, SY0], [SW, SY0], [SW, SY1 - 52e-4], [SW - 38e-4, SY1], [-SW + 38e-4, SY1], [-SW, SY1 - 52e-4]];
  const ef2 = (prof, f0, f1, bev, c, holes = null) => P2(extrudeFwd(prof, f0, f1, bev, holes, { smooth: 40 }), c);
  const zones = [[SF0, -0.088, 1], [-0.088, -0.05, 2], [-0.05, 3e-3, 1], [3e-3, 0.043, 3], [0.043, 0.07, 1], [0.07, 0.098, 2], [0.098, SF1, 1]];
  for (const [a, b, kind] of zones) {
    if (kind === 1) slide.add("gun", ef2(sp2, a, b, 8e-4, GUN2));
    else if (kind === 2) {
      const n = Math.round((b - a) / 42e-4);
      slide.add("gun", ef2(sp2.map(([x, y]) => [x * 0.9, y === SY0 ? y : y - 8e-4]), a, b, 0, GUN_D2));
      for (let i = 0; i < n; i++) {
        const f0 = a + (i + 0.18) * (b - a) / n, f1 = a + (i + 0.82) * (b - a) / n;
        slide.add("gun", ef2(sp2, f0, f1, 5e-4, GUN2));
      }
    } else {
      const open = [[-SW, SY0], [SW, SY0], [SW, 1e-3], [SW - 4e-3, 1e-3], [SW - 4e-3, SY0 + 3e-3], [-SW + 38e-4, SY0 + 3e-3], [-SW + 38e-4, SY1 - 4e-3], [-15e-4, SY1 - 4e-3], [-15e-4, SY1], [-SW + 38e-4, SY1], [-SW, SY1 - 52e-4]];
      slide.add("gun", ef2(open, a, b, 5e-4, GUN2));
    }
  }
  slide.add("gun", es2([[-0.086, SY1 - 5e-4], [-0.07, SY1 - 5e-4], [-0.0715, SY1 + 52e-4], [-0.086, SY1 + 52e-4]], -98e-4, -24e-4, 6e-4, GUN_D2), es2([[-0.086, SY1 - 5e-4], [-0.07, SY1 - 5e-4], [-0.0715, SY1 + 52e-4], [-0.086, SY1 + 52e-4]], 24e-4, 98e-4, 6e-4, GUN_D2), bx2(0.0196, 22e-4, 0.0158, 5e-4, 0, SY1 + 4e-4, -0.078, GUN_D2));
  slide.add("gun", es2([[0.092, SY1 - 5e-4], [0.105, SY1 - 5e-4], [0.1035, SY1 + 48e-4], [0.0965, SY1 + 48e-4]], -19e-4, 19e-4, 5e-4, GUN_D2));
  for (const x of [-6e-3, 6e-3]) {
    const g2 = lathe([[11e-4, 0], [0, 0]], 8, { axis: "z" });
    slide.add("trit", P2(g2.translate(x, SY1 + 27e-4, 0.0862), [0.3, 1, 0.4], 0));
  }
  slide.add("trit", P2(lathe([[12e-4, 0], [0, 0]], 8, { axis: "z" }).translate(0, SY1 + 27e-4, -0.0962), [0.3, 1, 0.4], 0));
  slide.add("bare", bx2(22e-4, 16e-4, 6e-3, 4e-4, 0, SY1 + 4e-4, 0, BARE_D2));
  slide.add("bare", bx2(14e-4, 4e-3, 0.02, 5e-4, SW + 2e-4, 45e-4, -0.014, BARE_D2));
  slide.add("gun", bx2(0.0152, 0.0222, 16e-4, 5e-4, 0, 35e-4, SF0 - 4e-4, GUN_D2));
  slide.add("bare", P2(lathe([[0, 0], [21e-4, 0], [21e-4, 8e-4], [0, 8e-4]], 10, { axis: "z" }).translate(0, 9e-3, 0.0944), BARE_D2));
  slide.add("bare", lz2([[31e-4, 0], [31e-4, 15e-4], [22e-4, 22e-4], [0, 22e-4]], 12, BARE_D2, 0, -8e-3).translate(0, 0, -SF1 + 8e-4));
  slide.add("bare", lz2([[43e-4, 3e-3], [58e-4, 3e-3], [58e-4, 0.105], [64e-4, 0.106], [64e-4, 0.1125], [58e-4, 0.1138], [49e-4, 0.1138], [44e-4, 0.1118], [44e-4, 0.09]], 18, BARE2, 0, PISTOL.boreY, { crease: 30 }));
  slide.add("bare", bx2(0.0168, 0.013, 0.038, 12e-4, 0, 85e-4, 0.0235, BARE2));
  slide.add("bare", bx2(6e-3, 12e-4, 4e-3, 3e-4, 0, 0.0152, 8e-3, BARE_D2));
  if (rect2) {
    const r = rect2("pistol"), g2 = new PlaneGeometry(0.058, 0.0105);
    const uv = g2.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, lerp2(r[0], r[2], uv.getX(i)), lerp2(r[1], r[3], uv.getY(i)));
    g2.rotateY(-Math.PI / 2);
    g2.translate(-SW - 3e-4, 35e-4, -0.028);
    paint(g2, [1, 1, 1], { jit: 0 });
    slide.add("decal", g2);
  }
  trig.add("poly", es2([[4e-3, 1e-3], [-35e-4, 1e-3], [-42e-4, -0.012], [-15e-4, -0.022], [3e-3, -0.0285], [52e-4, -0.027], [2e-3, -0.021], [6e-4, -0.012]], -38e-4, 38e-4, 9e-4, POLY2, null, { smooth: 50 }));
  trig.add("poly", es2([[12e-4, -8e-3], [-2e-4, -0.012], [14e-4, -0.024], [34e-4, -0.0235]], -1e-3, 1e-3, 3e-4, POLY_L));
  const mb = [[-45e-4, 0], [-0.0355, 4e-3], [-0.047, -0.112], [-0.0155, -0.116]].map(([f3, u]) => [f3 - 0.04, u - 0.035]);
  mag.add("mag", es2(mb, -98e-4, 98e-4, 12e-4, [0.05, 0.052, 0.05]));
  for (let i = 0; i < 5; i++) {
    const g2 = lathe([[16e-4, 0], [12e-4, 4e-4], [0, 4e-4]], 8, { axis: "z" });
    g2.translate(0, -0.06 - i * 0.017, 0.0915 + i * 21e-4);
    mag.add("bare", P2(g2, [0.08, 0.08, 0.08]));
  }
  mag.add("poly", es2([[-0.04, -0.146], [-0.0565, -0.1505], [-0.092, -0.156], [-0.094, -0.164], [-0.055, -0.1585], [-0.0385, -0.1535]], -0.0138, 0.0138, 2e-3, POLY_L));
  mag.add("brass", lz2([[0, 0], [34e-4, 2e-3], [47e-4, 6e-3], [47e-4, 0.019], [0, 0.019]], 10, [1, 1, 1], 0, -0.0345).translate(0, 0, 0.074));
  return { body, slide, mag, trig };
}

