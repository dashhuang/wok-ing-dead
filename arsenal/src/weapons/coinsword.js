// 金钱剑 · coin sword (melee).
// Square-holed bronze cash coins shingled along an iron core and bound with red cord.
// Gun space: +Z along the blade towards the tip, +Y up, +X shooter's left. Origin at the grip.
// The flat sides of the blade (the coin faces) look along +X and -X.

const R = 0.012; // coin radius
const PITCH = 0.0125; // spacing of coins along the blade
const Z0 = 0.092; // first blade coin
const N_MID = 34; // coins in the centre column
const N_SIDE = 29; // coins in each side column

// One cash coin: round rim, square hole, both faces. Axis along X. Built by hand because the kit's
// prism would spend ~500 triangles on it; this is ~150.
function coinGeometry(THREE, kit, radius, hole, thick, seg = 14) {
  const P = [],
    Nn = [],
    W = [];
  const b = thick * 0.3; // rim rounding
  const h = thick / 2;
  // frame (u, v, w) -> (x = w, y = u, z = v): a cyclic permutation, so winding is preserved
  const V = (u, v, w, nu, nv, nw, wear) => {
    P.push(w, u, v);
    Nn.push(nw, nu, nv);
    W.push(wear);
  };
  const tri = (a, c, d) => {
    V(...a);
    V(...c);
    V(...d);
  };
  for (let i = 0; i < seg; i++) {
    const a0 = (i / seg) * Math.PI * 2,
      a1 = ((i + 1) / seg) * Math.PI * 2;
    const c0 = Math.cos(a0),
      s0 = Math.sin(a0),
      c1 = Math.cos(a1),
      s1 = Math.sin(a1);
    const ri = radius - b;
    // wall
    const A0 = [c0 * radius, s0 * radius, -h + b, c0, s0, 0, 1],
      B0 = [c1 * radius, s1 * radius, -h + b, c1, s1, 0, 1],
      B1 = [c1 * radius, s1 * radius, h - b, c1, s1, 0, 1],
      A1 = [c0 * radius, s0 * radius, h - b, c0, s0, 0, 1];
    tri(A0, B0, B1);
    tri(A0, B1, A1);
    // rounded rims
    const A2 = [c0 * ri, s0 * ri, h, 0, 0, 1, 1],
      B2 = [c1 * ri, s1 * ri, h, 0, 0, 1, 1];
    tri(A1, B1, B2);
    tri(A1, B2, A2);
    const A3 = [c0 * ri, s0 * ri, -h, 0, 0, -1, 1],
      B3 = [c1 * ri, s1 * ri, -h, 0, 0, -1, 1];
    tri(A3, B3, B0);
    tri(A3, B0, A0);
  }
  // faces
  const contour = [];
  for (let i = 0; i < seg; i++) {
    const a = (i / seg) * Math.PI * 2;
    contour.push(
      new THREE.Vector2(Math.cos(a) * (radius - b), Math.sin(a) * (radius - b)),
    );
  }
  const hq = hole / 2;
  const sq = [
    new THREE.Vector2(-hq, -hq),
    new THREE.Vector2(-hq, hq),
    new THREE.Vector2(hq, hq),
    new THREE.Vector2(hq, -hq),
  ];
  const faces = THREE.ShapeUtils.triangulateShape(contour, [sq]);
  const all = contour.concat(sq);
  for (const f of faces) {
    const [a, c, d] = f.map((i) => all[i]);
    const ar = (c.x - a.x) * (d.y - a.y) - (d.x - a.x) * (c.y - a.y);
    const t = ar > 0 ? [a, c, d] : [a, d, c];
    // the face dips a little towards the hole so the rim reads as raised
    const wr = (p) =>
      Math.abs(p.x) <= hq + 1e-6 && Math.abs(p.y) <= hq + 1e-6 ? -0.25 : 0.3;
    tri(
      [t[0].x, t[0].y, h, 0, 0, 1, wr(t[0])],
      [t[1].x, t[1].y, h, 0, 0, 1, wr(t[1])],
      [t[2].x, t[2].y, h, 0, 0, 1, wr(t[2])],
    );
    tri(
      [t[0].x, t[0].y, -h, 0, 0, -1, wr(t[0])],
      [t[2].x, t[2].y, -h, 0, 0, -1, wr(t[2])],
      [t[1].x, t[1].y, -h, 0, 0, -1, wr(t[1])],
    );
  }
  // hole walls (normals point into the hole)
  for (let i = 0; i < 4; i++) {
    const a = sq[i],
      c = sq[(i + 1) % 4];
    const dx = c.x - a.x,
      dy = c.y - a.y;
    const l = Math.hypot(dx, dy);
    const nx = dy / l,
      ny = -dx / l; // sq runs clockwise -> the right of travel points into the hole
    const A0 = [a.x, a.y, -h, nx, ny, 0, -0.6],
      B0 = [c.x, c.y, -h, nx, ny, 0, -0.6],
      B1 = [c.x, c.y, h, nx, ny, 0, -0.6],
      A1 = [a.x, a.y, h, nx, ny, 0, -0.6];
    tri(A0, B0, B1);
    tri(A0, B1, A1);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(P, 3));
  g.setAttribute("normal", new THREE.Float32BufferAttribute(Nn, 3));
  const out = kit.adopt(g);
  out.setAttribute("aWear", new THREE.Float32BufferAttribute(W, 1));
  // bronze on the rims, verdigris collecting in the field round the hole and inside it
  const col = out.attributes.color;
  const BRONZE = [1.0, 0.8, 0.52],
    FIELD = [0.55, 0.62, 0.44],
    PATINA = [0.32, 0.8, 0.66],
    DEEP = [0.2, 0.42, 0.36];
  for (let i = 0; i < W.length; i++) {
    const w = W[i];
    const c = w >= 0.9 ? BRONZE : w > 0 ? FIELD : w > -0.4 ? PATINA : DEEP;
    col.setXYZ(i, c[0], c[1], c[2]);
  }
  return out;
}

export default function build(kit) {
  const {
    THREE,
    M,
    prism,
    box,
    lathe,
    rod,
    sweep,
    helix,
    sphere,
    torus,
    only,
    label,
    adopt,
  } = kit;
  const PI = Math.PI;
  const coin = coinGeometry(THREE, kit, R, 0.0062, 0.0017);
  // old cast bronze: the colour lives in the vertex colours (bronze rims, verdigris recesses); dull
  // enough that the coin faces show their own colour instead of mirroring the street neon. Worn rims
  // are rubbed back to bright metal.
  const COIN = kit.mats.variant(
    "coin",
    {
      color: 0xbca482,
      rough: 0.58,
      metal: 0.72,
      env: 0.55,
      dirt: 0.55,
      dirtColor: 0x5a6a48,
      edge: 0xf2cf86,
      edgeAmt: 0.9,
      edgeRough: 0.24,
      pAlbedo: 0.3,
      bump: 0.00025,
    },
    "coinsword-coin",
  );
  const rnd = (() => {
    let s = 20261112;
    return () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296;
  })();
  // a few bronze tones so the coins do not look stamped from one sheet
  const tones = [0xffffff, 0xeee0c8, 0xd8e0cc, 0xfff2dc, 0xe0d4bc, 0xd0dccc];
  const addCoin = (m, at, rot, o = {}) =>
    m.add(coin.clone(), COIN, {
      at,
      rot,
      color: tones[(rnd() * tones.length) | 0],
      mirror: o.mirror !== false,
      ...o,
    });
  const tie = (m, at, rot = [0, 0, 0], s = [0.0014, 0.0085, 0.0018]) =>
    m.add(adopt(new THREE.BoxGeometry(s[0], s[1], s[2])), "cord_red", {
      at,
      rot,
      mirror: true,
    });

  // ------------------------------------------------------------------ blade core + centre column (fixed)
  const bl = M();
  bl.add(box(0.0034, 0.011, 0.44, { bevel: 0.0008 }), "iron_cast", {
    at: [0, 0, 0.3],
  });
  bl.add(
    prism(
      [
        [0.505, -0.006, 0.002],
        [0.535, 0, 0.0015],
        [0.505, 0.006, 0.002],
      ],
      0.003,
      { bevel: 0.001 },
    ),
    "iron_cast",
  );
  const midZ = (i) => Z0 + i * PITCH;
  for (let i = 0; i < N_MID; i++) {
    // each coin leans on the one behind it, like scales
    addCoin(bl, [0.0046, 0, midZ(i)], [0, -0.13, (rnd() - 0.5) * 0.5]);
    tie(bl, [0.0064, 0, midZ(i) - 0.0005], [0, -0.13, 0]);
  }
  // red cord running through the square holes of the spine
  bl.add(
    rod(0.0011, Z0 - 0.012, midZ(N_MID - 1) + 0.006, { seg: 6 }),
    "cord_red",
    { at: [0.0061, 0, 0], mirror: true },
  );
  // tip: a last coin edge-on and the cord knotted round it
  bl.add(coin.clone(), COIN, {
    at: [0, 0, midZ(N_MID - 1) + 0.0115],
    rot: [0, 0, PI / 2],
  });
  bl.add(torus(0.0036, 0.0011, { seg: 6, around: 14 }), "cord_red", {
    at: [0, 0, midZ(N_MID - 1) + 0.021],
    rot: [0, PI / 2, 0],
  });
  const blade = bl.build("blade");

  // ------------------------------------------------------------------ side columns
  // base / B: tight, overlapping the spine. A: worked loose and splayed outwards.
  const sideZ = (i) => Z0 + 0.006 + i * PITCH;
  const taper = (i) => {
    const t = i / (N_SIDE - 1);
    return t < 0.78 ? 1 : 1 - ((t - 0.78) / 0.22) * 0.55; // the edge rows close in towards the tip
  };
  const tight = M();
  const loose = M();
  for (let i = 0; i < N_SIDE; i++) {
    for (const sy of [1, -1]) {
      const y = sy * 0.0118 * taper(i);
      addCoin(
        tight,
        [0.0024, y, sideZ(i)],
        [sy * 0.07, -0.13, (rnd() - 0.5) * 0.5],
      );
      tie(tight, [0.0042, y, sideZ(i)], [0, -0.13, 0]);
      // loose: pushed out, twisted and tilted by different amounts
      const k = rnd();
      addCoin(
        loose,
        [
          0.0026 + k * 0.0016,
          y * (1.16 + k * 0.22),
          sideZ(i) + (rnd() - 0.5) * 0.003,
        ],
        [
          sy * (0.2 + k * 0.5),
          -0.13 + (rnd() - 0.5) * 0.5,
          (rnd() - 0.5) * 0.8,
        ],
      );
    }
  }
  for (const sy of [1, -1]) {
    // edge cords
    const pts = [];
    for (let i = 0; i < N_SIDE; i += 4)
      pts.push([0.0039, sy * 0.0118 * taper(i), sideZ(i)]);
    pts.push([0.0039, sy * 0.0118 * taper(N_SIDE - 1), sideZ(N_SIDE - 1)]);
    tight.add(sweep(pts, 0.0011, { seg: 5, steps: 40 }), "cord_red", {
      mirror: true,
    });
    // loose cord sags away from the coins
    const lp = pts.map((p, j) => [
      p[0] + 0.0022 + (j % 2) * 0.0016,
      p[1] * (1.2 + (j % 3) * 0.08),
      p[2],
    ]);
    loose.add(sweep(lp, 0.0011, { seg: 5, steps: 40 }), "cord_red", {
      mirror: true,
    });
  }
  const sideTight = only(tight.build("coins-tight"), "base,b");
  const sideLoose = only(loose.build("coins-loose"), "a");

  // ------------------------------------------------------------------ guard, grip, pommel (fixed)
  const hl = M();
  // cross guard: a bronze bar faced with five coins on each side, a boss in the middle
  hl.add(box(0.0075, 0.104, 0.013, { bevel: 0.0015, r: 0.004 }), "bronze", {
    at: [0, 0, 0.068],
  });
  for (let i = -2; i <= 2; i++) {
    addCoin(
      hl,
      [0.0048 + (i % 2 === 0 ? 0.0014 : 0), i * 0.021, 0.068],
      [0, 0, (rnd() - 0.5) * 0.4],
    );
  }
  hl.add(
    lathe(
      [
        [0, 0],
        [0, 0.0082, 0.001],
        [0.0022, 0.0078, 0.001],
        [0.0036, 0.0044, 0.0015],
        [0.0044, 0],
      ],
      { seg: 18 },
    ),
    "brass_aged",
    { rot: [0, PI / 2, 0], at: [0.0068, 0, 0.068], mirror: true },
  );
  for (const sy of [1, -1]) {
    hl.add(
      sphere(0.0058, { seg: 12, rings: 8, squash: [0.8, 1, 1] }),
      "brass_aged",
      { at: [0, sy * 0.055, 0.068] },
    );
    // cord lashing the guard coins in an X
    hl.add(
      sweep(
        [
          [0.0074, sy * 0.006, 0.0745],
          [0.0078, sy * 0.022, 0.068],
          [0.0074, sy * 0.04, 0.0615],
        ],
        0.001,
        { seg: 5 },
      ),
      "cord_red",
      { mirror: true },
    );
    hl.add(
      sweep(
        [
          [0.0074, sy * 0.006, 0.0615],
          [0.0078, sy * 0.022, 0.068],
          [0.0074, sy * 0.04, 0.0745],
        ],
        0.001,
        { seg: 5 },
      ),
      "cord_red",
      { mirror: true },
    );
  }
  // collar between guard and blade
  hl.add(
    lathe(
      [
        [0.0745, 0],
        [0.0745, 0.0095, 0.001],
        [0.082, 0.0085, 0.001],
        [0.086, 0.006, 0.001],
        [0.086, 0],
      ],
      { seg: 20, squash: [0.62, 1.25] },
    ),
    "brass_aged",
  );
  // grip: wooden core bound in red cord
  hl.add(
    lathe(
      [
        [-0.052, 0],
        [-0.052, 0.0118, 0.001],
        [-0.02, 0.0132, 0.02],
        [0.03, 0.0128, 0.02],
        [0.0615, 0.0112, 0.001],
        [0.0615, 0],
      ],
      { seg: 22, squash: [0.84, 1.12] },
    ),
    "cord_red",
  );
  hl.add(
    helix((t) => 0.0122 + Math.sin(t * PI) * 0.0014, 0.0015, -0.05, 0.06, 26, {
      squash: [0.84, 1.12],
      seg: 5,
      perTurn: 14,
    }),
    "cord_red",
    {
      wear: 0.3,
    },
  );
  for (const z of [-0.05, 0.058]) {
    hl.add(
      lathe(
        [
          [z - 0.0035, 0.011, 0],
          [z - 0.0035, 0.0146, 0.001],
          [z + 0.0035, 0.0146, 0.001],
          [z + 0.0035, 0.011, 0],
        ],
        { seg: 22, squash: [0.84, 1.12] },
      ),
      "brass_aged",
    );
  }
  // pommel: bronze knob with a coin let into each side and a ring for the tassel
  hl.add(
    lathe(
      [
        [-0.0535, 0],
        [-0.0535, 0.012, 0.002],
        [-0.062, 0.0165, 0.006],
        [-0.074, 0.0165, 0.006],
        [-0.082, 0.009, 0.003],
        [-0.085, 0.004, 0.001],
        [-0.085, 0],
      ].reverse(),
      { seg: 22, squash: [0.6, 1.1] },
    ),
    "bronze",
  );
  addCoin(hl, [0.0098, 0, -0.068], [0, 0, 0.3]);
  hl.add(torus(0.0052, 0.0013, { seg: 6, around: 16 }), "brass_aged", {
    at: [0, 0, -0.0885],
    rot: [0, PI / 2, 0],
  });
  const hilt = hl.build("hilt");

  // ------------------------------------------------------------------ tassel (sways)
  const ts = M();
  // cord from the ring, a flat knot, a jade bead, then the tassel
  ts.add(
    sweep(
      [
        [0, 0, 0],
        [0, -0.004, -0.014],
        [0, -0.012, -0.03],
      ],
      0.0013,
      { seg: 5 },
    ),
    "cord_red",
  );
  // knot: woven lozenge with four ears
  ts.add(
    prism(
      [
        [-0.03, -0.012, 0.002],
        [-0.045, -0.03, 0.002],
        [-0.06, -0.016, 0.002],
        [-0.045, 0.002, 0.002],
      ],
      0.005,
      { bevel: 0.0018, bevelSeg: 2 },
    ),
    "cord_red",
  );
  for (const [z, y] of [
    [-0.036, -0.0245],
    [-0.054, -0.0245],
    [-0.054, -0.0035],
    [-0.036, -0.0035],
  ]) {
    ts.add(torus(0.0048, 0.0013, { seg: 5, around: 14 }), "cord_red", {
      at: [0, y, z],
      rot: [0, PI / 2, 0],
    });
  }
  for (let i = 0; i < 3; i++) {
    // weave lines across the knot
    ts.add(adopt(new THREE.BoxGeometry(0.0056, 0.0012, 0.02)), "cord_gold", {
      at: [0, -0.014 - (i - 1) * 0.0052, -0.045 - (i - 1) * 0.0052],
      rot: [-PI / 4, 0, 0],
    });
  }
  ts.add(sphere(0.0062, { seg: 14, rings: 10 }), "jade", {
    at: [0, -0.034, -0.066],
  });
  ts.add(
    lathe(
      [
        [0, 0],
        [0, 0.0042, 0.001],
        [0.004, 0.0062, 0.002],
        [0.014, 0.0066, 0.002],
        [0.016, 0.005, 0.001],
        [0.016, 0],
      ],
      { seg: 14 },
    ),
    "cord_gold",
    { rot: [PI - 0.45, 0, 0], at: [0, -0.0385, -0.0745] },
  );
  // skirt of threads
  const dir = [0, -Math.sin(0.45), -Math.cos(0.45)];
  const head = [0, -0.0385 + dir[1] * 0.014, -0.0745 + dir[2] * 0.014];
  ts.add(
    lathe(
      [
        [0, 0],
        [0, 0.0052, 0.001],
        [0.05, 0.0072, 0.01],
        [0.118, 0.0048, 0.002],
        [0.12, 0],
      ],
      { seg: 12 },
    ),
    "cord_red",
    { rot: [PI - 0.45, 0, 0], at: head },
  );
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * PI * 2;
    const ox = Math.cos(a),
      oy = Math.sin(a);
    const len = 0.118 + rnd() * 0.022;
    const p = (t, spread) => [
      head[0] + ox * spread,
      head[1] + dir[1] * len * t + oy * spread * 0.9 - t * t * 0.012,
      head[2] + dir[2] * len * t + oy * spread * 0.4,
    ];
    ts.add(
      sweep(
        [
          p(0.05, 0.004),
          p(0.45, 0.0078),
          p(0.8, 0.0082),
          p(1, 0.0074 + rnd() * 0.003),
        ],
        0.0011,
        { seg: 4, steps: 10 },
      ),
      "cord_red",
      {
        wear: 0.3,
      },
    );
  }
  const tassel = ts.build("tassel");
  tassel.position.set(0, 0, -0.0935);

  // ------------------------------------------------------------------ branch A 散钱: strings of loose coins hung from the guard
  const strings = [];
  for (const sy of [1, -1]) {
    const m = M();
    const n = 7;
    const path = [];
    for (let i = 0; i <= n + 1; i++) {
      const t = i / (n + 1);
      path.push([
        sy * 0.004 * Math.sin(t * 3),
        -sy * t * 0.004 - t * t * 0.03,
        -t * 0.105,
      ]);
    }
    m.add(sweep(path, 0.001, { seg: 5, steps: 30 }), "cord_red");
    for (let i = 1; i <= n; i++) {
      const p = path[i];
      m.add(coin.clone(), COIN, {
        at: [p[0], p[1] - 0.008, p[2]],
        rot: [0.5 + rnd() * 0.5, (rnd() - 0.5) * 1.6, rnd() * 3],
        color: tones[(rnd() * tones.length) | 0],
      });
    }
    m.add(sphere(0.003, { seg: 8, rings: 6 }), "cord_red", { at: path[n + 1] });
    const node = only(m.build("string"), "a");
    node.position.set(0, sy * 0.058, 0.064);
    strings.push(node);
  }

  // ------------------------------------------------------------------ branch B 斩煞: cinnabar spine, gilt edge, coins that light with the charge
  const bNode = new THREE.Group();
  bNode.name = "branch-b";
  only(bNode, "b");
  const bm = M();
  // gilt edge following the outer rows of coins and closing at the tip
  for (const sy of [1, -1]) {
    const pts = [];
    for (let i = 0; i < N_SIDE; i += 3)
      pts.push([0, sy * (0.0118 * taper(i) + R + 0.0006), sideZ(i)]);
    pts.push(
      [0, sy * 0.0128, midZ(N_MID - 1) + 0.004],
      [0, sy * 0.0035, midZ(N_MID - 1) + 0.03],
      [0, 0, midZ(N_MID - 1) + 0.036],
    );
    bm.add(
      sweep(pts, 0.0013, { seg: 6, steps: 60 }),
      kit.mats.glow(0xffb22a, 1.15, { base: 0x6a4a14, metal: 1, rough: 0.25 }),
      { scale: [1.9, 1, 1] },
    );
  }
  bNode.add(bm.build("gilt-edge"));
  // cinnabar script down the spine, both sides
  const script = (g, W, H) => {
    g.clearRect(0, 0, W, H);
    g.fillStyle = "#ff3a1c";
    g.strokeStyle = "#ff3a1c";
    g.textAlign = "center";
    g.textBaseline = "middle";
    const chars = [..."敕令斬煞鎮邪破祟急急如律令"];
    const step = W / (chars.length + 1);
    g.font = `700 ${H * 0.82}px ${kit.FONT_KAI}`;
    chars.forEach((c, i) => g.fillText(c, step * (i + 1), H * 0.52));
    g.lineWidth = H * 0.06;
    g.beginPath();
    g.moveTo(step * 0.3, H * 0.94);
    for (let x = step * 0.3; x < W - step * 0.3; x += 6)
      g.lineTo(x, H * 0.94 + Math.sin(x * 0.11) * H * 0.04);
    g.stroke();
  };
  for (const face of ["x", "-x"]) {
    bNode.add(
      label({
        key: "coinsword-script",
        w: 0.36,
        h: 0.0105,
        px: 1024,
        face,
        at: [face === "x" ? 0.0079 : -0.0079, 0, 0.3],
        glow: 2.2,
        glowColor: 0xff5030,
        rough: 0.6,
        draw: script,
      }),
    );
  }
  // hole rims on the spine coins: eight groups that light one after another as the charge builds
  const GROUPS = 8;
  const lit = [];
  const rim = prism(
    [
      [-0.0046, -0.0046, 0],
      [0.0046, -0.0046, 0],
      [0.0046, 0.0046, 0],
      [-0.0046, 0.0046, 0],
    ],
    0.0007,
    {
      bevel: 0,
      holes: [
        [
          [-0.0031, -0.0031, 0],
          [0.0031, -0.0031, 0],
          [0.0031, 0.0031, 0],
          [-0.0031, 0.0031, 0],
        ],
      ],
    },
  );
  const rimBase = kit.mats.glow(0xffb428, 3.2, {
    base: 0x6a5020,
    metal: 1,
    rough: 0.3,
  });
  for (let gI = 0; gI < GROUPS; gI++) {
    const mat = rimBase.clone();
    mat.userData.glow = 0;
    mat.emissiveIntensity = 0;
    kit.mats.glowMats.push(mat);
    const m = M();
    const from = Math.floor((gI / GROUPS) * N_MID),
      to = Math.floor(((gI + 1) / GROUPS) * N_MID);
    for (let i = from; i < to; i++)
      m.add(rim.clone(), mat, {
        at: [0.0057, 0, midZ(i)],
        rot: [0, -0.13, 0],
        mirror: true,
      });
    bNode.add(m.build(`rims-${gI}`));
    lit.push(mat);
  }

  // ------------------------------------------------------------------ assemble
  const root = new THREE.Group();
  root.name = "coinsword";
  root.add(blade, sideTight, sideLoose, hilt, tassel, ...strings, bNode);

  // ------------------------------------------------------------------ hands
  // Right hand round the corded hilt just behind the guard, thumb towards the guard; the hilt runs
  // diagonally across the palm (fingers tilted towards the tip) and the hand sits over the top-right
  // of it, knuckles up, so the wrist stays inside its range through the backhand cut. The hilt lies
  // across the roots of the fingers, not the middle of the palm, so the fingers close round it.
  // Left hand: 剑指, index and middle fingers held up beside the blade at the lower left of the view.
  // 乙 charging: the sword fingers run up the flat of the blade towards the tip, leading the light.
  const finger = new THREE.Object3D();
  finger.name = "sword-finger";
  root.add(finger);
  const basis = (palm, fingers) => {
    const z = new THREE.Vector3(...fingers).normalize();
    const y = new THREE.Vector3(...palm).negate();
    y.addScaledVector(z, -y.dot(z)).normalize();
    const x = new THREE.Vector3().crossVectors(y, z);
    return new THREE.Quaternion().setFromRotationMatrix(
      new THREE.Matrix4().makeBasis(x, y, z),
    );
  };
  // the gesture frame carries the hand: identity grip inside it
  const REST = {
    pos: new THREE.Vector3(0.293, -0.255, 0.127),
    q: basis([-0.719, 0.68, -0.142], [-0.414, -0.157, 0.897]),
  };
  // on the blade the hand sits off the shooter's-side flat towards the left edge, so the two straight
  // fingers run up along the coins without hiding them; ring and little finger fold below the edge.
  // The fingers lean in a little so their pads, not the palm, lie on the coins.
  const WIPE0 = {
    pos: new THREE.Vector3(0.012, -0.034, 0.165),
    q: basis([-1, 0, 0], [-0.05, 0.08, 1]),
  };
  const WIPE1 = {
    pos: new THREE.Vector3(0.012, -0.03, 0.355),
    q: basis([-1, 0, 0], [-0.05, 0.05, 1]),
  };
  // 乙 charging: the sword is brought in, hilt low in front of the body and the blade raised ahead,
  // so the off hand reaches it from below instead of crossing the whole view to the shooter's right.
  // CHARGE is the turn of the root that takes the hip pose (HIP) to the charge pose (camera space).
  const HIP = { pos: [0.21, -0.2, -0.36], rot: [1.02, 0.3, -0.32] };
  const CHARGE = (() => {
    const at = (v) => {
      const e = new THREE.Euler(v.rot[0], v.rot[1], v.rot[2], "YXZ");
      return new THREE.Matrix4()
        .compose(
          new THREE.Vector3(...v.pos),
          new THREE.Quaternion().setFromEuler(e),
          new THREE.Vector3(1, 1, 1),
        )
        .multiply(new THREE.Matrix4().makeRotationY(Math.PI));
    };
    const m = at(HIP)
      .invert()
      .multiply(at({ pos: [0.1, -0.3, -0.3], rot: [0.9, 0.2, -0.1] }));
    const out = { pos: new THREE.Vector3(), q: new THREE.Quaternion() };
    m.decompose(out.pos, out.q, new THREE.Vector3());
    return out;
  })();
  const ZERO = new THREE.Vector3(),
    UNTURNED = new THREE.Quaternion();
  finger.position.copy(REST.pos);
  finger.quaternion.copy(REST.q);
  // index and middle pressed together (the game hand's fingers fan apart at rest)
  const SWORD = {
    base: "sword",
    index: [0.04, 0.05, 0.03, -0.12],
    middle: [0.04, 0.05, 0.03, 0.04],
  };
  // on the blade the thumb cannot fold over the ring finger (it would go into the coins): it lies
  // along the index finger instead
  const WIPE_POSE = {
    base: "sword",
    index: [0.06, 0.08, 0.05, -0.12],
    middle: [0.06, 0.08, 0.05, 0.04],
    thumb: [0.6, 0.05, 0.8, 0.1, 0.1],
  };
  const fingerGrip = {
    parent: finger,
    at: [0, 0, 0],
    palm: [0, -1, 0],
    fingers: [0, 0, 1],
    pose: SWORD,
  };
  const ease = (k) => k * k * (3 - 2 * k);
  const wipe = { k: 0, along: 0 };
  const _q = new THREE.Quaternion(),
    _p = new THREE.Vector3(),
    _s = new THREE.Vector3(1, 1, 1),
    _A = new THREE.Matrix4(),
    _K = new THREE.Matrix4(),
    _L = new THREE.Matrix4(),
    _T = new THREE.Matrix4(),
    _I = new THREE.Matrix4();
  // First person: the swings turn the whole view rig about the eye. The sword hand rides it, but the
  // off hand belongs to the body: hold the gesture where it is relative to the camera.
  const rig = () => {
    const pose = model && model.holder.parent;
    const kick = pose && pose.parent;
    const mount = kick && kick.parent;
    if (!mount || !mount.parent || !mount.parent.isCamera) return null;
    // weapon root -> kick space, and the kick itself
    _A.compose(pose.position, pose.quaternion, pose.scale)
      .multiply(
        _T.compose(
          model.holder.position,
          model.holder.quaternion,
          model.holder.scale,
        ),
      )
      .multiply(_T.compose(root.position, root.quaternion, root.scale));
    _K.compose(kick.position, kick.quaternion, kick.scale);
    return true;
  };
  const hangers = [tassel, ...strings].map((node, i) => ({
    node,
    axis: (i
      ? new THREE.Vector3(0, -0.31, -0.95)
      : new THREE.Vector3(0, -0.45, -0.89)
    ).normalize(),
    dir: null,
    vel: new THREE.Vector3(),
  }));
  const _wq = new THREE.Quaternion(),
    _down = new THREE.Vector3(),
    _t = new THREE.Vector3(),
    _e = new THREE.Euler();
  let model;
  model = kit.weapon({
    id: "coinsword",
    root,
    hands: () => ({
      right: {
        at: [-0.0014, 0.0182, 0.006],
        palm: [0.6967, -0.7174, 0],
        fingers: [-0.5921, -0.575, 0.5646],
        pose: {
          base: "wrap",
          r: 0.0135,
          thumb: [0.42, -0.52, 0.74, 0.4, 0],
          index: [0.6, 0.45, 0.31, 0.03],
          middle: [1.2, 1.2, 0.84, 0],
          ring: [1.45, 1.05, 0.74, -0.02],
          pinky: [1.6, 0.65, 0.46, -0.05],
        },
      },
      left: fingerGrip,
    }),
    anchors: { base: [0, 0, 0.088], tip: [0, 0, 0.536] },
    view: { hip: HIP },
    show: { yaw: -0.75, pitch: 0.16, dist: 1.35 },
    update(s, dt = 1 / 60) {
      const t = s.t || 0;
      // 乙: the sword fingers lift to the blade as the charge starts and run up it with the light
      // (not while a cut is still going round: the sword is brought in once it has finished)
      const charging =
        s.branch === "b" &&
        (s.charge || 0) > 0.001 &&
        !(s.swing !== undefined && s.swing >= 0);
      // on release the hand snaps back into the guard before the cut comes round
      wipe.k +=
        ((charging ? 1 : 0) - wipe.k) * Math.min(1, dt * (charging ? 9 : 16));
      wipe.along +=
        ((charging ? Math.min(1, s.charge) : 0) - wipe.along) *
        Math.min(1, dt * 12);
      const kw = ease(Math.max(0, Math.min(1, wipe.k)));
      root.position.lerpVectors(ZERO, CHARGE.pos, kw);
      root.quaternion.slerpQuaternions(UNTURNED, CHARGE.q, kw);
      _p.lerpVectors(WIPE0.pos, WIPE1.pos, wipe.along);
      _q.slerpQuaternions(WIPE0.q, WIPE1.q, wipe.along);
      finger.position.lerpVectors(REST.pos, _p, kw);
      finger.quaternion.slerpQuaternions(REST.q, _q, kw);
      const gl = model && model.grips.left;
      if (gl) gl.pose = kw > 0.5 ? WIPE_POSE : SWORD;
      if (rig()) {
        // the gesture stays put in the view while the sword swings (it rides the blade when wiping)
        _L.compose(finger.position, finger.quaternion, _s);
        _T.copy(_K).invert().multiply(_A);
        _T.premultiply(_I.copy(_A).invert()).multiply(_L);
        _T.decompose(_p, _q, _s.set(1, 1, 1));
        _s.set(1, 1, 1);
        finger.position.lerp(_p, 1 - kw);
        finger.quaternion.slerp(_q, 1 - kw);
      }
      const sw =
        s.swing !== undefined && s.swing >= 0 ? Math.sin(s.swing * Math.PI) : 0;
      // tassel and coin strings hang towards the ground whichever way the sword is held, and
      // trail behind it through a swing (a damped pendulum chasing the local down direction)
      root.updateWorldMatrix(true, false);
      root.getWorldQuaternion(_wq);
      _down.set(0, -1, 0).applyQuaternion(_wq.invert());
      // a cord cannot hang through the hilt or the blade
      if (_down.z > -0.15) {
        _down.z = -0.15;
        _down.normalize();
      }
      const h = Math.min(dt, 0.05);
      for (let i = 0; i < hangers.length; i++) {
        const g = hangers[i];
        if (!g.dir) g.dir = _down.clone();
        g.vel
          .addScaledVector(_t.subVectors(_down, g.dir), 70 * h)
          .multiplyScalar(Math.exp(-6 * h));
        g.dir.addScaledVector(g.vel, h).normalize();
        g.node.quaternion.setFromUnitVectors(g.axis, g.dir);
        _e.set(
          Math.sin(t * 1.7 + i * 2) * 0.05 + sw * 0.25,
          Math.sin(t * 1.1 + i) * 0.07,
          0,
        );
        g.node.quaternion.multiply(_q.setFromEuler(_e));
      }
      // B: coins light from the guard to the tip as the charge builds, and flicker when full
      const c = Math.max(0, Math.min(1, s.charge || 0));
      const boost = (s.level || 1) >= 5 ? 1.8 : 1;
      for (let i = 0; i < lit.length; i++) {
        const k = Math.max(0, Math.min(1, c * (GROUPS + 1) - i));
        const full = c >= 0.999 ? 0.8 + 0.2 * Math.sin(t * 22 + i) : 1;
        lit[i].emissiveIntensity = 3.2 * k * full * boost;
      }
    },
  });
  return model;
}
