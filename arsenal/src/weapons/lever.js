// 更夫 · lever-action rifle (Winchester 1894 pattern, brass receiver).
// Gun space: +Z muzzle, +Y up, +X shooter's left. Origin at the trigger.
// Bore axis at y = BORE, magazine tube axis at y = TUBE.
const BORE = 0.036;
const TUBE = 0.0115;
const RW = 0.031; // receiver width
const REC_Z1 = 0.137; // receiver front
const END = 0.643; // 20" barrel muzzle
const END_A = 0.728; // 甲 long barrel (before the muzzle cap)
const LP = [0.05, -0.0025]; // lever pivot (z, y)
const HP = [-0.016, 0.02]; // hammer pivot (z, y)

export default function build(kit) {
  const {
    M,
    prism,
    box,
    lathe,
    rod,
    tube,
    cone,
    sweep,
    helix,
    torus,
    screw,
    sphere,
    only,
    label,
  } = kit;
  const THREE = kit.THREE;
  const PI = Math.PI;
  // oiled walnut: a thin coat and a dimmed environment so grazing angles stay warm instead of going grey
  const walnut = kit.mats.variant(
    "wood_walnut",
    {
      color: 0x522c15,
      coat: 0,
      env: 0.32,
      edge: 0x7e4622,
      edgeAmt: 0.3,
      rough: 0.48,
    },
    "lever_walnut",
  );
  // glazed porcelain, a little warm so it does not burn white under the lights
  const porcelain = kit.mats.variant(
    "ceramic",
    { color: 0xcabca0, rough: 0.32, env: 0.6 },
    "lever_porcelain",
  );

  // ---------------------------------------------------------------- helpers
  // smooth 1D interpolation through knots [[x, v], ...] (Catmull-Rom, clamped ends)
  const spline = (K) => (x) => {
    if (x <= K[0][0]) return K[0][1];
    if (x >= K[K.length - 1][0]) return K[K.length - 1][1];
    let i = 0;
    while (x > K[i + 1][0]) i++;
    const p0 = K[Math.max(0, i - 1)],
      p1 = K[i],
      p2 = K[i + 1],
      p3 = K[Math.min(K.length - 1, i + 2)];
    const t = (x - p1[0]) / (p2[0] - p1[0]);
    const m1 = ((p2[1] - p0[1]) / (p2[0] - p0[0] || 1)) * (p2[0] - p1[0]);
    const m2 = ((p3[1] - p1[1]) / (p3[0] - p1[0] || 1)) * (p2[0] - p1[0]);
    const t2 = t * t,
      t3 = t2 * t;
    return (
      (2 * t3 - 3 * t2 + 1) * p1[1] +
      (t3 - 2 * t2 + t) * m1 +
      (-2 * t3 + 3 * t2) * p2[1] +
      (t3 - t2) * m2
    );
  };
  const spow = (v, e) => Math.sign(v) * Math.pow(Math.abs(v), e);
  // lofted superellipse sections along Z (stocks): f(z) -> { yt, yb, w, n, dz(u) }
  function loft(zs, f, nT = 48) {
    const pos = [];
    const ring = (z) => {
      const s = f(z);
      const yc = (s.yt + s.yb) / 2,
        hh = (s.yt - s.yb) / 2;
      const r = [];
      for (let j = 0; j < nT; j++) {
        const th = (j / nT) * PI * 2;
        const u = spow(Math.sin(th), 2 / s.n);
        r.push([
          spow(Math.cos(th), 2 / s.n) * s.w * 0.5,
          yc + u * hh,
          z + (s.dz ? s.dz(u) : 0),
        ]);
      }
      return r;
    };
    const rings = zs.map(ring);
    for (const r of rings) for (const p of r) pos.push(...p);
    const idx = [];
    for (let i = 0; i < rings.length - 1; i++) {
      for (let j = 0; j < nT; j++) {
        const a = i * nT + j,
          b = i * nT + ((j + 1) % nT),
          c = (i + 1) * nT + ((j + 1) % nT),
          d = (i + 1) * nT + j;
        idx.push(a, b, c, a, c, d);
      }
    }
    // end caps on their own vertices so the edge stays crisp
    const cap = (r, dir) => {
      const base = pos.length / 3;
      let cx = 0,
        cy = 0,
        cz = 0;
      for (const p of r) {
        cx += p[0];
        cy += p[1];
        cz += p[2];
      }
      pos.push(cx / nT, cy / nT, cz / nT);
      for (const p of r) pos.push(...p);
      for (let j = 0; j < nT; j++) {
        const a = base + 1 + j,
          b = base + 1 + ((j + 1) % nT);
        if (dir > 0) idx.push(base, a, b);
        else idx.push(base, b, a);
      }
    };
    cap(rings[0], -1);
    cap(rings[rings.length - 1], 1);
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    g.setIndex(idx);
    g.computeVertexNormals();
    return kit.adopt(g);
  }
  // cord wound round a path lying in the YZ plane (leather lace on the lever)
  function wrapPath(path, rx, ry, wire, turns, t0, t1, seg = 10) {
    const curve = new THREE.CatmullRomCurve3(
      path.map((p) => new THREE.Vector3(p[0], p[1], p[2])),
    );
    const pts = [];
    const n = Math.ceil(turns * seg);
    const X = new THREE.Vector3(1, 0, 0);
    for (let i = 0; i <= n; i++) {
      const t = t0 + ((t1 - t0) * i) / n;
      const p = curve.getPointAt(t);
      const T = curve.getTangentAt(t);
      const B = new THREE.Vector3().crossVectors(T, X).normalize();
      const a = (i / seg) * PI * 2;
      pts.push([
        p.x + Math.cos(a) * rx,
        p.y + B.y * Math.sin(a) * ry,
        p.z + B.z * Math.sin(a) * ry,
      ]);
    }
    return sweep(pts, wire, { seg: 4, steps: Math.ceil(n * 1.3) });
  }
  const rel = (p, o) => [p[0] - o[0], p[1] - o[1], p[2]];

  // ---------------------------------------------------------------- receiver (brass, fixed)
  const REC = [
    [REC_Z1, -0.006, 0.002],
    [REC_Z1, 0.0505, 0.003],
    [REC_Z1 - 0.004, 0.0525, 0.003],
    [-0.006, 0.0525, 0.006],
    [-0.021, 0.0475, 0.006],
    [-0.0295, 0.0415, 0.002],
    [-0.0295, -0.0062, 0.002],
  ];
  const rc = M();
  rc.add(prism(REC, RW, { bevel: 0.0022, bevelSeg: 2 }), "brass");
  // receiver ring round the barrel shank
  rc.add(
    rod(0.0148, REC_Z1 - 0.002, REC_Z1 + 0.006, { seg: 32, r: 0.0012 }),
    "brass",
    { at: [0, BORE, 0] },
  );
  // ejection port / bolt channel on top (dark), visible when the bolt runs back
  rc.add(box(0.0168, 0.0016, 0.104, { bevel: 0.0003 }), "bore", {
    at: [0, 0.0521, 0.033],
  });
  // upper and lower tangs following the wrist
  const st_yt = spline([
    [-0.322, 0.0],
    [-0.2, 0.0145],
    [-0.125, 0.0255],
    [-0.09, 0.0305],
    [-0.055, 0.0355],
    [-0.028, 0.0412],
  ]);
  const st_yb = spline([
    [-0.322, -0.118],
    [-0.22, -0.071],
    [-0.14, -0.029],
    [-0.1, -0.0175],
    [-0.06, -0.0112],
    [-0.028, -0.0068],
  ]);
  const tangPts = (zs, yf, a, b) => [
    ...zs.map((z) => [z, yf(z) + a]),
    ...zs
      .slice()
      .reverse()
      .map((z) => [z, yf(z) + b]),
  ];
  const tz = [-0.026, -0.04, -0.055, -0.07, -0.082];
  rc.add(
    prism(tangPts(tz, st_yt, 0.0013, -0.003), 0.013, {
      bevel: 0.0018,
      bevelSeg: 2,
    }),
    "brass",
  );
  rc.add(
    prism(tangPts(tz, st_yb, 0.003, -0.0014), 0.012, {
      bevel: 0.0018,
      bevelSeg: 2,
    }),
    "brass",
  );
  rc.add(screw(0.0024, { axis: "y", h: 0.0007 }), "steel_blued", {
    at: [0, st_yt(-0.066) + 0.0013, -0.066],
    wear: 0.5,
  });
  // side screws and pins
  for (const [z, y] of [
    [0.02, 0.031],
    [0.104, 0.041],
    [-0.02, 0.006],
    [0.05, -0.0025],
  ]) {
    rc.add(screw(0.0026, { axis: "x", h: 0.0007 }), "steel_blued", {
      at: [RW / 2, y, z],
      mirror: true,
      wear: 0.6,
    });
  }
  rc.add(screw(0.0019, { axis: "x", slot: false, h: 0.0005 }), "steel_bare", {
    at: [RW / 2, HP[1], HP[0]],
    mirror: true,
    wear: 0.3,
  });
  rc.add(screw(0.0017, { axis: "x", slot: false, h: 0.0005 }), "steel_bare", {
    at: [RW / 2, -0.0035, 0.004],
    mirror: true,
    wear: 0.3,
  });
  // loading gate on the right side: spring plate in a dark recess, with its screw
  const gateO = [
    [0.083, 0.0035, 0.004],
    [0.126, 0.0035, 0.004],
    [0.126, 0.0225, 0.006],
    [0.083, 0.0225, 0.004],
  ];
  rc.add(prism(gateO, 0.0012, { bevel: 0.0002 }), "bore", {
    at: [-RW / 2 - 0.0002, 0, 0],
  });
  rc.add(
    prism(
      [
        [0.0845, 0.0048, 0.003],
        [0.1248, 0.0048, 0.003],
        [0.1248, 0.0212, 0.0055],
        [0.0845, 0.0212, 0.003],
      ],
      0.0014,
      { bevel: 0.0004 },
    ),
    "steel_blued",
    { at: [-RW / 2 - 0.0007, 0, 0] },
  );
  rc.add(box(0.0006, 0.0028, 0.014, { bevel: 0.0001, edge: 0 }), "bore", {
    at: [-RW / 2 - 0.0014, 0.0145, 0.113],
  });
  rc.add(screw(0.0021, { axis: "-x", h: 0.0006 }), "steel_bare", {
    at: [-RW / 2 - 0.0014, 0.0085, 0.091],
    wear: 0.3,
  });
  // buttstock bolt cap and saddle-ring stud on the left
  rc.add(screw(0.0026, { axis: "x", h: 0.0008, slot: false }), "steel_blued", {
    at: [RW / 2, 0.022, -0.009],
    wear: 0.4,
  });
  rc.add(torus(0.0075, 0.0011, { seg: 6, around: 24 }), "steel_blued", {
    rot: [0, PI / 2, 0],
    at: [RW / 2 + 0.002, 0.022, -0.009],
    wear: 0.4,
  });
  const receiver = rc.build("receiver");

  // receiver engraving: scroll work cut into the brass, a cartouche with the name on the left
  function engrave(face, key) {
    const z0 = -0.031,
      z1 = REC_Z1 + 0.001,
      y0 = -0.007,
      y1 = 0.054;
    const w = z1 - z0,
      h = y1 - y0;
    return label({
      key,
      w,
      h,
      px: 1024,
      face,
      at: [
        (face === "x" ? 1 : -1) * (RW / 2 + 0.00018),
        (y0 + y1) / 2,
        (z0 + z1) / 2,
      ],
      metal: 1,
      rough: 0.42,
      draw(g, W, H) {
        const ppm = W / w;
        const P = (z, y) => [
          face === "x" ? (z1 - z) * ppm : (z - z0) * ppm,
          (y1 - y) * ppm,
        ];
        const path = (pts) => {
          g.beginPath();
          pts.forEach((p, i) => {
            const [x, y] = P(p[0], p[1]);
            i ? g.lineTo(x, y) : g.moveTo(x, y);
          });
          g.closePath();
        };
        g.clearRect(0, 0, W, H);
        let seed = face === "x" ? 11 : 23;
        const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
        g.lineCap = "round";
        const scroll = (x, y, s, rot, flip) => {
          g.save();
          g.translate(x, y);
          g.rotate(rot);
          g.scale(flip ? -1 : 1, 1);
          const sp = new Path2D();
          const turns = 2.4 * PI;
          for (let i = 0; i <= 44; i++) {
            const t = i / 44,
              a = t * turns,
              r = s * (1 - t * 0.86);
            i
              ? sp.lineTo(Math.cos(a) * r, Math.sin(a) * r)
              : sp.moveTo(Math.cos(a) * r, Math.sin(a) * r);
          }
          sp.moveTo(s, 0);
          sp.bezierCurveTo(
            s * 1.1,
            -s * 1.2,
            s * 2.2,
            -s * 1.1,
            s * 2.9,
            -s * 0.2,
          );
          for (let k = 0; k < 4; k++) {
            const a = 0.6 + k * 0.9,
              r = s * (1 - (a / turns) * 0.86);
            const px = Math.cos(a) * r,
              py = Math.sin(a) * r,
              nx = Math.cos(a),
              ny = Math.sin(a),
              L = s * 0.5;
            sp.moveTo(px, py);
            sp.quadraticCurveTo(
              px + nx * L * 0.7 - ny * L * 0.5,
              py + ny * L * 0.7 + nx * L * 0.5,
              px + nx * L - ny * L * 0.9,
              py + ny * L + nx * L * 0.9,
            );
            sp.quadraticCurveTo(
              px + nx * L * 0.2 - ny * L * 0.8,
              py + ny * L * 0.2 + nx * L * 0.8,
              px,
              py,
            );
          }
          g.strokeStyle = "rgba(255,226,150,0.4)";
          g.lineWidth = 4;
          g.translate(-1, -1);
          g.stroke(sp);
          g.translate(1, 1);
          g.strokeStyle = "rgba(40,22,6,0.92)";
          g.lineWidth = 3.2;
          g.stroke(sp);
          g.restore();
        };
        const step = 0.013 * ppm;
        for (let y = 0; y < H + step; y += step * 0.86)
          for (let x = 0; x < W + step; x += step)
            scroll(
              x + (rnd() - 0.5) * step * 0.5,
              y + (rnd() - 0.5) * step * 0.5,
              step * (0.3 + rnd() * 0.1),
              rnd() * PI * 2,
              rnd() > 0.5,
            );
        // clear a panel in the middle for the cartouche / round the loading gate
        g.globalCompositeOperation = "destination-out";
        const [cx, cy] = P(0.058, 0.022);
        g.beginPath();
        g.ellipse(cx, cy, 0.034 * ppm, 0.0165 * ppm, 0, 0, PI * 2);
        g.fill();
        if (face === "-x") {
          path([
            [0.079, 0.0],
            [0.13, 0.0],
            [0.13, 0.026],
            [0.079, 0.026],
          ]);
          g.fill();
        }
        g.globalCompositeOperation = "destination-in";
        path(REC);
        g.fill();
        g.globalCompositeOperation = "destination-out";
        g.lineWidth = 0.0085 * ppm;
        path(REC);
        g.stroke();
        g.globalCompositeOperation = "source-over";
        // border lines and the cartouche
        g.strokeStyle = "rgba(48,28,8,0.9)";
        g.lineWidth = 3.5;
        g.beginPath();
        g.ellipse(cx, cy, 0.032 * ppm, 0.015 * ppm, 0, 0, PI * 2);
        g.stroke();
        g.beginPath();
        g.ellipse(cx, cy, 0.0295 * ppm, 0.0125 * ppm, 0, 0, PI * 2);
        g.stroke();
        g.fillStyle = "rgba(40,22,6,0.9)";
        g.textAlign = "center";
        g.textBaseline = "middle";
        if (face === "x") {
          g.font = `700 ${0.016 * ppm}px ${kit.FONT_KAI}`;
          g.fillText("更  夫", cx, cy + 2);
        } else {
          g.font = `700 ${0.0075 * ppm}px ${kit.FONT_KAI}`;
          g.fillText("一更天", cx, cy - 0.0045 * ppm);
          g.font = `600 ${0.0048 * ppm}px ${kit.FONT_MONO}`;
          g.fillText("M.1894 · .30-30", cx, cy + 0.0052 * ppm);
        }
      },
    });
  }
  receiver.add(
    engrave("x", "lever-engrave-l"),
    engrave("-x", "lever-engrave-r"),
  );

  // ---------------------------------------------------------------- barrel, magazine tube, bands (fixed)
  const octBarrel = (m, z0, z1, rA, rB) => {
    m.add(
      lathe(
        [
          [z0, 0.0056, 0],
          [z0, rA, 0.0005],
          [z1, rB, 0.0007],
          [z1, 0.0056, 0.0008],
          [z0, 0.0056, 0],
        ],
        { seg: 8, flat: true },
      ),
      "steel_blued",
      { rot: [0, 0, PI / 8], at: [0, BORE, 0] },
    );
    m.add(rod(0.0055, z0 + 0.01, z1 - 0.008, { seg: 12 }), "bore", {
      at: [0, BORE, 0],
    });
  };
  const flatTop = (z, z0, z1, rA, rB) =>
    (rA + ((rB - rA) * (z - z0)) / (z1 - z0)) * Math.cos(PI / 8);
  const frontBlade = (m, z, top) => {
    m.add(box(0.006, 0.0025, 0.009, { bevel: 0.0004 }), "steel_blued", {
      at: [0, top + 0.001, z],
    });
    m.add(
      prism(
        [
          [z - 0.0055, top + 0.002],
          [z + 0.0045, top + 0.002],
          [z + 0.0035, top + 0.0098, 0.0012],
          [z - 0.0015, top + 0.0103, 0.0015],
        ],
        0.0018,
        { bevel: 0.0004 },
      ),
      "steel_blued",
    );
    m.add(sphere(0.0011, { seg: 10, rings: 6 }), "brass", {
      at: [0, top + 0.0098, z - 0.0012],
      wear: 0.3,
    });
  };

  const bs = M();
  octBarrel(bs, REC_Z1, END, 0.0121, 0.0105);
  frontBlade(
    bs,
    END - 0.016,
    BORE + flatTop(END - 0.016, REC_Z1, END, 0.0121, 0.0105),
  );
  const barrelStd = only(bs.build("barrel-std"), "base,b");

  const ba = M();
  octBarrel(ba, REC_Z1, END_A, 0.0121, 0.0101);
  // muzzle cap: turned steel crown ring with a brass collar
  ba.add(
    lathe(
      [
        [END_A - 0.016, 0.0058, 0],
        [END_A - 0.016, 0.0118, 0.0006],
        [END_A - 0.004, 0.0118, 0.0008],
        [END_A + 0.008, 0.0108, 0.002],
        [END_A + 0.012, 0.0085, 0.0012],
        [END_A + 0.012, 0.0062, 0.0008],
        [END_A - 0.016, 0.0058, 0],
      ],
      { seg: 32 },
    ),
    "steel_blued",
    { at: [0, BORE, 0] },
  );
  ba.add(
    tube(0.0123, 0.0105, END_A - 0.017, END_A - 0.012, { seg: 32, r: 0.0005 }),
    "brass",
    { at: [0, BORE, 0], wear: 0.4 },
  );
  frontBlade(
    ba,
    END_A - 0.03,
    BORE + flatTop(END_A - 0.03, REC_Z1, END_A, 0.0121, 0.0101),
  );
  const barrelA = only(ba.build("barrel-a"), "a");

  const tb = M();
  // full-length magazine tube with its cap
  tb.add(rod(0.0094, REC_Z1, 0.612, { seg: 28, r: 0.0005 }), "steel_blued", {
    at: [0, TUBE, 0],
  });
  tb.add(
    lathe(
      [
        [0.612, 0],
        [0.612, 0.0099, 0.0005],
        [0.62, 0.0099, 0.0008],
        [0.623, 0.008, 0.0012],
        [0.623, 0],
      ],
      { seg: 28 },
    ),
    "steel_park",
    { at: [0, TUBE, 0] },
  );
  tb.add(screw(0.0026, { axis: "z", h: 0.0007 }), "steel_bare", {
    at: [0, TUBE, 0.623],
    wear: 0.3,
  });
  // barrel bands: figure-of-eight clamps round barrel and tube
  const band = (z, len) =>
    tb.add(
      prism(
        [
          [-0.0118, TUBE - 0.003, 0.004],
          [-0.0088, TUBE - 0.0112, 0.006],
          [0.0088, TUBE - 0.0112, 0.006],
          [0.0118, TUBE - 0.003, 0.004],
          [0.0134, BORE - 0.002, 0.004],
          [0.0094, BORE + 0.0128, 0.006],
          [-0.0094, BORE + 0.0128, 0.006],
          [-0.0134, BORE - 0.002, 0.004],
        ],
        len,
        { plane: "front", bevel: 0.0008 },
      ),
      "steel_blued",
      { at: [0, 0, z] },
    );
  band(0.6, 0.009);
  band(0.47, 0.0075);
  tb.add(screw(0.0018, { axis: "x", h: 0.0006 }), "steel_bare", {
    at: [0.0128, (BORE + TUBE) / 2, 0.6],
    wear: 0.3,
  });
  tb.add(screw(0.0016, { axis: "x", h: 0.0005 }), "steel_bare", {
    at: [0.0128, (BORE + TUBE) / 2, 0.47],
    wear: 0.3,
  });
  // buckhorn rear sight in a dovetail, with its stepped elevator
  const rsZ = 0.248;
  const rsY = BORE + flatTop(rsZ, REC_Z1, END, 0.0121, 0.0105);
  tb.add(
    box(0.0098, 0.0022, 0.03, { bevel: 0.0004, r: 0.002 }),
    "steel_blued",
    { at: [0, rsY + 0.0009, rsZ - 0.006] },
  );
  tb.add(
    prism(
      [
        [-0.0098, 0, 0.0006],
        [0.0098, 0, 0.0006],
        [0.0104, 0.0058, 0.002],
        [0.0098, 0.0118, 0.0008],
        [0.0074, 0.0102, 0.0012],
        [0.0058, 0.0072, 0.003],
        [0.0017, 0.0064, 0.0008],
        [0, 0.0048, 0.0008],
        [-0.0017, 0.0064, 0.0008],
        [-0.0058, 0.0072, 0.003],
        [-0.0074, 0.0102, 0.0012],
        [-0.0098, 0.0118, 0.0008],
        [-0.0104, 0.0058, 0.002],
      ],
      0.0017,
      { plane: "front", bevel: 0.0004 },
    ),
    "steel_blued",
    { at: [0, rsY + 0.0018, rsZ], rot: [-0.08, 0, 0] },
  );
  tb.add(
    box(0.0012, 0.0011, 0.0004, { bevel: 0.0001, edge: 0 }),
    "enamel_white",
    { at: [0, rsY + 0.0062, rsZ - 0.001], wear: 0 },
  );
  for (let i = 0; i < 4; i++) {
    tb.add(
      box(0.0062, 0.0012 + i * 0.0006, 0.0028, { bevel: 0.0003 }),
      "steel_blued",
      { at: [0, rsY + 0.0024 + i * 0.0003, rsZ - 0.0045 - i * 0.003] },
    );
  }
  const tubes = tb.build("tubes");

  // ---------------------------------------------------------------- fore-end (walnut + brass cap)
  const FE = [
    [-0.0134, BORE + 0.0015, 0.0015],
    [-0.0153, 0.027, 0.01],
    [-0.0146, 0.012, 0.01],
    [-0.0098, TUBE - 0.0126, 0.009],
    [0.0098, TUBE - 0.0126, 0.009],
    [0.0146, 0.012, 0.01],
    [0.0153, 0.027, 0.01],
    [0.0134, BORE + 0.0015, 0.0015],
  ];
  const fe = M();
  const feZ0 = REC_Z1 + 0.006,
    feZ1 = 0.352;
  fe.add(
    prism(FE, feZ1 - feZ0, { plane: "front", bevel: 0.0028, bevelSeg: 3 }),
    walnut,
    { at: [0, 0, (feZ0 + feZ1) / 2] },
  );
  fe.add(
    prism(
      FE.map((p) => [p[0] * 1.06, (p[1] - 0.024) * 1.06 + 0.024, p[2]]),
      0.013,
      { plane: "front", bevel: 0.0012, bevelSeg: 2 },
    ),
    "brass",
    { at: [0, 0, feZ1 + 0.006] },
  );
  fe.add(screw(0.0019, { axis: "x", h: 0.0006 }), "steel_bare", {
    at: [0.0162, 0.026, feZ1 + 0.006],
    mirror: true,
    wear: 0.3,
  });
  const foreend = fe.build("foreend");

  // ---------------------------------------------------------------- buttstock (walnut, crescent brass butt plate)
  const BUTT = -0.322;
  const st_w = spline([
    [-0.322, 0.041],
    [-0.21, 0.04],
    [-0.13, 0.0325],
    [-0.08, 0.0292],
    [-0.028, 0.0302],
  ]);
  const st_n = spline([
    [-0.322, 3.4],
    [-0.2, 3.0],
    [-0.12, 2.4],
    [-0.028, 2.6],
  ]);
  const crescent = (u) => 0.013 * (1 - u * u);
  const zs = [];
  for (let z = BUTT; z < -0.028; z += 0.006) zs.push(z);
  zs.push(-0.028);
  const stG = loft(zs, (z) => {
    const k = z < -0.27 ? (-0.27 - z) / (-0.27 - BUTT) : 0;
    return {
      yt: st_yt(z),
      yb: st_yb(z),
      w: st_w(z),
      n: st_n(z),
      dz: k > 0 ? (u) => crescent(u) * k : null,
    };
  });
  const st = M();
  st.add(stG, walnut);
  // crescent butt plate: horns at heel and toe, concave between
  const plate = [];
  const yc0 = (st_yt(BUTT) + st_yb(BUTT)) / 2,
    hh0 = (st_yt(BUTT) - st_yb(BUTT)) / 2;
  for (let i = 0; i <= 10; i++) {
    const u = 1 - (i / 10) * 2;
    plate.push([BUTT + crescent(u) - 0.0042, yc0 + u * hh0, 0.004]);
  }
  plate.push([BUTT - 0.0088, yc0 - hh0 - 0.0062, 0.0015]);
  for (let i = 0; i <= 10; i++) {
    const u = -1 + (i / 10) * 2;
    plate.push([BUTT + crescent(u) + 0.0015, yc0 + u * hh0 * 0.985, 0.002]);
  }
  plate.push([BUTT - 0.0062, yc0 + hh0 + 0.0028, 0.0015]);
  st.add(
    prism(plate, st_w(BUTT) * 0.99, { bevel: 0.0105, bevelSeg: 3 }),
    "brass",
  );
  st.add(screw(0.0021, { axis: "-z", h: 0.0006 }), "steel_bare", {
    at: [0, yc0 + hh0 * 0.78, BUTT + crescent(0.78) - 0.0045],
    rot: [0.5, 0, 0],
    wear: 0.3,
  });
  st.add(screw(0.0021, { axis: "-z", h: 0.0006 }), "steel_bare", {
    at: [0, yc0 - hh0 * 0.7, BUTT + crescent(-0.7) - 0.0045],
    rot: [-0.5, 0, 0],
    wear: 0.3,
  });
  // swivel stud for the pendant cord
  const GZ = -0.205;
  const GY = st_yb(GZ);
  st.add(
    lathe(
      [
        [0, 0],
        [0, 0.0032, 0.0006],
        [0.004, 0.0028, 0.0006],
        [0.0045, 0],
      ],
      { seg: 14 },
    ),
    "steel_bare",
    { rot: [PI / 2, 0, 0], at: [0, GY + 0.002, GZ], wear: 0.3 },
  );
  st.add(torus(0.0035, 0.0009, { seg: 6, around: 18 }), "steel_bare", {
    rot: [0, PI / 2, 0],
    at: [0, GY - 0.0045, GZ],
    wear: 0.3,
  });
  const stock = st.build("stock");

  // ---------------------------------------------------------------- gong pendant (sways)
  const gp = M();
  for (const s of [1, -1]) {
    gp.add(
      sweep(
        [
          [0, -0.0072, 0],
          [0.0016 * s, -0.015, 0.002 * s],
          [0.001 * s, -0.024, 0.0012 * s],
          [0, -0.0305, 0],
        ],
        0.0007,
        { seg: 6 },
      ),
      "cord_red",
      { wear: 0.2 },
    );
  }
  gp.add(sphere(0.0022, { seg: 10, rings: 6 }), "cord_red", {
    at: [0, -0.0175, 0],
    wear: 0.2,
  });
  // the gong: flat face, turned-back rim, raised boss; hangs facing the side
  gp.add(
    lathe(
      [
        [0.0007, 0],
        [0.0007, 0.0124, 0.0005],
        [0.0008, 0.0142, 0.0006],
        [-0.0038, 0.0142, 0.0008],
        [-0.0038, 0.0131, 0.0003],
        [-0.0007, 0.0126, 0.0004],
        [-0.0007, 0],
      ],
      { seg: 36 },
    ),
    "bronze",
    { rot: [0, PI / 2, 0], at: [0, -0.046, 0] },
  );
  gp.add(torus(0.0022, 0.0008, { seg: 6, around: 14 }), "bronze", {
    rot: [0, PI / 2, 0],
    at: [-0.0015, -0.0322, 0],
    wear: 0.3,
  });
  // tiny watchman's striker tied alongside
  gp.add(rod(0.0011, 0, 0.032, { seg: 8 }), "wood_dark", {
    rot: [PI / 2 - 0.25, 0, 0],
    at: [0.0035, -0.022, -0.012],
  });
  gp.add(sphere(0.0034, { seg: 10, rings: 8 }), "cloth_red", {
    at: [0.0035, -0.053, -0.0198],
    wear: 0.2,
  });
  gp.add(
    sweep(
      [
        [0, -0.0072, 0],
        [0.002, -0.014, -0.006],
        [0.0035, -0.0225, -0.0118],
      ],
      0.0005,
      { seg: 5 },
    ),
    "cord_red",
    { wear: 0.2 },
  );
  const gong = gp.build("gong");
  gong.position.set(0, GY - 0.0045, GZ);
  const gongFace = (key, face, ch) =>
    label({
      key,
      w: 0.016,
      h: 0.016,
      px: 256,
      face,
      at: [face === "x" ? 0.00085 : -0.00085, -0.046, 0],
      metal: 1,
      rough: 0.45,
      draw(g, W, H) {
        g.clearRect(0, 0, W, H);
        g.strokeStyle = "rgba(30,20,8,0.7)";
        g.lineWidth = 3;
        g.beginPath();
        g.arc(W / 2, H / 2, W * 0.38, 0, PI * 2);
        g.stroke();
        g.fillStyle = "rgba(34,22,8,0.85)";
        g.font = `700 ${H * 0.42}px ${kit.FONT_KAI}`;
        g.textAlign = "center";
        g.textBaseline = "middle";
        g.fillText(ch, W / 2, H * 0.53);
      },
    });
  gong.add(
    gongFace("lever-gong-l", "x", "更"),
    gongFace("lever-gong-r", "-x", "夜"),
  );

  // ---------------------------------------------------------------- lever (pivot at the front of the guard)
  const LV = [
    [0, -0.0062, 0.024],
    [0, -0.0072, 0.034],
    [0, -0.0175, 0.0258],
    [0, -0.028, 0.0205],
    [0, -0.0355, 0.0095],
    [0, -0.0368, -0.002],
    [0, -0.0335, -0.0115],
  ];
  const LV_REAR = [
    [0, -0.0335, -0.0115],
    [0, -0.024, -0.0162],
    [0, -0.0145, -0.0215],
    [0, -0.0128, -0.04],
    [0, -0.014, -0.062],
    [0, -0.0158, -0.079],
  ];
  const LOOP = [
    [0, -0.0335, -0.0115],
    [0, -0.047, -0.021],
    [0, -0.064, -0.038],
    [0, -0.0728, -0.061],
    [0, -0.0682, -0.086],
    [0, -0.0518, -0.1015],
    [0, -0.031, -0.1015],
    [0, -0.019, -0.091],
    [0, -0.0158, -0.079],
  ];
  const lv = M();
  const L = (pts) => pts.map((p) => [0, p[1] - LP[1], p[2] - LP[0]]);
  // flat front arm along the receiver belly with the pivot boss
  lv.add(
    prism(
      [
        [0.074 - LP[0], -0.0005 - LP[1], 0.002],
        [0.074 - LP[0], -0.0075 - LP[1], 0.003],
        [0.024 - LP[0], -0.0085 - LP[1], 0.003],
        [0.024 - LP[0], -0.002 - LP[1], 0.002],
      ],
      0.0094,
      { bevel: 0.0012 },
    ),
    "steel_blued",
  );
  lv.add(rod(0.0042, -0.005, 0.005, { seg: 16, r: 0.0008 }), "steel_blued", {
    rot: [0, PI / 2, 0],
  });
  lv.add(sweep(L(LV), 0.0032, { seg: 10, steps: 30 }), "steel_blued", {
    scale: [1.35, 1, 1],
    wear: 0,
  });
  lv.add(sweep(L(LV_REAR), 0.003, { seg: 10, steps: 30 }), "steel_blued", {
    scale: [1.35, 1, 1],
    wear: 0,
  });
  lv.add(sweep(L(LOOP), 0.0034, { seg: 10, steps: 48 }), "steel_blued", {
    scale: [1.3, 1, 1],
    wear: 0,
  });
  // leather lace wound round the big loop, with a tied-off end
  lv.add(
    wrapPath(L(LOOP), 0.0049, 0.0039, 0.00095, 34, 0.1, 0.9, 9),
    "leather",
    { wear: 0.3 },
  );
  lv.add(
    sweep(
      L([
        [0, -0.0745, -0.06],
        [0.001, -0.081, -0.058],
        [0, -0.087, -0.06],
      ]),
      0.0008,
      { seg: 5 },
    ),
    "leather",
    { wear: 0.3 },
  );
  // latch nub at the rear of the lever tang
  lv.add(box(0.007, 0.004, 0.008, { bevel: 0.001, r: 0.0015 }), "steel_blued", {
    at: [0, -0.0145 - LP[1], -0.082 - LP[0]],
  });
  const lever = lv.build("lever");
  lever.position.set(0, LP[1], LP[0]);

  // ---------------------------------------------------------------- trigger
  const tg = M();
  tg.add(
    prism(
      [
        [0.003, 0.003, 0.001],
        [0.0062, 0.001, 0.001],
        [0.0032, -0.009, 0.006],
        [0.0058, -0.021, 0.002],
        [0.0028, -0.022, 0.001],
        [-0.0006, -0.01, 0.007],
      ],
      0.0055,
      { bevel: 0.001, bevelSeg: 2 },
    ),
    "steel_blued",
  );
  const trigger = tg.build("trigger");
  trigger.position.set(0, -0.0035, 0.002);

  // ---------------------------------------------------------------- bolt (slides back on top of the receiver)
  const bo = M();
  bo.add(
    box(0.0158, 0.0072, 0.094, { bevel: 0.0008, r: 0.0012 }),
    "steel_blued",
    { at: [0, 0.0498, 0.026] },
  );
  bo.add(box(0.0118, 0.0014, 0.094, { bevel: 0.0004 }), "steel_bare", {
    at: [0, 0.0538, 0.026],
    wear: 0.5,
  });
  for (let i = 0; i < 7; i++) {
    bo.add(
      box(0.0124, 0.0005, 0.0009, { bevel: 0.0001, edge: 0 }),
      "steel_blued",
      { at: [0, 0.0546, -0.016 + i * 0.0026], wear: 0, color: 0x404040 },
    );
  }
  bo.add(rod(0.0016, -0.023, -0.0205, { seg: 10 }), "steel_bare", {
    at: [0, 0.049, 0],
    wear: 0.3,
  });
  const bolt = bo.build("bolt");

  // ---------------------------------------------------------------- hammer
  const hm = M();
  const H = (pts) => pts.map((p) => [p[0] - HP[0], p[1] - HP[1], p[2]]);
  hm.add(
    prism(
      H([
        [-0.0205, 0.016, 0.004],
        [-0.011, 0.02, 0.004],
        [-0.0228, 0.05, 0.003],
        [-0.0238, 0.0635, 0.002],
        [-0.028, 0.0682, 0.004],
        [-0.0405, 0.0702, 0.006],
        [-0.0502, 0.0752, 0.002],
        [-0.0522, 0.0716, 0.002],
        [-0.0415, 0.0625, 0.006],
        [-0.0318, 0.0565, 0.005],
        [-0.0262, 0.022, 0.004],
      ]),
      0.0072,
      { bevel: 0.001, bevelSeg: 2 },
    ),
    "steel_blued",
  );
  for (let i = 0; i < 6; i++) {
    const t = i / 5;
    hm.add(
      box(0.0076, 0.0007, 0.0007, { bevel: 0.0002, edge: 0 }),
      "steel_blued",
      {
        at: [0, 0.0712 + t * 0.0036 - HP[1], -0.0415 - t * 0.0075 - HP[0]],
        rot: [0.46, 0, 0],
        wear: 0.8,
      },
    );
  }
  const hammer = hm.build("hammer");
  hammer.position.set(0, HP[1], HP[0]);

  // ---------------------------------------------------------------- 甲 穿杨: long brass scope on a bridge, cheek piece, cartridge loops
  const a = M();
  const SY = 0.0905; // scope axis
  a.add(rod(0.0095, -0.105, 0.245, { seg: 32 }), "brass", { at: [0, SY, 0] });
  // ocular and objective bells, knurled bands
  a.add(
    lathe(
      [
        [-0.16, 0.0098, 0],
        [-0.16, 0.0128, 0.0008],
        [-0.13, 0.0128, 0.001],
        [-0.118, 0.0112, 0.0015],
        [-0.104, 0.0097, 0.001],
        [-0.104, 0],
      ],
      { seg: 32 },
    ),
    "brass",
    { at: [0, SY, 0] },
  );
  a.add(
    lathe(
      [
        [0.244, 0],
        [0.244, 0.0097, 0.001],
        [0.262, 0.0126, 0.002],
        [0.292, 0.0128, 0.001],
        [0.292, 0.0104, 0.0006],
        [0.288, 0.0104, 0],
      ],
      { seg: 32 },
    ),
    "brass",
    { at: [0, SY, 0] },
  );
  for (const z of [-0.153, -0.139, 0.285]) {
    for (let i = 0; i < 18; i++) {
      const an = (i / 18) * PI * 2;
      a.add(
        box(0.0011, 0.0009, 0.006, { bevel: 0.0002, edge: 0 }),
        "brass_aged",
        {
          at: [Math.cos(an) * 0.0129, SY + Math.sin(an) * 0.0129, z],
          rot: [0, 0, an + PI / 2],
          wear: 0.6,
        },
      );
    }
  }
  a.add(rod(0.0105, 0.287, 0.2885, { seg: 28 }), kit.mats.glass(0x7088a8), {
    at: [0, SY, 0],
  });
  a.add(rod(0.0112, -0.1592, -0.1585, { seg: 28 }), kit.mats.glass(0x7088a8), {
    at: [0, SY, 0],
  });
  // adjustment drum on top and the side focus knob
  a.add(
    lathe(
      [
        [0, 0],
        [0, 0.0062, 0.0006],
        [0.0088, 0.0062, 0.0008],
        [0.0098, 0.0048, 0.0008],
        [0.0098, 0],
      ],
      { seg: 24 },
    ),
    "brass",
    { rot: [-PI / 2, 0, 0], at: [0, SY + 0.007, 0.06] },
  );
  a.add(
    lathe(
      [
        [0, 0],
        [0, 0.0048, 0.0006],
        [0.0068, 0.0048, 0.0008],
        [0.0074, 0],
      ],
      { seg: 24 },
    ),
    "brass_aged",
    { rot: [0, -PI / 2, 0], at: [-0.007, SY, 0.06], wear: 0.6 },
  );
  // bridge: plate over the receiver, legs clamped to the receiver flanks, two rings
  a.add(box(0.016, 0.004, 0.156, { bevel: 0.0008, r: 0.003 }), "steel_blued", {
    at: [0, 0.067, 0.054],
  });
  for (const z of [-0.008, 0.118]) {
    a.add(
      prism(
        [
          [-0.0172, 0.03, 0.002],
          [-0.0172, 0.069, 0.004],
          [0.0172, 0.069, 0.004],
          [0.0172, 0.03, 0.002],
          [RW / 2 + 0.0002, 0.03, 0.0005],
          [RW / 2 + 0.0002, 0.058, 0.003],
          [-RW / 2 - 0.0002, 0.058, 0.003],
          [-RW / 2 - 0.0002, 0.03, 0.0005],
        ],
        0.012,
        { plane: "front", bevel: 0.0008 },
      ),
      "steel_blued",
      { at: [0, 0, z] },
    );
    a.add(screw(0.0022, { axis: "x", h: 0.0008 }), "steel_bare", {
      at: [0.0172, 0.036, z],
      mirror: true,
      wear: 0.3,
    });
    a.add(
      tube(0.0112, 0.0094, z - 0.0055, z + 0.0055, { seg: 32, r: 0.0006 }),
      "steel_blued",
      { at: [0, SY, 0] },
    );
    a.add(
      box(0.008, SY - 0.069 - 0.008, 0.009, { bevel: 0.0008 }),
      "steel_blued",
      { at: [0, (SY - 0.0102 + 0.069) / 2, z] },
    );
    a.add(screw(0.002, { axis: "y", h: 0.0008, hex: true }), "steel_bare", {
      at: [0, SY + 0.011, z],
      wear: 0.3,
    });
  }
  // leather cheek piece laced to the left side of the comb
  const cheekX = st_w(-0.2) / 2;
  a.add(
    prism(
      [
        [-0.13, st_yt(-0.13) - 0.004, 0.006],
        [-0.27, st_yt(-0.27) - 0.003, 0.008],
        [-0.282, st_yt(-0.27) - 0.04, 0.01],
        [-0.15, st_yt(-0.15) - 0.034, 0.018],
      ],
      0.009,
      { bevel: 0.0035, bevelSeg: 3 },
    ),
    "leather",
    { at: [cheekX + 0.0008, 0, 0] },
  );
  for (let i = 0; i < 12; i++) {
    const z = -0.142 - i * 0.0115;
    a.add(box(0.0012, 0.0008, 0.0036, { bevel: 0.0002, edge: 0 }), "cord_red", {
      at: [cheekX + 0.0052, st_yt(z) - 0.0056, z],
      wear: 0.2,
    });
  }
  // cartridge loops on the right side: a leather sleeve band holding six rounds nose-up
  const sx = -st_w(-0.21) / 2 - 0.0012;
  a.add(
    prism(
      [
        [-0.17, st_yb(-0.17) + 0.012, 0.004],
        [-0.25, st_yb(-0.25) + 0.012, 0.004],
        [-0.25, st_yb(-0.25) + 0.031, 0.004],
        [-0.17, st_yb(-0.17) + 0.031, 0.004],
      ],
      0.003,
      { bevel: 0.001 },
    ),
    "leather",
    { at: [sx, 0, 0] },
  );
  for (let i = 0; i < 6; i++) {
    const z = -0.178 - i * 0.013;
    const yb = st_yb(z) + 0.012;
    a.add(box(0.0042, 0.013, 0.0108, { bevel: 0.0014, r: 0.003 }), "leather", {
      at: [sx - 0.0028, yb + 0.0105, z],
      color: 0xb8a898,
    });
    a.add(
      lathe(
        [
          [0, 0],
          [0, 0.0034, 0.0003],
          [0.0016, 0.0034, 0.0002],
          [0.0018, 0.0029],
          [0.04, 0.0027, 0.0006],
          [0.045, 0.0021, 0.0006],
          [0.045, 0],
        ],
        { seg: 14 },
      ),
      "brass",
      { rot: [-PI / 2, 0, 0], at: [sx - 0.0034, yb - 0.004, z], wear: 0.4 },
    );
    a.add(
      lathe(
        [
          [0.0445, 0],
          [0.0445, 0.0021],
          [0.05, 0.0021, 0.001],
          [0.0545, 0.0011, 0.0011],
          [0.0552, 0],
        ],
        { seg: 14 },
      ),
      "copper",
      { rot: [-PI / 2, 0, 0], at: [sx - 0.0034, yb - 0.004, z], wear: 0.3 },
    );
  }
  const partsA = only(a.build("branch-a"), "a");

  // ---------------------------------------------------------------- 乙 惊雷: lightning rod on porcelain insulators, coil and knife switch
  const coilGlow = kit.mats.glow(0x46d6ff, 3).clone();
  coilGlow.userData.glow = 3;
  kit.mats.glowMats.push(coilGlow);
  const b = M();
  const RY = BORE + 0.047; // lightning-rod axis
  b.add(rod(0.003, 0.19, 0.69, { seg: 12, r: 0.0006 }), "copper", {
    at: [0, RY, 0],
  });
  b.add(cone(0.0038, 0.0003, 0.69, 0.742, { seg: 12 }), "copper", {
    at: [0, RY, 0],
  });
  b.add(sphere(0.0046, { seg: 16, rings: 10 }), "copper", {
    at: [0, RY, 0.692],
  });
  for (const an of [0, (2 * PI) / 3, (4 * PI) / 3]) {
    b.add(cone(0.0012, 0.0002, 0, 0.02, { seg: 8 }), "copper", {
      rot: [-0.55 * Math.sin(an), 0.55 * Math.cos(an), 0],
      at: [0, RY, 0.694],
      wear: 0.3,
    });
  }
  b.add(sphere(0.0034, { seg: 12, rings: 8 }), "copper", { at: [0, RY, 0.19] });
  // insulators: clamp on the barrel, porcelain petticoat stack, copper tie wire round the rod
  for (const z of [0.29, 0.53]) {
    const top = BORE + flatTop(z, REC_Z1, END, 0.0121, 0.0105);
    b.add(
      tube(0.0135, 0.0118, z - 0.004, z + 0.004, {
        seg: 8,
        flat: true,
        r: 0.0005,
      }),
      "brass",
      { rot: [0, 0, PI / 8], at: [0, BORE, 0], wear: 0.4 },
    );
    b.add(box(0.006, 0.006, 0.008, { bevel: 0.0008 }), "brass", {
      at: [0, top + 0.003, z],
      wear: 0.4,
    });
    b.add(
      lathe(
        [
          [0, 0],
          [0, 0.0036, 0.0006],
          [0.004, 0.0038, 0.0004],
          [0.0055, 0.0078, 0.0015],
          [0.0072, 0.0078, 0.0008],
          [0.0076, 0.0042, 0.0004],
          [0.0108, 0.0068, 0.0012],
          [0.0122, 0.0068, 0.0008],
          [0.0126, 0.0036, 0.0006],
          [0.0172, 0.0042, 0.0012],
          [0.0186, 0.0028, 0.0012],
          [0.0186, 0],
        ],
        { seg: 18 },
      ),
      porcelain,
      { rot: [-PI / 2, 0, 0], at: [0, top + 0.0055, z] },
    );
    b.add(torus(0.0029, 0.0007, { seg: 6, around: 16 }), "copper", {
      rot: [0, PI / 2, 0],
      at: [0, RY - 0.0002, z],
      wear: 0.3,
    });
    b.add(
      helix(0.0034, 0.0005, z - 0.006, z + 0.006, 5, { seg: 4, perTurn: 10 }),
      "copper",
      { at: [0, RY, 0], wear: 0.3 },
    );
  }
  // coil on the left flank of the receiver: glowing core, winding, porcelain end cheeks, brass straps
  const CX = RW / 2 + 0.0092,
    CYc = 0.0105,
    cz0 = 0.032,
    cz1 = 0.118;
  b.add(rod(0.0052, cz0, cz1, { seg: 20 }), coilGlow, { at: [CX, CYc, 0] });
  b.add(
    helix(0.0069, 0.0011, cz0 + 0.004, cz1 - 0.004, 25, {
      seg: 5,
      perTurn: 10,
    }),
    "copper",
    { at: [CX, CYc, 0] },
  );
  for (const z of [cz0, cz1]) {
    b.add(
      lathe(
        [
          [z - 0.003, 0],
          [z - 0.003, 0.0088, 0.0008],
          [z + 0.003, 0.0088, 0.0008],
          [z + 0.003, 0],
        ],
        { seg: 24 },
      ),
      porcelain,
      { at: [CX, CYc, 0] },
    );
    b.add(box(0.0094, 0.004, 0.005, { bevel: 0.0006 }), "brass", {
      at: [RW / 2 + 0.0035, CYc, z],
      wear: 0.4,
    });
  }
  // knife switch above the coil: slate base, brass jaw and hinge, copper blade, black handle
  const SWY = 0.036,
    swx = RW / 2 + 0.0022;
  b.add(
    box(0.0038, 0.014, 0.064, { bevel: 0.0007, r: 0.002 }),
    "lacquer_black",
    { at: [swx, SWY, 0.066] },
  );
  for (const z of [0.042, 0.092]) {
    b.add(box(0.0062, 0.0062, 0.0022, { bevel: 0.0004 }), "brass", {
      at: [swx + 0.0048, SWY, z - 0.0016],
      wear: 0.4,
    });
    b.add(box(0.0062, 0.0062, 0.0022, { bevel: 0.0004 }), "brass", {
      at: [swx + 0.0048, SWY, z + 0.0016],
      wear: 0.4,
    });
    b.add(screw(0.0016, { axis: "x", h: 0.0006 }), "steel_bare", {
      at: [swx + 0.0019, SWY + 0.0048, z + 0.008],
      wear: 0.3,
    });
  }
  b.add(box(0.0009, 0.0048, 0.056, { bevel: 0.0002 }), "copper", {
    at: [swx + 0.0052, SWY, 0.066],
    wear: 0.5,
  });
  b.add(rod(0.0009, -0.004, 0.004, { seg: 8 }), "steel_bare", {
    rot: [0, PI / 2, 0],
    at: [swx + 0.0052, SWY, 0.092],
    wear: 0.3,
  });
  b.add(box(0.0042, 0.0016, 0.004, { bevel: 0.0003 }), "copper", {
    at: [swx + 0.0062, SWY, 0.039],
    wear: 0.4,
  });
  b.add(
    lathe(
      [
        [0, 0],
        [0, 0.0022, 0.0004],
        [0.009, 0.0026, 0.002],
        [0.0145, 0.002, 0.0012],
        [0.0145, 0],
      ],
      { seg: 14 },
    ),
    "lacquer_black",
    { rot: [0, PI / 2, 0], at: [swx + 0.0058, SWY, 0.036] },
  );
  // leads: coil to switch, switch up to the lightning rod's root
  b.add(
    sweep(
      [
        [CX, CYc + 0.007, cz1 - 0.002],
        [CX - 0.001, 0.024, 0.104],
        [swx + 0.0052, SWY - 0.004, 0.096],
      ],
      0.0009,
      { seg: 6 },
    ),
    "copper",
    { wear: 0.4 },
  );
  b.add(
    sweep(
      [
        [swx + 0.0052, SWY + 0.0035, 0.094],
        [0.02, 0.05, 0.12],
        [0.016, 0.062, 0.15],
        [0.006, RY - 0.002, 0.182],
        [0, RY, 0.19],
      ],
      0.0009,
      { seg: 6 },
    ),
    "copper",
    { wear: 0.4 },
  );
  // charge lamp on the coil's front cheek
  b.add(sphere(0.0018, { seg: 10, rings: 6 }), coilGlow, {
    at: [CX, CYc + 0.0098, cz1 + 0.001],
  });
  const partsB = only(b.build("branch-b"), "b");

  // ---------------------------------------------------------------- assemble
  const root = new THREE.Group();
  root.name = "lever";
  root.add(
    receiver,
    barrelStd,
    barrelA,
    tubes,
    foreend,
    stock,
    gong,
    lever,
    trigger,
    bolt,
    hammer,
    partsA,
    partsB,
  );

  // ---------------------------------------------------------------- the round being loaded (reload only)
  // Node origin at the case head, +Z towards the bullet. One mesh: the bullet is brass tinted to copper.
  const rd = M();
  rd.add(
    lathe(
      [
        [0, 0],
        [0, 0.0034, 0.0003],
        [0.0016, 0.0034, 0.0002],
        [0.0018, 0.0029],
        [0.04, 0.0027, 0.0006],
        [0.045, 0.0021, 0.0006],
        [0.045, 0],
      ],
      { seg: 14 },
    ),
    "brass",
    { wear: 0.4 },
  );
  rd.add(
    lathe(
      [
        [0.0445, 0],
        [0.0445, 0.0021],
        [0.05, 0.0021, 0.001],
        [0.0545, 0.0011, 0.0011],
        [0.0552, 0],
      ],
      { seg: 14 },
    ),
    "brass",
    { wear: 0.3, color: 0xff9a78 },
  );
  const roundMesh = rd.build("round");
  roundMesh.scale.set(1.2, 1.2, 1.1);
  const round = new THREE.Group();
  round.name = "round-carrier";
  round.add(roundMesh);
  root.add(round);
  // the round lies along the gate, its nose turned in towards the magazine tube
  const RYAW = 0.32;
  const RDIR = [Math.sin(RYAW), 0, Math.cos(RYAW)];
  const R_IN = [-RW / 2 - 0.0012, 0.0128, 0.088]; // case head at the gate, the rest inside
  const R_AT = R_IN.map((v, i) => v - RDIR[i] * 0.05); // nose just touching the gate
  // in the hand below the rifle, out of sight (the rifle is rolled over during the reload, so "below the
  // screen" lies under its left flank); it comes up round the right side of the lever on a curve
  const R_LOW = [0.06, -0.3, -0.06];
  const R_MID = [-0.1, -0.07, 0.02];
  round.rotation.y = RYAW;
  round.position.fromArray(R_LOW);
  roundMesh.visible = false;

  // the trigger hand rides a node that turns with the lever but only part of the way, so the
  // fingers in the loop work it while the wrist stays believable
  const LF = 0.5;
  const LREF = [0, -0.036 - LP[1], -0.072 - LP[0]]; // fingers in the loop, relative to the pivot
  const leverHand = new THREE.Group();
  leverHand.name = "lever-hand";
  leverHand.position.set(0, LP[1], LP[0]);
  root.add(leverHand);
  const lrel = (p) => [p[0], p[1] - LP[1], p[2] - LP[0]];

  const smooth = (x) => {
    const t = Math.min(1, Math.max(0, x));
    return t * t * (3 - 2 * t);
  };
  // at rest the index reaches forward into the guard onto the trigger, the others hang in the loop and the
  // thumb lies over the top of the wrist; while the lever is down the index joins the others in the loop
  const POSE_HOLD = {
    base: "pistol",
    index: [-0.2, 1.2, 0.5, 0.2],
    thumb: [0.45, -0.85, 0.2, 0.9, 0.7],
  };
  const POSE_WORK = { base: "wrap", r: 0.016 };
  const span = (x, a, b) => smooth((x - a) / (b - a));
  // Reload, r 0 -> 1 over 2.8 s, three rounds through the gate:
  //   0-0.1  the right hand lets go of the loop and drops below the rifle for a round
  //   then three beats of 0.25: up to the gate (40%), pushed in nose first (20%, roundIn), back down empty (40%)
  //   0.85-1 after the third round the hand comes back up through the loop
  const B0 = 0.1,
    BEAT = 0.25;
  function reload(r, pr, s) {
    const g = model && model.grips.right;
    if (r < 0) {
      if (g) g.mix = 0;
      roundMesh.visible = false;
      round.position.fromArray(R_LOW);
      return;
    }
    let u = (r - B0) / BEAT; // beat index + phase
    const beat = Math.max(0, Math.min(2, Math.floor(u)));
    const ph = r < B0 ? 0 : Math.min(1, u - beat);
    const last = beat === 2;
    // where the round is along its way: 0 low, 1 at the gate, 2 pushed in
    let k;
    if (ph < 0.4) k = span(ph, 0, 0.4);
    else if (ph < 0.6) k = 1 + span(ph, 0.4, 0.6);
    else if (last) k = 2;
    else k = 2 * (1 - span(ph, 0.62, 1));
    const out = Math.max(0, 1 - k); // 1 low .. 0 at the gate
    if (k <= 1) {
      // coming up from below, round the right side of the lever
      const a = (1 - k) * (1 - k),
        b = 2 * k * (1 - k),
        c = k * k;
      for (let i = 0; i < 3; i++)
        round.position.setComponent(
          i,
          a * R_LOW[i] + b * R_MID[i] + c * R_AT[i],
        );
    } else {
      const p = k - 1;
      for (let i = 0; i < 3; i++)
        round.position.setComponent(i, R_AT[i] + (R_IN[i] - R_AT[i]) * p);
    }
    // nose tipped up a little while it comes up
    round.rotation.set(-0.5 * out, RYAW, 0);
    // the round shows while it is in the hand: from the moment the hand has it until it is pushed home
    const pushed = ph >= 0.6;
    roundMesh.visible = r >= 0.07 && !pushed;
    for (let i = 0; i < 3; i++) {
      const at = B0 + (i + 0.6) * BEAT;
      if (pr < at && r >= at && s.cue) s.cue("roundIn");
    }
    if (g) {
      g.to = "round";
      g.mix =
        r < B0 ? span(r, 0, B0 * 0.9) : r > 0.85 ? 1 - span(r, 0.86, 0.99) : 1;
    }
  }
  const NOPREV = { cycle: 1, reload: -1 };
  let model;
  model = kit.weapon({
    id: "lever",
    root,
    anchors: {
      muzzle: {
        base: [0, BORE, END + 0.002],
        a: [0, BORE, END_A + 0.013],
        b: [0, BORE, END + 0.002],
      },
      eject: [0, 0.058, 0.03],
    },
    // right hand round the wrist of the stock, fingers through the loop, index on the trigger; it rides the lever.
    // left hand under the walnut fore-end.
    hands: {
      right: {
        parent: leverHand,
        at: lrel([-0.0175, -0.004, -0.086]),
        palm: [1, 0.05, 0.2],
        fingers: [0.12, -0.6, 0.79],
        pose: POSE_HOLD,
        trigger: true,
        // reloading: the round held by its head between thumb and two fingers, palm up under it
        alts: {
          round: {
            parent: round,
            at: [-0.018, -0.03, -0.0427],
            palm: [0.75, 0.55, 0.37],
            fingers: [-0.177, -0.42, 0.89],
            pose: {
              base: "pinch",
              thumb: [0.2, -0.75, 0.65, 0.35, 0.25],
              index: [0.95, 1.15, 0.45, 0.05],
              middle: [1.0, 1.2, 0.45],
            },
          },
        },
      },
      left: {
        at: [0.008, -0.0016, 0.235],
        palm: [0, 1, 0],
        // the fore-end lies slantwise across the palm, in line with a forearm that comes up
        // from behind and below; fingers up the right flank, thumb along the left one
        // (finger angles from __lab.fitGrip)
        fingers: [-0.766, 0, 0.643],
        pose: {
          thumb: [0.51, -0.49, 0.7, 0.16, 0.15],
          index: [0.43, 0.84, 0.52, 0.03],
          middle: [0.92, 1.02, 0.63, 0.01],
          ring: [1.03, 1.13, 0.7, -0.01],
          pinky: [1.13, 1.22, 0.76, -0.01],
        },
      },
    },
    view: {
      // raised and pushed out a little so the hand working the lever stays in view below the receiver
      hip: { pos: [0.13, -0.1, -0.38], rot: [-0.02, 0.08, -0.1] },
      // reloading: rolled over to the left and turned in so the loading gate faces the eye
      reload: { pos: [-0.07, -0.312, 0.017], rot: [0.2, 0.1, 0.95] },
    },
    ownReload: true,
    show: { yaw: -0.85, pitch: 0.12 },
    // s.cycle 0 -> 1: hammer falls at once; the lever swings down ~55 deg over 10-45%, holds, and returns by 90%.
    // The bolt rides back with the lever and pushes the hammer over; the hammer stays cocked when it closes.
    update(s) {
      const c = s.cycle ?? 1;
      const prev = s.prev || NOPREV;
      const pc = prev.cycle ?? 1;
      if (s.cue) {
        if (pc < 0.12 && c >= 0.12) s.cue("leverOpen");
        if (pc < 0.86 && c >= 0.86) s.cue("leverClose");
      }
      reload(s.reload ?? -1, prev.reload ?? -1, s);
      const open =
        c < 0.1
          ? 0
          : c < 0.45
            ? (c - 0.1) / 0.35
            : c < 0.55
              ? 1
              : c < 0.9
                ? 1 - (c - 0.55) / 0.35
                : 0;
      const e = smooth(open);
      lever.rotation.x = -0.96 * e;
      // the fingers inside the loop (LREF) follow the lever exactly; the hand turns only part of the way
      const la = -0.96 * e;
      leverHand.rotation.x = la * LF;
      const gr = model && model.grips.right;
      if (gr) gr.pose = e > 0.12 ? POSE_WORK : POSE_HOLD;
      const c1 = Math.cos(la),
        s1 = Math.sin(la),
        c2 = Math.cos(la * LF),
        s2 = Math.sin(la * LF);
      leverHand.position.set(
        0,
        LP[1] + (c1 - c2) * LREF[1] - (s1 - s2) * LREF[2],
        LP[0] + (c1 - c2) * LREF[2] + (s1 - s2) * LREF[1],
      );
      bolt.position.z = -0.068 * e;
      const cocked =
        c < 0.04 ? 1 - c / 0.04 : c < 0.1 ? 0 : smooth((c - 0.1) / 0.08);
      hammer.rotation.x = -(0.38 * cocked + 0.62 * e);
      trigger.rotation.x = (s.trigger || 0) * 0.3;
      // pendant swings with the rifle and kicks on the shot
      const t = s.t || 0;
      const kick =
        c < 1 ? Math.sin(Math.min(1, c * 2) * PI) * (1 - c) * 0.4 : 0;
      gong.rotation.x = Math.sin(t * 1.5) * 0.06 + kick + e * 0.25;
      gong.rotation.z = Math.sin(t * 1.1 + 0.4) * 0.05;
      // 乙: the coil charges with heat and towards every third round, flaring when it fires
      const k = (s.shots || 0) % 3;
      const charge = k / 2;
      const flare = k === 0 && (s.shots || 0) > 0 && c < 1 ? (1 - c) * 2.4 : 0;
      const flick = Math.sin(t * 37) * 0.06 + Math.sin(t * 91) * 0.04;
      coilGlow.emissiveIntensity =
        coilGlow.userData.glow *
        ((s.level || 1) >= 5 ? 1.8 : 1) *
        (0.25 +
          charge * 0.45 +
          (s.heat || 0) * 0.7 +
          flare +
          flick * (0.3 + charge));
    },
  });
  return model;
}
