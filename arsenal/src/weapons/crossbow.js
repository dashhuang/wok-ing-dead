// 诸葛 · Zhuge repeating crossbow.
// Gun space: +Z towards the target, +Y up, +X shooter's left. Origin at the trigger under the stock.
// Layout: a vermilion stock with a pistol grip and butt; the composite prod passes through a mortise at
// z = ZC; a wooden magazine slides on top of the stock, pushed and pulled by a lever pivoting on the front
// of the stock. A hook under the back of the magazine catches the string, so pulling the lever back draws
// the bow; at the back of its travel the string slips off and drives the lowest bolt down the groove.
const TOP = 0.042; // top of the stock (the flight deck)
const BOT = -0.02; // underside of the fore-stock
const SW = 0.042; // stock width
const FT = 0.011; // the fore-stock underside rises this much towards the nose
const FRONT = 0.462; // front of the stock
const ZC = 0.235; // prod centre
const PRY = 0.033; // prod centre height
const TIP = 0.345; // half span to the string nocks
const SY = 0.0438; // string height
const MB = 0.0445; // magazine underside
const MH = 0.1; // magazine height
const MW = 0.036; // magazine width
const ML = 0.28; // magazine length
const MZ = 0.02; // magazine rear when home (string drawn)
const BRACE = 0.158; // string z when released
const D = BRACE - MZ - 0.004; // magazine travel to catch the string
const BL = 0.292; // bolt length
const PITCH = 0.0072; // bolt stacking pitch
const LP = [0.005, 0.41]; // lever pivot [y, z]
const LX = 0.05; // lever arms stand this far out from the centre line (room for a whole hand on the handle)
const PIN = [0.09, 0.022]; // lever pin on the magazine [y, z from the magazine rear] (near the back: a short, calm lever stroke)

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
  let seed = 11;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const GOLD = "#f2c86a";

  // ------------------------------------------------------------------ canvas helpers
  const cloud = (g, x, y, s, flip = 1) => {
    // 祥云: a fat curl with a smaller one tucked in and a tail
    g.save();
    g.translate(x, y);
    g.scale(flip * s, s);
    g.lineWidth /= s;
    g.beginPath();
    g.arc(0, 0, 1, PI * 0.15, PI * 1.85);
    g.arc(-0.32, -0.1, 0.42, PI * 1.8, PI * 0.9, true);
    g.stroke();
    g.beginPath();
    g.arc(1.55, 0.25, 0.75, PI * 1.05, PI * 2.75);
    g.arc(1.35, 0.15, 0.32, PI * 0.6, PI * 1.9, true);
    g.stroke();
    g.beginPath();
    g.moveTo(-1.1, 0.9);
    g.bezierCurveTo(0, 1.25, 1.4, 1.2, 2.6, 0.95);
    g.bezierCurveTo(3.4, 0.8, 3.8, 0.5, 4.4, 0.62);
    g.stroke();
    g.restore();
  };
  const cloudBand = (g, W, H, n, flip) => {
    g.clearRect(0, 0, W, H);
    g.strokeStyle = GOLD;
    g.lineCap = "round";
    g.lineWidth = H * 0.03;
    // thin gilt rules top and bottom
    g.fillStyle = GOLD;
    g.fillRect(W * 0.01, H * 0.07, W * 0.98, H * 0.035);
    g.fillRect(W * 0.01, H * 0.895, W * 0.98, H * 0.035);
    for (const [col, add] of [
      ["rgba(40,6,4,0.75)", H * 0.04],
      [GOLD, 0],
    ]) {
      g.strokeStyle = col;
      for (let i = 0; i < n; i++) {
        const x = W * ((i + 0.3) / n);
        const y = H * (0.44 + (i % 2) * 0.12);
        g.lineWidth = H * 0.07 + add;
        cloud(g, x, y, H * (0.19 + (i % 3) * 0.025), flip * (i % 2 ? -1 : 1));
      }
    }
    // tiny gilt dots like worn gold leaf
    for (let i = 0; i < 200; i++) {
      g.fillStyle = `rgba(242,200,106,${0.2 + rnd() * 0.4})`;
      g.fillRect(rnd() * W, H * 0.15 + rnd() * H * 0.7, 1.5, 1.5);
    }
    // wear: punch transparent scratches through the gilt
    g.globalCompositeOperation = "destination-out";
    for (let i = 0; i < 160; i++) {
      g.fillStyle = `rgba(0,0,0,${0.3 + rnd() * 0.6})`;
      g.fillRect(rnd() * W, rnd() * H, 2 + rnd() * 10, 1 + rnd() * 2);
    }
    g.globalCompositeOperation = "source-over";
  };

  // ------------------------------------------------------------------ stock (fixed)
  // vermilion lacquer over wood: satin rather than glossy, a ghost of grain under the coat, and the black
  // ground coat showing through on the worn edges
  const LAC = kit.mats.variant(
    "lacquer_red",
    {
      color: 0x701109,
      rough: 0.44,
      coat: 0.3,
      edge: 0x140806,
      edgeAmt: 1,
      edgeRough: 0.55,
      dirt: 0.65,
      dirtColor: 0x220605,
      pattern: "wood",
      pScale: 8,
      bump: 0.00006,
      pAlbedo: 0.22,
      grain: [0.3, 1],
    },
    "xb-lacquer",
  );
  // black lacquer worn to a soft sheen (no mirror highlights)
  const LACB = kit.mats.variant(
    "lacquer_black",
    {
      color: 0x0e0b0a,
      rough: 0.52,
      coat: 0.2,
      edge: 0x3a1c12,
      edgeAmt: 0.8,
      edgeRough: 0.7,
      dirt: 0.4,
      pattern: "wood",
      pScale: 9,
      bump: 0.00005,
      pAlbedo: 0.15,
      grain: [0.3, 1],
    },
    "xb-lacquer-black",
  );
  const botAt = (z) =>
    BOT + FT * Math.max(0, Math.min(1, (z - 0.06) / (FRONT - 0.064)));
  const st = M();
  // fore-stock beam: the underside rises gently towards the nose, edges rounded over
  st.add(
    prism(
      [
        [-0.012, BOT + 0.002, 0.006],
        [0.06, BOT, 0.06],
        [FRONT - 0.004, BOT + FT, 0.008],
        [FRONT, TOP, 0.003],
        [-0.012, TOP, 0.006],
      ],
      SW,
      { bevel: 0.0065, bevelSeg: 3 },
    ),
    LAC,
  );
  // butt and pistol grip are lofted from oval sections so they swell and taper like carved wood
  // station: { c: [x, y, z] centre, t: axis direction, a: half width (X), bt / bb: half height on the
  // up / down side of the section, nt / nb: superellipse exponents of the upper / lower half }
  const _ex = new THREE.Vector3(1, 0, 0);
  const loft = (stations, N = 28) => {
    const pos = [],
      wr = [],
      idx = [];
    const rings = [];
    const t = new THREE.Vector3(),
      ey = new THREE.Vector3(),
      c = new THREE.Vector3();
    for (const st of stations) {
      t.set(...st.t).normalize();
      ey.crossVectors(_ex, t).normalize();
      c.set(...st.c);
      const ring = [];
      for (let k = 0; k < N; k++) {
        const th = (k / N) * TAU;
        const cs = Math.cos(th),
          sn = Math.sin(th);
        const n = sn >= 0 ? st.nt : st.nb;
        const x = st.a * Math.sign(cs) * Math.abs(cs) ** (2 / n);
        const v =
          (sn >= 0 ? st.bt : st.bb) * Math.sign(sn) * Math.abs(sn) ** (2 / n);
        pos.push(c.x + x, c.y + ey.y * v, c.z + ey.z * v);
        // the rounded "edges" of the section wear through first
        wr.push(
          Math.min(1, Math.max(0, (Math.abs(cs * sn) - 0.3) * 3)) *
            (st.w ?? 0.55),
        );
        ring.push(pos.length / 3 - 1);
      }
      rings.push({ ring, c: c.clone() });
    }
    for (let r = 0; r < rings.length - 1; r++)
      for (let k = 0; k < N; k++) {
        const A = rings[r].ring[k],
          B = rings[r].ring[(k + 1) % N],
          C = rings[r + 1].ring[(k + 1) % N],
          Dd = rings[r + 1].ring[k];
        idx.push(A, C, B, A, Dd, C);
      }
    for (const [ri, flip] of [
      [0, false],
      [rings.length - 1, true],
    ]) {
      const { ring, c: cc } = rings[ri];
      pos.push(cc.x, cc.y, cc.z);
      wr.push(0.3);
      const ci = pos.length / 3 - 1;
      for (let k = 0; k < N; k++) {
        const A = ring[k],
          B = ring[(k + 1) % N];
        if (flip) idx.push(ci, B, A);
        else idx.push(ci, A, B);
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    // carry the wear through adopt() in the uv slot, then move it into aWear
    const uv = [];
    for (const w of wr) uv.push(w, 0);
    g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
    g.setIndex(idx);
    g.computeVertexNormals();
    const out = adopt(g, 0);
    const U = out.attributes.uv,
      Wa = out.attributes.aWear;
    for (let i = 0; i < Wa.count; i++) Wa.setX(i, U.getX(i));
    return out;
  };
  const lerpT = (tab, z) => {
    // piecewise-smooth interpolation through [z, ...values] rows (z descending)
    if (z >= tab[0][0]) return tab[0].slice(1);
    for (let i = 0; i < tab.length - 1; i++) {
      const [z0] = tab[i],
        [z1] = tab[i + 1];
      if (z <= z0 && z >= z1) {
        let k = (z0 - z) / (z0 - z1);
        k = k * k * (3 - 2 * k);
        return tab[i].slice(1).map((v, j) => v + (tab[i + 1][j + 1] - v) * k);
      }
    }
    return tab[tab.length - 1].slice(1);
  };
  // butt: z, top (comb line), bottom (belly line), half width, exponents of the upper / lower half
  // (square where it takes over from the fore-stock, rounding off towards the comb)
  const BUTT = [
    [-0.004, TOP + 0.0016, BOT - 0.0012, SW / 2 + 0.0014, 6, 6],
    [-0.03, TOP + 0.0016, -0.024, 0.0214, 4.4, 4.4],
    [-0.065, TOP + 0.0025, -0.031, 0.0202, 2.8, 3.4],
    [-0.11, TOP + 0.005, -0.036, 0.0204, 2.5, 3.2],
    [-0.16, TOP + 0.0075, -0.045, 0.0222, 2.5, 3.2],
    [-0.24, TOP + 0.006, -0.062, 0.0232, 2.6, 3.2],
    [-0.29, 0.042, -0.074, 0.0228, 2.6, 3.2],
    [-0.312, 0.037, -0.079, 0.0222, 2.6, 3.2],
  ];
  const buttSec = (z, grow = 0) => {
    const [top, bot, a, nt, nb] = lerpT(BUTT, z);
    return {
      c: [0, (top + bot) / 2, z],
      t: [0, 0, -1],
      a: a + grow,
      bt: (top - bot) / 2 + grow,
      bb: (top - bot) / 2 + grow,
      nt,
      nb,
    };
  };
  {
    const sts = [];
    for (let z = -0.004; z >= -0.3105; z -= 0.0153) sts.push(buttSec(z));
    sts.push(buttSec(-0.311));
    st.add(loft(sts), LAC);
    // black lacquer butt plate, its back face domed
    const pl = [-0.31, -0.318, -0.324, -0.3275, -0.3295].map((z, i) => {
      const q = buttSec(-0.312, 0.0006);
      const k = [1, 1, 0.97, 0.88, 0.7][i];
      return {
        ...q,
        c: [0, q.c[1], z],
        a: q.a * k,
        bt: q.bt * k,
        bb: q.bb * k,
        w: 0.9,
      };
    });
    st.add(loft(pl), LACB);
  }
  // pistol grip: raked back, a palm swell in the middle, flared over the cap
  {
    const P0 = new THREE.Vector3(0, -0.004, -0.058),
      dir = new THREE.Vector3(0, -0.113, -0.046).normalize();
    // u along the grip, half width, half depth back (bt) / front (bb): it flares where it grows out of the
    // wrist, swells under the palm and narrows before the cap
    const G = [
      [0, 0.0205, 0.034, 0.022],
      [0.016, 0.0202, 0.031, 0.0225],
      [0.034, 0.0192, 0.026, 0.0228],
      [0.058, 0.0188, 0.0252, 0.0222],
      [0.082, 0.0182, 0.0242, 0.0214],
      [0.1, 0.0174, 0.0226, 0.0204],
      [0.108, 0.0177, 0.0232, 0.0212],
    ];
    const at = (u) => P0.clone().addScaledVector(dir, u).toArray();
    st.add(
      loft(
        G.map(([u, a, bt, bb]) => ({
          c: at(u),
          t: dir.toArray(),
          a,
          bt,
          bb,
          nt: 2.3,
          nb: 2.4,
        })),
      ),
      LAC,
    );
    const cap = [
      [0.107, 1.03],
      [0.114, 1.04],
      [0.117, 0.96],
      [0.1185, 0.75],
    ].map(([u, k]) => ({
      c: at(u),
      t: dir.toArray(),
      a: 0.0176 * k,
      bt: 0.0232 * k,
      bb: 0.0214 * k,
      nt: 2.3,
      nb: 2.4,
      w: 0.8,
    }));
    st.add(loft(cap), LACB);
  }
  // launch groove down the flight deck, flared at the muzzle
  st.add(
    box(0.0075, 0.0012, FRONT - 0.002 - MZ + 0.002, { bevel: 0.0002 }),
    "bore",
    { at: [0, TOP + 0.0002, (FRONT + MZ) / 2] },
  );
  st.add(box(0.016, 0.0012, 0.012, { bevel: 0.0002, r: 0.004 }), "bore", {
    at: [0, TOP + 0.0002, FRONT - 0.008],
  });
  // brass nose cap with a bolt guide lip and the lever pivot boss
  st.add(
    prism(
      [
        [FRONT - 0.03, botAt(FRONT - 0.03) - 0.001, 0.002],
        [FRONT + 0.004, botAt(FRONT) - 0.001, 0.003],
        [FRONT + 0.004, TOP + 0.001, 0.002],
        [FRONT - 0.03, TOP + 0.001, 0.002],
      ],
      SW + 0.003,
      {
        bevel: 0.0012,
        holes: [
          [
            [FRONT - 0.026, botAt(FRONT) + 0.004, 0.003],
            [FRONT + 0.001, botAt(FRONT) + 0.004, 0.002],
            [FRONT + 0.001, TOP - 0.004, 0.002],
            [FRONT - 0.026, TOP - 0.004, 0.003],
          ],
        ],
      },
    ),
    "brass_aged",
    { wear: 0.7 },
  );
  st.add(
    box(SW - 0.006, TOP - botAt(FRONT) - 0.01, 0.004, { bevel: 0.001 }),
    LAC,
    {
      at: [0, (TOP + botAt(FRONT)) / 2 - 0.0005, FRONT + 0.001],
    },
  );
  for (const s of [1, -1]) {
    st.add(rod(0.007, 0, 0.004, { seg: 18, r: 0.001 }), "brass_aged", {
      rot: [0, (s * PI) / 2, 0],
      at: [s * (SW / 2), LP[0], LP[1]],
      wear: 0.6,
    });
  }
  st.add(rod(0.0028, -LX - 0.001, LX + 0.001, { seg: 10 }), "brass_aged", {
    rot: [0, PI / 2, 0],
    at: [0, LP[0], LP[1]],
    wear: 0.4,
  });
  // prod mortise: brass cheek plates on both sides with four pins
  st.add(
    prism(
      [
        [ZC - 0.028, PRY - 0.022, 0.004],
        [ZC + 0.028, PRY - 0.022, 0.004],
        [ZC + 0.024, TOP - 0.001, 0.003],
        [ZC - 0.024, TOP - 0.001, 0.003],
      ],
      0.0018,
      { bevel: 0.0006 },
    ),
    "brass_aged",
    { at: [SW / 2 + 0.0006, 0, 0], mirror: true, wear: 0.6 },
  );
  for (const dz of [-0.018, 0.018]) {
    for (const y of [PRY - 0.015, TOP - 0.007]) {
      st.add(
        sphere(0.0018, { seg: 8, rings: 5, squash: [0.6, 1, 1] }),
        "brass_aged",
        { at: [SW / 2 + 0.0016, y, ZC + dz], mirror: true, wear: 0.4 },
      );
    }
  }
  // wrist and fore-end brass bands
  {
    const q = (z) => ({
      ...buttSec(-0.058, 0.0016),
      c: [0, buttSec(-0.058).c[1], z],
      w: 0.9,
    });
    st.add(loft([q(-0.052), q(-0.064)]), "brass_aged");
  }
  for (const z of [0.4]) {
    st.add(
      prism(
        [
          [-SW / 2 - 0.0012, (z < 0 ? BOT + 0.004 : botAt(z)) - 0.0012, 0.004],
          [SW / 2 + 0.0012, (z < 0 ? BOT + 0.004 : botAt(z)) - 0.0012, 0.004],
          [SW / 2 + 0.0012, TOP + 0.0004, 0.002],
          [-SW / 2 - 0.0012, TOP + 0.0004, 0.002],
        ],
        0.009,
        { plane: "front", bevel: 0.0008 },
      ),
      "brass_aged",
      { at: [0, 0, z], wear: 0.7 },
    );
  }
  // trigger guard: brass strap from the fore-stock to the grip
  st.add(
    sweep(
      [
        [0, BOT + 0.001, 0.046],
        [0, BOT - 0.016, 0.04],
        [0, BOT - 0.03, 0.02],
        [0, BOT - 0.033, -0.004],
        [0, BOT - 0.028, -0.024],
        [0, BOT - 0.018, -0.036],
      ],
      0.002,
      { seg: 8, steps: 36 },
    ),
    "brass_aged",
    { scale: [2.2, 1, 1], wear: 0.5 },
  );
  // string rest pads on the deck either side of the groove where the drawn string sits
  st.add(box(0.012, 0.0016, 0.012, { bevel: 0.0004 }), LACB, {
    at: [0.012, TOP + 0.0006, MZ + 0.01],
    mirror: true,
    wear: 0.4,
  });
  const stock = st.build("stock");

  // gilt clouds on both sides of the fore-stock and the butt
  for (const [face, x] of [
    ["x", SW / 2 + 0.0003],
    ["-x", -SW / 2 - 0.0003],
  ]) {
    stock.add(
      label({
        key: `xb-cloud-fore-${face}`,
        w: 0.44,
        h: 0.036,
        px: 1536,
        face,
        at: [x, 0.015, 0.172],
        metal: 0.75,
        rough: 0.34,
        glow: 0.12,
        glowColor: 0xffc860,
        draw: (g, W, H) => cloudBand(g, W, H, 7, face === "x" ? 1 : -1),
      }),
    );
    stock.add(
      label({
        key: `xb-cloud-butt-${face}`,
        w: 0.17,
        h: 0.068,
        px: 768,
        face,
        at: [Math.sign(x) * (lerpT(BUTT, -0.2)[2] + 0.0004), -0.008, -0.2],
        metal: 0.75,
        rough: 0.34,
        glow: 0.12,
        glowColor: 0xffc860,
        draw(g, W, H) {
          g.clearRect(0, 0, W, H);
          g.lineCap = "round";
          const two = (col, add) => {
            g.strokeStyle = col;
            g.lineWidth = H * 0.06 + add;
            cloud(g, W * 0.18, H * 0.4, H * 0.16, face === "x" ? 1 : -1);
            g.lineWidth = H * 0.045 + add;
            cloud(g, W * 0.56, H * 0.62, H * 0.12, face === "x" ? -1 : 1);
          };
          two("rgba(40,6,4,0.75)", H * 0.035);
          two(GOLD, 0);
          g.globalCompositeOperation = "destination-out";
          for (let i = 0; i < 60; i++) {
            g.fillStyle = `rgba(0,0,0,${0.3 + rnd() * 0.6})`;
            g.fillRect(rnd() * W, rnd() * H, 2 + rnd() * 8, 1 + rnd() * 2);
          }
          g.globalCompositeOperation = "source-over";
        },
      }),
    );
  }

  // trigger: brass blade hanging from the stock
  const tg = M();
  tg.add(
    prism(
      [
        [0.004, 0.004, 0.001],
        [-0.004, 0.004, 0.001],
        [-0.004, -0.01, 0.006],
        [0.003, -0.024, 0.003],
        [-0.001, -0.026, 0.002],
        [-0.0085, -0.011, 0.008],
      ],
      0.006,
      { bevel: 0.0012, bevelSeg: 2 },
    ),
    "brass_aged",
    { wear: 0.6 },
  );
  const trigger = tg.build("trigger");
  trigger.position.set(0, BOT + 0.002, 0.004);

  // ------------------------------------------------------------------ prod (flexes as it is drawn)
  const zOf = (x) => {
    const a = Math.abs(x);
    // gentle reflex curve, then the stiff ears kick forward at the tips
    return -0.52 * a * a + (a > 0.29 ? (a - 0.29) * (a - 0.29) * 9 : 0);
  };
  const thick = (x) => 0.021 - 0.011 * Math.min(1, Math.abs(x) / TIP);
  const prodPts = (inset, f0, f1) => {
    const n = 40;
    const front = [],
      back = [];
    for (let i = 0; i <= n; i++) {
      const x = -TIP - 0.006 + ((2 * (TIP + 0.006)) / n) * i;
      const t = thick(x);
      front.push([x, zOf(x) + t * f1 - inset, 0]);
      back.push([x, zOf(x) - t * f0 + inset, 0]);
    }
    front[0][2] = front[n][2] = 0.003;
    back[0][2] = back[n][2] = 0.003;
    return [...back, ...front.reverse()];
  };
  const pr = M();
  // laminated limbs: bamboo facing on the front (target) side, a mulberry-wood core, black horn belly towards
  // the shooter, with pale glue-and-sinew lines between the layers standing slightly proud
  pr.add(
    prism(prodPts(0, 0.16, 0.2), 0.0166, { plane: "top", bevel: 0.0012 }),
    kit.mats.variant(
      "wood_peach",
      { color: 0x6a3a1c, rough: 0.55, coat: 0.3 },
      "xb-prod-core",
    ),
  );
  pr.add(
    prism(prodPts(0, -0.27, 0.52), 0.0184, {
      plane: "top",
      bevel: 0.002,
      bevelSeg: 2,
    }),
    "bamboo",
  );
  for (const [f0, f1] of [
    [-0.2, 0.27],
    [0.22, -0.16],
  ])
    pr.add(
      prism(prodPts(0, f0, f1), 0.0189, { plane: "top", bevel: 0.0005 }),
      "bamboo",
      { color: 0xfff4dc, wear: 0.2 },
    );
  pr.add(
    prism(prodPts(0, 0.52, -0.22), 0.0174, {
      plane: "top",
      bevel: 0.0015,
      bevelSeg: 2,
    }),
    LACB,
  );
  // sinew lashings: broad bands of red-lacquered cord wound round each limb
  for (const s of [1, -1]) {
    for (const a of [0.055, 0.115, 0.175, 0.235, 0.29, 0.325]) {
      const x = s * a;
      const dz = (zOf(x + 0.001) - zOf(x - 0.001)) / 0.002;
      const t = thick(x);
      const wide = a < 0.2 ? 0.0065 : 0.0045;
      pr.add(
        helix(0.012, 0.00115, -wide, wide, a < 0.2 ? 5.5 : 4, {
          seg: 4,
          perTurn: 12,
          squash: [(t * 0.52 + 0.0016) / 0.012, 0.0108 / 0.012],
        }),
        "cord_red",
        {
          rot: [0, Math.atan2(1, dz), 0],
          at: [x, 0, zOf(x) + t * 0.025],
          wear: 0.3,
        },
      );
    }
    pr.add(
      sphere(0.0062, { seg: 12, rings: 8, squash: [1.2, 1.15, 0.9] }),
      LACB,
      { at: [s * (TIP + 0.002), 0.0, zOf(TIP) - 0.001], wear: 0.5 },
    );
    pr.add(rod(0.0016, -0.008, 0.008, { seg: 8 }), LACB, {
      rot: [PI / 2, 0, 0],
      at: [s * (TIP + 0.0045), 0.0, zOf(TIP) - 0.004],
      wear: 0.3,
    });
  }
  const prod = pr.build("prod");
  prod.position.set(0, PRY, ZC);
  // the two string nocks in prod space (built once; update() only reads them)
  const TIPS = [1, -1].map(
    (s) => new THREE.Vector3(s * (TIP + 0.001), SY - PRY, zOf(TIP) - 0.0065),
  );
  const tipLocal = (s) => TIPS[s > 0 ? 0 : 1];

  // string: two straight hemp segments from the nocks to the hook; built once as unit rods and only
  // placed, turned and stretched each frame (no geometry is rebuilt)
  const segs = [1, -1].map((s) => {
    const m = M();
    m.add(rod(0.00125, 0, 1, { seg: 6 }), "rope_hemp");
    const n = m.build(`string-${s > 0 ? "l" : "r"}`);
    return n;
  });
  const serve = M();
  serve.add(rod(0.0019, -0.012, 0.012, { seg: 8, r: 0.001 }), "cord_red", {
    rot: [0, PI / 2, 0],
    wear: 0.2,
  });
  const serving = serve.build("string-serving");
  const _a = new THREE.Vector3(),
    _b = new THREE.Vector3(),
    _z = new THREE.Vector3(0, 0, 1),
    _x = new THREE.Vector3(1, 0, 0);
  const RIDE = 0.45; // share of the lever's rotation the right hand follows
  const setSeg = (n, a, b) => {
    n.position.copy(a);
    _b.subVectors(b, a);
    const len = _b.length();
    n.quaternion.setFromUnitVectors(_z, _b.normalize());
    n.scale.set(1, 1, len);
  };

  // ------------------------------------------------------------------ magazine + bolts (slides)
  const mag = new THREE.Group();
  mag.name = "magazine";
  const bodyBase = M(); // plain wood box (base, 乙)
  const bodyA = M(); // red-lacquered box (甲)
  const magFrame = (m, wood) => {
    const z0 = 0,
      z1 = ML;
    const y0 = MB,
      y1 = MB + MH;
    // side walls with a long window through which the bolt stack shows
    for (const s of [1, -1]) {
      m.add(
        prism(
          [
            [z0, y0, 0.002],
            [z1, y0, 0.002],
            [z1, y1, 0.002],
            [z0, y1, 0.002],
          ],
          0.004,
          {
            bevel: 0.0008,
            holes: [
              [
                [0.035, y0 + 0.016, 0.004],
                [0.25, y0 + 0.016, 0.004],
                [0.25, y1 - 0.012, 0.004],
                [0.035, y1 - 0.012, 0.004],
              ],
            ],
          },
        ),
        wood,
        { at: [s * (MW / 2 - 0.002), 0, 0] },
      );
    }
    // floor (open over the groove), lid with a finger slot, front plank slotted for the heads, rear plank
    for (const s of [1, -1])
      m.add(box(0.012, 0.004, ML - 0.004, { bevel: 0.0008 }), wood, {
        at: [s * 0.0105, y0 + 0.002, ML / 2],
      });
    m.add(
      prism(
        [
          [-MW / 2, 0.0, 0.002],
          [MW / 2, 0.0, 0.002],
          [MW / 2, ML, 0.002],
          [-MW / 2, ML, 0.002],
        ],
        0.005,
        {
          plane: "top",
          bevel: 0.0012,
          holes: [
            [
              [-0.0045, 0.05, 0.0045],
              [0.0045, 0.05, 0.0045],
              [0.0045, 0.23, 0.0045],
              [-0.0045, 0.23, 0.0045],
            ],
          ],
        },
      ),
      wood,
      { at: [0, y1 + 0.0025, 0] },
    );
    m.add(
      prism(
        [
          [-MW / 2 + 0.003, y0, 0.002],
          [MW / 2 - 0.003, y0, 0.002],
          [MW / 2 - 0.003, y1, 0.002],
          [-MW / 2 + 0.003, y1, 0.002],
        ],
        0.008,
        {
          plane: "front",
          bevel: 0.001,
          holes: [
            [
              [-0.0052, y0 - 0.003, 0.002],
              [0.0052, y0 - 0.003, 0.002],
              [0.0052, y1 - 0.024, 0.004],
              [-0.0052, y1 - 0.024, 0.004],
            ],
          ],
        },
      ),
      wood,
      { at: [0, 0, ML - 0.004] },
    );
    m.add(box(MW - 0.006, MH - 0.012, 0.006, { bevel: 0.001 }), wood, {
      at: [0, y0 + 0.006 + (MH - 0.012) / 2, 0.003],
    });
  };
  magFrame(bodyBase, "wood_peach");
  magFrame(
    bodyA,
    kit.mats.variant(
      "lacquer_red",
      { color: 0xa0140e, rough: 0.28, edge: 0x3a1a0a },
      "xb-mag-red",
    ),
  );
  // brass furniture shared by every magazine: corner caps, window frames, the string hook and lever pins
  const br = M();
  for (const s of [1, -1]) {
    for (const z of [0.0, ML]) {
      for (const y of [MB, MB + MH]) {
        // corner piece: an L of brass wrapping the edge, with a dome nail
        const zz = z === 0 ? 0.008 : ML - 0.008;
        const yy = y === MB ? MB + 0.008 : MB + MH - 0.008;
        br.add(
          box(0.0014, 0.02, 0.02, { bevel: 0.0005, r: 0.004 }),
          "brass_aged",
          { at: [s * (MW / 2 + 0.0004), yy, zz], wear: 0.6 },
        );
        br.add(box(MW + 0.002, 0.0014, 0.02, { bevel: 0.0005 }), "brass_aged", {
          at: [0, y === MB ? MB - 0.0003 : MB + MH + 0.0053, zz],
          wear: 0.6,
        });
        br.add(
          sphere(0.0016, { seg: 8, rings: 5, squash: [0.6, 1, 1] }),
          "brass_aged",
          { at: [s * (MW / 2 + 0.0012), yy, zz], wear: 0.4 },
        );
      }
    }
    // window frame
    br.add(
      prism(
        [
          [0.031, MB + 0.012, 0.005],
          [0.254, MB + 0.012, 0.005],
          [0.254, MB + MH - 0.008, 0.005],
          [0.031, MB + MH - 0.008, 0.005],
        ],
        0.0012,
        {
          bevel: 0.0004,
          holes: [
            [
              [0.035, MB + 0.016, 0.004],
              [0.25, MB + 0.016, 0.004],
              [0.25, MB + MH - 0.012, 0.004],
              [0.035, MB + MH - 0.012, 0.004],
            ],
          ],
        },
      ),
      "brass_aged",
      { at: [s * (MW / 2 + 0.0004), 0, 0], wear: 0.5 },
    );
    // lever pin with a washer
    br.add(rod(0.0042, 0, 0.004, { seg: 14, r: 0.0008 }), "brass_aged", {
      rot: [0, (s * PI) / 2, 0],
      at: [s * (MW / 2), PIN[0], PIN[1]],
      wear: 0.5,
    });
    br.add(rod(0.0024, 0, LX + 0.003 - MW / 2, { seg: 10 }), "brass_aged", {
      rot: [0, (s * PI) / 2, 0],
      at: [s * (MW / 2), PIN[0], PIN[1]],
      wear: 0.4,
    });
  }
  // string hook: iron tooth under the back of the magazine
  br.add(
    prism(
      [
        [-0.004, MB, 0.001],
        [0.022, MB, 0.001],
        [0.018, MB - 0.004, 0.002],
        [0.004, MB - 0.004, 0.001],
        [-0.004, MB - 0.0012, 0.001],
      ],
      0.0055,
      { bevel: 0.0006 },
    ),
    "brass_aged",
    { color: 0x6a5a48, wear: 0.5 },
  );
  const magBrass = br.build("mag-brass");
  const magBase = only(bodyBase.build("mag-wood"), "base,b");
  const magA = only(bodyA.build("mag-red"), "a");
  mag.add(magBase, magA, magBrass);

  // bolts: bamboo shaft, forged iron head, paper vanes laid flat so they stack
  const bolt = (m, y, opts = {}) => {
    const z0 = 0.004;
    m.add(rod(0.0031, z0, z0 + BL - 0.024, { seg: 8, r: 0.0008 }), "bamboo", {
      at: [0, y, 0],
      color: opts.tone ?? 0xffffff,
    });
    // node marks on the shaft
    m.add(rod(0.0034, z0 + 0.11, z0 + 0.114, { seg: 8 }), "bamboo", {
      at: [0, y, 0],
      color: 0xc8b480,
    });
    // socket and four-sided head
    m.add(
      lathe(
        [
          [z0 + BL - 0.03, 0],
          [z0 + BL - 0.03, 0.0035, 0.0006],
          [z0 + BL - 0.022, 0.0042, 0.0006],
          [z0 + BL - 0.02, 0.0046, 0.0004],
          [z0 + BL, 0, 0],
        ],
        { seg: 4, flat: true },
      ),
      "iron_cast",
      { at: [0, y, 0], rot: [0, 0, PI / 4], wear: 0.5 },
    );
    // nock and vanes
    m.add(box(0.0014, 0.0064, 0.007, { bevel: 0.0003 }), "bamboo", {
      at: [0, y, z0 + 0.0035],
      color: 0x3a2a1a,
      wear: 0.3,
    });
    m.add(
      prism(
        [
          [0.0028, 0.012, 0.001],
          [0.0028, 0.05, 0.001],
          [0.0062, 0.044, 0.002],
          [0.0062, 0.016, 0.002],
        ],
        0.0006,
        { plane: "top", bevel: 0.0002 },
      ),
      opts.vane ?? "paper_kraft",
      { at: [0, y, 0], mirror: true, wear: 0.2 },
    );
  };
  // stack in the magazine (sinks as it empties)
  const NST = 9;
  const stackY = (i) => MB + 0.0072 + i * PITCH;
  const sk = M();
  for (let i = 0; i < NST; i++)
    bolt(sk, stackY(i), { tone: [0xffffff, 0xe8dcc0, 0xf4ecd8][i % 3] });
  const stack = new THREE.Group();
  stack.name = "bolt-stack";
  stack.add(sk.build("bolts"));
  mag.add(stack);
  // the bolt in the launch groove
  const gb = M();
  bolt(gb, TOP + 0.002, {});
  const grooveBolt = new THREE.Group();
  grooveBolt.name = "groove-bolt";
  grooveBolt.add(gb.build("groove-bolt"));
  mag.add(grooveBolt);

  // ------------------------------------------------------------------ lever (pivots on the front of the stock)
  const LL = 0.465;
  const lv = M();
  for (const s of [1, -1]) {
    lv.add(
      prism(
        [
          [0.012, -0.007, 0.007],
          [0.012, 0.007, 0.007],
          [-0.4, 0.0065, 0.004],
          [-0.44, 0.012, 0.006],
          [-LL, 0.012, 0.006],
          [-LL, -0.004, 0.006],
          [-0.42, -0.006, 0.006],
          [-0.12, -0.006, 0.004],
        ],
        0.005,
        {
          bevel: 0.0012,
          bevelSeg: 2,
          holes: [
            [
              [-0.242, -0.0026, 0.0026],
              [-0.386, -0.0026, 0.0026],
              [-0.386, 0.0026, 0.0026],
              [-0.242, 0.0026, 0.0026],
            ],
          ],
        },
      ),
      LACB,
      { at: [s * LX, 0, 0], wear: 0.5 },
    );
    // iron strap on the slot and the pivot eye
    lv.add(rod(0.0085, 0, 0.0055, { seg: 18, r: 0.001 }), "iron_cast", {
      rot: [0, (s * PI) / 2, 0],
      at: [s * (LX - 0.0027), 0, 0],
      wear: 0.5,
    });
    for (const z of [-0.237, -0.391])
      lv.add(box(0.0062, 0.016, 0.005, { bevel: 0.0008 }), "iron_cast", {
        at: [s * LX, 0.0, z],
        wear: 0.5,
      });
  }
  // handle: crossbar with a turned wooden grip
  lv.add(rod(0.0035, -LX - 0.002, LX + 0.002, { seg: 10 }), "iron_cast", {
    rot: [0, PI / 2, 0],
    at: [0, 0.004, -LL + 0.008],
    wear: 0.4,
  });
  lv.add(
    lathe(
      [
        [-0.035, 0],
        [-0.035, 0.0075, 0.003],
        [-0.02, 0.0095, 0.008],
        [0.02, 0.0095, 0.008],
        [0.035, 0.0075, 0.003],
        [0.035, 0],
      ],
      { seg: 16 },
    ),
    "wood_rose",
    { rot: [0, PI / 2, 0], at: [0, 0.004, -LL + 0.008] },
  );
  const HR = 0.0095; // handle grip radius
  const lever = lv.build("lever");
  lever.position.set(0, LP[0], LP[1]);

  // ------------------------------------------------------------------ branch 甲 火箭: powder tubes on the bolts, slow match at the front
  const ember = kit.mats.glow(0xff5a14, 3).clone();
  ember.name = "xb-ember";
  ember.userData.glow = 3;
  kit.mats.glowMats.push(ember);
  const powder = (m, y, side) => {
    // red paper rocket tube tied beside the shaft behind the head, gilt-banded, with a fuse running back
    const z = BL - 0.098;
    const x = side * 0.0082;
    m.add(rod(0.0033, z, z + 0.05, { seg: 8, r: 0.001 }), "paper_red", {
      at: [x, y + 0.0002, 0],
      wear: 0.3,
    });
    // tied on with two turns of cord and a gilt paper band
    for (const [z0, z1] of [
      [0.008, 0.0112],
      [0.0225, 0.0265],
      [0.036, 0.0392],
    ])
      m.add(rod(0.00345, z + z0, z + z1, { seg: 8 }), "cord_red", {
        at: [x, y + 0.0002, 0],
        wear: 0.25,
      });
    m.add(
      sweep(
        [
          [x, y + 0.0002, z],
          [x * 0.85, y + 0.0012, z - 0.008],
          [x * 0.45, y + 0.0018, z - 0.02],
          [x * 0.25, y + 0.0016, z - 0.034],
        ],
        0.0006,
        { seg: 4, steps: 6 },
      ),
      "cord_red",
      { wear: 0.2, color: 0x5a3a2a },
    );
  };
  const pa = M();
  // a tube on both sides of every bolt so the rockets show through either window
  for (let i = 0; i < NST; i++) {
    powder(pa, stackY(i), 1);
    powder(pa, stackY(i), -1);
  }
  const stackA = only(pa.build("powder-stack"), "a");
  stack.add(stackA);
  const pg = M();
  powder(pg, TOP + 0.002, -1);
  powder(pg, TOP + 0.002, 1);
  grooveBolt.add(only(pg.build("powder-groove"), "a"));
  // 火折子 slow-match holder clipped to the left of the fore-stock ahead of the support hand, where neither
  // forearm hides it from the shooter: bamboo tube, brass cap on a chain, a smouldering match cord curling
  // out of the mouth
  const FX = SW / 2 + 0.0095,
    FY = 0.05,
    FZ0 = 0.36,
    FZ1 = 0.448;
  const fa = M();
  fa.add(tube(0.0072, 0.0052, FZ0, FZ1, { seg: 18, r: 0.0008 }), "bamboo", {
    at: [FX, FY, 0],
  });
  fa.add(
    rod(0.0072, FZ0 - 0.004, FZ0 + 0.001, { seg: 18, r: 0.0015 }),
    "bamboo",
    { at: [FX, FY, 0], color: 0xd8c89a },
  );
  fa.add(rod(0.0052, FZ1 - 0.03, FZ1 - 0.004, { seg: 12 }), "paper_kraft", {
    at: [FX, FY, 0],
    color: 0x5a4a3a,
  });
  for (const z of [FZ0 + 0.02, FZ1 - 0.024]) {
    fa.add(tube(0.0081, 0.0071, z, z + 0.006, { seg: 18 }), "brass_aged", {
      at: [FX, FY, 0],
      wear: 0.5,
    });
    fa.add(box(0.008, 0.011, 0.006, { bevel: 0.0008 }), "brass_aged", {
      at: [SW / 2 + 0.003, FY - 0.0055, z + 0.003],
      wear: 0.5,
    });
  }
  // brass cap hanging open on a little chain
  fa.add(
    lathe(
      [
        [0, 0],
        [0, 0.0083, 0.0008],
        [0.018, 0.0083, 0.0008],
        [0.018, 0.0074],
        [0.002, 0.0074],
      ],
      { seg: 18 },
    ),
    "brass_aged",
    {
      rot: [2.5, 0, 0],
      at: [FX, FY - 0.018, FZ1 - 0.006],
      wear: 0.5,
    },
  );
  for (let i = 0; i < 6; i++) {
    fa.add(torus(0.0018, 0.0005, { seg: 4, around: 8 }), "brass_aged", {
      at: [FX + 0.0002, FY - 0.006 - i * 0.003, FZ1 - 0.004 + i * 0.0012],
      rot: [0, (i % 2) * (PI / 2), 0],
      wear: 0.3,
    });
  }
  // the slow match: a hemp cord curling up out of the tube, charred towards the end, a hot ember at the tip
  // (it curls outwards, clear of the lever arm passing overhead)
  const MATCH = [
    [FX, FY, FZ1 - 0.01],
    [FX + 0.0005, FY + 0.001, FZ1 + 0.005],
    [FX + 0.004, FY + 0.004, FZ1 + 0.014],
    [FX + 0.01, FY + 0.008, FZ1 + 0.018],
    [FX + 0.016, FY + 0.012, FZ1 + 0.015],
  ];
  fa.add(
    sweep(MATCH.slice(0, 4), 0.0024, { seg: 8, steps: 14 }),
    "paper_kraft",
    { color: 0xa08060, wear: 0.3 },
  );
  fa.add(sweep(MATCH.slice(3), 0.0022, { seg: 8, steps: 6 }), "paper_kraft", {
    color: 0x1a1410,
  });
  const EMB = [FX + 0.0175, FY + 0.013, FZ1 + 0.0142];
  fa.add(sphere(0.0034, { seg: 12, rings: 8 }), ember, { at: EMB });
  // a soft halo round the coal so it reads from a distance
  fa.add(
    sphere(0.0075, { seg: 12, rings: 8 }),
    kit.mats.glow(0xff6a1c, 1.6, { opacity: 0.28 }),
    { at: EMB },
  );
  const matchA = only(fa.build("slow-match"), "a");

  // ------------------------------------------------------------------ branch 乙 符矢: talisman strips, bells, red thread, big talisman
  const bp = M();
  // red thread wound round the fore-stock and the wrist (rounded-rectangle spiral)
  const wind = (z0, z1, turns, yc, a, b) => {
    const pts = [];
    const n = Math.ceil(turns * 28);
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      const ang = t * turns * TAU;
      const c = Math.cos(ang),
        s = Math.sin(ang);
      const e = 0.4; // superellipse exponent -> rounded rectangle
      pts.push([
        Math.sign(c) * Math.abs(c) ** e * a,
        yc + Math.sign(s) * Math.abs(s) ** e * b,
        z0 + (z1 - z0) * t,
      ]);
    }
    bp.add(
      sweep(pts, 0.0011, { seg: 5, steps: n * 2, caps: false }),
      "cord_red",
      { wear: 0.15 },
    );
  };
  wind(
    0.3,
    0.385,
    13,
    (TOP + botAt(0.34)) / 2,
    SW / 2 + 0.0012,
    (TOP - botAt(0.34)) / 2 + 0.0012,
  );
  {
    // round the wrist, just ahead of the brass band
    const q = buttSec(-0.04, 0.0012);
    wind(-0.048, -0.022, 6, q.c[1], q.a, q.bt);
  }
  // a tail of red thread hanging from the front winding with a knot
  bp.add(
    sweep(
      [
        [-SW / 2 - 0.0015, BOT + 0.012, 0.386],
        [-SW / 2 - 0.003, BOT - 0.002, 0.392],
        [-SW / 2 - 0.002, BOT - 0.022, 0.389],
        [-SW / 2 - 0.004, BOT - 0.04, 0.394],
      ],
      0.0011,
      { seg: 5, steps: 20 },
    ),
    "cord_red",
    { wear: 0.15 },
  );
  bp.add(sphere(0.0026, { seg: 8, rings: 6 }), "cord_red", {
    at: [-SW / 2 - 0.0028, BOT - 0.002, 0.392],
    wear: 0.2,
  });
  const partsB = only(bp.build("branch-b"), "b");
  // yellow strips: a band and a short streamer on each stacked bolt, long streamers on the groove bolt
  const strip = (m, pts, w) => {
    // flat ribbon along a path: a thin prism-free strip built from quads
    const P = pts.map((p) => new THREE.Vector3(...p));
    const pos = [],
      uv = [];
    for (let i = 0; i < P.length - 1; i++) {
      const a = P[i],
        b = P[i + 1];
      const d = new THREE.Vector3().subVectors(b, a).normalize();
      const side = new THREE.Vector3(1, 0, 0)
        .addScaledVector(d, -d.x)
        .normalize()
        .multiplyScalar(w / 2);
      const a0 = a.clone().sub(side),
        a1 = a.clone().add(side),
        b0 = b.clone().sub(side),
        b1 = b.clone().add(side);
      pos.push(
        ...a0.toArray(),
        ...b0.toArray(),
        ...b1.toArray(),
        ...a0.toArray(),
        ...b1.toArray(),
        ...a1.toArray(),
      );
      const u0 = i / (P.length - 1),
        u1 = (i + 1) / (P.length - 1);
      uv.push(0, u0, 0, u1, 1, u1, 0, u0, 1, u1, 1, u0);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
    g.computeVertexNormals();
    m.add(adopt(g, 0.1), stripMat);
  };
  const stripMat = new THREE.MeshStandardMaterial({
    map: kit.canvas("xb-strip", 64, 512, (g, W, H) => {
      g.fillStyle = "#e0b43a";
      g.fillRect(0, 0, W, H);
      g.strokeStyle = "#b8160c";
      g.lineWidth = 3;
      g.beginPath();
      for (let y = 20; y < H - 10; y += 4)
        g.lineTo(
          W / 2 + Math.sin(y * 0.09) * W * 0.25 + Math.sin(y * 0.031) * W * 0.1,
          y,
        );
      g.stroke();
      g.fillStyle = "#b8160c";
      g.font = `700 ${W * 0.7}px ${kit.FONT_KAI}`;
      g.textAlign = "center";
      g.fillText("令", W / 2, W * 0.75);
      for (let i = 0; i < 200; i++) {
        g.fillStyle = `rgba(90,50,10,${rnd() * 0.15})`;
        g.fillRect(rnd() * W, rnd() * H, 2, 2);
      }
    }),
    roughness: 0.85,
    side: THREE.DoubleSide,
  });
  stripMat.name = "xb-strip";
  const sb = M();
  for (let i = 0; i < NST; i++) {
    const y = stackY(i);
    sb.add(rod(0.0036, 0.07, 0.082, { seg: 8 }), stripMat, {
      at: [0, y, 0],
      wear: 0.2,
    });
    const sway = (i % 3) - 1;
    strip(
      sb,
      [
        [0.0, y + 0.0034, 0.08],
        [0.001 * sway, y + 0.0036, 0.12],
        [0.002 * sway, y + 0.0036, 0.16],
        [0.003 * sway, y + 0.0036, 0.2],
      ],
      0.006,
    );
  }
  stack.add(only(sb.build("strip-stack"), "b"));
  const sg = M();
  sg.add(rod(0.0036, 0.02, 0.032, { seg: 8 }), stripMat, {
    at: [0, TOP + 0.002, 0],
    wear: 0.2,
  });
  for (const [dx, len, drop] of [
    [0.004, 0.085, 0.03],
    [-0.005, 0.065, 0.045],
  ]) {
    const pts = [];
    for (let k = 0; k <= 8; k++) {
      const t = k / 8;
      pts.push([
        dx * t + Math.sin(t * 5 + dx * 300) * 0.004 * t,
        TOP + 0.005 - drop * t * t,
        0.026 - len * t,
      ]);
    }
    strip(sg, pts, 0.009);
  }
  grooveBolt.add(only(sg.build("strip-groove"), "b"));
  // big talisman pasted on the right side of the magazine
  // big talisman pasted across each side of the magazine, a little askew
  for (const sx of [1, -1])
    mag.add(
      only(
        label({
          key: "xb-talisman",
          w: 0.074,
          h: 0.11,
          px: 512,
          face: sx > 0 ? "x" : "-x",
          at: [
            sx * (MW / 2 + 0.0017),
            MB + MH / 2 + 0.002,
            sx > 0 ? 0.1 : 0.085,
          ],
          rot: [sx * 0.035, 0, 0],
          rough: 0.85,
          opaque: true,
          draw(g, W, H) {
            g.fillStyle = "#e3b640";
            g.fillRect(0, 0, W, H);
            // torn, darker edges
            g.strokeStyle = "rgba(120,70,10,0.5)";
            g.lineWidth = 14;
            g.strokeRect(0, 0, W, H);
            g.strokeStyle = "#b3140c";
            g.lineWidth = 6;
            g.strokeRect(22, 22, W - 44, H - 44);
            g.lineWidth = 2.5;
            g.strokeRect(34, 34, W - 68, H - 68);
            g.fillStyle = "#b3140c";
            g.textAlign = "center";
            g.textBaseline = "middle";
            // the three-dot crown and 敕令
            for (const dx of [-0.16, 0, 0.16]) {
              g.beginPath();
              g.arc(W / 2 + dx * W, H * 0.085, W * 0.03, 0, TAU);
              g.fill();
            }
            g.font = `900 ${W * 0.34}px ${kit.FONT_KAI}`;
            g.fillText("敕", W / 2, H * 0.21);
            g.fillText("令", W / 2, H * 0.4);
            // squiggle script down the rest
            g.strokeStyle = "#b3140c";
            g.lineWidth = 9;
            g.lineCap = "round";
            g.lineJoin = "round";
            g.beginPath();
            let x = W / 2,
              y = H * 0.5;
            g.moveTo(x, y);
            for (let k = 0; k < 26; k++) {
              x = W / 2 + Math.sin(k * 1.7) * W * (0.18 + 0.08 * Math.sin(k));
              y += H * 0.014;
              g.quadraticCurveTo(
                W / 2 + Math.cos(k * 2.3) * W * 0.28,
                y - H * 0.012,
                x,
                y,
              );
            }
            g.stroke();
            g.lineWidth = 6;
            for (const yy of [0.62, 0.74]) {
              g.beginPath();
              g.moveTo(W * 0.22, H * yy);
              g.bezierCurveTo(
                W * 0.4,
                H * (yy - 0.03),
                W * 0.6,
                H * (yy + 0.03),
                W * 0.78,
                H * yy,
              );
              g.stroke();
            }
            g.font = `700 ${W * 0.12}px ${kit.FONT_KAI}`;
            g.fillText("急急如律令", W / 2, H * 0.9);
            // seal
            g.fillStyle = "rgba(190,20,12,0.85)";
            g.fillRect(W * 0.62, H * 0.8, W * 0.2, W * 0.2);
            g.fillStyle = "#e3b640";
            g.font = `900 ${W * 0.12}px ${kit.FONT_KAI}`;
            g.fillText("印", W * 0.72, H * 0.8 + W * 0.1);
            for (let i = 0; i < 900; i++) {
              g.fillStyle = `rgba(110,60,10,${rnd() * 0.12})`;
              g.fillRect(rnd() * W, rnd() * H, 2 + rnd() * 3, 2 + rnd() * 3);
            }
          },
        }),
        "b",
      ),
    );
  // bronze bells on red cords at the limb tips (they follow the tips and swing after each shot)
  const bells = [1, -1].map((s) => {
    const m = M();
    m.add(
      sweep(
        [
          [0, 0, 0],
          [0, -0.008, 0.001],
          [0, -0.018, 0],
          [0, -0.026, 0],
        ],
        0.0009,
        { seg: 5, steps: 12 },
      ),
      "cord_red",
      { wear: 0.15 },
    );
    // round jingle bell with its slot and a loop
    m.add(sphere(0.0118, { seg: 16, rings: 12 }), "bronze", {
      at: [0, -0.038, 0],
      wear: 0.35,
    });
    m.add(torus(0.0118, 0.0013, { seg: 6, around: 20 }), "bronze", {
      at: [0, -0.038, 0],
      rot: [PI / 2, 0, 0],
      wear: 0.5,
    });
    m.add(box(0.0026, 0.0024, 0.0105, { bevel: 0.0004, r: 0.001 }), "bronze", {
      at: [0, -0.0486, 0],
      rot: [0, PI / 2, 0],
      color: 0x181210,
      wear: 0,
    });
    m.add(sphere(0.0018, { seg: 8, rings: 5 }), "bronze", {
      at: [0, -0.047, -0.0077],
      color: 0x181210,
      wear: 0,
    });
    m.add(sphere(0.0018, { seg: 8, rings: 5 }), "bronze", {
      at: [0, -0.047, 0.0077],
      color: 0x181210,
      wear: 0,
    });
    m.add(torus(0.0022, 0.0007, { seg: 5, around: 10 }), "bronze", {
      at: [0, -0.0262, 0],
      rot: [0, PI / 2, 0],
      wear: 0.4,
    });
    const n = only(m.build(`bell-${s > 0 ? "l" : "r"}`), "b");
    return n;
  });

  // ------------------------------------------------------------------ assemble
  const root = new THREE.Group();
  root.name = "crossbow";
  root.add(
    stock,
    trigger,
    prod,
    ...segs,
    serving,
    mag,
    lever,
    matchA,
    partsB,
    ...bells,
  );

  // the right hand rides the lever handle through this node: it follows the handle's position fully but
  // only part of the lever's rocking, so the wrist does not snap back and forth with every shot
  const HANDLE = new THREE.Vector3(0, 0.004, -LL + 0.008);
  const ride = new THREE.Object3D();
  ride.name = "lever-ride";
  root.add(ride);
  let lever0 = null;
  const place = (d) => {
    mag.position.z = MZ + d;
    const dy = MB - 0 + PIN[0] - MB - LP[0];
    const dz = MZ + d + PIN[1] - LP[1];
    lever.rotation.x = Math.atan2(dy, -dz);
    if (lever0 === null) lever0 = Math.atan2(dy, -(MZ + PIN[1] - LP[1]));
    ride.position
      .copy(HANDLE)
      .applyAxisAngle(_x, lever.rotation.x)
      .add(lever.position);
    ride.rotation.x = (lever.rotation.x - lever0) * RIDE;
  };
  place(0);
  const ease = (k) => k * k * (3 - 2 * k);
  const span = (x, a, b) => ease(Math.min(1, Math.max(0, (x - a) / (b - a))));
  let swing = 0;

  // Reload, r 0 -> 1 over 1.8 s; the right hand never leaves the lever handle.
  //   0-0.1      the left hand lets go of the fore-end and takes the box from the left, over the lid
  //   0.1-0.22   box lifted straight up off its pins (woodKnock as it comes free)
  //   0.22-0.38  carried away down to the left, out of sight; a beat there while the full box is picked up
  //   0.5-0.68   back, hovering over the pins
  //   0.68-0.76  dropped onto the pins (woodKnock), a small settle to 0.84
  //   0.84-1     the hand goes back under the fore-end
  const LIFT = 0.06;
  const AWAY = [0.36, -0.42, -0.2]; // gun space, relative to the box's place on the stock
  const SWAP = 0.44; // the box is out of sight: from here on it is the full one
  function reload(r, pr, s) {
    const g = model && model.grips.left;
    if (r < 0) {
      if (g) g.mix = 0;
      mag.position.x = mag.position.y = 0;
      mag.rotation.set(0, 0, 0);
      return;
    }
    let up = 0,
      w = 0;
    if (r < 0.22) up = span(r, 0.1, 0.22);
    else if (r < 0.5) {
      up = 1;
      w = span(r, 0.22, 0.38);
    } else if (r < 0.68) {
      up = 1;
      w = 1 - span(r, 0.5, 0.68);
    } else up = 1 - span(r, 0.68, 0.76);
    // settle: a little bounce on the pins once it lands
    const settle =
      r > 0.76 && r < 0.84
        ? Math.sin(((r - 0.76) / 0.08) * Math.PI) * 0.0018
        : 0;
    mag.position.x = AWAY[0] * w;
    mag.position.y = LIFT * up + AWAY[1] * w + settle;
    mag.position.z += AWAY[2] * w; // place() has just set z
    // tipped towards the hand while it is carried
    mag.rotation.set(-0.3 * w, 0.4 * w, 0.6 * w);
    if (pr < 0.1 && r >= 0.1) s.cue("woodKnock");
    if (pr < 0.76 && r >= 0.76) s.cue("woodKnock");
    if (g) {
      g.to = "box";
      g.mix = r < 0.84 ? span(r, 0, 0.1) : 1 - span(r, 0.84, 0.99);
    }
  }

  const NOCUE = { cue() {} };
  const NOPREV = { cycle: 1, reload: -1 };
  let model;
  model = kit.weapon({
    id: "crossbow",
    root,
    anchors: { muzzle: [0, TOP + 0.003, FRONT + 0.004] },
    // right hand works the lever handle (overhand, knuckles up, fingers curled over the front of the bar);
    // left hand cradles the fore-end ahead of the prod
    hands: () => ({
      right: {
        parent: ride,
        at: [-0.008, HR * 0.98, -HR * 0.2],
        palm: [0, -1, 0.2],
        fingers: [0.22, 0.2, 1],
        pose: { base: "wrap", r: HR + 0.006 },
      },
      left: {
        at: [-0.002, BOT + FT * 0.68, 0.33],
        palm: [0, 1, 0],
        fingers: [-0.97, 0, 0.22],
        // thumb up along the left flank, fingers up the right flank below the lever arm
        pose: {
          base: "wrap",
          r: 0.03,
          index: [1.45, 0.2, 0.1, 0.03],
          middle: [1.42, 0.25, 0.15],
          ring: [1.45, 0.2, 0.1, -0.02],
          pinky: [1.4, 0.2, 0.15, -0.05],
          thumb: [0.95, -0.1, -0.45, 0.1, 0.1],
        },
        // reloading: from the left, palm on the side wall, fingers hooked over the lid
        alts: {
          box: {
            parent: mag,
            at: [MW / 2 + 0.003, MB + MH - 0.0185, 0.15],
            palm: [-1, 0, 0],
            fingers: [0, 0.9, 0.42],
            pose: {
              base: "wrap",
              r: 0.03,
              index: [1.35, 1.15, 0.2, 0.04],
              middle: [1.35, 1.2, 0.2],
              ring: [1.35, 1.25, 0.25, -0.03],
              pinky: [1.35, 1.35, 0.3, -0.06],
              thumb: [0.3, -0.1, 0.95, 0.75, 0.6],
            },
          },
        },
      },
    }),
    view: {
      hip: { pos: [0.15, -0.245, -0.44], rot: [0.03, 0.075, -0.05] },
      // reloading: brought in a little and turned so the box lifts clear above the lever hand
      reload: { pos: [0.063, -0.017, 0.078], rot: [0.1, 0.2, -0.1] },
    },
    ownReload: true,
    show: { yaw: -0.85, pitch: 0.16, dist: 1.25 },
    update(s) {
      const c = s.cycle ?? 1;
      const p = s.prev || NOPREV;
      const pc = p.cycle ?? 1;
      const r = s.reload ?? -1;
      if (s.cue) {
        // the string looses on the shot, the lever draws it back, the box knocks home
        if (c < pc) s.cue("stringSnap");
        if (pc < 0.55 && c >= 0.55) s.cue("stringDraw");
        if (pc < 0.92 && c >= 0.92) s.cue("woodKnock", 0.7);
      }
      // magazine: forward to catch the string over 6..45%, hold, then back to draw it by 92%
      let d = 0;
      if (c > 0.06 && c < 0.45) d = ease((c - 0.06) / 0.39);
      else if (c >= 0.45 && c < 0.55) d = 1;
      else if (c >= 0.55 && c < 0.92) d = 1 - ease((c - 0.55) / 0.37);
      const caught = c >= 0.45;
      place(d * D);
      // string: on the hook when caught, otherwise straight across at brace (with a little vibration after the shot)
      const nockZ = caught ? MZ + d * D + 0.004 : BRACE;
      const draw = Math.max(
        0,
        Math.min(1, (BRACE - nockZ) / (BRACE - MZ - 0.004)),
      );
      prod.scale.set(1 - draw * 0.035, 1, 1 + draw * 0.55);
      const shake =
        !caught && c < 0.3 ? Math.sin(c * 140) * (0.3 - c) * 0.03 : 0;
      for (let i = 0; i < 2; i++) {
        const sx = i ? -1 : 1;
        _a.copy(tipLocal(sx)).multiply(prod.scale).add(prod.position);
        _b.set(0, SY, nockZ + shake);
        setSeg(segs[i], _a, _b);
      }
      serving.position.set(0, SY, nockZ + shake);
      if (s.cue) reload(r, p.reload ?? -1, s);
      else reload(r, r, NOCUE);
      // bolts: one rides in the groove whenever the string is on the hook; the stack sinks as the magazine empties
      const mag10 = s.mag || 10;
      // once the empty box is out of sight the one that comes back is full
      const rounds =
        r >= SWAP ? mag10 : Math.max(0, Math.min(mag10, s.rounds ?? mag10));
      grooveBolt.visible = caught && rounds > 0;
      const left = Math.max(0, rounds - (caught ? 1 : 0));
      stack.position.y = -Math.max(0, NST - Math.min(NST, left)) * PITCH;
      // 甲 ember breathes; 乙 bells swing after the shot
      const t = s.t || 0;
      const boost = (s.level || 1) >= 5 ? 1.8 : 1;
      ember.emissiveIntensity =
        (2.2 +
          1.2 * Math.sin(t * 3.1) * Math.sin(t * 7.7) +
          0.6 * Math.sin(t * 17)) *
        boost;
      const since = s.shot ?? 99;
      swing = since < 3 ? Math.exp(-since * 2.2) * Math.sin(since * 13) : 0;
      for (let i = 0; i < 2; i++) {
        const b = bells[i],
          sx = i ? -1 : 1;
        b.position.copy(tipLocal(sx)).multiply(prod.scale).add(prod.position);
        b.position.y -= 0.004;
        b.rotation.x = swing * 0.5 + Math.sin(t * 1.3 + i) * 0.04;
        b.rotation.z = swing * 0.25 * sx + Math.sin(t * 0.9 + i * 2) * 0.03;
      }
    },
  });
  return model;
}
