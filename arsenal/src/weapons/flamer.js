// 镬气 · flamethrower made from a dai pai dong wok burner.
// Gun space: +Z nozzle, +Y up, +X shooter's left. Origin at the squeeze lever in front of the rear grip.
// Layout: a black-iron gas pipe along Z at y = PY, the cast-iron burner head screwed onto its front,
// a blue camping-gas cylinder slung underneath with a rubber hose up to a brass globe valve, a cloth
// wrapped pipe grip hanging from a tee at the back and a carry handle on top of the front half.
const PY = 0.045; // pipe axis height
const PR = 0.0167; // pipe radius (1" black-iron pipe)
const CY = PY - 0.0585; // gas cylinder axis height
const CZ = 0.2435; // middle of the gas cylinder along Z
const PIPE_END = 0.47;

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
    wrap,
    label,
  } = kit;
  const PI = Math.PI;
  const THREE = kit.THREE;

  // ------------------------------------------------------------------ helpers
  const zAxis = new THREE.Vector3(0, 0, 1);
  /** Euler (XYZ) that turns +Z onto dir. */
  const dirRot = (d) => {
    const v = new THREE.Vector3(d[0], d[1], d[2]).normalize();
    const q = new THREE.Quaternion().setFromUnitVectors(zAxis, v);
    const e = new THREE.Euler().setFromQuaternion(q, "XYZ");
    return [e.x, e.y, e.z];
  };
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const len = (a) => Math.hypot(a[0], a[1], a[2]);
  /** Round bar from point a to point b. */
  const bar = (m, r, a, b, mat, o = {}) => {
    const d = sub(b, a);
    m.add(rod(r, 0, len(d), { seg: o.seg || 12, r: o.r, flat: o.flat }), mat, {
      at: a,
      rot: dirRot(d),
      wear: o.wear,
    });
  };
  /** Worm-drive hose clamp round a hose of radius r at point p, hose running along dir. */
  const clamp = (m, p, dir, r, spin = 0) => {
    const g = kit.mergeGeometries([
      tube(r + 0.0012, r - 0.0001, -0.0035, 0.0035, { seg: 16, r: 0, rIn: 0 }),
      kit.place(box(0.0062, 0.0042, 0.0085, { bevel: 0.0006 }), {
        at: [0, r + 0.0026, 0],
      }),
      kit.place(rod(0.0017, -0.0045, 0.0045, { seg: 6, flat: true }), {
        at: [0, r + 0.0034, 0],
        rot: [0, PI / 2, 0],
      }),
    ]);
    g.rotateZ(spin);
    m.add(g, "steel_bare", { at: p, rot: dirRot(dir), wear: 0.3 });
  };
  /** Lofted shell between superellipse sections [z, halfW, halfH, exponent]. inner = normals face the axis. */
  const loft = (secs, { seg = 40, inner = false } = {}) => {
    const pos = [];
    for (const [z, a, b, p] of secs) {
      for (let j = 0; j < seg; j++) {
        const t = (j / seg) * PI * 2;
        const c = Math.cos(t),
          s = Math.sin(t);
        pos.push(
          a * Math.sign(c) * Math.abs(c) ** (2 / p),
          b * Math.sign(s) * Math.abs(s) ** (2 / p),
          z,
        );
      }
    }
    const idx = [];
    for (let i = 0; i < secs.length - 1; i++) {
      for (let j = 0; j < seg; j++) {
        const A = i * seg + j,
          B = i * seg + ((j + 1) % seg),
          C = (i + 1) * seg + ((j + 1) % seg),
          D = (i + 1) * seg + j;
        if (inner) idx.push(A, C, B, A, D, C);
        else idx.push(A, B, C, A, C, D);
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    g.setIndex(idx);
    g.computeVertexNormals();
    return kit.adopt(g, 0.15);
  };
  // text helpers for kit.wrap (see nailgun.js): logical canvas whose +x runs along the part
  const onLeft = (g, W, H, fn) => {
    g.save();
    g.translate(W, 0);
    g.rotate(PI / 2);
    fn(g, H, W);
    g.restore();
  };
  const onRight = (g, W, H, fn) => {
    g.save();
    g.translate(0, H);
    g.rotate(-PI / 2);
    fn(g, H, W);
    g.restore();
  };
  const scuff = (g, W, H, n = 60, rgb = "40,30,20") => {
    for (let i = 0; i < n; i++) {
      g.strokeStyle = `rgba(${rgb},${0.05 + Math.random() * 0.16})`;
      g.lineWidth = 1 + Math.random() * 2.5;
      g.beginPath();
      const x = Math.random() * W,
        y = Math.random() * H;
      g.moveTo(x, y);
      g.lineTo(x + (Math.random() - 0.5) * 60, y + (Math.random() - 0.5) * 20);
      g.stroke();
    }
  };

  const gasBlue = kit.mats.variant(
    "paint_blue",
    { color: 0x1d58b8, rough: 0.36 },
    "flamer-gas-blue",
  );
  const rag = kit.mats.variant(
    "cloth_red",
    { color: 0x5a4a34, edge: 0x9a8a6a },
    "flamer-rag",
  );
  const pipeMat = "steel_park";
  // burner casting: lighter grey-brown iron so the holes read, with bright rubbed edges
  const castIron = kit.mats.variant(
    "iron_cast",
    {
      color: 0x4e4842,
      rough: 0.6,
      metal: 0.55,
      pAlbedo: 0.42,
      dirt: 0.5,
      dirtColor: 0x6e4a30,
      edge: 0xc4c0b6,
      edgeAmt: 0.9,
      edgeRough: 0.3,
    },
    "flamer-cast",
  );
  // polished fittings: the valve body and the pilot line pick up highlights
  const brassLit = kit.mats.variant(
    "brass",
    { color: 0xc9a048, rough: 0.2, dirt: 0.4, edge: 0xffe6a0 },
    "flamer-brass",
  );
  const copperLit = kit.mats.variant(
    "copper",
    { color: 0xd07a48, rough: 0.2, dirt: 0.3, edge: 0xffc09a },
    "flamer-copper",
  );

  // ------------------------------------------------------------------ pipe body, grip, cylinder, hose (fixed)
  const b = M();
  // main pipe with threaded ends showing at the fittings
  b.add(rod(PR, -0.1, PIPE_END, { seg: 28, r: 0.0006 }), pipeMat, {
    at: [0, PY, 0],
  });
  for (const [z0, z1] of [
    [-0.1, -0.088],
    [PIPE_END - 0.028, PIPE_END - 0.016],
  ]) {
    b.add(
      helix(PR + 0.0002, 0.0005, z0, z1, 7, { seg: 3, perTurn: 10 }),
      "steel_bare",
      { at: [0, PY, 0], wear: 0.4 },
    );
  }
  // rear end cap (hex) with a wire loop and a red cord tied through it
  b.add(
    rod(0.0205, -0.126, -0.098, { seg: 6, flat: true, r: 0.0015 }),
    "iron_cast",
    { at: [0, PY, 0] },
  );
  b.add(rod(0.0175, -0.131, -0.125, { seg: 24, r: 0.0015 }), "iron_cast", {
    at: [0, PY, 0],
  });
  b.add(torus(0.009, 0.0016, { seg: 6, around: 18 }), "steel_bare", {
    at: [0, PY - 0.005, -0.136],
    rot: [0, PI / 2, 0],
    wear: 0.3,
  });
  b.add(
    sweep(
      [
        [0, PY - 0.013, -0.137],
        [0.006, PY - 0.03, -0.133],
        [0.004, PY - 0.055, -0.128],
        [0.008, PY - 0.075, -0.131],
      ],
      0.0017,
      { seg: 6, steps: 24 },
    ),
    "cord_red",
  );
  b.add(sphere(0.0036, { seg: 8, rings: 6 }), "cord_red", {
    at: [0.001, PY - 0.016, -0.137],
  });
  // grip tee and the hanging pipe grip, raked back
  b.add(
    rod(0.0215, -0.074, -0.026, { seg: 8, flat: true, r: 0.002 }),
    "iron_cast",
    { at: [0, PY, 0] },
  );
  b.add(rod(0.0225, -0.078, -0.072, { seg: 24, r: 0.001 }), "iron_cast", {
    at: [0, PY, 0],
  });
  b.add(rod(0.0225, -0.028, -0.022, { seg: 24, r: 0.001 }), "iron_cast", {
    at: [0, PY, 0],
  });
  const GTOP = [0, PY, -0.05];
  const GDIR = [0, -Math.sin(PI / 2 - 0.24), -Math.cos(PI / 2 - 0.24)];
  const gp = (t) => [
    GTOP[0] + GDIR[0] * t,
    GTOP[1] + GDIR[1] * t,
    GTOP[2] + GDIR[2] * t,
  ];
  const grot = dirRot(GDIR);
  b.add(rod(0.0205, 0, 0.034, { seg: 8, flat: true, r: 0.002 }), "iron_cast", {
    at: GTOP,
    rot: grot,
  });
  b.add(rod(0.0135, 0.03, 0.158, { seg: 22 }), pipeMat, {
    at: GTOP,
    rot: grot,
  });
  // rag wrap: base layer, raised spiral turns, a knot and a loose tail
  b.add(rod(0.0158, 0.044, 0.146, { seg: 22, r: 0.004 }), rag, {
    at: GTOP,
    rot: grot,
    wear: 0.4,
  });
  b.add(
    helix(0.0158, 0.0022, 0.046, 0.144, 8.5, { seg: 5, perTurn: 12 }),
    rag,
    { at: GTOP, rot: grot, wear: 0.5 },
  );
  b.add(sphere(0.0072, { seg: 10, rings: 8, squash: [1, 0.8, 1.3] }), rag, {
    at: sub(gp(0.144), [0, 0, -0.016]),
    wear: 0.4,
  });
  b.add(
    prism(
      [
        [0, 0, 0.001],
        [0.012, 0, 0.001],
        [0.011, -0.03, 0.006],
        [0.016, -0.052, 0.001],
        [0.006, -0.054, 0.001],
        [0.002, -0.028, 0.006],
      ],
      0.0018,
      { bevel: 0.0005 },
    ),
    rag,
    {
      at: [0.0, gp(0.144)[1] + 0.004, gp(0.144)[2] - 0.022],
      rot: [0, 0, 0.08],
      wear: 0.3,
    },
  );
  // grip end cap
  b.add(
    rod(0.0165, 0.154, 0.172, { seg: 6, flat: true, r: 0.0015 }),
    "iron_cast",
    { at: GTOP, rot: grot },
  );
  // lever bracket under the pipe: clamp band with two ears and a pin
  b.add(
    tube(PR + 0.0022, PR - 0.0002, 0.064, 0.082, { seg: 24, r: 0.0006 }),
    "steel_bare",
    { at: [0, PY, 0], wear: 0.3 },
  );
  b.add(box(0.003, 0.016, 0.016, { bevel: 0.0006, r: 0.004 }), "steel_bare", {
    at: [0.0072, PY - 0.022, 0.073],
    mirror: true,
    wear: 0.3,
  });
  b.add(rod(0.0022, -0.011, 0.011, { seg: 8 }), "steel_bare", {
    at: [0, PY - 0.026, 0.073],
    rot: [0, PI / 2, 0],
    wear: 0.3,
  });
  b.add(screw(0.0026, { axis: "y", hex: true, h: 0.002 }), "steel_bare", {
    at: [0, PY + PR + 0.002, 0.073],
    wear: 0.4,
  });

  // brass globe valve inline on the pipe
  const VZ = 0.125;
  b.add(
    sphere(0.0215, { seg: 22, rings: 14, squash: [1, 1.08, 1.15] }),
    brassLit,
    { at: [0, PY, VZ] },
  );
  for (const z of [0.093, 0.146]) {
    b.add(
      rod(0.0222, z, z + 0.011, { seg: 6, flat: true, r: 0.0012 }),
      brassLit,
      { at: [0, PY, 0] },
    );
    b.add(
      rod(0.02, z + (z < VZ ? 0.011 : -0.004), z + (z < VZ ? 0.015 : 0), {
        seg: 22,
      }),
      brassLit,
      { at: [0, PY, 0] },
    );
  }
  // bonnet, packing nut and stem
  b.add(rod(0.0135, 0, 0.012, { seg: 6, flat: true, r: 0.001 }), brassLit, {
    at: [0, PY + 0.019, VZ],
    rot: [-PI / 2, 0, 0],
  });
  b.add(rod(0.0105, 0.012, 0.022, { seg: 20, r: 0.001 }), brassLit, {
    at: [0, PY + 0.019, VZ],
    rot: [-PI / 2, 0, 0],
  });
  b.add(rod(0.0075, 0.022, 0.03, { seg: 6, flat: true, r: 0.0008 }), brassLit, {
    at: [0, PY + 0.019, VZ],
    rot: [-PI / 2, 0, 0],
    wear: 0.4,
  });
  b.add(rod(0.0028, 0.03, 0.044, { seg: 10 }), "steel_bare", {
    at: [0, PY + 0.019, VZ],
    rot: [-PI / 2, 0, 0],
    wear: 0.3,
  });
  // side inlet with a hose barb on the left
  b.add(
    rod(0.0085, 0.014, 0.026, { seg: 6, flat: true, r: 0.0008 }),
    brassLit,
    {
      at: [0, PY - 0.002, VZ - 0.004],
      rot: [0, PI / 2, 0],
    },
  );
  b.add(
    lathe(
      [
        [0.026, 0],
        [0.026, 0.0052],
        [0.03, 0.0052],
        [0.03, 0.0062, 0],
        [0.034, 0.0046, 0],
        [0.034, 0.0062, 0],
        [0.038, 0.0046, 0],
        [0.038, 0.0055, 0],
        [0.041, 0.0042],
        [0.041, 0],
      ],
      { seg: 16 },
    ),
    brassLit,
    { at: [0, PY - 0.002, VZ - 0.004], rot: [0, PI / 2, 0] },
  );
  // pilot needle valve on top-left of the body
  b.add(rod(0.0045, 0, 0.012, { seg: 6, flat: true }), brassLit, {
    at: [0.011, PY + 0.014, VZ + 0.016],
    rot: [-PI / 2 + 0.0, 0.55, 0],
  });
  b.add(rod(0.0058, 0.012, 0.018, { seg: 12, r: 0.0008 }), "polymer", {
    at: [0.011, PY + 0.014, VZ + 0.016],
    rot: [-PI / 2, 0.55, 0],
    wear: 0.3,
  });

  // pressure gauge on a riser behind the valve, tilted up towards the shooter
  const GZ = 0.058;
  const TILT = 0.62;
  const GC = [0, PY + 0.05, GZ]; // gauge centre
  const GN = [0, Math.sin(TILT), -Math.cos(TILT)]; // dial normal
  b.add(rod(0.0085, 0, 0.012, { seg: 24, r: 0.001 }), "iron_cast", {
    at: [0, PY + PR - 0.004, GZ],
    rot: [-PI / 2, 0, 0],
  });
  b.add(rod(0.0046, 0.008, 0.022, { seg: 12 }), brassLit, {
    at: [0, PY + PR - 0.004, GZ],
    rot: [-PI / 2, 0, 0],
  });
  b.add(rod(0.0068, 0.014, 0.02, { seg: 6, flat: true }), brassLit, {
    at: [0, PY + PR - 0.004, GZ],
    rot: [-PI / 2, 0, 0],
    wear: 0.4,
  });
  b.add(
    lathe(
      [
        [-0.009, 0],
        [-0.009, 0.019, 0.004],
        [0.006, 0.0222, 0.002],
        [0.0092, 0.0218, 0.0008],
        [0.0092, 0.0196, 0.0003],
        [0.006, 0.0196, 0],
        [0.006, 0],
      ],
      { seg: 36 },
    ),
    "chrome",
    { at: GC, rot: [TILT + PI, 0, 0] },
  );
  b.add(
    rod(0.0196, 0.0084, 0.0089, { seg: 36 }),
    kit.mats.glass(0xffffff, { opacity: 0.16 }),
    {
      at: GC,
      rot: [TILT + PI, 0, 0],
    },
  );

  // camping-gas cylinder slung underneath: domed can, crimped rear neck, regulator with a black knob.
  // The can is its own node (it is unscrewed and swapped on reload); the regulator stays on the hose.
  const cn = M();
  const CO = [0, 0, -CZ]; // can node origin sits on the can axis at its middle
  cn.add(
    lathe(
      [
        [0.146, 0],
        [0.146, 0.022, 0.006],
        [0.158, 0.0358, 0.012],
        [0.326, 0.0358, 0.012],
        [0.338, 0.024, 0.008],
        [0.341, 0],
      ],
      { seg: 32 },
    ),
    gasBlue,
    { at: CO },
  );
  cn.add(
    tube(0.0365, 0.0352, 0.158, 0.161, { seg: 32, r: 0, rIn: 0 }),
    gasBlue,
    { at: CO, wear: 0.8 },
  );
  cn.add(
    tube(0.0365, 0.0352, 0.322, 0.325, { seg: 32, r: 0, rIn: 0 }),
    gasBlue,
    { at: CO, wear: 0.8 },
  );
  // crimped neck: same blue steel, a little brighter wear so it reads as bare metal at the edges
  cn.add(rod(0.0135, 0.134, 0.149, { seg: 24, r: 0.0025 }), gasBlue, {
    at: CO,
    wear: 1,
  });
  b.add(rod(0.012, 0.108, 0.136, { seg: 6, flat: true, r: 0.0012 }), brassLit, {
    at: [0, CY, 0],
  });
  b.add(rod(0.0082, 0.1, 0.11, { seg: 20, r: 0.001 }), brassLit, {
    at: [0, CY, 0],
  });
  b.add(rod(0.0095, 0, 0.014, { seg: 16, r: 0.002 }), "polymer", {
    at: [0, CY - 0.009, 0.122],
    rot: [PI / 2, 0, 0],
  });
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * PI * 2;
    b.add(box(0.0016, 0.012, 0.0016, { bevel: 0.0003 }), "polymer", {
      at: [Math.cos(a) * 0.0095, CY - 0.016, 0.122 + Math.sin(a) * 0.0095],
      wear: 0.2,
    });
  }
  // regulator outlet barb pointing left
  b.add(rod(0.006, 0.012, 0.02, { seg: 6, flat: true }), brassLit, {
    at: [0, CY, 0.122],
    rot: [0, PI / 2, 0],
  });
  b.add(
    lathe(
      [
        [0.02, 0],
        [0.02, 0.0052],
        [0.024, 0.0062, 0],
        [0.027, 0.0046, 0],
        [0.027, 0.0058, 0],
        [0.031, 0.0042],
        [0.031, 0],
      ],
      { seg: 16 },
    ),
    brassLit,
    { at: [0, CY, 0.122], rot: [0, PI / 2, 0] },
  );
  // two spring clips round the cylinder (open underneath so the can pulls down out of them) hung from
  // straps round the pipe, a saddle block between
  const CLIP = 0.62; // half-width of the clip opening, radians either side of straight down
  for (const z of [0.17, 0.312]) {
    b.add(
      tube(0.0378, 0.0356, z - 0.005, z + 0.005, {
        seg: 26,
        r: 0,
        rIn: 0,
        arc: [-PI / 2 + CLIP, PI * 2 - CLIP * 2],
      }),
      "steel_bare",
      { at: [0, CY, 0], wear: 0.35 },
    );
    // rolled lips at the two ends of the clip
    for (const sgn of [-1, 1])
      b.add(rod(0.0022, z - 0.005, z + 0.005, { seg: 8 }), "steel_bare", {
        at: [
          Math.cos(-PI / 2 + CLIP * sgn) * 0.0388 * 1,
          CY + Math.sin(-PI / 2 + CLIP * sgn) * 0.0388,
          0,
        ],
        wear: 0.5,
      });
    b.add(
      tube(PR + 0.0016, PR - 0.0002, z - 0.005, z + 0.005, {
        seg: 20,
        r: 0,
        rIn: 0,
      }),
      "steel_bare",
      { at: [0, PY, 0], wear: 0.35 },
    );
    b.add(box(0.016, 0.0095, 0.012, { bevel: 0.001 }), "rubber", {
      at: [0, PY - PR - 0.0028, z],
    });
    b.add(box(0.008, 0.007, 0.012, { bevel: 0.001 }), "steel_bare", {
      at: [0.0395, CY + 0.004, z],
      wear: 0.3,
    });
    b.add(rod(0.0021, -0.0075, 0.0075, { seg: 6 }), "steel_park", {
      at: [0.0405, CY + 0.004, z],
      rot: [-PI / 2, 0, 0],
      wear: 0.3,
    });
  }
  // hose from the regulator up into the valve, two clamps
  const H0 = [0.029, CY, 0.122];
  const H1 = [0.039, PY - 0.002, VZ - 0.004];
  b.add(
    sweep(
      [
        H0,
        [0.042, CY + 0.001, 0.121],
        [0.058, CY + 0.012, 0.112],
        [0.066, PY - 0.02, 0.098],
        [0.064, PY - 0.002, 0.1],
        [0.052, PY - 0.002, VZ - 0.006],
        H1,
      ],
      0.0056,
      { seg: 10, tension: 0.4, steps: 48 },
    ),
    "rubber",
  );
  clamp(b, [0.0245, CY, 0.122], [1, 0, 0], 0.0056, 0.4);
  clamp(b, [0.035, PY - 0.002, VZ - 0.004], [1, 0, 0], 0.0056, -0.6);

  // pilot line: copper tube from the needle valve along the top-left of the pipe
  const PA = 0.82; // angle of the pilot tube round the pipe (from +X towards +Y)
  const PRR = PR + 0.0028;
  const pilotPt = (z, rr = PRR) => [
    Math.cos(PA) * rr,
    PY + Math.sin(PA) * rr,
    z,
  ];
  b.add(
    sweep(
      [
        [0.0135, PY + 0.022, VZ + 0.02],
        [0.014, PY + 0.022, VZ + 0.034],
        pilotPt(VZ + 0.05),
        pilotPt(0.25),
        pilotPt(PIPE_END - 0.02),
      ],
      0.0022,
      {
        seg: 8,
        tension: 0.3,
        steps: 56,
      },
    ),
    copperLit,
  );
  for (const z of [0.2, 0.39]) {
    b.add(box(0.008, 0.0016, 0.006, { bevel: 0.0004 }), "steel_bare", {
      at: pilotPt(z, PRR + 0.002),
      rot: [0, 0, PA - PI / 2],
      wear: 0.3,
    });
  }

  // front carry handle: two strap posts and a wooden sleeve
  const HZ0 = 0.33,
    HZ1 = 0.425,
    HY = PY + 0.06;
  for (const z of [HZ0, HZ1]) {
    b.add(
      tube(PR + 0.002, PR - 0.0002, z - 0.006, z + 0.006, { seg: 20, rIn: 0 }),
      "steel_bare",
      { at: [0, PY, 0], wear: 0.3 },
    );
    b.add(
      prism(
        [
          [z - 0.008, PY + PR - 0.001],
          [z + 0.008, PY + PR - 0.001],
          [z + 0.005, HY + 0.004, 0.004],
          [z - 0.005, HY + 0.004, 0.004],
        ],
        0.0045,
        { bevel: 0.0008 },
      ),
      "steel_bare",
      { wear: 0.3 },
    );
    b.add(screw(0.0028, { axis: "x", hex: true, h: 0.002 }), "steel_bare", {
      at: [0.0024, PY + PR + 0.006, z],
      mirror: true,
      wear: 0.4,
    });
  }
  b.add(
    rod(0.0042, HZ0 - 0.006, HZ1 + 0.006, { seg: 12, r: 0.001 }),
    "steel_bare",
    { at: [0, HY, 0] },
  );
  b.add(
    rod(0.0105, HZ0 + 0.007, HZ1 - 0.007, { seg: 20, r: 0.003 }),
    "wood_dark",
    { at: [0, HY, 0] },
  );
  for (const z of [HZ0 + 0.012, HZ1 - 0.012])
    b.add(
      tube(0.0112, 0.0098, z - 0.002, z + 0.002, { seg: 20 }),
      "steel_bare",
      { at: [0, HY, 0], wear: 0.3 },
    );
  // pipe coupling at the front that takes the nozzle
  b.add(
    rod(0.0215, PIPE_END - 0.016, PIPE_END + 0.016, {
      seg: 8,
      flat: true,
      r: 0.0015,
    }),
    "iron_cast",
    { at: [0, PY, 0] },
  );
  const body = b.build("body");

  // red brush-painted characters on the pipe, between the straps
  body.add(
    wrap({
      key: "flamer-pipe",
      r: PR + 0.0003,
      z0: 0.19,
      z1: 0.292,
      arc: [PI / 2 - 0.9, 1.8],
      px: 256,
      opaque: false,
      at: [0, PY, 0],
      rough: 0.7,
      draw(g, W, H) {
        g.clearRect(0, 0, W, H);
        onLeft(g, W, H, (g, w, h) => {
          g.fillStyle = "rgba(196,28,20,0.92)";
          g.font = `900 ${h * 0.62}px ${kit.FONT_KAI}`;
          g.textAlign = "center";
          g.textBaseline = "middle";
          g.fillText("鑊 氣", w * 0.5, h * 0.52);
          g.globalCompositeOperation = "destination-out";
          scuff(g, w, h, 40, "0,0,0");
          g.globalCompositeOperation = "source-over";
        });
      },
    }),
  );
  // the gas can rides its own node: unscrewed, dropped and swapped on reload
  const can = cn.build("gas-can");
  can.position.set(0, CY, CZ);
  // cylinder label: white band with brand and the 小心火燭 warning on both sides
  can.add(
    wrap({
      key: "flamer-gas",
      r: 0.03595,
      z0: 0.176,
      z1: 0.306,
      px: 1024,
      at: CO,
      rough: 0.45,
      metal: 0.1,
      draw(g, W, H) {
        g.fillStyle = "#1d58b8";
        g.fillRect(0, 0, W, H);
        for (const [u, side] of [
          [0.25, onLeft],
          [0.75, onRight],
        ]) {
          g.save();
          g.beginPath();
          g.rect(W * (u - 0.21), 0, W * 0.42, H);
          g.clip();
          g.translate(W * (u - 0.5), 0);
          side(g, W, H, (g, w, h) => {
            const y0 = h * 0.29,
              y1 = h * 0.71;
            g.fillStyle = "#efece4";
            g.fillRect(w * 0.02, y0, w * 0.96, y1 - y0);
            g.textBaseline = "middle";
            g.textAlign = "left";
            // brand block
            g.fillStyle = "#1d58b8";
            g.fillRect(w * 0.04, y0 + h * 0.015, w * 0.3, h * 0.07);
            g.fillStyle = "#fff";
            g.font = `900 ${h * 0.055}px ${kit.FONT_HEI}`;
            g.fillText("藍火牌", w * 0.07, y0 + h * 0.05);
            g.fillStyle = "#16233c";
            g.font = `900 ${h * 0.05}px ${kit.FONT_HEI}`;
            g.fillText("野營氣罐", w * 0.05, y0 + h * 0.13);
            g.font = `700 ${h * 0.024}px ${kit.FONT_MONO}`;
            g.fillText("BUTANE / PROPANE  450g", w * 0.05, y0 + h * 0.185);
            g.font = `600 ${h * 0.02}px ${kit.FONT_HEI}`;
            g.fillText(
              "淨重 450克 · 香港製造 · 請勿暴曬",
              w * 0.05,
              y0 + h * 0.225,
            );
            g.fillText("用畢請關緊閥門 · 遠離兒童", w * 0.05, y0 + h * 0.26);
            // flame mark
            g.fillStyle = "#e5501a";
            g.beginPath();
            const fx = w * 0.47,
              fy = y0 + h * 0.1;
            g.moveTo(fx, fy + h * 0.06);
            g.quadraticCurveTo(fx - h * 0.04, fy + h * 0.02, fx, fy - h * 0.05);
            g.quadraticCurveTo(
              fx + h * 0.008,
              fy,
              fx + h * 0.02,
              fy - h * 0.01,
            );
            g.quadraticCurveTo(
              fx + h * 0.045,
              fy + h * 0.04,
              fx,
              fy + h * 0.06,
            );
            g.fill();
            // warning box
            g.fillStyle = "#c8201a";
            g.fillRect(w * 0.56, y0 + h * 0.015, w * 0.4, y1 - y0 - h * 0.03);
            g.fillStyle = "#fff6e0";
            g.textAlign = "center";
            g.font = `900 ${h * 0.05}px ${kit.FONT_KAI}`;
            g.fillText("『小心火燭』", w * 0.76, y0 + h * 0.08);
            g.font = `700 ${h * 0.022}px ${kit.FONT_HEI}`;
            g.fillText("易燃氣體 · 嚴禁煙火", w * 0.76, y0 + h * 0.155);
            g.font = `700 ${h * 0.017}px ${kit.FONT_MONO}`;
            g.fillText("FLAMMABLE GAS · DANGER", w * 0.76, y0 + h * 0.2);
            g.font = `900 ${h * 0.03}px ${kit.FONT_HEI}`;
            g.fillText("⚠", w * 0.76, y0 + h * 0.25);
            scuff(g, w, h, 90);
          });
          g.restore();
        }
      },
    }),
  );
  // pressure gauge dial
  body.add(
    label({
      key: "flamer-gauge",
      w: 0.039,
      h: 0.039,
      px: 256,
      face: "-z",
      at: [
        GC[0] + GN[0] * 0.0062,
        GC[1] + GN[1] * 0.0062,
        GC[2] + GN[2] * 0.0062,
      ],
      rot: [TILT, 0, 0],
      rough: 0.35,
      draw(g, W, H) {
        g.clearRect(0, 0, W, H);
        const cx = W / 2,
          cy = H / 2,
          R = W * 0.49;
        g.fillStyle = "#c9c2ae";
        g.beginPath();
        g.arc(cx, cy, R, 0, 7);
        g.fill();
        // green / red zones
        const A0 = PI * 0.75,
          SP = PI * 1.5;
        g.lineWidth = W * 0.045;
        g.strokeStyle = "#3a8a4a";
        g.beginPath();
        g.arc(cx, cy, R * 0.8, A0 + SP * 0.15, A0 + SP * 0.6);
        g.stroke();
        g.strokeStyle = "#c8201a";
        g.beginPath();
        g.arc(cx, cy, R * 0.8, A0 + SP * 0.8, A0 + SP);
        g.stroke();
        g.strokeStyle = "#111";
        for (let i = 0; i <= 20; i++) {
          const a = A0 + (i / 20) * SP;
          const big = i % 4 === 0;
          g.lineWidth = big ? 3 : 1.5;
          g.beginPath();
          g.moveTo(
            cx + Math.cos(a) * R * (big ? 0.66 : 0.72),
            cy + Math.sin(a) * R * (big ? 0.66 : 0.72),
          );
          g.lineTo(cx + Math.cos(a) * R * 0.86, cy + Math.sin(a) * R * 0.86);
          g.stroke();
        }
        g.fillStyle = "#111";
        g.textAlign = "center";
        g.textBaseline = "middle";
        g.font = `700 ${W * 0.085}px ${kit.FONT_MONO}`;
        for (let i = 0; i <= 5; i++) {
          const a = A0 + (i / 5) * SP;
          g.fillText(
            String(i * 2),
            cx + Math.cos(a) * R * 0.5,
            cy + Math.sin(a) * R * 0.5,
          );
        }
        g.font = `700 ${W * 0.07}px ${kit.FONT_HEI}`;
        g.fillText("壓力表", cx, cy - R * 0.25);
        g.font = `600 ${W * 0.05}px ${kit.FONT_MONO}`;
        g.fillText("kgf/cm²", cx, cy + R * 0.3);
        g.font = `600 ${W * 0.045}px ${kit.FONT_HEI}`;
        g.fillText("上海儀表", cx, cy + R * 0.48);
      },
    }),
  );

  // ------------------------------------------------------------------ gauge needle (moves)
  const needlePivot = new THREE.Group();
  needlePivot.name = "needle-pivot";
  needlePivot.position.set(GC[0], GC[1], GC[2]);
  needlePivot.rotation.set(TILT, 0, 0);
  const nd = M();
  nd.add(
    prism(
      [
        [-0.0011, -0.0045],
        [0.0011, -0.0045],
        [0.0004, 0.0155],
        [-0.0004, 0.0155],
      ],
      0.0005,
      { plane: "front", bevel: 0.0001, edge: 0.0001 },
    ),
    "paint_red",
    { at: [0, 0, -0.0072], wear: 0 },
  );
  nd.add(rod(0.0018, -0.0082, -0.0068, { seg: 12 }), "steel_dark", {
    wear: 0.2,
  });
  const needle = nd.build("needle");
  needlePivot.add(needle);

  // ------------------------------------------------------------------ hand wheel (turns)
  const hw = M();
  hw.add(torus(0.0185, 0.0026, { seg: 8, around: 36 }), "paint_red", {
    rot: [PI / 2, 0, 0],
    wear: 0.5,
  });
  hw.add(
    rod(0.0058, -0.004, 0.004, { seg: 6, flat: true, r: 0.0008 }),
    "paint_red",
    { rot: [PI / 2, 0, 0], wear: 0.4 },
  );
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * PI * 2 + PI / 4;
    hw.add(box(0.016, 0.0028, 0.0034, { bevel: 0.0008 }), "paint_red", {
      at: [Math.cos(a) * 0.0115, 0, Math.sin(a) * 0.0115],
      rot: [0, -a, 0],
      wear: 0.4,
    });
  }
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * PI * 2;
    hw.add(sphere(0.0029, { seg: 7, rings: 5 }), "paint_red", {
      at: [Math.cos(a) * 0.0185, 0, Math.sin(a) * 0.0185],
      wear: 0.6,
    });
  }
  hw.add(screw(0.0034, { axis: "y", hex: true, h: 0.0025 }), "steel_bare", {
    at: [0, 0.003, 0],
    wear: 0.4,
  });
  const wheel = hw.build("hand-wheel");
  wheel.position.set(0, PY + 0.063, VZ);

  // ------------------------------------------------------------------ squeeze lever (moves): pivots under the pipe
  const PIV = [0, PY - 0.026, 0.073];
  const lv = M();
  lv.add(
    prism(
      [
        [0.007, 0.004, 0.003],
        [0.004, -0.006, 0.004],
        [-0.03, -0.034, 0.012],
        [-0.072, -0.06, 0.006],
        [-0.079, -0.066, 0.003],
        [-0.082, -0.058, 0.003],
        [-0.074, -0.05, 0.006],
        [-0.036, -0.026, 0.012],
        [-0.006, 0.004, 0.003],
      ],
      0.011,
      { bevel: 0.0022, bevelSeg: 2 },
    ),
    "steel_park",
  );
  // rubber finger sleeve and link rod up to the valve
  lv.add(
    prism(
      [
        [-0.03, -0.039, 0.004],
        [-0.068, -0.063, 0.004],
        [-0.072, -0.054, 0.004],
        [-0.034, -0.029, 0.004],
      ],
      0.0135,
      { bevel: 0.003, bevelSeg: 2 },
    ),
    "rubber",
  );
  lv.add(rod(0.0045, -0.008, 0.008, { seg: 12, r: 0.0008 }), "steel_park", {
    rot: [0, PI / 2, 0],
    wear: 0.3,
  });
  const lever = lv.build("lever");
  lever.position.set(PIV[0], PIV[1], PIV[2]);

  // ------------------------------------------------------------------ base nozzle: cast-iron wok burner head
  const BH = 0.652; // burner face
  const hb = M();
  hb.add(
    lathe(
      [
        [0.487, 0],
        [0.487, 0.0205, 0.002],
        [0.5, 0.0205, 0],
        [0.5, 0.0245, 0.001],
        [0.565, 0.0245, 0.006],
        [0.598, 0.04, 0.008],
        [0.606, 0.043, 0.002],
        [0.646, 0.043, 0.002],
        [BH, 0.0405, 0.0015],
        [BH, 0.036, 0.0006],
        [BH - 0.006, 0.0352, 0.0006],
        [BH - 0.006, 0.0215, 0.0006],
        [BH + 0.002, 0.0205, 0.0012],
        [BH + 0.002, 0.0135, 0.0006],
        [0.628, 0.0128, 0],
        [0.628, 0],
      ],
      { seg: 40 },
    ),
    castIron,
    { at: [0, PY, 0] },
  );
  // casting lugs with bolts round the bell
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * PI * 2 + PI / 2;
    hb.add(box(0.008, 0.008, 0.014, { bevel: 0.0015 }), castIron, {
      at: [Math.cos(a) * 0.0445, PY + Math.sin(a) * 0.0445, 0.622],
      rot: [0, 0, a - PI / 2],
    });
    hb.add(screw(0.0028, { axis: "y", hex: true, h: 0.002 }), "steel_park", {
      at: [Math.cos(a) * 0.0485, PY + Math.sin(a) * 0.0485, 0.622],
      rot: [0, 0, a - PI / 2],
      wear: 0.4,
    });
  }
  // air-shutter sleeve on the mixing tube with its ring of air holes and a thumb screw
  hb.add(
    tube(0.027, 0.0244, 0.508, 0.548, { seg: 40, r: 0.0008 }),
    "steel_park",
    { at: [0, PY, 0] },
  );
  hb.add(screw(0.0032, { axis: "y", h: 0.003 }), "steel_park", {
    at: [0, PY + 0.027, 0.542],
    wear: 0.4,
  });
  // holes are cheap dark inlays standing a hair proud of the casting
  const disc = (r, h, seg = 10) =>
    kit.adopt(
      new THREE.CylinderGeometry(r, r, h, seg, 1).rotateX(PI / 2),
      -0.6,
    );
  const slab = (w, h, d) => kit.adopt(new THREE.BoxGeometry(w, h, d), -0.6);
  const holes = M();
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * PI * 2 + PI / 8;
    const g = kit.mergeGeometries([
      kit.place(disc(0.0036, 0.0016, 10), {
        rot: [PI / 2, 0, 0],
        at: [0, 0, -0.0055],
      }),
      kit.place(disc(0.0036, 0.0016, 10), {
        rot: [PI / 2, 0, 0],
        at: [0, 0, 0.0055],
      }),
      slab(0.0072, 0.0016, 0.011),
    ]);
    holes.add(g, "bore", {
      at: [Math.cos(a) * 0.0265, PY + Math.sin(a) * 0.0265, 0.527],
      rot: [0, 0, a - PI / 2],
    });
  }
  // ring of air holes on the flared bell (normal of the cone tilts forward)
  const coneTilt = Math.atan2(0.04 - 0.0245, 0.598 - 0.565);
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * PI * 2;
    const g = disc(0.0034, 0.001, 12);
    g.rotateX(PI / 2 - coneTilt);
    g.rotateZ(a - PI / 2);
    holes.add(g, "bore", {
      at: [Math.cos(a) * 0.0324, PY + Math.sin(a) * 0.0324, 0.5815],
    });
  }
  // flame ports round the rim and jets on the face
  for (let i = 0; i < 30; i++) {
    const a = (i / 30) * PI * 2;
    holes.add(slab(0.0022, 0.0012, 0.009), "bore", {
      at: [Math.cos(a) * 0.0429, PY + Math.sin(a) * 0.0429, 0.636],
      rot: [0, 0, a - PI / 2],
    });
  }
  for (let i = 0; i < 18; i++) {
    const a = (i / 18) * PI * 2;
    holes.add(disc(0.0019, 0.0008, 8), "bore", {
      at: [Math.cos(a) * 0.0283, PY + Math.sin(a) * 0.0283, BH - 0.0058],
    });
  }
  holes.add(disc(0.0127, 0.0006, 24), "bore", { at: [0, PY, 0.6288] });
  // machined lips round the bell holes, rubbed bright so the ring reads against the casting
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * PI * 2;
    const g = torus(0.0043, 0.00085, { seg: 5, around: 14 });
    g.rotateX(PI / 2 - coneTilt);
    g.rotateZ(a - PI / 2);
    hb.add(g, castIron, {
      at: [Math.cos(a) * 0.0326, PY + Math.sin(a) * 0.0326, 0.5815],
      wear: 1,
    });
  }
  hb.attach(holes.build("burner-holes"));
  const headBase = only(hb.build("burner"), "base");
  // heat discolouration on the bell: soot at the mouth, then temper blue, straw, fading into raw casting.
  // The rim flame ports are painted here too, each with a bright lower lip.
  headBase.add(
    wrap({
      key: "flamer-heat",
      r: 0.04365,
      z0: 0.6062,
      z1: 0.6466,
      px: 1024,
      seg: 48,
      opaque: false,
      rough: 0.6,
      metal: 0.35,
      at: [0, PY, 0],
      draw(g, W, H) {
        g.clearRect(0, 0, W, H);
        const gr = g.createLinearGradient(0, 0, 0, H);
        gr.addColorStop(0, "rgba(16,13,12,0.9)");
        gr.addColorStop(0.2, "rgba(30,28,34,0.75)");
        gr.addColorStop(0.42, "rgba(52,58,92,0.5)");
        gr.addColorStop(0.62, "rgba(96,84,92,0.32)");
        gr.addColorStop(0.8, "rgba(150,120,70,0.3)");
        gr.addColorStop(1, "rgba(140,112,70,0)");
        g.fillStyle = gr;
        g.fillRect(0, 0, W, H);
        // soot streaks running back from the mouth
        for (let i = 0; i < 70; i++) {
          const x = Math.random() * W;
          g.fillStyle = `rgba(10,8,8,${0.2 + Math.random() * 0.4})`;
          g.fillRect(
            x,
            0,
            1 + Math.random() * 3,
            H * (0.15 + Math.random() * 0.4),
          );
        }
        const sw = W * 0.0085,
          sy = H * 0.15,
          sh = H * 0.22;
        for (let i = 0; i < 30; i++) {
          const x = ((i + 0.5) / 30) * W - sw / 2;
          g.fillStyle = "rgba(205,190,160,0.95)";
          g.fillRect(x - 2, sy - 2, sw + 4, sh + 5);
          g.fillStyle = "#050404";
          g.fillRect(x, sy, sw, sh);
        }
      },
    }),
  );

  // pilot tip for the base: bends out round the bell and stops beside the face
  const pb = M();
  const pilotBase = [
    Math.cos(PA) * 0.051,
    PY + Math.sin(PA) * 0.051,
    BH + 0.004,
  ];
  pb.add(
    sweep(
      [
        pilotPt(PIPE_END - 0.02),
        pilotPt(0.5, PR + 0.012),
        pilotPt(0.56, 0.034),
        pilotPt(0.6, 0.049),
        pilotPt(0.635, 0.051),
        pilotBase,
      ],
      0.0022,
      {
        seg: 8,
        tension: 0.4,
        steps: 56,
        caps: false,
      },
    ),
    copperLit,
  );
  pb.add(rod(0.0036, 0, 0.009, { seg: 6, flat: true }), brassLit, {
    at: sub(pilotBase, [0, 0, 0.009]),
    wear: 0.3,
  });
  pb.add(box(0.006, 0.012, 0.004, { bevel: 0.0006 }), brassLit, {
    at: [pilotBase[0] - 0.003, pilotBase[1] - 0.006, 0.64],
    rot: [0, 0, PA - PI / 2],
    wear: 0.3,
  });
  const pilotTipBase = only(pb.build("pilot-base"), "base");

  // ------------------------------------------------------------------ branch A 蓝焰: venturi nozzle, air-adjust collar, oxygen bottle
  const a = M();
  const AT = 0.84; // tip of the venturi
  a.add(
    lathe(
      [
        [0.487, 0],
        [0.487, 0.0205, 0.002],
        [0.535, 0.0205, 0.004],
        [0.585, 0.0098, 0.02],
        [0.62, 0.0094, 0.01],
        [0.72, 0.0108],
        [0.72, 0],
      ],
      { seg: 32 },
    ),
    "steel_park",
    { at: [0, PY, 0], wear: 0.7 },
  );
  a.add(
    lathe(
      [
        [0.72, 0],
        [0.72, 0.0108],
        [AT - 0.02, 0.0128, 0.002],
        [AT - 0.02, 0.0142, 0.0006],
        [AT, 0.0142, 0.0008],
        [AT, 0.0108, 0.0004],
        [AT - 0.012, 0.0104, 0],
        [AT - 0.012, 0],
      ],
      { seg: 32 },
    ),
    "steel_blued",
    { at: [0, PY, 0] },
  );
  a.add(rod(0.0103, AT - 0.0125, AT - 0.0118, { seg: 20 }), "bore", {
    at: [0, PY, 0],
  });
  a.add(
    tube(0.0148, 0.0138, AT - 0.016, AT - 0.004, { seg: 32, r: 0.0005 }),
    brassLit,
    { at: [0, PY, 0] },
  );
  // cooling fins near the tip
  for (let i = 0; i < 5; i++) {
    const z = 0.73 + i * 0.012;
    a.add(
      tube(0.0175, 0.0108 + (z - 0.72) * 0.016, z, z + 0.0028, {
        seg: 24,
        rIn: 0,
      }),
      "steel_blued",
      { at: [0, PY, 0], wear: 0.5 },
    );
  }
  // knurled brass air-adjust collar (flat-faceted grip ring) with windows
  a.add(tube(0.0245, 0.0205, 0.498, 0.534, { seg: 32, r: 0.0012 }), brassLit, {
    at: [0, PY, 0],
  });
  a.add(
    rod(0.0262, 0.499, 0.509, { seg: 24, flat: true, r: 0.0006 }),
    brassLit,
    { at: [0, PY, 0], wear: 0.7 },
  );
  for (let i = 0; i < 4; i++) {
    const an = (i / 4) * PI * 2 + PI / 4;
    const g = kit.mergeGeometries([
      kit.place(disc(0.0038, 0.0014, 10), {
        rot: [PI / 2, 0, 0],
        at: [0, 0, -0.0045],
      }),
      kit.place(disc(0.0038, 0.0014, 10), {
        rot: [PI / 2, 0, 0],
        at: [0, 0, 0.0045],
      }),
      slab(0.0076, 0.0014, 0.009),
    ]);
    a.add(g, "bore", {
      at: [Math.cos(an) * 0.0244, PY + Math.sin(an) * 0.0244, 0.522],
      rot: [0, 0, an - PI / 2],
    });
  }
  // oxygen bottle clamped along the left of the pipe, regulator and green line into the collar
  const OX = 0.04,
    OY = PY - 0.004;
  a.add(
    lathe(
      [
        [0.262, 0],
        [0.262, 0.012, 0.005],
        [0.27, 0.0172, 0.008],
        [0.42, 0.0172, 0.014],
        [0.44, 0.0075, 0.004],
        [0.446, 0.0075],
        [0.446, 0],
      ],
      { seg: 32 },
    ),
    kit.mats.variant(
      "paint_green",
      { color: 0x2f6a4a, rough: 0.35 },
      "flamer-oxy",
    ),
    { at: [OX, OY, 0] },
  );
  a.add(rod(0.0075, 0.444, 0.462, { seg: 6, flat: true, r: 0.001 }), brassLit, {
    at: [OX, OY, 0],
  });
  a.add(rod(0.0102, 0, 0.014, { seg: 20, r: 0.0015 }), brassLit, {
    at: [OX, OY, 0.454],
    rot: [0, PI / 2, 0],
  });
  a.add(rod(0.0062, 0.462, 0.47, { seg: 16, r: 0.001 }), "polymer", {
    at: [OX, OY, 0],
    wear: 0.3,
  });
  a.add(
    sweep(
      [
        [OX, OY, 0.469],
        [OX - 0.002, OY + 0.003, 0.482],
        [0.03, PY + 0.008, 0.49],
        [0.0215, PY + 0.008, 0.508],
      ],
      0.0032,
      { seg: 8, steps: 24 },
    ),
    "rubber",
  );
  for (const z of [0.29, 0.38]) {
    a.add(
      tube(0.0186, 0.0168, z - 0.0045, z + 0.0045, { seg: 20, r: 0, rIn: 0 }),
      "steel_bare",
      { at: [OX, OY, 0], wear: 0.3 },
    );
    a.add(box(0.026, 0.0014, 0.009, { bevel: 0.0003 }), "steel_bare", {
      at: [0.021, OY + 0.0178, z],
      rot: [0, 0, -0.18],
      wear: 0.3,
    });
    a.add(box(0.026, 0.0014, 0.009, { bevel: 0.0003 }), "steel_bare", {
      at: [0.021, OY - 0.0178, z],
      rot: [0, 0, 0.12],
      wear: 0.3,
    });
    a.add(screw(0.0026, { axis: "x", hex: true, h: 0.002 }), "steel_bare", {
      at: [OX + 0.018, OY, z],
      wear: 0.4,
    });
  }
  const partsA = only(a.build("branch-a"), "a");
  partsA.add(
    wrap({
      key: "flamer-oxy",
      r: 0.0174,
      z0: 0.3,
      z1: 0.37,
      px: 512,
      at: [OX, OY, 0],
      rough: 0.4,
      draw(g, W, H) {
        g.fillStyle = "#2f6a4a";
        g.fillRect(0, 0, W, H);
        g.save();
        g.beginPath();
        g.rect(W * 0.05, 0, W * 0.4, H);
        g.clip();
        g.translate(W * -0.25, 0);
        onLeft(g, W, H, (g, w, h) => {
          g.fillStyle = "#f4f1e8";
          g.textAlign = "center";
          g.textBaseline = "middle";
          g.font = `900 ${h * 0.11}px ${kit.FONT_HEI}`;
          g.fillText("氧 氣", w / 2, h * 0.47);
          g.font = `700 ${h * 0.05}px ${kit.FONT_MONO}`;
          g.fillText("O₂  1L · 15MPa", w / 2, h * 0.58);
        });
        g.restore();
        scuff(g, W, H, 40);
      },
    }),
  );
  // pilot runs along the venturi to just behind its tip
  const pa = M();
  const pilotA = [Math.cos(PA) * 0.022, PY + Math.sin(PA) * 0.022, AT - 0.02];
  pa.add(
    sweep(
      [
        pilotPt(PIPE_END - 0.02),
        pilotPt(0.5, 0.03),
        pilotPt(0.56, 0.026),
        pilotPt(0.62, 0.0175),
        pilotPt(0.71, 0.0175),
        pilotA,
      ],
      0.0018,
      {
        seg: 8,
        tension: 0.4,
        steps: 56,
        caps: false,
      },
    ),
    copperLit,
  );
  pa.add(rod(0.003, 0, 0.007, { seg: 6, flat: true }), brassLit, {
    at: sub(pilotA, [0, 0, 0.007]),
    wear: 0.3,
  });
  for (const z of [0.6, 0.68]) {
    pa.add(box(0.005, 0.004, 0.004, { bevel: 0.0005 }), brassLit, {
      at: pilotPt(z, 0.0142),
      rot: [0, 0, PA - PI / 2],
      wear: 0.3,
    });
  }
  const pilotTipA = only(pa.build("pilot-a"), "a");

  // ------------------------------------------------------------------ branch B 泼油: duck-bill nozzle, oil pot and ladle
  const bb = M();
  const DB = 0.668; // duck-bill mouth
  const dbSecs = [
    [0.487, 0.0205, 0.0205, 2],
    [0.505, 0.0215, 0.021, 2],
    [0.54, 0.03, 0.0185, 2.4],
    [0.585, 0.044, 0.0145, 3.2],
    [0.63, 0.055, 0.0115, 4],
    [DB, 0.061, 0.0098, 4.5],
  ];
  bb.add(loft(dbSecs.map((s) => [s[0], s[1], s[2], s[3]])), "steel_dark", {
    at: [0, PY, 0],
  });
  bb.add(
    loft([
      [DB, 0.061, 0.0098, 4.5],
      [DB, 0.0575, 0.0066, 4.5],
    ]),
    "steel_dark",
    { at: [0, PY, 0], wear: 0.9 },
  );
  bb.add(
    loft(
      [
        [DB, 0.0575, 0.0066, 4.5],
        [0.6, 0.042, 0.0085, 3.2],
      ],
      { inner: true },
    ),
    "bore",
    { at: [0, PY, 0] },
  );
  bb.add(rod(0.0215, 0.482, 0.502, { seg: 28, r: 0.0012 }), "iron_cast", {
    at: [0, PY, 0],
  });
  // welded top/bottom spines riding on the shell, beaded side seams
  const secAt = (z) => {
    const k = Math.max(
      1,
      dbSecs.findIndex((s) => s[0] >= z),
    );
    const s0 = dbSecs[k - 1],
      s1 = dbSecs[k];
    const u = (z - s0[0]) / (s1[0] - s0[0] || 1);
    return [s0[1] + (s1[1] - s0[1]) * u, s0[2] + (s1[2] - s0[2]) * u];
  };
  const spine = [];
  for (let i = 0; i <= 6; i++) {
    const z = 0.505 + (i / 6) * (DB - 0.508);
    spine.push([z, secAt(z)[1] - 0.001]);
  }
  for (let i = 6; i >= 0; i--) {
    const z = 0.505 + (i / 6) * (DB - 0.508);
    spine.push([
      z,
      secAt(z)[1] + 0.0028 - i * 0.0002,
      i === 0 || i === 6 ? 0.0012 : 0,
    ]);
  }
  for (const s of [1, -1]) {
    bb.add(
      prism(
        spine.map((p) => [p[0], p[1], p[2]]),
        0.0042,
        { bevel: 0.0008 },
      ),
      "steel_dark",
      { at: [0, PY, 0], scale: [1, s, 1], wear: 0.6 },
    );
  }
  for (let i = 0; i < 12; i++) {
    const z = 0.512 + (i / 11) * 0.148;
    bb.add(
      sphere(0.0019, { seg: 6, rings: 4, squash: [0.8, 1, 1.5] }),
      "steel_bare",
      { at: [secAt(z)[0] - 0.0003, PY, z], mirror: true, wear: 0.3 },
    );
  }
  for (const z of [0.6, 0.645]) {
    bb.add(screw(0.0022, { axis: "y", slot: false, h: 0.0008 }), "steel_bare", {
      at: [0.03, PY + 0.0108 + (0.645 - z) * 0.04, z],
      mirror: true,
      wear: 0.4,
    });
  }
  // oil pot on a saddle above the pipe
  const POT = [0, PY + 0.034, 0.235];
  bb.add(
    prism(
      [
        [0.2, PY + PR - 0.004],
        [0.27, PY + PR - 0.004],
        [0.268, PY + 0.031, 0.002],
        [0.202, PY + 0.031, 0.002],
      ],
      0.028,
      { bevel: 0.0015, holes: [] },
    ),
    "iron_cast",
  );
  for (const z of [0.21, 0.26]) {
    bb.add(
      tube(PR + 0.002, PR - 0.0002, z - 0.005, z + 0.005, {
        seg: 20,
        r: 0,
        rIn: 0,
      }),
      "steel_bare",
      { at: [0, PY, 0], wear: 0.3 },
    );
  }
  const potRot = [-PI / 2, 0, 0];
  bb.add(
    lathe(
      [
        [0, 0],
        [0, 0.03, 0.004],
        [0.006, 0.037, 0.008],
        [0.03, 0.04, 0.012],
        [0.05, 0.034, 0.01],
        [0.054, 0.03, 0.003],
        [0.058, 0.031, 0.001],
        [0.058, 0.028, 0.0005],
        [0.056, 0.0272],
        [0.056, 0],
      ],
      { seg: 40 },
    ),
    "iron_cast",
    { at: POT, rot: potRot },
  );
  // lid with a wooden knob, hinge strap and a gap that lets the smoke out
  bb.add(
    lathe(
      [
        [0.0565, 0],
        [0.0565, 0.0298, 0.001],
        [0.059, 0.0298, 0.001],
        [0.066, 0.016, 0.006],
        [0.068, 0],
      ],
      { seg: 36 },
    ),
    "iron_rust",
    { at: POT, rot: [-PI / 2 + 0.09, 0, 0] },
  );
  bb.add(
    lathe(
      [
        [0.066, 0],
        [0.066, 0.004],
        [0.072, 0.0065, 0.003],
        [0.077, 0.006, 0.003],
        [0.078, 0],
      ],
      { seg: 16 },
    ),
    "wood_dark",
    {
      at: [POT[0], POT[1] + 0.0004, POT[2] - 0.006],
      rot: [-PI / 2 + 0.09, 0, 0],
    },
  );
  bb.add(box(0.012, 0.012, 0.004, { bevel: 0.001 }), "steel_bare", {
    at: [0, POT[1] + 0.054, POT[2] - 0.032],
    rot: [0.2, 0, 0],
    wear: 0.3,
  });
  bb.add(rod(0.0022, -0.008, 0.008, { seg: 8 }), "steel_bare", {
    at: [0, POT[1] + 0.058, POT[2] - 0.031],
    rot: [0, PI / 2, 0],
    wear: 0.3,
  });
  // spout leaning forward, bail handle over the pot
  const SP0 = [0, POT[1] + 0.03, POT[2] + 0.034],
    SP1 = [0, POT[1] + 0.058, POT[2] + 0.062];
  bb.add(
    cone(0.0105, 0.0055, 0, len(sub(SP1, SP0)), { seg: 20, r: 0.001 }),
    "iron_cast",
    { at: SP0, rot: dirRot(sub(SP1, SP0)) },
  );
  bb.add(tube(0.0062, 0.0042, 0, 0.004, { seg: 16 }), "iron_cast", {
    at: SP1,
    rot: dirRot(sub(SP1, SP0)),
    wear: 0.5,
  });
  bb.add(rod(0.0041, 0.0, 0.001, { seg: 12 }), "bore", {
    at: SP1,
    rot: dirRot(sub(SP1, SP0)),
  });
  bb.add(
    sweep(
      [
        [0.0395, POT[1] + 0.045, POT[2]],
        [0.044, POT[1] + 0.07, POT[2] - 0.004],
        [0.02, POT[1] + 0.086, POT[2] - 0.008],
        [-0.02, POT[1] + 0.086, POT[2] - 0.008],
        [-0.044, POT[1] + 0.07, POT[2] - 0.004],
        [-0.0395, POT[1] + 0.045, POT[2]],
      ],
      0.0018,
      { seg: 6, steps: 40 },
    ),
    "steel_bare",
  );
  for (const s of [1, -1])
    bb.add(box(0.004, 0.008, 0.008, { bevel: 0.0008 }), "iron_cast", {
      at: [s * 0.039, POT[1] + 0.045, POT[2]],
    });
  // feed line from the pot down into the pipe with a petcock
  bb.add(rod(0.0042, 0, 0.026, { seg: 12 }), brassLit, {
    at: [-0.018, PY + 0.008, POT[2] + 0.028],
    rot: [-PI / 2 + 0.35, 0, 0],
  });
  bb.add(box(0.012, 0.007, 0.007, { bevel: 0.001 }), brassLit, {
    at: [-0.018, PY + 0.022, POT[2] + 0.024],
  });
  bb.add(box(0.003, 0.016, 0.004, { bevel: 0.0008, r: 0.0015 }), "paint_red", {
    at: [-0.026, PY + 0.03, POT[2] + 0.024],
    rot: [0, 0, -0.5],
    wear: 0.4,
  });
  // long-handled ladle hooked on the left of the pot, handle resting in a clip by the valve
  const L0 = [0.0625, POT[1] + 0.046, POT[2] + 0.004]; // bowl rim centre
  const bowl = [[-0.021, 0]];
  for (let i = 1; i <= 7; i++) {
    const t = (i / 7) * PI * 0.5;
    bowl.push([-Math.cos(t) * 0.021, Math.sin(t) * 0.0205, 0]);
  }
  bowl.push([0.0008, 0.0205, 0.0006], [0.0008, 0.0192, 0.0004]);
  for (let i = 7; i >= 1; i--) {
    const t = (i / 7) * PI * 0.5;
    bowl.push([-Math.cos(t) * 0.0195, Math.sin(t) * 0.0192, 0]);
  }
  bowl.push([-0.0195, 0]);
  bb.add(lathe(bowl, { seg: 24 }), "steel_bare", {
    at: L0,
    rot: [-PI / 2, 0, 0],
    wear: 0.5,
  });
  bb.add(rod(0.0172, -0.0066, -0.006, { seg: 24 }), "iron_rust", {
    at: L0,
    rot: [-PI / 2, 0, 0],
  });
  // shank rising from the rim, then a long wooden handle running back past the gauge
  const LS = [0.0615, L0[1] + 0.001, L0[2] - 0.0195];
  const LH0 = [0.058, PY + 0.072, POT[2] - 0.06],
    LH1 = [0.05, PY + 0.066, 0.0];
  bb.add(
    sweep(
      [
        LS,
        [0.061, L0[1] + 0.008, L0[2] - 0.03],
        [0.059, PY + 0.07, POT[2] - 0.05],
        LH0,
      ],
      0.0021,
      { seg: 8, steps: 20 },
    ),
    "steel_bare",
  );
  bb.add(
    rod(0.0058, 0, len(sub(LH1, LH0)), { seg: 14, r: 0.003 }),
    "wood_dark",
    { at: LH0, rot: dirRot(sub(LH1, LH0)) },
  );
  bb.add(tube(0.0066, 0.0055, 0, 0.008, { seg: 14 }), "steel_bare", {
    at: LH0,
    rot: dirRot(sub(LH1, LH0)),
    wear: 0.3,
  });
  bb.add(torus(0.0045, 0.0011, { seg: 6, around: 14 }), "steel_bare", {
    at: [0.0495, PY + 0.066, -0.006],
    rot: [0, PI / 2, 0],
    wear: 0.3,
  });
  // wire hook off the gauge riser that holds the handle
  bb.add(
    sweep(
      [
        [0.004, PY + 0.03, 0.046],
        [0.022, PY + 0.036, 0.042],
        [0.04, PY + 0.05, 0.04],
        [0.044, PY + 0.064, 0.04],
        [0.05, PY + 0.072, 0.04],
        [0.057, PY + 0.066, 0.04],
      ],
      0.0012,
      { seg: 5, steps: 24 },
    ),
    "steel_bare",
  );
  const partsB = only(bb.build("branch-b"), "b");
  // pilot: short hop over the bill
  const pbb = M();
  const pilotB = [0.012, PY + 0.024, DB - 0.008];
  pbb.add(
    sweep(
      [
        pilotPt(PIPE_END - 0.02),
        pilotPt(0.51, 0.026),
        [0.016, PY + 0.026, 0.56],
        [0.014, PY + 0.022, 0.62],
        pilotB,
      ],
      0.0022,
      {
        seg: 8,
        tension: 0.4,
        steps: 56,
        caps: false,
      },
    ),
    copperLit,
  );
  pbb.add(rod(0.0036, 0, 0.008, { seg: 6, flat: true }), brassLit, {
    at: sub(pilotB, [0, 0, 0.008]),
    wear: 0.3,
  });
  pbb.add(box(0.006, 0.01, 0.004, { bevel: 0.0006 }), brassLit, {
    at: [0.014, PY + 0.0165, 0.62],
    wear: 0.3,
  });
  const pilotTipB = only(pbb.build("pilot-b"), "b");

  // ------------------------------------------------------------------ assemble
  const root = new THREE.Group();
  root.name = "flamer";
  root.add(
    body,
    can,
    needlePivot,
    wheel,
    lever,
    headBase,
    pilotTipBase,
    partsA,
    pilotTipA,
    partsB,
    pilotTipB,
  );

  // right hand round the rag-wrapped grip, index on the squeeze lever; left hand under the slung gas
  // cylinder like a fore-end (low, so the long pipe stays clear of the crosshair; B's pot and ladle are on top)
  const RN = [0.98, 0, 0.2]; // right palm: into the grip from the shooter's right, a little forward
  const RA = gp(0.097); // grip axis point under the middle of the palm
  const hands = {
    right: {
      at: [RA[0] - 0.0172 * RN[0], RA[1], RA[2] - 0.0172 * RN[2]],
      palm: RN,
      fingers: [0.1, -0.24, 0.97],
      pose: {
        base: "wrap",
        r: 0.0172,
        // dipped under the squeeze lever so the pad pushes it up towards the pipe
        index: [0.0, 1.0, 0.6, -0.25],
        thumb: [0.5, -0.44, 0.75, 0.4, 0.35],
      },
      trigger: true,
    },
    // fingers angled forward round the can so the wrist lines up with a forearm from below and behind
    left: {
      at: [-0.004, CY - 0.0362, 0.262],
      palm: [-0.2, 1, 0],
      fingers: [-1, 0.15, 0.7],
      pose: { base: "wrap", r: 0.036 },
      // reload: on the can itself so the hand rides it while it is swapped, turned a little further
      // across it so the wrist stays inside its range while the can is twisted and carried down
      alts: {
        can: {
          parent: can,
          at: [-0.004, -0.0368, 0.262 - CZ],
          palm: [0, 1, 0],
          fingers: [-1, 0.15, 0.45],
          pose: { base: "wrap", r: 0.034 },
        },
      },
    },
  };

  // ---- reload: unscrew the can, pull it down out of the clips and out of sight, bring a fresh one up
  // and screw it home. Phases of s.reload (0..1) -> eased 0..1.
  const ease = (a, b, x) => {
    const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
    return t * t * (3 - 2 * t);
  };
  const TWIST = 1.0; // radians the can turns to come off its thread
  const crossed = (s, at) => s.prev.reload < at && s.reload >= at;
  let press = 0.3;
  let gas = 1; // 0 while the can is off: the needle falls to zero
  let model;
  model = kit.weapon({
    id: "flamer",
    root,
    hands,
    ownReload: true,
    anchors: {
      muzzle: {
        base: [0, PY, BH + 0.004],
        a: [0, PY, AT + 0.002],
        b: [0, PY, DB + 0.002],
      },
      pilot: {
        base: [pilotBase[0], pilotBase[1], pilotBase[2] + 0.002],
        a: [pilotA[0], pilotA[1], pilotA[2] + 0.002],
        b: [pilotB[0], pilotB[1], pilotB[2] + 0.002],
      },
      smoke: {
        base: [0, PY + 0.06, 0.4],
        a: [0, PY + 0.06, 0.4],
        b: [SP1[0], SP1[1] + 0.004, SP1[2] + 0.002],
      },
    },
    view: {
      hip: { pos: [0.175, -0.172, -0.4], rot: [0.03, 0.035, -0.04] },
      // reload: brought in and rolled so the can underneath turns towards the eye
      reload: { pos: [-0.06, 0.01, 0.03], rot: [0.06, 0.34, 0.3] },
    },
    show: { yaw: -0.85, pitch: 0.14 },
    // s.trigger squeezes the lever; the gauge needle climbs while s.firing and trembles; the wheel eases open
    update(s, dt) {
      const r = s.reload;
      const tr = r >= 0 ? 0 : Math.max(0, Math.min(1, s.trigger || 0));
      lever.rotation.x = tr * 0.3;
      // reload choreography (all zero outside a reload)
      let tw = 0,
        d1 = 0,
        d2 = 0,
        twitch = 0;
      const L = model && model.grips.left;
      if (r >= 0) {
        // 0-.08 grip the can · .08-.24 unscrew · .24-.33 out of the clips · .31-.46 down and away
        // .46-.56 out of sight (fresh can) · .56-.70 up · .68-.77 into the clips · .77-.88 screw home · .88-1 back
        tw = ease(0.08, 0.24, r) - ease(0.77, 0.88, r);
        d1 = ease(0.24, 0.33, r) - ease(0.68, 0.77, r);
        d2 = ease(0.31, 0.46, r) - ease(0.56, 0.7, r);
        // the seal lets go with a jolt the valve wheel and hose feel
        twitch = Math.sin(PI * Math.max(0, Math.min(1, (r - 0.15) / 0.07)));
        gas = 1 - ease(0.15, 0.3, r) + ease(0.86, 0.96, r);
        if (L) {
          L.to = "can";
          L.mix = Math.min(1, r / 0.09, (1 - r) / 0.11);
        }
        if (crossed(s, 0.15)) s.cue("gasHiss");
        if (crossed(s, 0.3)) s.cue("canOut");
        if (crossed(s, 0.86)) s.cue("canIn");
        if (crossed(s, 0.875)) s.cue("gasHiss", 0.35);
      } else {
        gas = 1;
        if (L) {
          L.to = null;
          L.mix = 0;
        }
      }
      can.rotation.set(-0.6 * d2, 0, TWIST * tw);
      can.position.set(
        0.1 * d2,
        CY - 0.055 * d1 - 0.5 * d2,
        CZ + 0.006 * tw - 0.3 * d2,
      );
      wheel.rotation.y = -tr * 0.9 + twitch * 0.14;
      const target = s.firing ? 0.7 + (s.heat || 0) * 0.15 : 0.28 + tr * 0.12;
      const k = 1 - Math.exp(-(dt || 0.016) * (s.firing ? 6 : 2.5));
      press += (target - press) * k;
      const t = s.t || 0;
      const shake = s.firing
        ? 0.025 * Math.sin(t * 61) + 0.015 * Math.sin(t * 37.7)
        : 0.004 * Math.sin(t * 3.1) + twitch * 0.04;
      needle.rotation.z = -PI * 0.75 + (press + shake) * gas * PI * 1.5;
    },
  });
  return model;
}
