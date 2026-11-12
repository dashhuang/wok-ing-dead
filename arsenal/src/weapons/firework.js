// 满堂红 · shoulder-held firework battery.
// Gun space: +Z towards the tube mouths, +Y up, +X shooter's left. Origin at the igniter trigger under the
// bamboo spine. Layout: a bamboo pole (the shoulder rest) runs fore-aft under the payload, a bamboo grip
// hangs from it behind the trigger, and a cigarette lighter lashed to the right of the pole is the igniter.
// Base: six red paper tubes in two rows of three. 甲: a 19-tube honeycomb cake in two brass hex bands.
// 乙: one fat mortar on a wooden cradle.
const PY = 0.022; // bamboo spine axis height
const PR = 0.017; // bamboo spine radius
const TR = 0.0225; // base tube radius
const TIN = 0.0155; // base tube bore radius
const TZ0 = 0.07; // base tube tails
const TZ1 = 0.55; // base tube mouths
const COLS = [0.046, 0, -0.046];
const ROWS = [0.0625, 0.1085];
const FUSE = [-0.03, 0.031, 0.056]; // where the fuses meet in front of the lighter's flame port
const LX = -0.03; // lighter centre
const LY = 0.022;

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
    sphere,
    screw,
    only,
    label,
    adopt,
  } = kit;
  const THREE = kit.THREE;
  const PI = Math.PI;
  const TAU = PI * 2;

  // deterministic noise so the sheet renders the same every time
  let seed = 7;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;

  // ------------------------------------------------------------------ helpers
  // outer hull of a set of circles [[x, y, r]...] in the XY plane, sampled by direction
  const hull = (circles, pad = 0, n = 96) => {
    const pts = [];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU,
        dx = Math.cos(a),
        dy = Math.sin(a);
      let best = -1e9,
        bp = null;
      for (const [cx, cy, r] of circles) {
        const s = cx * dx + cy * dy + r + pad;
        if (s > best) {
          best = s;
          bp = [cx + dx * (r + pad), cy + dy * (r + pad)];
        }
      }
      pts.push(bp);
    }
    return pts;
  };
  // a few tight turns of rope around a hull, with a knot and two short tails on top
  const lash = (
    m,
    circles,
    z,
    {
      turns = 3,
      r = 0.0026,
      mat = "rope_hemp",
      knot = true,
      pitch = 0.0052,
    } = {},
  ) => {
    const pts = hull(circles, r * 0.9, 72);
    for (let k = 0; k < turns; k++) {
      const zz = z + (k - (turns - 1) / 2) * pitch;
      const wob = (k * 1.7) % 1;
      m.add(
        sweep(
          pts.map((p, i) => [
            p[0],
            p[1],
            zz + Math.sin(i * 0.5 + wob * 6) * 0.0004,
          ]),
          r,
          { closed: true, seg: 5, steps: 64 },
        ),
        mat,
      );
    }
    if (knot) {
      // knot at the top of the hull
      let top = pts[0];
      for (const p of pts) if (p[1] > top[1]) top = p;
      m.add(
        sphere(r * 2.1, { seg: 8, rings: 6, squash: [1.3, 0.8, 1.1] }),
        mat,
        { at: [top[0] + 0.004, top[1] + r * 0.6, z] },
      );
      m.add(
        sphere(r * 1.7, { seg: 8, rings: 6, squash: [1.1, 0.8, 1.3] }),
        mat,
        { at: [top[0] - 0.003, top[1] + r * 0.5, z + 0.003] },
      );
      for (const [dx, dz, len] of [
        [0.006, 0.004, 0.03],
        [0.001, -0.006, 0.022],
      ]) {
        m.add(
          sweep(
            [
              [top[0] + dx * 0.5, top[1] + r, z + dz * 0.3],
              [top[0] + dx, top[1] + r * 1.6, z + dz],
              [top[0] + dx * 1.6, top[1] + r * 0.8, z + dz * 1.6 - len * 0.5],
              [top[0] + dx * 2.2, top[1] - 0.002, z + dz * 2 - len],
            ],
            r * 0.8,
            { seg: 5, steps: 12 },
          ),
          mat,
        );
      }
    }
  };
  // a pair of iron wires twisted together and wound once round a hull, with a pigtail
  const wire = (m, circles, z, twists = 26) => {
    const base = hull(circles, 0.0012, 96);
    const n = 180;
    const P = [];
    for (let i = 0; i < n; i++) {
      const f = (i / n) * base.length;
      const a = base[Math.floor(f) % base.length],
        b = base[(Math.floor(f) + 1) % base.length];
      const t = f - Math.floor(f);
      P.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]);
    }
    for (const ph of [0, PI]) {
      const path = [];
      for (let i = 0; i < n; i++) {
        const p = P[i];
        const q = P[(i + 1) % n],
          o = P[(i + n - 1) % n];
        let nx = q[1] - o[1],
          ny = -(q[0] - o[0]);
        const l = Math.hypot(nx, ny) || 1;
        nx /= l;
        ny /= l;
        const phi = (i / n) * twists * TAU + ph;
        const a = 0.00085;
        path.push([
          p[0] + nx * Math.cos(phi) * a,
          p[1] + ny * Math.cos(phi) * a,
          z + Math.sin(phi) * a,
        ]);
      }
      m.add(
        sweep(path, 0.00075, { closed: true, seg: 3, steps: n }),
        "iron_rust",
        { wear: 0.4 },
      );
    }
    // pigtail: the twisted ends sticking out where the wire was tightened (rightmost point)
    let side = P[0];
    for (const p of P) if (p[0] < side[0]) side = p;
    m.add(
      helix(0.0008, 0.00075, 0, 0.014, 3, { seg: 3, perTurn: 6 }),
      "iron_rust",
      {
        rot: [0, -PI / 2 - 0.3, 0],
        at: [side[0], side[1] + 0.006, z],
        wear: 0.4,
      },
    );
    m.add(
      helix(0.0008, 0.00075, 0, 0.014, 3, { seg: 3, perTurn: 6, phase: PI }),
      "iron_rust",
      {
        rot: [0, -PI / 2 - 0.3, 0],
        at: [side[0], side[1] + 0.006, z],
        wear: 0.4,
      },
    );
  };
  // open cylinder along Z for canvas-printed paper; the texture's u range can be squeezed into a column
  const paperCyl = (r, z0, z1, { seg = 32, u0 = 0, u1 = 1, spin = 0 } = {}) => {
    const g = new THREE.CylinderGeometry(r, r, z1 - z0, seg, 1, true);
    g.rotateX(PI / 2);
    g.translate(0, 0, (z0 + z1) / 2);
    if (spin) g.rotateZ(spin);
    const uv = g.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setX(i, u0 + uv.getX(i) * (u1 - u0));
    return adopt(g);
  };
  const paperMat = (key, W, H, draw, rough = 0.78) => {
    const map = kit.canvas(key, W, H, draw);
    map.anisotropy = 8;
    const m = new THREE.MeshStandardMaterial({
      map,
      roughness: rough,
      metalness: 0,
    });
    m.name = key;
    return m;
  };
  // canvas helpers: draw in a logical frame whose +x runs along the tube (muzzle -> tail on the left, tail -> muzzle on the right)
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
  // column centred at canvas u (0..1) drawn in the logical frame of one side
  const column = (g, W, H, u, half, side, fn) => {
    g.save();
    g.beginPath();
    g.rect(W * (u - half), 0, W * half * 2, H);
    g.clip();
    g.translate(W * (u - 0.5), 0);
    side(g, W, H, fn);
    g.restore();
  };
  const speckle = (g, W, H, n, a = 0.08) => {
    for (let i = 0; i < n; i++) {
      g.fillStyle =
        rnd() < 0.5
          ? `rgba(0,0,0,${a * rnd()})`
          : `rgba(255,220,180,${a * 0.6 * rnd()})`;
      g.fillRect(rnd() * W, rnd() * H, 1 + rnd() * 3, 1 + rnd() * 3);
    }
  };
  // 回纹 key fret running along canvas X between y0 and y0 + h
  const fret = (g, x0, y0, w, h, col) => {
    g.strokeStyle = col;
    g.fillStyle = col;
    const lw = Math.max(1.5, h * 0.07);
    g.lineWidth = lw;
    g.fillRect(x0, y0, w, lw * 1.2);
    g.fillRect(x0, y0 + h - lw * 1.2, w, lw * 1.2);
    const s = h * 0.72;
    const n = Math.max(1, Math.round(w / s));
    const step = w / n;
    const yy = y0 + (h - s) / 2;
    for (let i = 0; i < n; i++) {
      const x = x0 + i * step + (step - s) / 2;
      const P = [
        [0.05, 0.95],
        [0.05, 0.05],
        [0.95, 0.05],
        [0.95, 0.8],
        [0.3, 0.8],
        [0.3, 0.3],
        [0.72, 0.3],
        [0.72, 0.58],
        [0.5, 0.58],
      ];
      g.beginPath();
      P.forEach(([u, v], k) =>
        k ? g.lineTo(x + u * s, yy + v * s) : g.moveTo(x + u * s, yy + v * s),
      );
      g.stroke();
    }
  };
  const GOLD = "#e8bf52";
  const GOLD_D = "#b88a2c";

  // ------------------------------------------------------------------ bamboo spine (shoulder rest) + grip (fixed)
  const bb = M();
  // spine: closed node at the back, open cut at the front
  bb.add(rod(PR, -0.075, 0.33, { seg: 24, r: 0.004 }), "bamboo", {
    at: [0, PY, 0],
  });
  bb.add(
    tube(PR + 0.0002, PR - 0.0032, 0.329, 0.334, { seg: 24, r: 0.0008 }),
    "bamboo",
    { at: [0, PY, 0] },
  );
  bb.add(rod(PR - 0.0032, 0.31, 0.333, { seg: 16 }), "bore", {
    at: [0, PY, 0],
  });
  for (const z of [-0.035, 0.1, 0.235]) {
    // nodes: a raised double ring
    bb.add(
      lathe(
        [
          [z - 0.004, PR - 0.0004],
          [z - 0.0015, PR + 0.0016, 0.001],
          [z + 0.0015, PR + 0.0013, 0.001],
          [z + 0.004, PR - 0.0004],
        ],
        { seg: 24 },
      ),
      "bamboo",
      { at: [0, PY, 0], color: 0xd8c89a },
    );
  }
  // grip: shorter, thinner culm hanging down and back from the spine
  const GRIP_ROT = [PI - 1.33, 0, 0];
  const GRIP_AT = [0, PY - 0.004, -0.028];
  bb.add(rod(0.0148, -0.012, 0.125, { seg: 20, r: 0.004 }), "bamboo", {
    rot: GRIP_ROT,
    at: GRIP_AT,
  });
  bb.add(
    lathe(
      [
        [0.04, 0.0144],
        [0.0425, 0.0164, 0.001],
        [0.0455, 0.0162, 0.001],
        [0.048, 0.0144],
      ],
      { seg: 20 },
    ),
    "bamboo",
    { rot: GRIP_ROT, at: GRIP_AT, color: 0xd8c89a },
  );
  // rope wound round the lower grip for purchase
  bb.add(
    helix(0.0158, 0.0017, 0.052, 0.112, 9.5, { seg: 5, perTurn: 12 }),
    "rope_hemp",
    { rot: GRIP_ROT, at: GRIP_AT },
  );
  // cloth pad round the back of the spine where it sits against the body
  bb.add(rod(PR + 0.004, -0.074, -0.04, { seg: 24, r: 0.003 }), "cloth_red", {
    at: [0, PY, 0],
  });
  bb.add(
    helix(PR + 0.0045, 0.0015, -0.072, -0.042, 6, { seg: 5, perTurn: 12 }),
    "rope_hemp",
    { at: [0, PY, 0], wear: 0.3 },
  );
  // grip joint: rope lashed crosswise over the spine
  for (const s of [1, -1]) {
    bb.add(
      sweep(
        [
          [0.0155 * s, PY - 0.012, -0.045],
          [0.019 * s, PY + 0.004, -0.032],
          [0.012 * s, PY + 0.017, -0.022],
          [-0.012 * s, PY + 0.017, -0.006],
          [-0.019 * s, PY + 0.004, 0.004],
          [-0.0155 * s, PY - 0.012, -0.002],
        ],
        0.0022,
        { seg: 6, steps: 40 },
      ),
      "rope_hemp",
    );
  }
  // iron trigger guard: a bent strap from under the spine round to the grip
  bb.add(
    sweep(
      [
        [0, PY - 0.016, 0.03],
        [0, -0.012, 0.03],
        [0, -0.034, 0.018],
        [0, -0.04, 0.0],
        [0, -0.038, -0.018],
        [0, -0.032, -0.03],
      ],
      0.0022,
      { seg: 8, steps: 40 },
    ),
    "iron_rust",
    { scale: [2.0, 1, 1], wear: 0.4 },
  );
  bb.add(box(0.012, 0.004, 0.014, { bevel: 0.001 }), "iron_rust", {
    at: [0, PY - 0.0165, 0.03],
    wear: 0.3,
  });
  bb.add(screw(0.0022, { axis: "-y", h: 0.0012 }), "steel_bare", {
    at: [0, PY - 0.0188, 0.03],
    wear: 0.3,
  });
  // trigger pivot block
  bb.add(box(0.012, 0.007, 0.012, { bevel: 0.0012 }), "iron_rust", {
    at: [0, PY - 0.019, 0.004],
    wear: 0.3,
  });
  bb.add(rod(0.0018, -0.0075, 0.0075, { seg: 8 }), "steel_bare", {
    rot: [0, PI / 2, 0],
    at: [0, PY - 0.021, 0.004],
    wear: 0.3,
  });
  const spine = bb.build("spine");

  // ------------------------------------------------------------------ igniter: lighter lashed to the right of the spine (fixed body)
  const LZ0 = -0.034,
    LZ1 = 0.036; // body, then the steel hood to LZ1 + 0.012
  const lighterRed = kit.mats.variant(
    "polymer",
    { color: 0xc23a16, rough: 0.28, edge: 0xf08a5a, edgeAmt: 0.25, dirt: 0.5 },
    "fw-lighter",
  );
  const lg = M();
  lg.add(
    box(0.0122, 0.025, LZ1 - LZ0, { bevel: 0.003, bevelSeg: 3, r: 0.004 }),
    lighterRed,
    { at: [LX, LY, (LZ0 + LZ1) / 2] },
  );
  // fuel window: darker strip, and the lighter's base cap
  lg.add(box(0.0126, 0.016, 0.03, { bevel: 0.0015, r: 0.003 }), lighterRed, {
    at: [LX, LY, -0.008],
    color: 0x6a3a34,
  });
  // steel hood: two ears carrying the wheel axle and a perforated windscreen round the burner
  const HZ = LZ1;
  for (const y of [-0.0105, 0.0105]) {
    lg.add(
      box(0.0105, 0.0016, 0.012, { bevel: 0.0005, r: 0.002 }),
      "steel_bare",
      { at: [LX, LY + y, HZ + 0.006], wear: 0.3 },
    );
  }
  lg.add(
    prism(
      [
        [-0.006, 0, 0.001],
        [0.006, 0, 0.001],
        [0.006, 0.0085, 0.003],
        [-0.006, 0.0085, 0.003],
      ],
      0.019,
      {
        plane: "top",
        bevel: 0.0004,
        holes: [
          [
            [-0.0052, 0.0006, 0.002],
            [0.0052, 0.0006, 0.002],
            [0.0052, 0.0079, 0.002],
            [-0.0052, 0.0079, 0.002],
          ],
        ],
      },
    ),
    "steel_bare",
    { at: [LX + 0.0003, LY, HZ + 0.0035], scale: [1, 1, 1], wear: 0.3 },
  );
  for (let i = 0; i < 4; i++)
    lg.add(box(0.0014, 0.0016, 0.0012, { bevel: 0.0002 }), "bore", {
      at: [LX + 0.0061, LY - 0.006 + i * 0.004, HZ + 0.008],
    });
  // burner nozzle (the flame port)
  lg.add(rod(0.0018, HZ, HZ + 0.009, { seg: 12, r: 0.0004 }), "brass", {
    at: [LX + 0.002, LY, 0],
    wear: 0.3,
  });
  lg.add(rod(0.0009, HZ + 0.008, HZ + 0.0095, { seg: 10 }), "bore", {
    at: [LX + 0.002, LY, 0],
  });
  // flint tube beside the wheel
  lg.add(rod(0.0022, HZ - 0.004, HZ + 0.004, { seg: 10 }), "steel_bare", {
    at: [LX - 0.0035, LY, 0],
    wear: 0.3,
  });
  // tape bands binding the lighter to the spine
  for (const z of [-0.022, 0.016]) {
    const outer = hull(
      [
        [0, PY, PR],
        [LX - 0.0005, LY + 0.008, 0.0065],
        [LX - 0.0005, LY - 0.008, 0.0065],
      ],
      0.0011,
      28,
    );
    const inner = hull(
      [
        [0, PY, PR],
        [LX - 0.0005, LY + 0.008, 0.0065],
        [LX - 0.0005, LY - 0.008, 0.0065],
      ],
      0.0001,
      28,
    );
    lg.add(
      prism(outer, 0.011, { plane: "front", bevel: 0.0005, holes: [inner] }),
      "tape_black",
      { at: [0, 0, z], rot: [0, 0, 0], wear: 0.3 },
    );
  }
  const lighter = lg.build("lighter");
  lighter.add(
    label({
      key: "fw-lighter-sticker",
      w: 0.026,
      h: 0.017,
      px: 256,
      face: "-x",
      at: [LX - 0.0064, LY, 0.006],
      rough: 0.5,
      draw(g, W, H) {
        g.fillStyle = "#efe4c8";
        g.fillRect(0, 0, W, H);
        g.fillStyle = "#c01c14";
        g.fillRect(4, 4, W - 8, H - 8);
        g.strokeStyle = GOLD;
        g.lineWidth = 3;
        g.strokeRect(10, 10, W - 20, H - 20);
        g.fillStyle = "#ffe08a";
        g.font = `900 ${H * 0.5}px ${kit.FONT_KAI}`;
        g.textAlign = "center";
        g.textBaseline = "middle";
        g.fillText("大前門", W / 2, H * 0.44);
        g.font = `700 ${H * 0.14}px ${kit.FONT_MONO}`;
        g.fillText("SAFETY LIGHTER", W / 2, H * 0.8);
        speckle(g, W, H, 160, 0.2);
      },
    }),
  );

  // spark wheel (turns with the trigger)
  const wh = M();
  wh.add(rod(0.0042, -0.0085, 0.0085, { seg: 16, r: 0.0004 }), "steel_park", {
    rot: [PI / 2, 0, 0],
    wear: 0.4,
  });
  wh.add(rod(0.0045, -0.0075, 0.0075, { seg: 18, flat: true }), "steel_bare", {
    rot: [PI / 2, 0, 0],
    wear: 0.6,
  });
  wh.add(rod(0.0012, -0.0115, 0.0115, { seg: 8 }), "steel_bare", {
    rot: [PI / 2, 0, 0],
    wear: 0.3,
  });
  const wheel = wh.build("spark-wheel");
  wheel.position.set(LX - 0.0035, LY, HZ + 0.0085);

  // gas fork under the wheel (dips with the trigger)
  const fk = M();
  fk.add(
    prism(
      [
        [-0.008, -0.001, 0.001],
        [0.0, -0.001, 0.001],
        [0.002, 0.003, 0.002],
        [-0.008, 0.003, 0.001],
      ],
      0.013,
      { bevel: 0.0006 },
    ),
    "polymer",
    { rot: [0, 0, PI / 2], wear: 0.3 },
  );
  const fork = fk.build("gas-fork");
  fork.position.set(LX - 0.003, LY, HZ + 0.001);

  // flame at the port while the trigger is held
  const flameMat = kit.mats.glow(0xff7a22, 3.5).clone();
  flameMat.name = "fw-flame";
  flameMat.userData.glow = 3.5;
  kit.mats.glowMats.push(flameMat);
  const fl = M();
  fl.add(
    lathe(
      [
        [0, 0],
        [0, 0.0018],
        [0.004, 0.0026, 0.002],
        [0.012, 0.0008, 0.002],
        [0.015, 0],
      ],
      { seg: 12 },
    ),
    flameMat,
  );
  const flame = fl.build("flame");
  flame.position.set(LX + 0.002, LY, HZ + 0.0095);

  // trigger: bent iron finger lever on the pivot block, linked to the lighter fork by a wire
  const tg = M();
  tg.add(
    prism(
      [
        [0.004, 0.003, 0.001],
        [-0.004, 0.003, 0.001],
        [-0.003, -0.012, 0.006],
        [0.002, -0.028, 0.004],
        [-0.002, -0.03, 0.002],
        [-0.0075, -0.012, 0.008],
      ],
      0.0065,
      { bevel: 0.0013, bevelSeg: 2 },
    ),
    "iron_rust",
    { wear: 0.4 },
  );
  tg.add(
    sweep(
      [
        [0, 0.002, 0.003],
        [-0.008, 0.008, 0.012],
        [-0.02, 0.009, 0.028],
        [LX + 0.006, LY - PY + 0.019, 0.04],
      ],
      0.0007,
      { seg: 5, steps: 20 },
    ),
    "steel_bare",
    { wear: 0.4 },
  );
  const trigger = tg.build("trigger");
  trigger.position.set(0, PY - 0.021, 0.004);

  // ------------------------------------------------------------------ base: six paper tubes
  const tubesAt = [];
  for (const y of ROWS) for (const x of COLS) tubesAt.push([x, y]);
  // tail plugs are rammed clay: matte, no glaze (glazed ceramic flared white at grazing angles)
  const clay = kit.mats.variant(
    "ceramic",
    {
      color: 0x8a7860,
      rough: 0.88,
      coat: 0,
      edge: 0xa89878,
      edgeAmt: 0.4,
      edgeRough: 0.9,
    },
    "fw-clay",
  );
  const T = M();
  const wrapBase = paperMat("fw-tube-wrap", 512, 1792, (g, W, H) => {
    // red ground, a touch of blotchiness
    g.fillStyle = "#b0170f";
    g.fillRect(0, 0, W, H);
    for (let i = 0; i < 40; i++) {
      g.fillStyle = `rgba(${rnd() < 0.5 ? "90,0,0" : "220,60,30"},${0.04 + rnd() * 0.05})`;
      g.fillRect(0, rnd() * H, W, 10 + rnd() * 70);
    }
    // gold fret bands at the mouth, the waist and the tail
    fret(g, 0, 26, W, 64, GOLD);
    fret(g, 0, H - 92, W, 64, GOLD);
    g.fillStyle = GOLD;
    g.fillRect(0, 100, W, 5);
    g.fillRect(0, H - 105, W, 5);
    // big characters on both sides
    for (const [u, side] of [
      [0.25, onLeft],
      [0.75, onRight],
    ]) {
      column(g, W, H, u, 0.24, side, (g, w, h) => {
        g.textAlign = "center";
        g.textBaseline = "middle";
        const sz = h * 0.36;
        const x0 = side === onLeft ? w * 0.22 : w * 0.78;
        const dir = side === onLeft ? 1 : -1;
        // gold lozenge seal behind 福
        g.save();
        g.translate(side === onLeft ? w * 0.08 : w * 0.92, h / 2);
        g.rotate(PI / 4);
        g.fillStyle = GOLD;
        g.fillRect(-h * 0.13, -h * 0.13, h * 0.26, h * 0.26);
        g.restore();
        g.fillStyle = "#a8140c";
        g.font = `900 ${h * 0.2}px ${kit.FONT_KAI}`;
        g.fillText("福", side === onLeft ? w * 0.08 : w * 0.92, h / 2 + 2);
        // the name, with a dark offset to pop it off the red
        const chars = [..."滿堂紅"];
        g.font = `900 ${sz}px ${kit.FONT_KAI}`;
        chars.forEach((c, i) => {
          const x = w / 2 + (i - 1) * sz * 1.18 * (side === onLeft ? 1 : 1);
          g.fillStyle = "rgba(60,0,0,0.55)";
          g.fillText(c, x + 3, h / 2 + 4);
          g.fillStyle = GOLD;
          g.fillText(c, x, h / 2);
        });
        // small print towards the tail
        g.font = `700 ${h * 0.065}px ${kit.FONT_SONG}`;
        g.fillStyle = "#f3d27a";
        const xs = side === onLeft ? w * 0.82 : w * 0.18;
        g.fillText("高空禮花 · 十響", xs, h * 0.36);
        g.fillText("點燃引線 速離五米", xs, h * 0.5);
        g.fillText("金龍爆竹廠 監製", xs, h * 0.64);
        void x0;
        void dir;
      });
    }
    // top/bottom: a thin warning strip and batch number
    for (const u of [0, 0.5, 1]) {
      column(g, W, H, u, 0.08, onLeft, (g, w, h) => {
        g.fillStyle = "#f0d070";
        g.fillRect(w * 0.08, h / 2 - h * 0.04, w * 0.84, h * 0.08);
        g.fillStyle = "#8a0c08";
        g.font = `700 ${h * 0.055}px ${kit.FONT_HEI}`;
        g.textAlign = "center";
        g.textBaseline = "middle";
        g.fillText("注意安全　嚴禁對人燃放　批號 2627-08", w / 2, h / 2 + 1);
      });
    }
    // creases and rubbing where the bindings sit
    for (let i = 0; i < 26; i++) {
      g.strokeStyle = `rgba(40,0,0,${0.08 + rnd() * 0.12})`;
      g.lineWidth = 1 + rnd() * 2;
      const y = rnd() * H;
      g.beginPath();
      g.moveTo(0, y);
      g.lineTo(W, y + (rnd() - 0.5) * 30);
      g.stroke();
    }
    speckle(g, W, H, 2200, 0.12);
  });
  tubesAt.forEach(([x, y], i) => {
    // cardboard body (outside + both end faces), dark bore wall and floor, clay plug at the tail
    T.add(
      lathe(
        [
          [TZ0, TIN],
          [TZ0, TR - 0.0005, 0.0006],
          [TZ1, TR - 0.0005, 0.0006],
          [TZ1, TIN, 0.0004],
        ],
        { seg: 26 },
      ),
      "paper_kraft",
      { at: [x, y, 0] },
    );
    T.add(
      lathe(
        [
          [TZ1, TIN],
          [TZ1 - 0.09, TIN],
          [TZ1 - 0.09, 0],
        ],
        { seg: 20 },
      ),
      "bore",
      { at: [x, y, 0] },
    );
    // rolled-paper ring on the mouth face
    T.add(
      tube(TR - 0.004, TR - 0.0048, TZ1, TZ1 + 0.0004, { seg: 26, r: 0 }),
      "paper_kraft",
      { at: [x, y, 0], color: 0x6a4c2e },
    );
    T.add(
      lathe(
        [
          [TZ0 + 0.004, 0],
          [TZ0 + 0.004, TIN],
          [TZ0 - 0.0012, TIN, 0],
          [TZ0 - 0.0012, 0.0016],
          [TZ0 + 0.002, 0.0016],
          [TZ0 + 0.002, 0],
        ].reverse(),
        { seg: 16 },
      ),
      clay,
      { at: [x, y, 0], color: 0x6a5a48, wear: 0.4 },
    );
    // printed paper wrapper (rotated so the side print faces out of the bundle)
    T.add(
      paperCyl(TR, TZ0 + 0.0015, TZ1 - 0.0008, {
        seg: 32,
        spin: ((i * 0.4) % 0.5) - 0.25,
      }),
      wrapBase,
      { at: [x, y, 0] },
    );
  });
  // bindings: two hemp lashings round the bundle and the spine, three twisted iron wires round the bundle
  const bundle = tubesAt.map(([x, y]) => [x, y, TR]);
  lash(T, [...bundle, [0, PY, PR]], 0.155);
  lash(T, [...bundle, [0, PY, PR]], 0.3);
  wire(T, bundle, 0.095);
  wire(T, bundle, 0.525);
  // fuses: green visco cord out of each plug, gathered under a paper twist in front of the lighter
  const visco = kit.mats.variant(
    "cord_red",
    { color: 0x3c5a26, edge: 0x8aa860 },
    "fw-visco",
  );
  tubesAt.forEach(([x, y], i) => {
    const k = (i % 3) - 1;
    T.add(
      sweep(
        [
          [x, y, TZ0 - 0.001],
          [x - 0.002, y - 0.004, TZ0 - 0.012],
          [x * 0.6 - 0.008, (y + FUSE[1]) / 2 + 0.008, TZ0 - 0.022 + k * 0.002],
          [
            FUSE[0] + 0.006 + k * 0.002,
            FUSE[1] + 0.006 + (y > 0.08 ? 0.002 : 0),
            FUSE[2] + 0.006,
          ],
          [FUSE[0] + k * 0.0012, FUSE[1] + 0.0014, FUSE[2] - 0.002],
        ],
        0.0011,
        { seg: 5, steps: 40 },
      ),
      visco,
      { wear: 0.2 },
    );
  });
  // paper twist gathering the fuses, frayed tip just over the flame port
  T.add(rod(0.0032, -0.007, 0.007, { seg: 10, r: 0.002 }), "paper_kraft", {
    rot: [0.6, 0, 0],
    at: [FUSE[0] + 0.001, FUSE[1] + 0.004, FUSE[2] + 0.002],
    wear: 0.3,
  });
  const tubesBase = only(T.build("tubes-base"), "base");

  // soot on the mouths of spent tubes (shown one by one as the battery empties)
  const soot = tubesAt.map(([x, y], i) => {
    const s = M();
    s.add(
      lathe(
        [
          [TZ1 - 0.014, TR + 0.0003],
          [TZ1 + 0.0009, TR + 0.0003],
          [TZ1 + 0.0009, TIN - 0.0002],
        ],
        { seg: 24 },
      ),
      "bore",
      { at: [x, y, 0] },
    );
    s.add(
      lathe(
        [
          [TZ1 + 0.0009, TIN - 0.0002],
          [TZ1 - 0.0005, TIN - 0.0002],
        ],
        { seg: 24 },
      ),
      "bore",
      { at: [x, y, 0] },
    );
    const n = s.build(`soot-${i}`);
    n.visible = false;
    return n;
  });
  const sootGroup = only(new THREE.Group(), "base");
  sootGroup.add(...soot);

  // ------------------------------------------------------------------ branch 甲 万花筒: 19-tube honeycomb cake in two brass hex bands
  const CR = 0.0172,
    CD = 0.0362; // tube radius and pitch
  const CY = 0.1255,
    CZ0 = 0.14,
    CZ1 = 0.44;
  const cake = [[0, 0]];
  for (let ring = 1; ring <= 2; ring++) {
    for (let side = 0; side < 6; side++) {
      const a0 = (side / 6) * TAU,
        a1 = ((side + 1) / 6) * TAU;
      for (let k = 0; k < ring; k++) {
        const t = k / ring;
        const x = ring * CD * (Math.cos(a0) * (1 - t) + Math.cos(a1) * t);
        const y = ring * CD * (Math.sin(a0) * (1 - t) + Math.sin(a1) * t);
        cake.push([x, y]);
      }
    }
  }
  const A = M();
  const wrapCake = paperMat("fw-cake-wrap", 1024, 768, (g, W, H) => {
    const sets = [
      ["#b3150e", GOLD, "#f6d47a"],
      ["#d8a628", "#a8140c", "#7a0a06"],
      ["#1e6a3a", GOLD, "#f0d070"],
      ["#5a2478", GOLD, "#f0c0f0"],
    ];
    sets.forEach(([ground, ink, ink2], k) => {
      const x0 = (k * W) / 4,
        w = W / 4;
      g.fillStyle = ground;
      g.fillRect(x0, 0, w, H);
      // spiral stripes like a rolled candy wrapper
      g.save();
      g.beginPath();
      g.rect(x0, 0, w, H);
      g.clip();
      g.strokeStyle = ink;
      g.globalAlpha = 0.35;
      g.lineWidth = 9;
      for (let y = -w; y < H + w; y += 46) {
        g.beginPath();
        g.moveTo(x0, y);
        g.lineTo(x0 + w, y + w * 0.6);
        g.stroke();
      }
      g.globalAlpha = 1;
      // stars
      g.fillStyle = ink2;
      for (let i = 0; i < 10; i++) {
        const sx = x0 + rnd() * w,
          sy = 90 + rnd() * (H - 180),
          r = 5 + rnd() * 6;
        g.beginPath();
        for (let j = 0; j < 10; j++) {
          const a = (j / 10) * TAU - PI / 2;
          const rr = j % 2 ? r * 0.42 : r;
          g.lineTo(sx + Math.cos(a) * rr, sy + Math.sin(a) * rr);
        }
        g.fill();
      }
      g.restore();
      // mouth and tail bands
      fret(g, x0, 10, w, 40, ink);
      fret(g, x0, H - 50, w, 40, ink);
      // vertical name
      g.fillStyle = ink;
      g.textAlign = "center";
      g.textBaseline = "middle";
      g.font = `900 ${w * 0.3}px ${kit.FONT_KAI}`;
      [..."萬花"].forEach((c, i) =>
        g.fillText(c, x0 + w * 0.3, H * 0.36 + i * w * 0.34),
      );
      g.font = `700 ${w * 0.12}px ${kit.FONT_SONG}`;
      [..."十九發組合"].forEach((c, i) =>
        g.fillText(c, x0 + w * 0.72, H * 0.3 + i * w * 0.14),
      );
      speckle(g, w, H, 300, 0.1);
    });
  });
  cake.forEach(([x, y], i) => {
    const X = x,
      Y = CY + y;
    A.add(
      lathe(
        [
          [CZ0, CR - 0.0055],
          [CZ0, CR - 0.0005, 0],
          [CZ1, CR - 0.0005, 0],
          [CZ1, CR - 0.0055, 0],
        ],
        { seg: 16 },
      ),
      "paper_kraft",
      { at: [X, Y, 0] },
    );
    A.add(
      lathe(
        [
          [CZ1, CR - 0.0055],
          [CZ1 - 0.06, CR - 0.0055],
          [CZ1 - 0.06, 0],
        ],
        { seg: 12 },
      ),
      "bore",
      { at: [X, Y, 0] },
    );
    A.add(
      lathe(
        [
          [CZ0 + 0.003, CR - 0.0055],
          [CZ0 - 0.001, CR - 0.0055],
          [CZ0 - 0.001, 0],
        ].reverse(),
        { seg: 12 },
      ),
      clay,
      { at: [X, Y, 0], color: 0x6a5a48, wear: 0.3 },
    );
    const k = (i * 7 + (i >> 2)) % 4;
    A.add(
      paperCyl(CR, CZ0 + 0.002, CZ1 - 0.0006, {
        seg: 20,
        u0: k / 4 + 0.002,
        u1: (k + 1) / 4 - 0.002,
        spin: rnd() * TAU,
      }),
      wrapCake,
      { at: [X, Y, 0] },
    );
  });
  // back board (hex) and the main fuse
  const hexPts = (ap, rr = 0.006) => {
    const R = ap / Math.cos(PI / 6);
    const p = [];
    for (let j = 0; j < 6; j++)
      p.push([Math.cos((j / 6) * TAU) * R, Math.sin((j / 6) * TAU) * R, rr]);
    return p;
  };
  // tail fuse: one visco line snaking through every plug so the cake fires in sequence
  {
    const order = [
      0, 1, 7, 8, 9, 2, 10, 11, 3, 12, 13, 4, 14, 15, 5, 16, 17, 6, 18,
    ];
    const pts = [];
    order.forEach((k, j) => {
      const [x, y] = cake[k];
      pts.push([x, CY + y, CZ0 - 0.0025]);
      const n = cake[order[j + 1]];
      if (n)
        pts.push([
          (x + n[0]) / 2,
          CY + (y + n[1]) / 2,
          CZ0 - 0.006 - 0.002 * (j % 2),
        ]);
    });
    A.add(sweep(pts, 0.0012, { seg: 5, steps: 200, tension: 0.2 }), visco, {
      wear: 0.2,
    });
  }
  for (const z of [0.185, 0.395]) {
    // brass hex band, rolled edges and a clasp with two rivets on the right
    A.add(
      prism(hexPts(0.0842, 0.009), 0.026, {
        plane: "front",
        bevel: 0.0009,
        holes: [hexPts(0.0815, 0.007)],
      }),
      "brass_aged",
      { at: [0, CY, z], wear: 0.6 },
    );
    A.add(box(0.004, 0.022, 0.03, { bevel: 0.0012 }), "brass_aged", {
      at: [-0.0848, CY, z],
      wear: 0.5,
    });
    for (const dy of [-0.006, 0.006])
      A.add(
        screw(0.0022, { axis: "-x", slot: false, h: 0.0013 }),
        "brass_aged",
        { at: [-0.0868, CY + dy, z], wear: 0.4 },
      );
    // embossed rib round the band centre
    A.add(
      prism(hexPts(0.0852, 0.009), 0.004, {
        plane: "front",
        bevel: 0.0012,
        holes: [hexPts(0.083, 0.008)],
      }),
      "brass_aged",
      { at: [0, CY, z], wear: 0.6 },
    );
  }
  // the cake rides on the spine: two lashings round the band and the pole
  const cakeHull = [];
  for (let j = 0; j < 6; j++)
    cakeHull.push([
      Math.cos((j / 6) * TAU) * 0.0975,
      CY + Math.sin((j / 6) * TAU) * 0.0975,
      0.002,
    ]);
  lash(A, [...cakeHull, [0, PY, PR]], 0.248, { turns: 3 });
  // wooden wedges between cake and spine
  for (const z of [0.185, 0.31]) {
    A.add(
      prism(
        [
          [-0.03, PY + 0.006, 0.002],
          [0.03, PY + 0.006, 0.002],
          [0.03, CY - 0.0842 - 0.0005, 0.002],
          [-0.03, CY - 0.0842 - 0.0005, 0.002],
        ],
        0.018,
        {
          plane: "front",
          bevel: 0.0015,
          holes: [{ c: [0, PY], r: PR + 0.0003, seg: 24 }],
        },
      ),
      "wood_peach",
      { at: [0, 0, z] },
    );
  }
  // main fuse from the back board down to the lighter
  A.add(
    sweep(
      [
        [cake[13][0], CY + cake[13][1], CZ0 - 0.003],
        [cake[13][0] - 0.004, CY + cake[13][1] - 0.008, CZ0 - 0.016],
        [-0.012, CY - 0.05, CZ0 - 0.04],
        [-0.024, FUSE[1] + 0.02, FUSE[2] + 0.02],
        [FUSE[0], FUSE[1] + 0.004, FUSE[2] + 0.004],
        [FUSE[0], FUSE[1] + 0.0008, FUSE[2] - 0.002],
      ],
      0.0016,
      { seg: 6, steps: 50 },
    ),
    visco,
    { wear: 0.2 },
  );
  const tubesA = only(A.build("cake"), "a");

  // ------------------------------------------------------------------ branch 乙 冲天炮: one fat mortar on a wooden cradle
  const MR = 0.055,
    MIN = 0.047,
    MY = 0.1,
    MZ0 = 0.1,
    MZ1 = 0.555;
  const B = M();
  B.add(
    tube(MR - 0.0006, MIN, MZ0, MZ1 - 0.04, { seg: 48, r: 0.001 }),
    "paper_kraft",
    { at: [0, MY, 0] },
  );
  // inside: dark liner and the round shell waiting at the bottom
  B.add(
    tube(MIN + 0.0001, MIN - 0.0008, MZ1 - 0.22, MZ1 - 0.003, { seg: 32 }),
    "bore",
    { at: [0, MY, 0] },
  );
  B.add(sphere(MIN - 0.002, { seg: 24, rings: 16 }), "paper_kraft", {
    at: [0, MY, MZ1 - 0.2],
    color: 0x6a4a34,
  });
  B.add(rod(MIN, MZ1 - 0.26, MZ1 - 0.2, { seg: 24 }), "bore", {
    at: [0, MY, 0],
  });
  // brass mouth: rolled bead outside and in, three rows of rivets
  B.add(
    lathe(
      [
        [MZ1 - 0.002, MIN - 0.0012],
        [MZ1 - 0.002, MIN - 0.0008],
        [MZ1, MIN - 0.0008, 0.001],
        [MZ1 + 0.0022, MIN + 0.002, 0.0015],
        [MZ1 + 0.0022, MR + 0.0042, 0.002],
        [MZ1 - 0.004, MR + 0.0042, 0.002],
        [MZ1 - 0.006, MR + 0.0022, 0.001],
        [MZ1 - 0.047, MR + 0.0022, 0.001],
        [MZ1 - 0.049, MR + 0.0036, 0.001],
        [MZ1 - 0.054, MR + 0.0036, 0.001],
        [MZ1 - 0.056, MR - 0.0004],
        [MZ1 - 0.056, MIN + 0.002],
      ],
      { seg: 40 },
    ),
    "brass_aged",
    { at: [0, MY, 0], wear: 0.8 },
  );
  B.add(
    tube(MIN - 0.0006, MIN - 0.0014, MZ1 - 0.05, MZ1 - 0.0015, { seg: 40 }),
    "brass_aged",
    { at: [0, MY, 0] },
  );
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * TAU + 0.1;
    for (const z of [MZ1 - 0.013, MZ1 - 0.04]) {
      B.add(
        sphere(0.0021, { seg: 8, rings: 5, squash: [1, 0.55, 1] }),
        "brass_aged",
        {
          rot: [0, 0, a - PI / 2],
          at: [
            Math.cos(a) * (MR + 0.0022),
            MY + Math.sin(a) * (MR + 0.0022),
            z,
          ],
          wear: 0.6,
        },
      );
    }
  }
  // wooden tail plug with an iron ring
  B.add(
    lathe(
      [
        [MZ0 - 0.022, 0],
        [MZ0 - 0.022, MR - 0.012, 0.006],
        [MZ0 - 0.012, MR + 0.002, 0.003],
        [MZ0 + 0.004, MR + 0.002, 0.002],
        [MZ0 + 0.004, MR - 0.004],
      ],
      { seg: 40 },
    ),
    "wood_peach",
    { at: [0, MY, 0], color: 0x6a5040 },
  );
  B.add(
    tube(MR + 0.0032, MR + 0.0004, MZ0 - 0.009, MZ0 + 0.002, {
      seg: 40,
      r: 0.0008,
    }),
    "iron_rust",
    { at: [0, MY, 0], wear: 0.5 },
  );
  // wooden cradle: two saddles on the spine with iron straps over the tube
  for (const z of [0.15, 0.305]) {
    const sad = [
      [-0.05, PY - 0.024, 0.006],
      [0.05, PY - 0.024, 0.006],
      [0.05, MY - 0.03, 0.004],
    ];
    // concave seat following the lower arc of the tube from the right cheek round the bottom to the left
    const xs = Math.sqrt((MR + 0.0006) ** 2 - 0.03 ** 2);
    const b0 = Math.atan2(-0.03, xs),
      b1 = Math.atan2(-0.03, -xs);
    const arc = [];
    for (let j = 0; j <= 18; j++) {
      const t = b0 - (j / 18) * (b0 - b1);
      arc.push([
        Math.cos(t) * (MR + 0.0006),
        MY + Math.sin(t) * (MR + 0.0006),
        0,
      ]);
    }
    sad.push(
      [xs, MY - 0.03, 0.002],
      ...arc.slice(1, -1),
      [-xs, MY - 0.03, 0.002],
      [-0.05, MY - 0.03, 0.004],
    );
    B.add(
      prism(sad, 0.03, {
        plane: "front",
        bevel: 0.002,
        holes: [{ c: [0, PY], r: PR + 0.0003, seg: 20 }],
      }),
      "wood_peach",
      { at: [0, 0, z] },
    );
    // strap round the tube, bolted into both cheeks
    B.add(
      lathe(
        [
          [z - 0.008, MR + 0.0002],
          [z - 0.008, MR + 0.0022, 0.0006],
          [z + 0.008, MR + 0.0022, 0.0006],
          [z + 0.008, MR + 0.0002],
        ],
        { seg: 32, arc: [b0 + 0.03, TAU - (b0 - b1) - 0.06] },
      ),
      "iron_rust",
      { at: [0, MY, 0], wear: 0.5 },
    );
    for (const s of [1, -1]) {
      B.add(box(0.004, 0.016, 0.016, { bevel: 0.0012 }), "iron_rust", {
        at: [s * 0.0515, MY - 0.035, z],
        wear: 0.5,
      });
      B.add(
        screw(0.0028, { axis: s > 0 ? "x" : "-x", hex: true, h: 0.002 }),
        "iron_rust",
        { at: [s * 0.0535, MY - 0.035, z], wear: 0.4 },
      );
    }
  }
  // thick fuse out of the tail plug, sleeved in red paper, to the lighter
  const fusePath = [
    [-0.018, MY - 0.03, MZ0 - 0.022],
    [-0.02, MY - 0.034, MZ0 - 0.034],
    [-0.026, MY - 0.05, MZ0 - 0.045],
    [FUSE[0] + 0.002, FUSE[1] + 0.012, FUSE[2] + 0.008],
    [FUSE[0], FUSE[1] + 0.001, FUSE[2] - 0.002],
  ];
  B.add(sweep(fusePath, 0.0026, { seg: 8, steps: 40 }), visco, { wear: 0.2 });
  lash(
    B,
    [
      [0, MY, MR + 0.0004],
      [0, PY, PR],
    ],
    0.228,
    { turns: 3 },
  );
  const tubesB = only(B.build("mortar"), "b");
  // dragon wrapper
  const dragonMat = paperMat("fw-dragon-wrap", 1024, 1152, (g, W, H) => {
    g.fillStyle = "#ad150d";
    g.fillRect(0, 0, W, H);
    for (let i = 0; i < 30; i++) {
      g.fillStyle = `rgba(${rnd() < 0.5 ? "80,0,0" : "220,60,30"},${0.04 + rnd() * 0.05})`;
      g.fillRect(0, rnd() * H, W, 10 + rnd() * 80);
    }
    fret(g, 0, 16, W, 54, GOLD);
    fret(g, 0, H - 70, W, 54, GOLD);
    // clouds
    const cloud = (x, y, s) => {
      g.strokeStyle = GOLD_D;
      g.lineWidth = s * 0.12;
      g.beginPath();
      g.arc(x, y, s * 0.5, PI * 0.2, PI * 1.9);
      g.stroke();
      g.beginPath();
      g.arc(x + s * 0.2, y + s * 0.05, s * 0.22, PI, TAU * 0.98);
      g.stroke();
      g.beginPath();
      g.arc(x + s * 0.85, y + s * 0.1, s * 0.38, PI * 1.1, PI * 2.6);
      g.stroke();
      g.beginPath();
      g.moveTo(x - s * 0.6, y + s * 0.5);
      g.quadraticCurveTo(x + s * 0.4, y + s * 0.75, x + s * 1.4, y + s * 0.45);
      g.stroke();
    };
    for (let i = 0; i < 14; i++)
      cloud(rnd() * W, 140 + rnd() * (H - 300), 30 + rnd() * 26);
    // dragon: body coils once round the tube, head at the mouth end; drawn three times for a seamless wrap
    const N = 160;
    const C = [];
    for (let i = 0; i <= N; i++) {
      const t = i / N;
      C.push([
        W * (0.08 + 1.0 * t) + W * 0.06 * Math.sin(t * PI * 4),
        H * (0.2 + 0.66 * t) + H * 0.05 * Math.sin(t * PI * 7),
        112 * (1 - t * 0.86) + 8,
      ]);
    }
    const DGOLD = "#f2ae36";
    const drawDragon = (ox) => {
      g.save();
      g.translate(ox, 0);
      // body outline: offset both sides of the spine
      const L = [],
        R = [];
      for (let i = 0; i < C.length; i++) {
        const a = C[Math.max(0, i - 1)],
          b = C[Math.min(C.length - 1, i + 1)];
        let nx = -(b[1] - a[1]),
          ny = b[0] - a[0];
        const l = Math.hypot(nx, ny) || 1;
        nx /= l;
        ny /= l;
        const w = C[i][2] * 0.5;
        L.push([C[i][0] + nx * w, C[i][1] + ny * w, nx, ny]);
        R.push([C[i][0] - nx * w, C[i][1] - ny * w]);
      }
      // dorsal fins
      g.fillStyle = "#d29a34";
      for (let i = 4; i < C.length - 6; i += 5) {
        const [x, y, nx, ny] = L[i];
        const s = C[i][2] * 0.35;
        g.beginPath();
        g.moveTo(x - ny * s * 0.5, y + nx * s * 0.5);
        g.lineTo(
          x + nx * s * 1.2 + ny * s * 0.4,
          y + ny * s * 1.2 - nx * s * 0.4,
        );
        g.lineTo(x + ny * s * 0.5, y - nx * s * 0.5);
        g.fill();
      }
      g.beginPath();
      L.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
      for (let i = R.length - 1; i >= 0; i--) g.lineTo(R[i][0], R[i][1]);
      g.closePath();
      g.fillStyle = DGOLD;
      g.fill();
      g.strokeStyle = "#5a0a04";
      g.lineWidth = 3;
      g.stroke();
      // belly plates along one side
      g.strokeStyle = "#a87420";
      g.lineWidth = 2;
      for (let i = 2; i < C.length - 2; i += 2) {
        const w = C[i][2] * 0.5;
        const [x, y] = R[i];
        const [nx, ny] = [L[i][2], L[i][3]];
        g.beginPath();
        g.moveTo(x, y);
        g.lineTo(x + nx * w * 0.6, y + ny * w * 0.6);
        g.stroke();
      }
      // scales
      g.strokeStyle = "#8a5a14";
      g.lineWidth = 1.8;
      for (let i = 3; i < C.length - 3; i += 2) {
        const w = C[i][2] * 0.5;
        for (const f of [0.15, 0.55]) {
          const x = C[i][0] + L[i][2] * w * f,
            y = C[i][1] + L[i][3] * w * f;
          g.beginPath();
          g.arc(
            x,
            y,
            w * 0.28,
            Math.atan2(L[i][3], L[i][2]) + PI * 0.5,
            Math.atan2(L[i][3], L[i][2]) + PI * 1.5,
          );
          g.stroke();
        }
      }
      // legs with three claws
      for (const i of [26, 62, 98, 130]) {
        const [x, y, nx, ny] =
          i % 2 ? [...L[i]] : [R[i][0], R[i][1], -L[i][2], -L[i][3]];
        const s = C[i][2];
        g.strokeStyle = DGOLD;
        g.lineWidth = s * 0.28;
        g.lineCap = "round";
        g.beginPath();
        g.moveTo(x, y);
        g.quadraticCurveTo(
          x + nx * s * 0.8 - ny * s * 0.5,
          y + ny * s * 0.8 + nx * s * 0.5,
          x + nx * s * 1.1,
          y + ny * s * 1.1,
        );
        g.stroke();
        g.lineWidth = s * 0.1;
        for (const sp of [-0.5, 0, 0.5]) {
          g.beginPath();
          g.moveTo(x + nx * s * 1.1, y + ny * s * 1.1);
          g.lineTo(
            x + nx * s * 1.45 + ny * s * sp * 0.6,
            y + ny * s * 1.45 - nx * s * sp * 0.6,
          );
          g.stroke();
        }
      }
      // head at the front of the body
      const [hx, hy] = C[0];
      g.save();
      g.translate(hx, hy);
      g.rotate(Math.atan2(C[0][1] - C[4][1], C[0][0] - C[4][0]));
      g.scale(1.9, 1.9);
      g.fillStyle = DGOLD;
      g.strokeStyle = "#5a0a04";
      g.lineWidth = 3;
      g.beginPath();
      g.moveTo(-20, -34);
      g.quadraticCurveTo(30, -46, 62, -16);
      g.lineTo(86, -10);
      g.quadraticCurveTo(92, 4, 80, 10);
      g.lineTo(58, 12);
      g.quadraticCurveTo(70, 22, 60, 30);
      g.quadraticCurveTo(20, 40, -20, 30);
      g.closePath();
      g.fill();
      g.stroke();
      // horns, mane, eye, whiskers
      g.strokeStyle = "#d29a34";
      g.lineWidth = 7;
      g.lineCap = "round";
      g.beginPath();
      g.moveTo(10, -36);
      g.quadraticCurveTo(-10, -70, -44, -76);
      g.moveTo(26, -38);
      g.quadraticCurveTo(14, -66, -14, -82);
      g.stroke();
      g.strokeStyle = DGOLD;
      g.lineWidth = 3;
      g.beginPath();
      g.moveTo(84, 0);
      g.bezierCurveTo(110, -20, 120, 20, 150, -6);
      g.moveTo(80, 8);
      g.bezierCurveTo(104, 30, 124, 6, 146, 34);
      g.stroke();
      g.fillStyle = "#fff4c8";
      g.beginPath();
      g.arc(40, -16, 7, 0, TAU);
      g.fill();
      g.fillStyle = "#300400";
      g.beginPath();
      g.arc(42, -16, 3.5, 0, TAU);
      g.fill();
      g.fillStyle = "#fff";
      for (let k = 0; k < 4; k++) g.fillRect(60 + k * 6, 10, 3, 5);
      g.restore();
      // flaming pearl ahead of the head
      g.fillStyle = "#ffd77a";
      g.beginPath();
      g.arc(hx + 230, hy - 20, 26, 0, TAU);
      g.fill();
      g.strokeStyle = DGOLD;
      g.lineWidth = 3;
      for (let k = 0; k < 7; k++) {
        const a = (k / 7) * TAU;
        g.beginPath();
        g.moveTo(hx + 230 + Math.cos(a) * 22, hy - 20 + Math.sin(a) * 22);
        g.quadraticCurveTo(
          hx + 230 + Math.cos(a + 0.4) * 34,
          hy - 20 + Math.sin(a + 0.4) * 34,
          hx + 230 + Math.cos(a + 0.2) * 40,
          hy - 20 + Math.sin(a + 0.2) * 40,
        );
        g.stroke();
      }
      g.restore();
    };
    // twin dragons half a turn apart, chasing their pearls round the tube
    for (const ox of [-W, 0, W]) drawDragon(ox);
    g.save();
    g.translate(0, H * 0.06);
    for (const ox of [-W * 0.5, W * 0.5]) drawDragon(ox);
    g.restore();
    // cartouche with the name on the left and the right
    for (const [u, side] of [
      [0.25, onLeft],
      [0.75, onRight],
    ]) {
      column(g, W, H, u, 0.07, side, (g, w, h) => {
        const cx = side === onLeft ? w * 0.72 : w * 0.28;
        g.fillStyle = "#1a0d08";
        g.fillRect(cx - w * 0.15, h / 2 - h * 0.055, w * 0.3, h * 0.11);
        g.strokeStyle = GOLD;
        g.lineWidth = 4;
        g.strokeRect(
          cx - w * 0.15 + 6,
          h / 2 - h * 0.055 + 6,
          w * 0.3 - 12,
          h * 0.11 - 12,
        );
        g.fillStyle = GOLD;
        g.font = `900 ${h * 0.075}px ${kit.FONT_KAI}`;
        g.textAlign = "center";
        g.textBaseline = "middle";
        g.fillText("沖 天 炮", cx, h / 2 + 3);
      });
    }
    speckle(g, W, H, 3000, 0.12);
  });
  tubesB.add(
    (() => {
      const m = M();
      m.add(
        paperCyl(MR, MZ0 + 0.004, MZ1 - 0.057, { seg: 64, spin: PI * 0.3 }),
        dragonMat,
        { at: [0, MY, 0] },
      );
      return m.build("dragon-wrap");
    })(),
  );
  tubesB.add(
    label({
      key: "fw-mortar-seal",
      w: 0.064,
      h: 0.064,
      px: 256,
      face: "-z",
      at: [0, MY, MZ0 - 0.0222],
      rough: 0.8,
      draw(g, W, H) {
        g.clearRect(0, 0, W, H);
        g.fillStyle = "#b3170e";
        g.beginPath();
        g.arc(W / 2, H / 2, W * 0.48, 0, TAU);
        g.fill();
        g.strokeStyle = GOLD;
        g.lineWidth = 6;
        g.beginPath();
        g.arc(W / 2, H / 2, W * 0.42, 0, TAU);
        g.stroke();
        g.lineWidth = 2;
        g.beginPath();
        g.arc(W / 2, H / 2, W * 0.38, 0, TAU);
        g.stroke();
        g.fillStyle = GOLD;
        g.font = `900 ${H * 0.5}px ${kit.FONT_KAI}`;
        g.textAlign = "center";
        g.textBaseline = "middle";
        g.fillText("福", W / 2, H * 0.53);
        speckle(g, W, H, 400, 0.25);
      },
    }),
  );
  const sootB = M();
  sootB.add(
    tube(MIN - 0.0013, MIN - 0.0045, MZ1 - 0.03, MZ1 - 0.002, { seg: 32 }),
    "bore",
    { at: [0, MY, 0] },
  );
  const sootMortar = only(sootB.build("soot-mortar"), "b");
  sootMortar.visible = false;

  // ------------------------------------------------------------------ reload: fresh rockets carried in by the left hand
  // One mesh, one material, its geometry swapped per form (base: a taped pair of rockets, 甲: a paper strip of
  // three small ones, 乙: a round shell). Local frame: +Z along the tubes, z = 0 at the tail of the load.
  // The mesh rides `loadRocket`, which slides down into the tube on the drop; that rides `carrier`, which the
  // hand holds (second grip "load") and which travels from the pouch to the mouths.
  const lowCyl = (r0, r1, z0, z1, seg, caps = true) => {
    const g = new THREE.CylinderGeometry(r1, r0, z1 - z0, seg, 1, !caps);
    g.rotateX(PI / 2);
    g.translate(0, 0, (z0 + z1) / 2);
    return adopt(g);
  };
  const RED = 0xff2a18,
    GREEN = 0x2c8a3a,
    KRAFT = 0xb07a48;
  const rocketInto = (m, x, y, r, L) => {
    m.add(lowCyl(r, r, 0, L * 0.78, 8), "paper_yellow", {
      at: [x, y, 0],
      color: RED,
      wear: 0.3,
    });
    m.add(lowCyl(r, 0.0015, L * 0.78, L, 8, false), "paper_yellow", {
      at: [x, y, 0],
      wear: 0.3,
    });
    m.add(lowCyl(0.0014, 0.0014, -0.012, 0, 3, false), "paper_yellow", {
      at: [x, y, 0],
      color: GREEN,
    });
  };
  const loadGeo = (fn) => {
    const m = M();
    fn(m);
    return m.build("load").children[0];
  };
  const PAIR = (ROWS[1] - ROWS[0]) / 2; // the base pair: one rocket per row of a column
  const RK = {
    base: { r: 0.0125, L: 0.084 },
    a: { r: 0.0095, L: 0.054 },
    b: { r: 0.042 },
  };
  const loadMeshes = {
    base: loadGeo((m) => {
      for (const y of [-PAIR, PAIR]) rocketInto(m, 0, y, RK.base.r, RK.base.L);
      m.add(
        adopt(new THREE.BoxGeometry(0.027, PAIR * 2 + 0.026, 0.014)),
        "paper_yellow",
        {
          at: [0, 0, 0.046],
          color: KRAFT,
        },
      );
    }),
    a: loadGeo((m) => {
      for (const x of [-CD, 0, CD]) rocketInto(m, x, 0, RK.a.r, RK.a.L);
      m.add(
        adopt(new THREE.BoxGeometry(CD * 2 + 0.021, 0.0205, 0.011)),
        "paper_yellow",
        {
          at: [0, 0, 0.03],
          color: 0x44b860,
        },
      );
    }),
    b: loadGeo((m) => {
      const R = RK.b.r;
      m.add(adopt(new THREE.SphereGeometry(R, 12, 8)), "paper_yellow", {
        at: [0, 0, R],
        color: KRAFT,
        wear: 0.3,
      });
      // red paper cross-band and the time fuse on top
      m.add(
        lowCyl(R + 0.0006, R + 0.0006, R - 0.007, R + 0.007, 12, false),
        "paper_yellow",
        {
          at: [0, 0, 0],
          color: RED,
        },
      );
      m.add(
        lowCyl(0.003, 0.0025, R * 2 - 0.002, R * 2 + 0.03, 5),
        "paper_yellow",
        {
          at: [0, 0, 0],
          color: GREEN,
        },
      );
    }),
  };
  // one mesh: start with the largest load so the budget counts it, the branch hook swaps the geometry
  const loadGeos = {};
  for (const k of ["base", "a", "b"]) loadGeos[k] = loadMeshes[k].geometry;
  const loadTris = (k) => loadGeos[k].attributes.position.count / 3;
  const biggest = ["base", "a", "b"].sort(
    (p, q) => loadTris(q) - loadTris(p),
  )[0];
  const loadMesh = loadMeshes[biggest];
  const loadRocket = new THREE.Group();
  loadRocket.name = "load-rocket";
  loadRocket.add(loadMesh);
  const carrier = new THREE.Group();
  carrier.name = "load-carrier";
  carrier.add(loadRocket);
  carrier.visible = false;

  // ------------------------------------------------------------------ assemble
  const root = new THREE.Group();
  root.name = "firework";
  root.add(
    spine,
    lighter,
    wheel,
    fork,
    flame,
    trigger,
    tubesBase,
    sootGroup,
    tubesA,
    tubesB,
    sootMortar,
    carrier,
  );

  const mouth = (x, y) => [x, y, TZ1 + 0.004];
  const muzzle = {
    base: [0, (ROWS[0] + ROWS[1]) / 2, TZ1 + 0.004],
    a: [0, CY, CZ1 + 0.004],
    b: [0, MY, MZ1 + 0.004],
  };
  const anchors = { muzzle, fuse: [LX + 0.002, LY, HZ + 0.012] };
  for (let i = 0; i < 19; i++) {
    const c = cake[i];
    anchors[`m${i}`] = {
      base: i < 6 ? mouth(...tubesAt[i]) : muzzle.base,
      a: [c[0], CY + c[1], CZ1 + 0.004],
      b: muzzle.b,
    };
  }

  // right hand round the roped bamboo grip, index on the iron trigger lever.
  // left hand open under the front of the payload, past the end of the spine, fingers curling up the far side.
  const GD = [0, -Math.sin(GRIP_ROT[0]), Math.cos(GRIP_ROT[0])]; // grip axis, down and back
  const GA = GD.map((d, i) => GRIP_AT[i] + d * 0.066);
  const RN = [0.98, 0, 0.2];
  // The palm sits back on the grip (web high behind it) so the knuckles come round its front and the
  // index, short of room in front of the grip, reaches the trigger by wrapping it at the middle joint.
  // The lower fingers start further back on the hand's knuckle arc, so they bend less at the knuckle.
  const right = {
    at: [GA[0] - 0.0162 * RN[0], GA[1], GA[2] - 0.0162 * RN[2] - 0.021],
    palm: RN,
    fingers: [0.1, -0.24, 0.97],
    pose: {
      base: "wrap",
      r: 0.0162,
      index: [0.1, 1.4, 0.9, 0.05],
      middle: [1.1, 1.5, 0.85, 0],
      ring: [0.95, 1.55, 0.85, -0.02],
      pinky: [0.8, 1.6, 0.85, -0.05],
      thumb: [0.5, -0.44, 0.75, 0.4, 0.35],
    },
    trigger: true,
  };
  // palm turned a little towards the shooter's right and the fingers angled forward, so the wrist
  // lines up with a forearm that comes up from below and behind
  const under = (y, z, r) => ({
    at: [0.012, y, z],
    palm: [-0.4, 1, 0],
    fingers: [-1, 0.12, 0.4],
    pose: { base: "wrap", r, thumb: [0.8, -0.3, 0.5, 0.25, 0.2] },
  });
  // reload: while the battery is tipped up the right hand leaves the grip (it would have to bend back
  // past what a wrist can do) and holds the payload from the shooter's right instead, fingers round
  // its underside (second grip "hold")
  const side = (x, y, z, r) => ({
    at: [x, y, z],
    palm: [1, 0, 0],
    fingers: [0, -1, -0.4],
    pose: { base: "wrap", r, thumb: [0.7, -0.3, 0.6, 0.25, 0.2] },
  });
  const SIDEGRIP = {
    base: side(-(COLS[0] + TR) - 0.001, (ROWS[0] + ROWS[1]) / 2, 0.16, 0.045),
    a: side(-(2 * CD + CR) - 0.003, CY, 0.2, 0.05),
    b: side(-MR - 0.001, MY, 0.2, 0.05),
  };
  // reload: the left hand holds the load from the shooter's left, fingers round its far side, thumb up
  // towards the nose (second grip "load", riding the carrier)
  const loadGrip = (x, z, r) => ({
    parent: carrier,
    at: [x, 0, z],
    palm: [-1, 0, 0],
    fingers: [0, -1, 0.12],
    pose: { base: "wrap", r, thumb: [0.6, -0.4, 0.7, 0.3, 0.25] },
  });
  const LOADGRIP = {
    base: loadGrip(RK.base.r + 0.0012, 0.05, 0.022),
    a: loadGrip(CD + RK.a.r + 0.001, 0.03, 0.014),
    b: loadGrip(RK.b.r + 0.0015, RK.b.r + 0.004, 0.04),
  };
  const hands = (br) => ({
    right: { ...right, alts: { hold: SIDEGRIP[br] || SIDEGRIP.base } },
    left: {
      ...(br === "a"
        ? under(CY - 0.0975 * Math.sin(PI / 3) - 0.0012, 0.385, 0.042)
        : br === "b"
          ? under(MY - MR - 0.0008, 0.4, 0.04)
          : under(ROWS[0] - TR - 0.0006, 0.4, 0.034)),
      alts: { load: LOADGRIP[br] || LOADGRIP.base },
    },
  });

  // ---- reload choreography
  const ease = (a, b, x) => {
    const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
    return t * t * (3 - 2 * t);
  };
  const clamp01 = (x) => Math.max(0, Math.min(1, x));
  const crossed = (s, at) => s.prev.reload < at && s.reload >= at;
  // where the hand takes a fresh load from (a pouch at the hip, out of sight) and where it offers it up:
  // carrier origin = the tail of the load. Base: columns of the 2x3 block; 甲: top, middle and bottom
  // rows of three in the honeycomb; 乙: the mortar mouth.
  const POUCH = [0.3, -0.04, -0.34];
  const TILT = [0.9, -0.5, 0]; // how the load lies in the pouch
  // the turn that puts the load (as the hand will hold it) the way the hand already lies under the
  // battery: the first reach starts from it, so the wrist turns on the way instead of straining
  const TILT0 = [-0.17, 0.27, -1.62];
  const ROW_A = 2 * CD * Math.sin(PI / 3);
  const MIDROW = (ROWS[0] + ROWS[1]) / 2;
  const SLOTS = {
    base: COLS.map((x) => ({
      at: [x, MIDROW, TZ1 + 0.03],
      seat: 0.028,
      floor: TZ1 - 0.088,
    })),
    a: [ROW_A, 0, -ROW_A].map((y) => ({
      at: [0, CY + y, CZ1 + 0.026],
      seat: 0.024,
      floor: CZ1 - 0.058,
    })),
    b: [{ at: [0, MY, MZ1 + 0.1], seat: 0.105, floor: MZ1 - 0.2 - RK.b.r }],
  };
  // beats: [start, length] in reload progress
  const BEATS = {
    base: [
      [0.1, 0.24],
      [0.34, 0.24],
      [0.58, 0.24],
    ],
    b: [[0.08, 0.7]],
  };
  BEATS.a = BEATS.base;
  // phases within a beat
  const PHASE = {
    up: [0.0, 0.42],
    seat: [0.44, 0.56],
    drop: [0.58, 0.66],
    back: [0.68, 1],
  };
  const PHASE_BIG = {
    up: [0.0, 0.42],
    seat: [0.46, 0.68],
    drop: [0.72, 0.8],
    back: [0.82, 1],
  };
  const refilled = [false, false, false]; // per beat, while reloading
  const sootCol = (i) => i % 3; // base soot i sits on column i % 3
  let flick = 0;
  /** Carrier and load for this frame. Returns the hand's blend onto the load. */
  function loadPose(br, r, s) {
    const beats = BEATS[br] || BEATS.base;
    const slots = SLOTS[br] || SLOTS.base;
    const big = br === "b";
    carrier.visible = false;
    loadRocket.position.set(0, 0, 0);
    let mix = 0;
    for (let k = 0; k < beats.length; k++)
      refilled[k] = (r - beats[k][0]) / beats[k][1] >= (big ? 0.79 : 0.65);
    for (let k = 0; k < beats.length; k++) {
      const t0 = beats[k][0],
        len = beats[k][1];
      const u = (r - t0) / len;
      if (u < 0 || u > 1) continue;
      const last = k === beats.length - 1;
      const slot = slots[k];
      const P = big ? PHASE_BIG : PHASE;
      const up = ease(P.up[0], P.up[1], u);
      const seat = ease(P.seat[0], P.seat[1], u);
      const away = last ? 0 : ease(P.back[0], P.back[1], u);
      const e = up * (1 - away);
      // a curve from the pouch, out past the left of the tubes, to the mouth
      const bulge = Math.sin(PI * e);
      carrier.position.set(
        POUCH[0] + (slot.at[0] - POUCH[0]) * e + 0.05 * bulge,
        POUCH[1] + (slot.at[1] - POUCH[1]) * e + 0.04 * bulge,
        POUCH[2] + (slot.at[2] - POUCH[2]) * e - slot.seat * seat * (1 - away),
      );
      // the load comes out of the pouch lying over and straightens up on the way
      carrier.rotation.set(
        TILT[0] * (1 - e),
        TILT[1] * (1 - e),
        TILT[2] * (1 - e),
      );
      const dropT = clamp01((u - P.drop[0]) / (P.drop[1] - P.drop[0]));
      const inTube = u >= P.drop[0];
      // gravity: slow then fast
      const fall = carrier.position.z - slot.floor;
      loadRocket.position.z = -fall * dropT * dropT;
      // the load is shown from the pouch until it has gone down the tube
      carrier.visible = true;
      loadMesh.visible = !(inTube && dropT >= 1);
      // sounds
      if (crossed(s, t0 + len * 0.04)) s.cue("paper", 0.7);
      if (crossed(s, t0 + len * (big ? 0.5 : 0.48)))
        s.cue(big ? "cloth" : "paper", 0.5);
      if (crossed(s, t0 + len * (big ? 0.79 : 0.65))) s.cue("tubeIn");
      break;
    }
    // hand: onto the load from the start, off it once the last one is in
    const n = beats.length;
    const off = beats[n - 1][0] + beats[n - 1][1] * (big ? 0.82 : 0.68);
    mix = Math.min(clamp01(r / beats[0][0]), 1 - clamp01((r - off) / 0.13));
    return mix;
  }
  // before the first beat starts the hand is already reaching for the pouch
  function preReach(br, r) {
    const beats = BEATS[br] || BEATS.base;
    if (r < beats[0][0]) {
      carrier.visible = true;
      loadMesh.visible = true;
      carrier.position.set(POUCH[0], POUCH[1], POUCH[2]);
      const k = ease(beats[0][0] * 0.7, beats[0][0], r);
      carrier.rotation.set(
        TILT0[0] + (TILT[0] - TILT0[0]) * k,
        TILT0[1] + (TILT[1] - TILT0[1]) * k,
        TILT0[2] + (TILT[2] - TILT0[2]) * k,
      );
      loadRocket.position.set(0, 0, 0);
    }
  }

  let model;
  model = kit.weapon({
    id: "firework",
    root,
    anchors,
    hands,
    ownReload: true,
    view: {
      hip: { pos: [0.16, -0.2, -0.24], rot: [0.03, 0.08, 0.06] },
      // reload: muzzle tipped up and the battery brought down and in, so the eye looks into the mouths
      // (a little right of the crosshair)
      reload: { pos: [-0.04, -0.8, -0.52], rot: [1.9, 0, 0.04] },
    },
    show: { yaw: -0.85, pitch: 0.14 },
    onBranch(br) {
      loadMesh.geometry = loadGeos[br] || loadGeos.base;
      carrier.visible = false;
    },
    update(s) {
      const br = s.branch || "base";
      const r = s.reload;
      const L = model && model.grips.left;
      const R = model && model.grips.right;
      if (r >= 0) {
        const m = loadPose(br, r, s);
        preReach(br, r);
        if (L) {
          L.to = "load";
          L.mix = m;
        }
        // the right hand moves onto the payload as the battery tips up (the same curve the view uses)
        if (R) {
          R.to = "hold";
          R.mix = Math.min(1, Math.sin(PI * clamp01(r)) * 2.2);
        }
        // flick the lighter once the hand is back: the battery is ready
        flick = Math.sin(PI * clamp01((r - 0.9) / 0.08));
        if (crossed(s, 0.92)) s.cue("fuse", 0.8);
      } else {
        carrier.visible = false;
        flick = 0;
        refilled.fill(false);
        if (L) {
          L.to = null;
          L.mix = 0;
        }
        if (R) {
          R.to = null;
          R.mix = 0;
        }
      }
      const tr = r >= 0 ? 0 : Math.max(0, Math.min(1, s.trigger || 0));
      trigger.rotation.x = tr * 0.35; // the blade swings back towards the grip
      // thumb wheel rolls back and the gas fork dips as the lever comes in; spin a little on each shot
      const c = s.cycle ?? 1;
      wheel.rotation.y = tr * 1.4 + (1 - c) * 2.2 + flick * 1.6;
      fork.position.z = HZ + 0.001 - Math.max(tr, flick) * 0.0016;
      const lit = Math.max(
        tr > 0.35 ? (tr - 0.35) / 0.65 : 0,
        c < 0.5 ? 1 - c * 2 : 0,
        flick,
      );
      flame.visible = lit > 0.02;
      const flk =
        0.85 + 0.15 * Math.sin((s.t || 0) * 31) * Math.sin((s.t || 0) * 13.7);
      flame.scale.set(
        0.8 + lit * 0.3,
        0.8 + lit * 0.3,
        (0.4 + lit * 0.8) * flk,
      );
      flameMat.emissiveIntensity =
        3.5 * lit * flk * ((s.level || 1) >= 5 ? 1.8 : 1);
      // spent tubes are blackened round the mouth; during a reload each column clears as its pair goes in
      const mag = s.mag || 6;
      const rounds = s.rounds ?? mag;
      const spent = Math.round(((mag - rounds) / mag) * 6);
      for (let i = 0; i < soot.length; i++)
        soot[i].visible = i < spent && !(r >= 0 && refilled[sootCol(i)]);
      sootMortar.visible =
        br === "b" && rounds < mag && !(r >= 0 && refilled[0]);
    },
  });
  return model;
}
