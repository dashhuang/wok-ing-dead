// 霓虹 · arc gun made from a dead neon sign's transformer.
// Gun space: +Z electrodes, +Y up, +X shooter's left. Origin at the trigger.
// Layout: an iron-cased neon transformer sits on a taped wooden grip, a square lantern battery is taped to
// its back with the springs facing the shooter, a knife switch sits on top. In front, a bakelite spine
// carries porcelain insulators and the copper electrodes; neon hairpins run along both sides; red and
// black high-tension leads loop down from the transformer's bushings to the insulators.
const A = 0.055; // electrode axis height
const CASE = { x: 0.034, y0: 0.012, y1: 0.092, z0: -0.07, z1: 0.13 };
const PINK = 0xff3b8d,
  CYAN = 0x35e0ff,
  VIOLET = 0xa86bff;

export default function build(kit) {
  const {
    M,
    prism,
    box,
    lathe,
    rod,
    tube,
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
  const dirRot = (d) => {
    const v = new THREE.Vector3(d[0], d[1], d[2]).normalize();
    const q = new THREE.Quaternion().setFromUnitVectors(zAxis, v);
    const e = new THREE.Euler().setFromQuaternion(q, "XYZ");
    return [e.x, e.y, e.z];
  };
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const len = (a) => Math.hypot(a[0], a[1], a[2]);
  const bar = (m, r, a, b, mat, o = {}) => {
    const d = sub(b, a);
    m.add(rod(r, 0, len(d), { seg: o.seg || 10, r: o.r }), mat, {
      at: a,
      rot: dirRot(d),
      wear: o.wear,
    });
  };
  const scuff = (g, W, H, n = 50, rgb = "30,24,18") => {
    for (let i = 0; i < n; i++) {
      g.strokeStyle = `rgba(${rgb},${0.05 + Math.random() * 0.15})`;
      g.lineWidth = 1 + Math.random() * 2;
      g.beginPath();
      const x = Math.random() * W,
        y = Math.random() * H;
      g.moveTo(x, y);
      g.lineTo(x + (Math.random() - 0.5) * 50, y + (Math.random() - 0.5) * 16);
      g.stroke();
    }
  };
  /** Ribbed porcelain insulator along Z from z0, sheds alternate big/small. */
  const insulator = (r, z0, n, { pitch = 0.0085, core = 0.62 } = {}) => {
    const prof = [
      [z0, 0],
      [z0, r * core, 0.001],
    ];
    for (let i = 0; i < n; i++) {
      const z = z0 + 0.002 + i * pitch;
      const big = i % 2 === 0 ? r : r * 0.82;
      prof.push(
        [z + pitch * 0.12, r * core, 0],
        [z + pitch * 0.34, big, 0.0012],
        [z + pitch * 0.48, big * 0.96, 0],
        [z + pitch * 0.82, r * core, 0],
      );
    }
    const z1 = z0 + 0.002 + n * pitch;
    prof.push(
      [z1 + 0.002, r * core * 0.9, 0.0012],
      [z1 + 0.004, r * 0.35, 0.0008],
      [z1 + 0.004, 0],
    );
    return lathe(prof, { seg: 12 });
  };
  // animated neon materials (pushed to glowMats so the lab's global glow scale reaches them)
  const neon = (c, p) => {
    const g = kit.mats.glow(c, p).clone();
    g.name = "arc-neon-" + c.toString(16);
    g.userData.glow = p;
    kit.mats.glowMats.push(g);
    return g;
  };
  // kept moderate so the tubes read as coloured light rather than blooming out to white
  const gPink = neon(PINK, 2.5),
    gCyan = neon(CYAN, 2.3),
    gViolet = neon(VIOLET, 2.6),
    gPlasma = neon(0xd890ff, 3.6);
  const glass = kit.mats.glass(0xf4f8ff, { opacity: 0.2 });
  const globeGlass = kit.mats.glass(0xc8b8ff, { opacity: 0.14 });
  const caseMat = kit.mats.variant(
    "paint_grey",
    { color: 0x55605a, rough: 0.55 },
    "arc-case",
  );

  /** Neon tube along a path: glass envelope, glowing core, thicker electrode bulbs and black boots at both ends. */
  const neonTube = (
    m,
    pts,
    glowMat,
    { boots = [true, true], steps = 36 } = {},
  ) => {
    m.add(sweep(pts, 0.0058, { seg: 9, steps, tension: 0.5 }), glass);
    m.add(
      sweep(pts, 0.0024, { seg: 5, steps, tension: 0.5, caps: false }),
      glowMat,
    );
    const ends = [
      [pts[0], pts[1]],
      [pts[pts.length - 1], pts[pts.length - 2]],
    ];
    ends.forEach(([p, q], i) => {
      const d = sub(p, q);
      const n = len(d);
      const u = [d[0] / n, d[1] / n, d[2] / n];
      const rot = dirRot(u);
      m.add(rod(0.0078, -0.004, 0.018, { seg: 10, r: 0.004 }), glass, {
        at: p,
        rot,
      });
      m.add(rod(0.0032, 0.0, 0.014, { seg: 6, r: 0.0015 }), "steel_park", {
        at: p,
        rot,
        wear: 0.3,
      });
      if (boots[i]) {
        m.add(
          lathe(
            [
              [0.012, 0],
              [0.012, 0.0092, 0.002],
              [0.03, 0.0098, 0.003],
              [0.036, 0.0052, 0.002],
              [0.044, 0.0042],
              [0.044, 0],
            ],
            { seg: 12 },
          ),
          "polymer",
          { at: p, rot, wear: 0.3 },
        );
      }
    });
  };

  // ------------------------------------------------------------------ transformer case, grip, battery (fixed)
  const b = M();
  const CZ = (CASE.z0 + CASE.z1) / 2,
    CYm = (CASE.y0 + CASE.y1) / 2;
  b.add(
    box(CASE.x * 2, CASE.y1 - CASE.y0, CASE.z1 - CASE.z0 - 0.012, {
      bevel: 0.002,
      r: 0.004,
    }),
    caseMat,
    { at: [0, CYm, CZ] },
  );
  // pressed end caps with a lip
  for (const z of [CASE.z0 + 0.004, CASE.z1 - 0.004]) {
    b.add(
      box(CASE.x * 2 + 0.004, CASE.y1 - CASE.y0 + 0.004, 0.008, {
        bevel: 0.0015,
        r: 0.006,
      }),
      caseMat,
      { at: [0, CYm, z], wear: 0.7 },
    );
  }
  // cooling fins along Z: full length on the right, rear half on the left (nameplate in front), top front
  for (let i = 0; i < 7; i++) {
    const y = CASE.y0 + 0.011 + i * 0.0098;
    b.add(box(0.005, 0.0024, 0.176, { bevel: 0.0007 }), caseMat, {
      at: [-CASE.x - 0.0024, y, CZ],
      wear: 0.8,
    });
    b.add(box(0.005, 0.0024, 0.082, { bevel: 0.0007 }), caseMat, {
      at: [CASE.x + 0.0024, y, -0.021],
      wear: 0.8,
    });
  }
  for (let i = 0; i < 6; i++) {
    const x = -0.025 + i * 0.01;
    b.add(box(0.0024, 0.005, 0.118, { bevel: 0.0007 }), caseMat, {
      at: [x, CASE.y1 + 0.0024, 0.066],
      wear: 0.8,
    });
  }
  // mounting feet and bolts along the bottom
  for (const z of [-0.052, 0.108]) {
    b.add(box(0.088, 0.003, 0.022, { bevel: 0.0008, r: 0.003 }), "steel_park", {
      at: [0, CASE.y0 - 0.0015, z],
      wear: 0.4,
    });
    b.add(screw(0.0032, { axis: "y", hex: true, h: 0.0022 }), "steel_bare", {
      at: [0.038, CASE.y0, z],
      mirror: true,
      wear: 0.4,
    });
  }
  // riveted aluminium nameplate on the left
  b.add(box(0.0012, 0.04, 0.078, { bevel: 0.0004, r: 0.002 }), "steel_bare", {
    at: [CASE.x + 0.0006, CYm + 0.002, 0.085],
    wear: 0.5,
  });
  for (const [y, z] of [
    [CYm + 0.0185, 0.0485],
    [CYm + 0.0185, 0.1215],
    [CYm - 0.0145, 0.0485],
    [CYm - 0.0145, 0.1215],
  ]) {
    b.add(screw(0.0018, { axis: "x", slot: false, h: 0.0009 }), "steel_bare", {
      at: [CASE.x + 0.0012, y, z],
      wear: 0.4,
    });
  }
  // HV bushings on the front face with brass studs
  const BUSH = [
    [0.018, 0.068],
    [-0.018, 0.068],
  ];
  for (const [x, y] of BUSH) {
    b.add(insulator(0.0085, CASE.z1, 3, { pitch: 0.0072 }), "ceramic", {
      at: [x, y, 0],
      wear: 0.4,
    });
    b.add(rod(0.0022, CASE.z1 + 0.024, CASE.z1 + 0.034, { seg: 8 }), "brass", {
      at: [x, y, 0],
      wear: 0.3,
    });
    b.add(
      rod(0.0042, CASE.z1 + 0.026, CASE.z1 + 0.029, { seg: 6, flat: true }),
      "brass",
      { at: [x, y, 0], wear: 0.3 },
    );
  }
  // low-voltage ground stud and the jumper to the lower tube ends
  b.add(rod(0.004, CASE.z1, CASE.z1 + 0.008, { seg: 6, flat: true }), "brass", {
    at: [0, 0.03, 0],
    wear: 0.4,
  });

  // wooden grip wrapped in electrical tape, raked back
  const GT = [0, CASE.y0 + 0.002, -0.032];
  const GD = [0, -Math.cos(0.3), -Math.sin(0.3)];
  const grot = dirRot(GD);
  b.add(
    lathe(
      [
        [-0.006, 0],
        [-0.006, 0.0155, 0.002],
        [0.03, 0.0168, 0.03],
        [0.07, 0.0172, 0.03],
        [0.108, 0.0158, 0.008],
        [0.116, 0.012, 0.004],
        [0.118, 0],
      ],
      { seg: 24, squash: [0.78, 1] },
    ),
    "wood_walnut",
    { at: GT, rot: grot },
  );
  // tape: overlapping tilted turns over the middle of the grip
  for (let i = 0; i < 11; i++) {
    const z = 0.02 + i * 0.0074;
    const g = tube(0.0181, 0.0158, z - 0.0055, z + 0.0055, {
      seg: 18,
      r: 0,
      rIn: 0,
      squash: [0.79, 1],
    });
    g.rotateX((i % 2 ? 1 : -1) * 0.07);
    b.add(g, "tape_black", { at: GT, rot: grot, wear: 0.3 });
  }
  // loose tape tail
  const gp = (t) => [GT[0] + GD[0] * t, GT[1] + GD[1] * t, GT[2] + GD[2] * t];
  b.add(
    prism(
      [
        [0, 0, 0.001],
        [0.011, 0, 0.001],
        [0.012, -0.018, 0.004],
        [0.004, -0.024, 0.001],
        [0.0, -0.02, 0.004],
      ],
      0.0008,
      { bevel: 0.0003 },
    ),
    "tape_black",
    {
      at: [-0.0125, gp(0.098)[1], gp(0.098)[2] - 0.006],
      rot: [0.3, 0.1, 0.05],
      wear: 0.2,
    },
  );
  // brass butt cap with a lanyard ring
  b.add(
    rod(0.0135, 0.115, 0.122, { seg: 20, r: 0.002, squash: [0.8, 1] }),
    "brass",
    { at: GT, rot: grot, wear: 0.5 },
  );
  b.add(torus(0.0065, 0.0013, { seg: 6, around: 16 }), "steel_bare", {
    at: sub(gp(0.128), [0, 0, 0]),
    rot: [0, PI / 2, 0.3],
    wear: 0.3,
  });
  // grip block bolted under the case
  b.add(box(0.03, 0.01, 0.05, { bevel: 0.0015, r: 0.003 }), "steel_park", {
    at: [0, CASE.y0 - 0.004, -0.03],
    wear: 0.4,
  });
  b.add(screw(0.0028, { axis: "x", hex: true, h: 0.002 }), "steel_bare", {
    at: [0.015, CASE.y0 - 0.004, -0.042],
    mirror: true,
    wear: 0.4,
  });
  // trigger guard: bent steel wire
  b.add(
    sweep(
      [
        [0, CASE.y0 - 0.004, 0.034],
        [0, CASE.y0 - 0.02, 0.034],
        [0, -0.036, 0.022],
        [0, -0.04, 0.0],
        [0, -0.036, -0.016],
        [0, -0.022, -0.025],
      ],
      0.0024,
      { seg: 8, steps: 40 },
    ),
    "steel_park",
    { scale: [1.8, 1, 1], wear: 0.35 },
  );
  b.add(box(0.012, 0.004, 0.012, { bevel: 0.001 }), "steel_park", {
    at: [0, CASE.y0 - 0.004, 0.032],
    wear: 0.4,
  });

  // lantern battery taped to the back, springs facing the shooter. It is its own node (swapped on reload)
  // and one mesh: every part is the battery's enamel with a vertex tint, so the swap costs a single draw.
  const BZ0 = -0.168,
    BZ1 = CASE.z0 - 0.001,
    BY = 0.051,
    BW = 0.064;
  const BM = (BZ0 + BZ1) / 2; // battery node origin: the middle of the battery
  const bt = M();
  const bat = (geo, o = {}) =>
    bt.add(geo, "enamel_white", {
      ...o,
      at: [
        (o.at || [0, 0, 0])[0],
        (o.at || [0, 0, 0])[1] - BY,
        (o.at || [0, 0, 0])[2] - BM,
      ],
    });
  bat(box(BW, BW, BZ1 - BZ0 - 0.004, { bevel: 0.002, r: 0.004 }), {
    at: [0, BY, BM + 0.002],
    wear: 0.4,
  });
  bat(box(BW - 0.003, BW - 0.003, 0.006, { bevel: 0.0015, r: 0.004 }), {
    at: [0, BY, BZ0 + 0.003],
    color: 0x1a1a1c,
  });
  for (const [x, red] of [
    [0.017, true],
    [-0.017, false],
  ]) {
    bat(rod(0.0055, BZ0 - 0.003, BZ0 + 0.0005, { seg: 14 }), {
      at: [x, BY + 0.012, 0],
      color: red ? 0xb01a14 : 0x1a1a1c,
      wear: 0.3,
    });
    bat(
      helix(0.0038, 0.0009, BZ0 - 0.022, BZ0 - 0.003, 4.5, {
        seg: 3,
        perTurn: 8,
      }),
      { at: [x, BY + 0.012, 0], color: 0x8a8c90, wear: 0.3 },
    );
  }
  // tape bands binding the battery
  const band = (z, tilt, grow) =>
    bat(
      prism(
        [
          [-BW / 2 - 0.0012 - grow, BY - BW / 2 - 0.0012 - grow, 0.005],
          [BW / 2 + 0.0012 + grow, BY - BW / 2 - 0.0012 - grow, 0.005],
          [BW / 2 + 0.0012 + grow, BY + BW / 2 + 0.0012 + grow, 0.005],
          [-BW / 2 - 0.0012 - grow, BY + BW / 2 + 0.0012 + grow, 0.005],
        ],
        0.016,
        {
          plane: "front",
          bevel: 0.0006,
          holes: [
            [
              [-BW / 2 + 0.0002, BY - BW / 2 + 0.0002, 0.004],
              [BW / 2 - 0.0002, BY - BW / 2 + 0.0002, 0.004],
              [BW / 2 - 0.0002, BY + BW / 2 - 0.0002, 0.004],
              [-BW / 2 + 0.0002, BY + BW / 2 - 0.0002, 0.004],
            ],
          ],
        },
      ),
      { at: [0, 0, z], rot: [0, tilt, 0], color: 0x161616, wear: 0.3 },
    );
  band(-0.156, 0.04, 0);
  band(-0.081, -0.05, 0.0004);
  // strips of tape along the battery
  for (const [x, w] of [
    [0.012, 0.018],
    [-0.016, 0.016],
  ]) {
    bat(box(w, 0.0012, 0.07, { bevel: 0.0004 }), {
      at: [x, BY + BW / 2 + 0.0008, -0.083],
      rot: [0.02, 0.04 * Math.sign(x), 0],
      color: 0x161616,
      wear: 0.2,
    });
  }
  // the end of a tape strip left on the case side
  b.add(box(0.018, 0.0012, 0.026, { bevel: 0.0004 }), "tape_black", {
    at: [CASE.x + 0.0018, 0.06, -0.058],
    rot: [0, 0, PI / 2],
    wear: 0.2,
  });

  // knife-switch base on top of the case, rear half
  const KY = CASE.y1 + 0.0035,
    KZ0 = -0.058,
    KZ1 = -0.006;
  b.add(box(0.032, 0.007, 0.064, { bevel: 0.0015, r: 0.003 }), "wood_walnut", {
    at: [0, KY, (KZ0 + KZ1) / 2],
    color: 0x5a3a28,
    wear: 0.4,
  });
  for (const s of [1, -1]) {
    // hinge posts and front jaws, one pair for each blade
    for (const z of [KZ0, KZ1]) {
      b.add(box(0.0016, 0.012, 0.009, { bevel: 0.0004 }), "copper", {
        at: [0.0095 * s + 0.0024, KY + 0.0095, z],
        wear: 0.4,
      });
      b.add(box(0.0016, 0.012, 0.009, { bevel: 0.0004 }), "copper", {
        at: [0.0095 * s - 0.0024, KY + 0.0095, z],
        wear: 0.4,
      });
    }
    b.add(screw(0.0026, { axis: "y", h: 0.0012 }), "brass", {
      at: [0.0095 * s, KY + 0.0036, KZ0 - 0.009],
      wear: 0.4,
    });
    b.add(screw(0.0026, { axis: "y", h: 0.0012 }), "brass", {
      at: [0.0095 * s, KY + 0.0036, KZ1 + 0.009],
      wear: 0.4,
    });
  }
  b.add(rod(0.0012, -0.014, 0.014, { seg: 6 }), "brass", {
    at: [0, KY + 0.012, KZ0],
    rot: [0, PI / 2, 0],
    wear: 0.3,
  });
  // battery leads up into the switch. They are their own node, hinged where they enter the switch,
  // so that with the battery out they sag under the weight of their clips instead of standing in the air
  const LP = [0, KY + 0.004, KZ0 - 0.009];
  const LOFF = { at: [-LP[0], -LP[1], -LP[2]] };
  const ld = M();
  // the leads end in two brass clips the battery's springs push into
  for (const x of [0.017, -0.017])
    ld.add(kit.adopt(new THREE.BoxGeometry(0.009, 0.006, 0.007)), "brass", {
      at: [x - LP[0], BY + 0.0165 - LP[1], BZ0 - 0.0165 - LP[2]],
    });
  ld.add(
    sweep(
      [
        [0.017, BY + 0.018, BZ0 - 0.016],
        [0.026, BY + 0.03, BZ0 - 0.014],
        [0.024, BY + BW / 2 + 0.012, BZ0 + 0.03],
        [0.016, KY + 0.004, KZ0 - 0.026],
        [0.0095, KY + 0.004, KZ0 - 0.009],
      ],
      0.0019,
      { seg: 6, steps: 40 },
    ),
    "rubber_red",
    LOFF,
  );
  ld.add(
    sweep(
      [
        [-0.017, BY + 0.018, BZ0 - 0.016],
        [-0.028, BY + 0.022, BZ0 - 0.012],
        [-0.03, BY + BW / 2 + 0.008, BZ0 + 0.04],
        [-0.016, KY + 0.004, KZ0 - 0.022],
        [-0.0095, KY + 0.004, KZ0 - 0.009],
      ],
      0.0019,
      { seg: 6, steps: 40 },
    ),
    "polymer",
    LOFF,
  );
  // short leads from the jaws down into the case
  for (const s of [1, -1]) {
    b.add(
      sweep(
        [
          [0.0095 * s, KY + 0.004, KZ1 + 0.009],
          [0.0095 * s, KY + 0.005, KZ1 + 0.02],
          [0.016 * s, CASE.y1 + 0.006, KZ1 + 0.03],
          [0.02 * s, CASE.y1, KZ1 + 0.036],
        ],
        0.0017,
        { seg: 6, steps: 20 },
      ),
      s > 0 ? "rubber_red" : "polymer",
    );
  }
  b.add(rod(0.0042, -0.003, 0.003, { seg: 12 }), "polymer", {
    at: [0.02, CASE.y1 + 0.001, KZ1 + 0.036],
    rot: [PI / 2, 0, 0],
  });
  b.add(rod(0.0042, -0.003, 0.003, { seg: 12 }), "polymer", {
    at: [-0.02, CASE.y1 + 0.001, KZ1 + 0.036],
    rot: [PI / 2, 0, 0],
  });

  // bakelite spine carrying the front end, bolted to the case with an angle bracket
  const SY = 0.026;
  b.add(box(0.024, 0.008, 0.21, { bevel: 0.0012, r: 0.002 }), "polymer", {
    at: [0, SY, CASE.z1 + 0.105],
    wear: 0.35,
  });
  b.add(
    prism(
      [
        [CASE.z1 - 0.001, SY - 0.004],
        [CASE.z1 + 0.034, SY - 0.004],
        [CASE.z1 + 0.034, SY - 0.0016],
        [CASE.z1 + 0.0024, SY - 0.0016],
        [CASE.z1 + 0.0024, SY + 0.024],
        [CASE.z1 - 0.001, SY + 0.024],
      ],
      0.03,
      { bevel: 0.0006 },
    ),
    "steel_park",
    { wear: 0.4 },
  );
  b.add(screw(0.0028, { axis: "z", hex: true, h: 0.002 }), "steel_bare", {
    at: [0.009, SY + 0.016, CASE.z1 + 0.0024],
    mirror: true,
    wear: 0.4,
  });
  b.add(screw(0.0028, { axis: "y", hex: true, h: 0.002 }), "steel_bare", {
    at: [0, SY + 0.004, CASE.z1 + 0.024],
    wear: 0.4,
  });
  const body = b.build("body");
  const leads = ld.build("leads");
  leads.position.set(...LP);

  // nameplate text
  body.add(
    label({
      key: "arc-plate",
      w: 0.074,
      h: 0.036,
      px: 512,
      face: "x",
      at: [CASE.x + 0.00125, CYm + 0.002, 0.085],
      metal: 0.35,
      rough: 0.45,
      draw(g, W, H) {
        g.fillStyle = "#a9adb0";
        g.fillRect(0, 0, W, H);
        const gr = g.createLinearGradient(0, 0, W, H);
        gr.addColorStop(0, "rgba(255,255,255,0.18)");
        gr.addColorStop(1, "rgba(0,0,0,0.18)");
        g.fillStyle = gr;
        g.fillRect(0, 0, W, H);
        g.fillStyle = "rgba(20,22,26,0.92)";
        g.fillRect(W * 0.06, H * 0.08, W * 0.88, H * 0.2);
        g.fillStyle = "#d8dadc";
        g.textAlign = "center";
        g.textBaseline = "middle";
        g.font = `900 ${H * 0.13}px ${kit.FONT_HEI}`;
        g.fillText("金華霓虹變壓器廠", W / 2, H * 0.18);
        g.fillStyle = "#1a1c20";
        g.textAlign = "left";
        g.font = `700 ${H * 0.1}px ${kit.FONT_HEI}`;
        g.fillText("型號 NT-1530", W * 0.08, H * 0.4);
        g.fillText("輸入 220V 50Hz", W * 0.08, H * 0.55);
        g.fillText("輸出 15kV 30mA", W * 0.08, H * 0.7);
        g.textAlign = "right";
        g.fillText("香港 九龍", W * 0.92, H * 0.4);
        g.fillText("1983年製", W * 0.92, H * 0.55);
        g.fillStyle = "#c8201a";
        g.font = `900 ${H * 0.11}px ${kit.FONT_HEI}`;
        g.fillText("⚡ 高壓危險", W * 0.92, H * 0.7);
        g.fillStyle = "#1a1c20";
        g.textAlign = "center";
        g.font = `600 ${H * 0.07}px ${kit.FONT_MONO}`;
        g.fillText("NEON SIGN TRANSFORMER · NO. 0417", W / 2, H * 0.87);
        g.strokeStyle = "rgba(20,22,26,0.7)";
        g.lineWidth = 2;
        g.strokeRect(W * 0.04, H * 0.05, W * 0.92, H * 0.9);
        scuff(g, W, H, 50);
      },
    }),
  );
  // the battery node, with its label (left side) and the end marking
  const battery = bt.build("battery");
  battery.position.set(0, BY, BM);
  battery.add(
    label({
      key: "arc-batt",
      w: 0.088,
      h: 0.06,
      px: 512,
      face: "x",
      at: [BW / 2 + 0.0004, 0, 0.002],
      rough: 0.5,
      draw(g, W, H) {
        g.fillStyle = "#e9e3d2";
        g.fillRect(0, 0, W, H);
        g.fillStyle = "#c8201a";
        g.fillRect(0, 0, W, H * 0.42);
        g.fillStyle = "#14161c";
        g.fillRect(0, H * 0.86, W, H * 0.14);
        g.fillStyle = "#fff4d6";
        g.textBaseline = "middle";
        g.textAlign = "left";
        g.font = `900 ${H * 0.25}px ${kit.FONT_HEI}`;
        g.fillText("金鹿牌", W * 0.06, H * 0.22);
        g.font = `900 ${H * 0.28}px ${kit.FONT_MONO}`;
        g.textAlign = "right";
        g.fillText("6V", W * 0.94, H * 0.22);
        g.fillStyle = "#14161c";
        g.textAlign = "left";
        g.font = `800 ${H * 0.13}px ${kit.FONT_HEI}`;
        g.fillText("方形手電筒電池", W * 0.06, H * 0.55);
        g.font = `600 ${H * 0.085}px ${kit.FONT_MONO}`;
        g.fillText("4R25 · 6V · HEAVY DUTY", W * 0.06, H * 0.72);
        g.fillStyle = "#e9e3d2";
        g.font = `600 ${H * 0.07}px ${kit.FONT_HEI}`;
        g.fillText("用完請勿投入火中", W * 0.06, H * 0.93);
        scuff(g, W, H, 60);
      },
    }),
  );
  battery.add(
    label({
      key: "arc-batt-end",
      w: 0.05,
      h: 0.02,
      px: 256,
      face: "-z",
      at: [0, -0.012, BZ0 - 0.0002 - BM],
      rough: 0.5,
      draw(g, W, H) {
        g.clearRect(0, 0, W, H);
        g.fillStyle = "#e9e3d2";
        g.textAlign = "center";
        g.textBaseline = "middle";
        g.font = `900 ${H * 0.62}px ${kit.FONT_MONO}`;
        g.fillText("+", W * 0.16, H * 0.45);
        g.fillText("−", W * 0.84, H * 0.45);
        g.font = `700 ${H * 0.34}px ${kit.FONT_HEI}`;
        g.fillText("金鹿 6V", W / 2, H * 0.5);
      },
    }),
  );

  // ------------------------------------------------------------------ knife-switch blades (move with the trigger)
  const kw = M();
  const KL = KZ1 - KZ0;
  for (const s of [1, -1])
    kw.add(box(0.0018, 0.0062, KL + 0.004, { bevel: 0.0005 }), "copper", {
      at: [0.0095 * s, 0, KL / 2],
      wear: 0.5,
    });
  kw.add(box(0.026, 0.004, 0.006, { bevel: 0.0008 }), "polymer", {
    at: [0, 0.004, KL - 0.002],
    wear: 0.3,
  });
  kw.add(rod(0.0018, -0.004, 0.016, { seg: 8 }), "copper", {
    at: [0, 0.004, KL - 0.002],
    rot: [-PI / 2, 0, 0],
    wear: 0.3,
  });
  kw.add(
    lathe(
      [
        [0, 0],
        [0, 0.0045, 0.001],
        [0.012, 0.0058, 0.004],
        [0.022, 0.0052, 0.003],
        [0.024, 0],
      ],
      { seg: 16 },
    ),
    "polymer",
    { at: [0, 0.018, KL - 0.002], rot: [-PI / 2, 0, 0], wear: 0.3 },
  );
  const knife = kw.build("knife-switch");
  knife.position.set(0, KY + 0.012, KZ0);

  // trigger (moves)
  const tg = M();
  tg.add(
    prism(
      [
        [0.004, 0.004, 0.001],
        [0.0075, 0.002, 0.001],
        [0.0045, -0.011, 0.006],
        [0.009, -0.025, 0.002],
        [0.005, -0.027, 0.001],
        [0.0, -0.012, 0.008],
      ],
      0.0065,
      { bevel: 0.0013, bevelSeg: 2 },
    ),
    "copper",
    { wear: 0.4 },
  );
  const trigger = tg.build("trigger");
  trigger.position.set(0, CASE.y0 - 0.008, 0.004);

  // ------------------------------------------------------------------ base front: hairpin neon tubes, insulators, two electrodes, HT leads
  /** Hairpin in the plane x = X: upper run at yU, lower at yL, bend centre at zB. */
  const hairpin = (X, yU, yL, z0, zB) => {
    const r = (yU - yL) / 2,
      yc = (yU + yL) / 2;
    const pts = [
      [X, yU, z0],
      [X, yU, z0 + 0.03],
      [X, yU, zB - 0.03],
    ];
    for (let i = 0; i <= 8; i++) {
      const a = PI / 2 - (i / 8) * PI;
      pts.push([X, yc + Math.sin(a) * r, zB + Math.cos(a) * r]);
    }
    pts.push([X, yL, zB - 0.03], [X, yL, z0 + 0.03], [X, yL, z0]);
    return pts;
  };
  const TX = 0.047;
  const fb = M();
  const TZ0 = CASE.z1 + 0.034;
  neonTube(fb, hairpin(TX, 0.079, 0.031, TZ0, 0.39), gPink);
  neonTube(fb, hairpin(-TX, 0.079, 0.031, TZ0, 0.39), gCyan);
  // tube supports: cross straps under the spine with porcelain posts and wire ties to the upper run
  const tubeSupports = (m, zs, X) => {
    for (const z of zs) {
      m.add(box(X * 2 + 0.01, 0.0018, 0.008, { bevel: 0.0005 }), "steel_park", {
        at: [0, SY - 0.005, z],
        wear: 0.4,
      });
      for (const s of [1, -1]) {
        m.add(rod(0.0042, 0, 0.016, { seg: 12, r: 0.0015 }), "ceramic", {
          at: [s * X, SY - 0.004, z],
          rot: [-PI / 2, 0, 0],
          wear: 0.4,
        });
        m.add(
          sweep(
            [
              [s * (X - 0.007), 0.031, z],
              [s * (X - 0.0075), 0.055, z],
              [s * (X - 0.007), 0.079, z],
              [s * (X + 0.001), 0.0855, z],
              [s * (X + 0.0068), 0.079, z],
            ],
            0.0008,
            { seg: 4, steps: 18 },
          ),
          "steel_park",
          { wear: 0.3 },
        );
      }
    }
  };
  tubeSupports(fb, [0.22, 0.33], TX);
  // porcelain insulators with the copper electrodes
  const EX = 0.016,
    IZ0 = 0.268;
  for (const s of [1, -1]) {
    fb.add(insulator(0.0105, IZ0, 5), "ceramic", {
      at: [s * EX, A, 0],
      wear: 0.4,
    });
    fb.add(
      rod(0.0058, IZ0 - 0.01, IZ0 + 0.001, { seg: 6, flat: true, r: 0.0006 }),
      "copper",
      { at: [s * EX, A, 0], wear: 0.3 },
    );
    // bracket from the spine up to the insulator
    fb.add(
      tube(0.0074, 0.0064, IZ0 + 0.004, IZ0 + 0.012, { seg: 16 }),
      "steel_park",
      { at: [s * EX, A, 0], wear: 0.3 },
    );
    fb.add(box(0.004, A - SY - 0.006, 0.008, { bevel: 0.0006 }), "steel_park", {
      at: [s * EX * 0.6, (A + SY) / 2 - 0.002, IZ0 + 0.008],
      wear: 0.3,
    });
    // electrode: straight rod, then kinks in towards the gap
    const tip = [s * 0.0068, A, 0.452];
    fb.add(
      sweep(
        [
          [s * EX, A, IZ0 + 0.045],
          [s * EX, A, 0.39],
          [s * 0.0142, A, 0.42],
          [s * 0.0095, A, 0.44],
          tip,
        ],
        0.0032,
        { seg: 10, steps: 40, caps: false },
      ),
      "copper",
    );
    fb.add(sphere(0.0046, { seg: 12, rings: 8 }), "copper", {
      at: tip,
      wear: 0.3,
    });
    fb.add(rod(0.0045, 0, 0.006, { seg: 6, flat: true }), "copper", {
      at: [s * EX, A, IZ0 + 0.044],
      wear: 0.3,
    });
  }
  // HT leads: red on the left, black on the right, looping down under the spine
  for (const s of [1, -1]) {
    fb.add(
      sweep(
        [
          [s * 0.018, 0.068, CASE.z1 + 0.034],
          [s * 0.022, 0.066, CASE.z1 + 0.05],
          [s * 0.032, 0.032, 0.2],
          [s * 0.03, 0.002, 0.228],
          [s * 0.022, 0.0, 0.25],
          [s * 0.017, 0.028, IZ0 - 0.018],
          [s * EX, A, IZ0 - 0.012],
        ],
        0.0042,
        { seg: 8, steps: 34, tension: 0.5 },
      ),
      s > 0 ? "rubber_red" : "polymer",
    );
  }
  const frontBase = only(fb.build("front-base"), "base");

  // ------------------------------------------------------------------ branch A 连锁: three spiral tubes, three-pronged claw, second coil pack
  const fa = M();
  const spiral = (phase, r, z0, z1, turns) => {
    const pts = [];
    const n = 24;
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      const a = phase + t * turns * PI * 2;
      pts.push([Math.cos(a) * r, A + Math.sin(a) * r, z0 + (z1 - z0) * t]);
    }
    return pts;
  };
  [gPink, gCyan, gViolet].forEach((gm, i) => {
    neonTube(
      fa,
      spiral(PI / 2 + (i * PI * 2) / 3, 0.04, TZ0, 0.392, 0.62),
      gm,
      { steps: 44 },
    );
  });
  // three rings that hold the spiral, on porcelain spacers
  for (const z of [0.215, 0.33]) {
    fa.add(torus(0.048, 0.0014, { seg: 6, around: 40 }), "steel_park", {
      at: [0, A, z],
      wear: 0.3,
    });
    for (let i = 0; i < 3; i++) {
      // clip where each tube passes through the ring
      const a =
        PI / 2 + (i * PI * 2) / 3 + ((z - TZ0) / (0.392 - TZ0)) * 0.62 * PI * 2;
      fa.add(box(0.0042, 0.004, 0.006, { bevel: 0.0006 }), "ceramic", {
        at: [Math.cos(a) * 0.0466, A + Math.sin(a) * 0.0466, z],
        rot: [0, 0, a + PI / 2],
        wear: 0.4,
      });
    }
  }
  fa.add(
    box(0.006, A - 0.048 - SY + 0.002, 0.008, { bevel: 0.0006 }),
    "steel_park",
    { at: [0, SY + 0.004 - 0.002, 0.215], wear: 0.4 },
  );
  // central insulator and the three-pronged claw
  fa.add(insulator(0.014, 0.262, 6, { pitch: 0.0095 }), "ceramic", {
    at: [0, A, 0],
    wear: 0.4,
  });
  fa.add(rod(0.008, 0.25, 0.264, { seg: 6, flat: true, r: 0.0008 }), "copper", {
    at: [0, A, 0],
    wear: 0.3,
  });
  fa.add(box(0.006, A - SY - 0.012, 0.01, { bevel: 0.0006 }), "steel_park", {
    at: [0, (A + SY) / 2 - 0.004, 0.27],
    wear: 0.4,
  });
  fa.add(rod(0.0045, 0.33, 0.37, { seg: 14 }), "copper", {
    at: [0, A, 0],
    wear: 0.4,
  });
  fa.add(
    lathe(
      [
        [0.362, 0],
        [0.362, 0.0085, 0.002],
        [0.378, 0.0095, 0.002],
        [0.384, 0.006, 0.002],
        [0.386, 0],
      ],
      { seg: 18 },
    ),
    "copper",
    { at: [0, A, 0], wear: 0.4 },
  );
  const CLAW = [];
  for (let i = 0; i < 3; i++) {
    const a = PI / 2 + (i * PI * 2) / 3;
    const c = Math.cos(a),
      s = Math.sin(a);
    const P = (r, z) => [c * r, A + s * r, z];
    const tip = P(0.0085, 0.468);
    CLAW.push(tip);
    fa.add(
      sweep(
        [
          P(0.006, 0.376),
          P(0.016, 0.39),
          P(0.025, 0.415),
          P(0.022, 0.445),
          P(0.013, 0.462),
          tip,
        ],
        0.0034,
        { seg: 8, steps: 26 },
      ),
      "copper",
    );
    fa.add(sphere(0.004, { seg: 10, rings: 6 }), "copper", {
      at: tip,
      wear: 0.3,
    });
    fa.add(screw(0.0026, { axis: "z", hex: true, h: 0.002 }), "steel_park", {
      at: P(0.0095, 0.3865),
      wear: 0.4,
    });
  }
  // HT leads join at the central insulator
  for (const s of [1, -1]) {
    fa.add(
      sweep(
        [
          [s * 0.018, 0.068, CASE.z1 + 0.034],
          [s * 0.02, 0.064, CASE.z1 + 0.05],
          [s * 0.026, 0.02, 0.195],
          [s * 0.016, 0.004, 0.232],
          [s * 0.006, 0.018, 0.25],
          [s * 0.002, A - 0.006, 0.251],
        ],
        0.0042,
        { seg: 8, steps: 34 },
      ),
      s > 0 ? "rubber_red" : "polymer",
    );
  }
  // second coil pack strapped on top of the case: fibre bobbin, copper winding, bakelite cheeks
  const KC = [0, CASE.y1 + 0.03, 0.066];
  fa.add(rod(0.0085, 0.022, 0.11, { seg: 16 }), "paper_kraft", {
    at: [0, KC[1], 0],
    wear: 0.3,
  });
  const wind = [[0.03, 0]];
  for (let i = 0; i < 19; i++) {
    const z = 0.03 + i * 0.0038;
    wind.push([z, 0.0172, 0], [z + 0.0019, 0.0192, 0]);
  }
  wind.push([0.102, 0.0172, 0], [0.102, 0]);
  fa.add(lathe(wind, { seg: 18 }), "copper", { at: [0, KC[1], 0], wear: 0.4 });
  for (const z of [0.022, 0.102])
    fa.add(box(0.05, 0.05, 0.008, { bevel: 0.0012, r: 0.004 }), "polymer", {
      at: [0, KC[1], z + 0.004],
      wear: 0.35,
    });
  for (const z of [0.033, 0.098]) {
    fa.add(box(0.048, 0.0018, 0.008, { bevel: 0.0004 }), "steel_park", {
      at: [0, CASE.y1 + 0.0055, z],
      wear: 0.3,
    });
  }
  fa.add(box(0.04, 0.006, 0.09, { bevel: 0.001 }), "steel_park", {
    at: [0, CASE.y1 + 0.0072, 0.066],
    wear: 0.4,
  });
  fa.add(box(0.012, 0.012, 0.072, { bevel: 0.0012 }), "steel_park", {
    at: [0, KC[1], 0.066 + 0.0],
    wear: 0.3,
  });
  for (const s of [1, -1]) {
    fa.add(screw(0.003, { axis: "y", hex: true, h: 0.002 }), "copper", {
      at: [s * 0.016, KC[1] + 0.025, 0.026],
      wear: 0.4,
    });
    fa.add(
      sweep(
        [
          [s * 0.016, KC[1] + 0.027, 0.026],
          [s * 0.022, KC[1] + 0.03, 0.015],
          [s * 0.026, CASE.y1 + 0.01, 0.0],
          [s * 0.024, CASE.y1 + 0.001, -0.002],
        ],
        0.0016,
        { seg: 6, steps: 20 },
      ),
      s > 0 ? "rubber_red" : "polymer",
    );
  }
  const partsA = only(fa.build("front-a"), "a");

  // ------------------------------------------------------------------ branch B 球闪: plasma globe in a copper cage, big capacitor
  const fbb = M();
  const GZ = 0.4,
    GR = 0.05;
  neonTube(fbb, hairpin(TX, 0.079, 0.031, TZ0, 0.3), gPink);
  neonTube(fbb, hairpin(-TX, 0.079, 0.031, TZ0, 0.3), gCyan);
  tubeSupports(fbb, [0.22], TX);
  // bakelite socket the globe sits in
  fbb.add(
    lathe(
      [
        [0.29, 0],
        [0.29, 0.022, 0.003],
        [0.305, 0.026, 0.004],
        [0.33, 0.03, 0.004],
        [0.344, 0.03, 0.002],
        [0.348, 0.026, 0.001],
        [0.348, 0],
      ],
      { seg: 32 },
    ),
    "polymer",
    { at: [0, A, 0], wear: 0.35 },
  );
  fbb.add(tube(0.0312, 0.0296, 0.33, 0.336, { seg: 32 }), "copper", {
    at: [0, A, 0],
    wear: 0.6,
  });
  fbb.add(box(0.02, A - SY - 0.02, 0.03, { bevel: 0.001 }), "steel_park", {
    at: [0, SY + (A - SY - 0.02) / 2 + 0.003, 0.305],
    wear: 0.4,
  });
  // globe and inner electrode
  fbb.add(sphere(GR, { seg: 32, rings: 20 }), globeGlass, { at: [0, A, GZ] });
  fbb.add(rod(0.0042, 0.344, GZ - 0.009, { seg: 12 }), "steel_park", {
    at: [0, A, 0],
    wear: 0.3,
  });
  fbb.add(sphere(0.0105, { seg: 14, rings: 10 }), globeGlass, {
    at: [0, A, GZ],
  });
  fbb.add(sphere(0.0062, { seg: 14, rings: 10 }), gPlasma, { at: [0, A, GZ] });
  // filaments: jagged streamers from the core to the glass
  const rnd = (() => {
    let x = 7;
    return () => ((x = (x * 16807) % 2147483647) / 2147483647) * 2 - 1;
  })();
  const STREAM = [];
  for (let i = 0; i < 8; i++) {
    const dir = new THREE.Vector3(rnd(), rnd(), rnd() * 0.8 + 0.25).normalize();
    const side = new THREE.Vector3()
      .crossVectors(dir, new THREE.Vector3(0.3, 1, 0.1))
      .normalize();
    const up = new THREE.Vector3().crossVectors(dir, side);
    const pts = [];
    const n = 7;
    for (let k = 0; k <= n; k++) {
      const t = k / n;
      const r = 0.008 + t * (GR - 0.011);
      const j = k === 0 || k === n ? 0 : 0.004 * (0.4 + t);
      const p = dir
        .clone()
        .multiplyScalar(r)
        .addScaledVector(side, rnd() * j)
        .addScaledVector(up, rnd() * j);
      pts.push([p.x, A + p.y, GZ + p.z]);
    }
    STREAM.push(pts[n]);
    fbb.add(
      sweep(pts, 0.00085, { seg: 4, steps: 20, tension: 0.2, caps: false }),
      gPlasma,
    );
    fbb.add(sphere(0.0022, { seg: 8, rings: 6 }), gPlasma, { at: pts[n] });
  }
  // copper cage: meridian straps, equator ring, front cap and the ring into the socket
  const CR = GR + 0.006;
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * PI;
    const g = torus(CR, 0.0016, { seg: 4, around: 22, arc: PI * 0.86 });
    // arc in the XY plane from +X; turn it so it runs over the front of the globe
    g.rotateZ(-PI * 0.43);
    g.rotateY(PI / 2);
    g.rotateZ(a);
    fbb.add(g, "copper", { at: [0, A, GZ], wear: 0.5 });
  }
  fbb.add(torus(CR, 0.0022, { seg: 6, around: 36 }), "copper", {
    at: [0, A, GZ],
    wear: 0.5,
  });
  fbb.add(torus(CR * 0.62, 0.002, { seg: 6, around: 32 }), "copper", {
    at: [0, A, GZ + CR * 0.78],
    wear: 0.5,
  });
  fbb.add(torus(0.031, 0.0024, { seg: 6, around: 32 }), "copper", {
    at: [0, A, 0.347],
    wear: 0.5,
  });
  fbb.add(
    rod(0.0065, GZ + CR - 0.002, GZ + CR + 0.006, { seg: 14, r: 0.002 }),
    "copper",
    { at: [0, A, 0], wear: 0.4 },
  );
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * PI * 2 + PI / 6;
    fbb.add(sphere(0.0026, { seg: 8, rings: 6 }), "copper", {
      at: [Math.cos(a) * CR, A + Math.sin(a) * CR, GZ],
      wear: 0.4,
    });
  }
  // HT leads into the socket
  for (const s of [1, -1]) {
    fbb.add(
      sweep(
        [
          [s * 0.018, 0.068, CASE.z1 + 0.034],
          [s * 0.02, 0.064, CASE.z1 + 0.05],
          [s * 0.028, 0.02, 0.2],
          [s * 0.024, 0.004, 0.25],
          [s * 0.016, 0.022, 0.284],
          [s * 0.008, A - 0.006, 0.292],
        ],
        0.0042,
        { seg: 8, steps: 34 },
      ),
      s > 0 ? "rubber_red" : "polymer",
    );
  }
  // big capacitor can on top of the case, with bus bars to the bushings
  const CC = [0, CASE.y1 + 0.036, 0];
  // plain drawn-aluminium can: the brushed pattern is projected along the axes and smeared into streaks
  // across the flat end disc, so the can gets its own unpatterned, slightly satin variant
  const canMat = kit.mats.variant(
    "steel_bare",
    { pattern: null, rough: 0.5, color: 0x9a9ea4, edgeAmt: 0.35, bump: 0 },
    "arc-can",
  );
  fbb.add(
    lathe(
      [
        [0.005, 0],
        [0.005, 0.03, 0.003],
        [0.12, 0.03, 0.003],
        [0.124, 0.027, 0.0015],
        [0.124, 0],
      ],
      { seg: 32 },
    ),
    canMat,
    { at: [0, CC[1], 0], wear: 0.5 },
  );
  fbb.add(tube(0.0312, 0.0294, 0.012, 0.018, { seg: 32 }), canMat, {
    at: [0, CC[1], 0],
    wear: 0.6,
  });
  // bakelite end seal (matte, no knurl pattern to streak across the flat face)
  const sealMat = kit.mats.variant(
    "polymer",
    {
      color: 0x16130f,
      rough: 0.78,
      dirt: 0.08,
      edgeAmt: 0.3,
      var: 0.15,
      env: 0.6,
    },
    "arc-cap-seal",
  );
  fbb.add(rod(0.026, -0.001, 0.0046, { seg: 30, r: 0.0015 }), sealMat, {
    at: [0, CC[1], 0],
    wear: 0.3,
  });
  // front end: a pressed rubber vent disc inside the rolled rim instead of a bare mirror face
  fbb.add(rod(0.0262, 0.121, 0.1262, { seg: 30, r: 0.0018 }), sealMat, {
    at: [0, CC[1], 0],
    wear: 0.3,
  });
  fbb.add(rod(0.0075, 0.125, 0.1272, { seg: 16, r: 0.0008 }), canMat, {
    at: [0, CC[1], 0],
    wear: 0.4,
  });
  for (const s of [1, -1]) {
    fbb.add(rod(0.0045, -0.008, 0.0, { seg: 6, flat: true }), "copper", {
      at: [s * 0.012, CC[1], 0],
      wear: 0.4,
    });
    fbb.add(rod(0.0022, -0.014, -0.008, { seg: 8 }), "copper", {
      at: [s * 0.012, CC[1], 0],
      wear: 0.3,
    });
    fbb.add(
      sweep(
        [
          [s * 0.012, CC[1], -0.012],
          [s * 0.02, CC[1] + 0.006, -0.022],
          [s * 0.03, CASE.y1 + 0.012, -0.0],
          [s * 0.031, CASE.y1 + 0.004, 0.04],
          [s * 0.028, CASE.y1 + 0.0, 0.09],
          [s * 0.024, 0.08, CASE.z1 + 0.006],
          [s * 0.019, 0.07, CASE.z1 + 0.026],
        ],
        0.0017,
        { seg: 6, steps: 50 },
      ),
      s > 0 ? "rubber_red" : "polymer",
    );
  }
  for (const z of [0.03, 0.098]) {
    fbb.add(
      tube(0.0322, 0.0302, z - 0.005, z + 0.005, { seg: 32, r: 0, rIn: 0 }),
      "steel_park",
      { at: [0, CC[1], 0], wear: 0.3 },
    );
    fbb.add(box(0.05, 0.006, 0.012, { bevel: 0.001 }), "steel_park", {
      at: [0, CASE.y1 + 0.006, z],
    });
    for (const s of [1, -1])
      fbb.add(screw(0.0028, { axis: "y", hex: true, h: 0.002 }), "steel_park", {
        at: [s * 0.021, CASE.y1 + 0.009, z],
        wear: 0.4,
      });
  }
  const partsB = only(fbb.build("front-b"), "b");
  partsB.add(
    wrap({
      key: "arc-cap",
      r: 0.0302,
      z0: 0.036,
      z1: 0.092,
      px: 512,
      at: [0, CC[1], 0],
      rough: 0.35,
      draw(g, W, H) {
        g.fillStyle = "#1b3c8c";
        g.fillRect(0, 0, W, H);
        g.fillStyle = "#e6c34a";
        g.fillRect(0, 0, W, H * 0.06);
        g.fillRect(0, H * 0.94, W, H * 0.06);
        // text reads from the left, running along the can
        g.save();
        g.translate(W * -0.25, 0);
        g.translate(W, 0);
        g.rotate(PI / 2);
        const w = H,
          h = W;
        g.fillStyle = "#f2efe6";
        g.textAlign = "center";
        g.textBaseline = "middle";
        g.font = `900 ${h * 0.075}px ${kit.FONT_HEI}`;
        g.fillText("電解電容", w * 0.5, h * 0.42);
        g.font = `700 ${h * 0.05}px ${kit.FONT_MONO}`;
        g.fillText("4700μF 450V", w * 0.5, h * 0.52);
        g.font = `600 ${h * 0.034}px ${kit.FONT_MONO}`;
        g.fillText("85°C  ⊖ ⊖ ⊖", w * 0.5, h * 0.6);
        g.restore();
        scuff(g, W, H, 30, "0,0,0");
      },
    }),
  );

  // ------------------------------------------------------------------ spark at the battery clip (reload)
  const sparkMat = kit.mats.glow(0xcfe6ff, 6).clone();
  sparkMat.name = "arc-spark";
  const sk = M();
  for (const [sx, sy, sz, rx, rz] of [
    [0.5, 0.5, 2.6, 0.3, 0],
    [2.4, 0.45, 0.45, 0, 0.5],
    [0.45, 2.2, 0.5, 0, -0.4],
  ])
    sk.add(kit.adopt(new THREE.OctahedronGeometry(0.0032)), sparkMat, {
      rot: [rx, 0, rz],
      scale: [sx, sy, sz],
    });
  const spark = sk.build("spark");
  spark.position.set(0.017, BY + 0.013, BZ0 - 0.012);
  spark.visible = false;

  // ------------------------------------------------------------------ assemble
  const root = new THREE.Group();
  root.name = "arc";
  root.add(
    body,
    leads,
    battery,
    spark,
    knife,
    trigger,
    frontBase,
    partsA,
    partsB,
  );

  const tipL = [0.0068, A, 0.452],
    tipR = [-0.0068, A, 0.452];
  const muzzleBase = [0, A, 0.452];
  const muzzleA = [0, A, 0.47];
  const muzzleB = [0, A, GZ];
  let flick = 0;
  // right hand round the taped grip, index on the trigger; left hand flat under the front of the case
  // The web of the hand sits high at the back of the grip, so the knuckles come round its front
  // instead of standing off it; fingers square to the raked grip. The trigger is close to the grip,
  // so the index reaches it with a short first bone and wraps it at the middle joint.
  const RIGHT = {
    at: [-0.0135, -0.036, -0.07],
    palm: [1, 0, 0.18],
    fingers: [0.08, -0.28, 0.96],
    pose: {
      base: "pistol",
      index: [0.2, 1.25, 0.8, 0.1],
      ring: [1.2, 1.42, 0.6, -0.02],
      pinky: [1.22, 1.4, 0.5, -0.05],
      // forward along the left of the grip, under the case
      thumb: [0.2, -0.6, 0.75, 0.3, 0.3],
    },
    trigger: true,
  };
  const LEFT = {
    at: [0.006, CASE.y0 - 0.003, 0.06],
    palm: [0, 1, 0],
    fingers: [-0.9, 0.22, 0.38],
    pose: "cradle",
    // reload: palm flat on the battery's left side, fingers up over its top edge, thumb under it
    alts: {
      batt: {
        parent: battery,
        at: [BW / 2 + 0.0012, -0.004, 0.004],
        palm: [-1, 0, 0],
        fingers: [0, 0.94, 0.34],
        pose: { base: "wrap", r: 0.032, thumb: [0.7, -0.45, 0.55, 0.3, 0.2] },
      },
    },
  };
  const LEFT_CLAMP = {
    base: "cradle",
    index: [0.86, 1.05, 0.58, 0.05],
    middle: [0.9, 1.08, 0.6, 0],
    ring: [0.92, 1.1, 0.6, -0.03],
    pinky: [0.96, 1.1, 0.6, -0.06],
  };
  const NEON = [gPink, gCyan, gViolet]; // built once, driven every frame
  const ease = (a, b, x) => {
    const k = Math.max(0, Math.min(1, (x - a) / (b - a)));
    return k * k * (3 - 2 * k);
  };
  /** A short flash centred on `at` (reload progress units). */
  const blip = (at, x) => Math.max(0, 1 - Math.abs(x - at) / 0.022);
  const crossed = (s, at) => s.prev.reload < at && s.reload >= at;
  let model;
  model = kit.weapon({
    id: "arc",
    root,
    anchors: {
      muzzle: { base: muzzleBase, a: muzzleA, b: muzzleB },
      e0: { base: tipL, a: CLAW[0], b: muzzleB },
      e1: { base: tipR, a: CLAW[1], b: muzzleB },
      e2: { base: muzzleBase, a: CLAW[2], b: muzzleB },
    },
    view: {
      hip: { pos: [0.152, -0.17, -0.43], rot: [0.03, 0.05, -0.03] },
      // reload: drawn in and turned so the battery at the back faces the eye
      reload: { pos: [-0.06, 0.04, 0.05], rot: [0.12, 0.42, -0.12] },
    },
    show: { yaw: -0.85, pitch: 0.14 },
    hands: () => ({ right: { ...RIGHT }, left: { ...LEFT } }),
    ownReload: true,
    // neon idles with a faint flicker and flares with s.firing / s.charge; the knife switch closes with s.trigger
    update(s, dt) {
      const r = s.reload;
      const t = s.t || 0;
      // ---- reload: unplug the battery, take it away, bring a fresh one, push it onto the clips
      // 0-.12 reach back · .12-.2 grip, unplug (spark) · .2-.4 down and away · .4-.52 out of sight
      // .52-.72 back up under the clips · .72-.8 pushed home (spark) · .8-.92 the neon flickers up · .82-.95 hand back
      let power = 1,
        zap = 0;
      const lg = model && model.grips.left;
      if (r >= 0) {
        const unplug = ease(0.12, 0.2, r) - ease(0.72, 0.8, r);
        const away = ease(0.2, 0.4, r) - ease(0.52, 0.72, r);
        battery.position.set(
          0.06 * away,
          BY - 0.014 * unplug - 0.3 * away,
          BM - 0.008 * unplug - 0.12 * away,
        );
        battery.rotation.set(0.5 * away, 0.35 * away, -0.3 * away);
        // free of the battery, the leads drop and swing a little before they settle
        const loose = ease(0.17, 0.3, r) - ease(0.66, 0.78, r);
        leads.rotation.x =
          -0.42 * loose -
          0.1 * loose * Math.exp(-(r - 0.17) * 14) * Math.sin((r - 0.17) * 60);
        // the neon dies as the springs leave the clips and stutters back once they are home
        if (r < 0.5) {
          const u = Math.max(0, Math.min(1, (r - 0.165) / 0.045));
          power =
            u <= 0
              ? 1
              : u >= 1
                ? 0
                : (1 - u) * (Math.sin(t * 90) > 0 ? 1 : 0.3);
        } else {
          const u = Math.max(0, Math.min(1, (r - 0.79) / 0.125));
          power =
            u <= 0
              ? 0
              : u >= 1
                ? 1
                : (Math.sin(t * 61 + u * 17) > 0.7 - 1.6 * u ? 1 : 0.12) *
                  (0.35 + 0.65 * u);
        }
        zap = Math.max(blip(0.17, r), blip(0.795, r));
        if (crossed(s, 0.17)) {
          s.cue("spark");
          s.cue("batteryOut");
        }
        if (crossed(s, 0.795)) {
          s.cue("batteryIn");
          s.cue("spark", 0.7);
        }
        if (lg) {
          lg.to = "batt";
          lg.mix = Math.min(1, r / 0.12, (0.95 - r) / 0.13);
        }
      } else {
        battery.position.set(0, BY, BM);
        battery.rotation.set(0, 0, 0);
        leads.rotation.x = 0;
        if (lg) {
          lg.to = null;
          lg.mix = 0;
        }
      }
      spark.visible = zap > 0.02;
      if (spark.visible) {
        spark.scale.setScalar(0.5 + zap * (0.8 + 0.5 * Math.sin(t * 173)));
        spark.rotation.set(t * 37, t * 23, t * 51);
        sparkMat.emissiveIntensity = 6 * zap;
      }
      const tr = r >= 0 ? 0 : Math.max(0, Math.min(1, s.trigger || 0));
      knife.rotation.x = -0.62 * (1 - tr);
      trigger.rotation.x = tr * 0.32; // the blade swings back towards the grip
      const boost = (s.level || 1) >= 5 ? 1.8 : 1;
      const charge = r >= 0 ? 0 : Math.max(0, Math.min(1, s.charge || 0));
      const fire = s.firing && r < 0 ? 1 : 0;
      flick += ((fire ? 1 : 0) - flick) * Math.min(1, (dt || 0.016) * 10);
      for (let i = 0; i < NEON.length; i++) {
        const m = NEON[i];
        // idle: slow breathing plus the odd stutter of an old tube
        const ph = t * (7.3 + i * 1.7) + i * 2.1;
        const stutter = Math.sin(t * 2.3 + i) > 0.985 ? 0.45 : 1;
        const idle =
          (0.48 + 0.05 * Math.sin(ph) + 0.035 * Math.sin(ph * 3.7)) * stutter;
        const hot =
          1.25 +
          charge * 0.7 +
          0.3 * Math.sin(t * 53 + i * 1.3) * Math.sin(t * 31);
        m.emissiveIntensity =
          m.userData.glow *
          boost *
          power *
          (idle * (1 - flick) + hot * flick + charge * 0.6 * (1 - flick));
      }
      const pl =
        0.8 +
        0.2 * Math.sin(t * 9) * Math.sin(t * 4.1) +
        flick * (1.2 + 0.4 * Math.sin(t * 47)) +
        charge * 1.6;
      gPlasma.emissiveIntensity = gPlasma.userData.glow * boost * pl * power;
      // the transformer hums in the support hand: a fine buzz while the arc runs, the fingers clamp harder
      if (lg) {
        const amp = 0.0007 * flick + 0.0003 * charge;
        lg.anchor.position.set(
          LEFT.at[0] + Math.sin(t * 97) * amp,
          LEFT.at[1] + Math.sin(t * 131 + 1.3) * amp,
          LEFT.at[2] + Math.sin(t * 83 + 2.1) * amp * 0.6,
        );
        lg.pose = flick > 0.5 ? LEFT_CLAMP : LEFT.pose;
      }
    },
  });
  return model;
}
