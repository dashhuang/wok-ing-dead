// 镇街 · pump-action shotgun.
// Reference model for the arsenal: shows how a weapon is assembled from the kit, how branch-only
// parts are tagged and how moving parts are driven. Gun space: +Z muzzle, +Y up, +X shooter's left.
// Origin sits at the trigger; the bore axis is at y = BORE.
const BORE = 0.04;
const TUBE = 0.011; // magazine tube axis

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
    label,
  } = kit;
  const PI = Math.PI;

  // ------------------------------------------------------------------ receiver (fixed)
  const body = M();
  // main block: cross-section extruded along Z, rounded shoulders, flat belly
  body.add(
    prism(
      [
        [-0.0205, -0.008, 0.002],
        [0.0205, -0.008, 0.002],
        [0.0205, 0.043, 0.004],
        [0.0125, 0.0595, 0.012],
        [-0.0125, 0.0595, 0.012],
        [-0.0205, 0.043, 0.004],
      ],
      0.214,
      { plane: "front", bevel: 0.0012 },
    ),
    "steel_park",
    { at: [0, 0, 0.022] },
  );
  // slanted tang that runs into the stock wrist
  body.add(
    prism(
      [
        [-0.112, 0.006],
        [-0.084, -0.004],
        [-0.084, 0.056, 0.004],
        [-0.112, 0.043, 0.006],
      ],
      0.038,
      { bevel: 0.004, bevelSeg: 2 },
    ),
    "steel_park",
  );
  // barrel ring / magazine yoke at the front of the receiver
  body.add(rod(0.0165, 0.127, 0.139, { r: 0.001 }), "steel_park", {
    at: [0, BORE, 0],
  });
  body.add(rod(0.0158, 0.127, 0.137, { r: 0.001 }), "steel_park", {
    at: [0, TUBE, 0],
  });
  // ejection port on the right (-X): dark opening with the bolt showing
  body.add(box(0.003, 0.021, 0.078, { bevel: 0.0008 }), "steel_dark", {
    at: [-0.0198, 0.037, 0.058],
  });
  // loading port underneath
  body.add(box(0.027, 0.003, 0.085, { bevel: 0.0008 }), "bore", {
    at: [0, -0.0072, 0.068],
  });
  body.add(box(0.022, 0.002, 0.07, { bevel: 0.0006, r: 0.002 }), "steel_bare", {
    at: [0, -0.0064, 0.062],
    rot: [0.05, 0, 0],
  });
  // trigger group housing + guard
  body.add(
    prism(
      [
        [-0.07, -0.006],
        [0.062, -0.006],
        [0.058, -0.014, 0.003],
        [-0.064, -0.016, 0.003],
      ],
      0.03,
      { bevel: 0.0015 },
    ),
    "steel_blued",
  );
  body.add(
    sweep(
      [
        [0, -0.014, 0.056],
        [0, -0.03, 0.05],
        [0, -0.045, 0.03],
        [0, -0.049, 0.004],
        [0, -0.045, -0.02],
        [0, -0.03, -0.036],
        [0, -0.014, -0.04],
      ],
      0.0034,
      { seg: 8, steps: 40 },
    ),
    "steel_blued",
    { scale: [2.2, 1, 1], wear: 0 },
  );
  // cross-bolt safety, slide release, receiver pins
  body.add(rod(0.0042, -0.0235, 0.0235, { r: 0.0008 }), "steel_bare", {
    rot: [0, PI / 2, 0],
    at: [0, -0.011, -0.05],
  });
  body.add(
    box(0.004, 0.009, 0.013, { bevel: 0.001, r: 0.002 }),
    "steel_blued",
    { at: [0.014, -0.02, 0.05] },
  );
  for (const z of [-0.012, 0.044]) {
    body.add(
      screw(0.0032, { axis: "x", slot: false, h: 0.0008 }),
      "steel_blued",
      { at: [0.0205, 0.012, z], mirror: true },
    );
  }
  // top: matted rib along the receiver
  for (let i = 0; i < 26; i++) {
    body.add(box(0.012, 0.0008, 0.0032, { bevel: 0.0003 }), "steel_park", {
      at: [0, 0.0599, -0.07 + i * 0.0072],
      wear: 0.25,
    });
  }
  const receiver = body.build("receiver");

  // engraving: 鎮街 filled with gold on the left side
  receiver.add(
    label({
      key: "shotgun-name",
      w: 0.07,
      h: 0.032,
      px: 512,
      face: "x",
      at: [0.0208, 0.024, 0.02],
      metal: 1,
      rough: 0.3,
      draw(g, W, H) {
        g.clearRect(0, 0, W, H);
        g.strokeStyle = "rgba(214,170,84,0.9)";
        g.lineWidth = 3;
        g.strokeRect(10, 10, W - 20, H - 20);
        g.strokeRect(18, 18, W - 36, H - 36);
        g.fillStyle = "#e2b65a";
        g.font = `700 ${H * 0.62}px ${kit.FONT_KAI}`;
        g.textAlign = "center";
        g.textBaseline = "middle";
        g.fillText("鎮  街", W / 2, H * 0.53);
      },
    }),
  );
  receiver.add(
    label({
      key: "shotgun-proof",
      w: 0.06,
      h: 0.009,
      px: 512,
      face: "-x",
      at: [-0.0208, 0.012, 0.03],
      metal: 0.8,
      rough: 0.4,
      draw(g, W, H) {
        g.clearRect(0, 0, W, H);
        g.fillStyle = "rgba(190,196,204,0.8)";
        g.font = `600 ${H * 0.62}px ${kit.FONT_MONO}`;
        g.textAlign = "center";
        g.textBaseline = "middle";
        g.fillText("NW-12  ·  12 GA  ·  JINLONG ST. ARMOURY", W / 2, H / 2);
      },
    }),
  );

  // ------------------------------------------------------------------ barrel + magazine tube (fixed)
  const tubes = M();
  const barrelEnd = 0.605;
  // standard barrel (base and A); B swaps in a longer one
  const barrel = M();
  barrel.add(
    tube(0.0118, 0.0092, 0.137, barrelEnd, { seg: 32, r: 0.0008 }),
    "steel_blued",
    { at: [0, BORE, 0] },
  );
  barrel.add(rod(0.0091, 0.14, barrelEnd - 0.012, { seg: 16 }), "bore", {
    at: [0, BORE, 0],
  });
  const barrelStd = only(barrel.build("barrel-std"), "base,a");
  // magazine tube, cap and barrel clamp
  tubes.add(rod(0.0122, 0.137, 0.545, { seg: 28, r: 0.0006 }), "steel_blued", {
    at: [0, TUBE, 0],
  });
  tubes.add(
    lathe(
      [
        [0.545, 0],
        [0.545, 0.0135, 0.001],
        [0.553, 0.0135, 0.001],
        [0.556, 0.012, 0.001],
        [0.566, 0.012, 0.004],
        [0.57, 0.006, 0.002],
        [0.57, 0],
      ],
      { seg: 28 },
    ),
    "steel_park",
    { at: [0, TUBE, 0] },
  );
  for (let i = 0; i < 12; i++) {
    // knurling on the cap
    tubes.add(box(0.0014, 0.0012, 0.009, { bevel: 0.0003 }), "steel_park", {
      at: [
        Math.cos((i / 12) * PI * 2) * 0.0122,
        TUBE + Math.sin((i / 12) * PI * 2) * 0.0122,
        0.561,
      ],
      rot: [0, 0, (i / 12) * PI * 2 + PI / 2],
    });
  }
  // clamp joining barrel and tube
  tubes.add(
    prism(
      [
        [-0.0145, TUBE - 0.004, 0.006],
        [-0.0125, TUBE - 0.0148, 0.008],
        [0.0125, TUBE - 0.0148, 0.008],
        [0.0145, TUBE - 0.004, 0.006],
        [0.0138, BORE + 0.004, 0.006],
        [0.009, BORE + 0.0138, 0.008],
        [-0.009, BORE + 0.0138, 0.008],
        [-0.0138, BORE + 0.004, 0.006],
      ],
      0.016,
      { plane: "front", bevel: 0.001 },
    ),
    "steel_park",
    { at: [0, 0, 0.49] },
  );
  tubes.add(screw(0.003, { axis: "x", hex: true, h: 0.0022 }), "steel_bare", {
    at: [0.014, (BORE + TUBE) / 2, 0.49],
    mirror: true,
  });
  // sling stud on the cap
  tubes.add(torus(0.006, 0.0014, { seg: 6, around: 18 }), "steel_bare", {
    at: [0, TUBE - 0.018, 0.562],
    rot: [0, PI / 2, 0],
  });
  const tubesNode = tubes.build("tubes");

  // bead sight (base only)
  const bead = M();
  bead.add(rod(0.0012, 0, 0.004, { seg: 8 }), "steel_blued", {
    rot: [-PI / 2, 0, 0],
    at: [0, BORE + 0.0115, 0.596],
  });
  bead.add(sphere(0.0022, { seg: 12, rings: 8 }), "brass", {
    at: [0, BORE + 0.0165, 0.596],
  });
  const beadNode = only(bead.build("bead"), "base");

  // ------------------------------------------------------------------ stock (fixed)
  const st = M();
  st.add(
    prism(
      [
        [-0.086, 0.047, 0.003],
        [-0.15, 0.033, 0.045],
        [-0.215, 0.041, 0.04],
        [-0.418, 0.02, 0.01],
        [-0.423, -0.098, 0.012],
        [-0.404, -0.104, 0.012],
        [-0.255, -0.05, 0.09],
        [-0.186, -0.068, 0.014],
        [-0.166, -0.063, 0.012],
        [-0.126, -0.014, 0.024],
        [-0.086, -0.008, 0.003],
      ],
      0.043,
      { bevel: 0.015, bevelSeg: 5 },
    ),
    "wood_walnut",
  );
  // recoil pad
  st.add(
    prism(
      [
        [-0.42, 0.021, 0.006],
        [-0.444, 0.017, 0.01],
        [-0.449, -0.097, 0.01],
        [-0.425, -0.102, 0.006],
      ],
      0.043,
      { bevel: 0.013, bevelSeg: 4 },
    ),
    "rubber",
  );
  st.add(
    prism(
      [
        [-0.416, 0.0215],
        [-0.421, 0.0212],
        [-0.426, -0.0995],
        [-0.421, -0.1005],
      ],
      0.0434,
      { bevel: 0.013, bevelSeg: 4 },
    ),
    "polymer",
  );
  // grip cap and sling stud
  st.add(
    lathe(
      [
        [0, 0],
        [0, 0.0125, 0.001],
        [0.003, 0.0125, 0.0015],
        [0.004, 0],
      ],
      { seg: 20, squash: [1, 1.25] },
    ),
    "steel_blued",
    { rot: [PI / 2 + 0.22, 0, 0], at: [0, -0.0665, -0.176] },
  );
  st.add(torus(0.006, 0.0014, { seg: 6, around: 18 }), "steel_bare", {
    at: [0, -0.093, -0.36],
    rot: [0, PI / 2, 0],
  });
  // red cloth strip tied round the butt: two overlapping turns, a knot and two hanging tails
  const band = (z, top, bot, tilt, grow) =>
    st.add(
      prism(
        [
          [-0.0232 - grow, bot - 0.002 - grow, 0.017],
          [0.0232 + grow, bot - 0.002 - grow, 0.017],
          [0.0232 + grow, top + 0.002 + grow, 0.017],
          [-0.0232 - grow, top + 0.002 + grow, 0.017],
        ],
        0.017,
        {
          plane: "front",
          bevel: 0.0008,
          holes: [
            [
              [-0.0218, bot - 0.0006, 0.0156],
              [0.0218, bot - 0.0006, 0.0156],
              [0.0218, top + 0.0006, 0.0156],
              [-0.0218, top + 0.0006, 0.0156],
            ],
          ],
        },
      ),
      "cloth_red",
      { at: [0, 0, z], rot: [0, tilt, 0], wear: 0.3 },
    );
  band(-0.292, 0.033, -0.063, 0.05, 0);
  band(-0.305, 0.0318, -0.0675, -0.07, 0.0007);
  st.add(
    sphere(0.0085, { seg: 12, rings: 8, squash: [0.6, 1.1, 1.25] }),
    "cloth_red",
    { at: [0.0245, 0.004, -0.298] },
  );
  for (const [dz, len, sway] of [
    [0, 0.085, 0.014],
    [0.013, 0.06, -0.008],
  ]) {
    st.add(
      prism(
        [
          [-0.305 + dz, 0.004, 0.002],
          [-0.292 + dz, 0.004, 0.002],
          [-0.29 + dz + sway * 0.4, 0.004 - len * 0.5, 0.02],
          [-0.288 + dz + sway, 0.004 - len, 0.001],
          [-0.303 + dz + sway, 0.004 - len - 0.005, 0.001],
          [-0.306 + dz + sway * 0.4, 0.004 - len * 0.5, 0.02],
        ],
        0.0016,
        { bevel: 0.0005 },
      ),
      "cloth_red",
      { at: [0.0262 + dz * 0.1, 0, 0], rot: [0, 0, -0.05], wear: 0.3 },
    );
  }
  const stock = st.build("stock");

  // ------------------------------------------------------------------ pump (moves)
  const pm = M();
  // walnut fore-end wrapped round the magazine tube, with finger grooves
  pm.add(
    prism(
      [
        [-0.0205, TUBE + 0.012, 0.006],
        [-0.0225, TUBE - 0.006, 0.012],
        [-0.014, TUBE - 0.0215, 0.012],
        [0.014, TUBE - 0.0215, 0.012],
        [0.0225, TUBE - 0.006, 0.012],
        [0.0205, TUBE + 0.012, 0.006],
        [0.0135, TUBE + 0.018, 0.004],
        [-0.0135, TUBE + 0.018, 0.004],
      ],
      0.205,
      { plane: "front", bevel: 0.004, bevelSeg: 3 },
    ),
    "wood_walnut",
    { at: [0, 0, 0.3125] },
  );
  for (let i = 0; i < 9; i++) {
    pm.add(
      prism(
        [
          [-0.0232, TUBE + 0.009, 0.002],
          [-0.0242, TUBE - 0.006, 0.01],
          [-0.015, TUBE - 0.0232, 0.01],
          [0.015, TUBE - 0.0232, 0.01],
          [0.0242, TUBE - 0.006, 0.01],
          [0.0232, TUBE + 0.009, 0.002],
          [0.019, TUBE + 0.009, 0.001],
          [0.0195, TUBE - 0.005, 0.008],
          [0.012, TUBE - 0.019, 0.008],
          [-0.012, TUBE - 0.019, 0.008],
          [-0.0195, TUBE - 0.005, 0.008],
          [-0.019, TUBE + 0.009, 0.001],
        ],
        0.011,
        { plane: "front", bevel: 0.0025, bevelSeg: 2 },
      ),
      "wood_walnut",
      { at: [0, 0, 0.236 + i * 0.019], color: 0xc8beb4, wear: 0.5 },
    );
  }
  // steel collar and action bars reaching back into the receiver
  pm.add(tube(0.0152, 0.0124, 0.2, 0.213, { seg: 24 }), "steel_blued", {
    at: [0, TUBE, 0],
  });
  pm.add(box(0.0022, 0.008, 0.16, { bevel: 0.0005 }), "steel_blued", {
    at: [0.0142, TUBE + 0.004, 0.135],
    mirror: true,
  });
  const pump = pm.build("pump");

  // bolt seen through the ejection port (moves with the pump)
  const bo = M();
  bo.add(box(0.004, 0.0185, 0.07, { bevel: 0.001 }), "steel_bare", {
    at: [-0.0188, 0.037, 0.06],
  });
  bo.add(box(0.0044, 0.006, 0.02, { bevel: 0.001 }), "steel_blued", {
    at: [-0.0188, 0.035, 0.036],
  });
  const bolt = bo.build("bolt");

  // trigger
  const tg = M();
  tg.add(
    prism(
      [
        [0.004, 0.006, 0.001],
        [0.0075, 0.004, 0.001],
        [0.0045, -0.01, 0.006],
        [0.008, -0.024, 0.002],
        [0.005, -0.025, 0.001],
        [0.0005, -0.011, 0.008],
      ],
      0.0062,
      { bevel: 0.0012, bevelSeg: 2 },
    ),
    "steel_bare",
  );
  const trigger = tg.build("trigger");
  trigger.position.set(0, -0.016, 0.006);

  // ------------------------------------------------------------------ branch A 龙息: heat shield, shell carrier, flash bowl
  const a = M();
  // ventilated heat shield over the barrel: rings joined by three ribs
  const shR = 0.0152;
  for (let i = 0; i < 17; i++) {
    a.add(
      lathe(
        [
          [0, shR - 0.0012, 0],
          [0, shR, 0.0004],
          [0.0125, shR, 0.0004],
          [0.0125, shR - 0.0012, 0],
        ],
        { seg: 16, arc: [-0.32, PI + 0.64] },
      ),
      "steel_park",
      { at: [0, BORE, 0.16 + i * 0.0178] },
    );
  }
  for (const ang of [0.05, PI / 2, PI - 0.05]) {
    a.add(box(0.0042, 0.0016, 0.3, { bevel: 0.0004 }), "steel_park", {
      at: [Math.cos(ang) * shR, BORE + Math.sin(ang) * shR, 0.31],
      rot: [0, 0, ang - PI / 2],
    });
  }
  for (const z of [0.168, 0.44]) {
    a.add(screw(0.0024, { axis: "x", h: 0.0012 }), "steel_bare", {
      at: [shR + 0.0002, BORE - 0.002, z],
      mirror: true,
    });
  }
  // flash bowl
  a.add(
    lathe(
      [
        [0.585, 0.0122, 0],
        [0.585, 0.0148, 0.001],
        [0.6, 0.0148, 0.002],
        [0.634, 0.0245, 0.0012],
        [0.634, 0.0222, 0.0006],
        [0.604, 0.0125, 0.002],
        [0.6, 0.0122, 0],
      ],
      { seg: 32 },
    ),
    "steel_park",
    { at: [0, BORE, 0] },
  );
  for (let i = 0; i < 8; i++) {
    const an = (i / 8) * PI * 2;
    a.add(box(0.0022, 0.0012, 0.02, { bevel: 0.0004 }), "bore", {
      at: [Math.cos(an) * 0.0195, BORE + Math.sin(an) * 0.0195, 0.619],
      rot: [0, 0, an + PI / 2],
    });
  }
  // shell carrier on the left side with six dragon's-breath shells
  a.add(box(0.004, 0.036, 0.132, { bevel: 0.001, r: 0.003 }), "polymer", {
    at: [0.0228, 0.032, 0.034],
  });
  for (let i = 0; i < 6; i++) {
    const z = -0.018 + i * 0.0208;
    a.add(box(0.012, 0.012, 0.0185, { bevel: 0.002, r: 0.004 }), "polymer", {
      at: [0.03, 0.036, z],
    });
    // shell: brass head down, red hull up (carried nose-up)
    a.add(
      lathe(
        [
          [0, 0],
          [0, 0.0108, 0.0006],
          [0.0015, 0.0108, 0.0006],
          [0.002, 0.0101, 0.0003],
          [0.016, 0.0101, 0.0005],
          [0.016, 0],
        ],
        { seg: 18 },
      ),
      "brass",
      { rot: [-PI / 2, 0, 0], at: [0.0315, 0.006, z] },
    );
    a.add(
      lathe(
        [
          [0.016, 0],
          [0.016, 0.01, 0],
          [0.058, 0.01, 0.0015],
          [0.062, 0.0085, 0.001],
          [0.062, 0.004, 0.001],
          [0.0605, 0],
        ],
        { seg: 18 },
      ),
      "paint_red",
      { rot: [-PI / 2, 0, 0], at: [0.0315, 0.006, z], wear: 0.3 },
    );
  }
  const partsA = only(a.build("branch-a"), "a");

  // ------------------------------------------------------------------ branch B 独头: long ported barrel, ghost ring, fibre front sight, cheek pad
  const b = M();
  const bEnd = 0.72;
  b.add(
    tube(0.0122, 0.0092, 0.137, bEnd - 0.07, { seg: 32, r: 0.0008 }),
    "steel_blued",
    { at: [0, BORE, 0] },
  );
  b.add(rod(0.0091, 0.14, bEnd - 0.08, { seg: 16 }), "bore", {
    at: [0, BORE, 0],
  });
  // muzzle brake: stacked baffles
  b.add(
    tube(0.0145, 0.0095, bEnd - 0.072, bEnd - 0.062, { seg: 32 }),
    "steel_park",
    { at: [0, BORE, 0] },
  );
  for (let i = 0; i < 5; i++) {
    const z0 = bEnd - 0.058 + i * 0.0116;
    b.add(
      tube(0.0145, 0.0095, z0, z0 + 0.0072, { seg: 32, r: 0.0006 }),
      "steel_park",
      { at: [0, BORE, 0] },
    );
  }
  for (const ang of [PI / 2, -PI / 2, 0.0, PI]) {
    b.add(box(0.0036, 0.0016, 0.064, { bevel: 0.0004 }), "steel_park", {
      at: [Math.cos(ang) * 0.0137, BORE + Math.sin(ang) * 0.0137, bEnd - 0.034],
      rot: [0, 0, ang - PI / 2],
    });
  }
  b.add(rod(0.0108, bEnd - 0.07, bEnd - 0.004, { seg: 20 }), "bore", {
    at: [0, BORE, 0],
  });
  // fibre-optic front sight on a ramp
  b.add(
    prism(
      [
        [bEnd - 0.105, BORE + 0.0118],
        [bEnd - 0.078, BORE + 0.0118],
        [bEnd - 0.08, BORE + 0.021, 0.002],
        [bEnd - 0.094, BORE + 0.021, 0.004],
      ],
      0.0064,
      { bevel: 0.001 },
    ),
    "steel_park",
  );
  b.add(
    rod(0.0014, bEnd - 0.098, bEnd - 0.079, { seg: 10 }),
    kit.mats.glow(0xff3a1a, 4),
    { at: [0, BORE + 0.0222, 0] },
  );
  // ghost-ring rear sight on a short rail
  b.add(kit.rail(-0.062, 0.06), "steel_park", { at: [0, 0.0692, 0] });
  b.add(box(0.02, 0.006, 0.022, { bevel: 0.001 }), "steel_park", {
    at: [0, 0.0715, -0.046],
  });
  b.add(torus(0.0062, 0.0017, { seg: 8, around: 24 }), "steel_blued", {
    at: [0, 0.0835, -0.046],
  });
  b.add(box(0.0024, 0.013, 0.014, { bevel: 0.0008 }), "steel_park", {
    at: [0.0112, 0.08, -0.046],
    mirror: true,
  });
  b.add(screw(0.003, { axis: "x", h: 0.002 }), "steel_bare", {
    at: [0.0112, 0.0725, -0.05],
  });
  // cheek pad strapped to the comb
  b.add(
    prism(
      [
        [-0.212, 0.036, 0.006],
        [-0.224, 0.056, 0.012],
        [-0.345, 0.047, 0.012],
        [-0.358, 0.024, 0.006],
      ],
      0.046,
      { bevel: 0.014, bevelSeg: 4 },
    ),
    "leather",
  );
  for (const z of [-0.235, -0.325]) {
    b.add(
      prism(
        [
          [-0.0235, 0.052, 0.012],
          [0.0235, 0.052, 0.012],
          [0.0235, -0.072 - (z + 0.235) * -0.25, 0.012],
          [-0.0235, -0.072 - (z + 0.235) * -0.25, 0.012],
        ],
        0.014,
        {
          plane: "front",
          bevel: 0.001,
          holes: [
            [
              [-0.0222, 0.0508, 0.011],
              [0.0222, 0.0508, 0.011],
              [0.0222, -0.0708 - (z + 0.235) * -0.25, 0.011],
              [-0.0222, -0.0708 - (z + 0.235) * -0.25, 0.011],
            ],
          ],
        },
      ),
      "cloth_black",
      { at: [0, 0, z] },
    );
  }
  const partsB = only(b.build("branch-b"), "b");

  // ------------------------------------------------------------------ the shell being loaded (reload only)
  // 12 gauge, axis along +Z with the brass head at z = 0
  const sh = M();
  sh.add(
    lathe(
      [
        [0, 0],
        [0, 0.0108, 0.0006],
        [0.0015, 0.0108, 0.0006],
        [0.002, 0.0101, 0.0003],
        [0.016, 0.0101, 0.0005],
        [0.016, 0],
      ],
      { seg: 18 },
    ),
    "brass",
    { wear: 0.4 },
  );
  sh.add(
    lathe(
      [
        [0.016, 0],
        [0.016, 0.01, 0],
        [0.058, 0.01, 0.0015],
        [0.062, 0.0085, 0.001],
        [0.062, 0.004, 0.001],
        [0.0605, 0],
      ],
      { seg: 18 },
    ),
    "paint_red",
    { wear: 0.3 },
  );
  const shell = sh.build("shell");
  shell.visible = false;

  // ------------------------------------------------------------------ assemble
  const root = new kit.THREE.Group();
  root.name = "shotgun";
  root.add(
    receiver,
    barrelStd,
    tubesNode,
    beadNode,
    stock,
    pump,
    bolt,
    trigger,
    partsA,
    partsB,
    shell,
  );

  // ------------------------------------------------------------------ reload choreography
  // Three beats, one shell each: the left hand drops off the pump, comes up from below with a shell
  // lying in its fingers, lifts it into the loading port under the receiver and thumbs it forward into
  // the tube (shellIn), then goes back down for the next. After the third it returns to the pump.
  // The hand rides the shell through second grips; a "via" grip carries it between them.
  const THREE = kit.THREE;
  const sm = (a, b, x) => {
    const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
    return t * t * (3 - 2 * t);
  };
  const lerp = (a, b, t) => a + (b - a) * t;
  const _inv = new THREE.Matrix4(),
    _m = new THREE.Matrix4(),
    _pa = new THREE.Vector3(),
    _pb = new THREE.Vector3(),
    _qa = new THREE.Quaternion(),
    _qb = new THREE.Quaternion(),
    _sc = new THREE.Vector3();
  const gripNode = (L, n) => (n === "main" ? L.anchor : L.alts[n].anchor);
  const gripPose = (L, n) => (n === "main" ? L.pose : L.alts[n].pose);
  /** Where grip n is right now, in gun space. */
  function capture(L, n, p, q) {
    root.updateWorldMatrix(true, false);
    _inv.copy(root.matrixWorld).invert();
    const o = gripNode(L, n);
    o.updateWorldMatrix(true, false);
    _m.multiplyMatrices(_inv, o.matrixWorld).decompose(p, q, _sc);
  }
  /** The via grip k of the way between two captured grips, with the pose of the nearer one. */
  function blend(L, a, b, k) {
    const v = L.alts.via;
    v.anchor.position.lerpVectors(_pa, _pb, k);
    v.anchor.quaternion.slerpQuaternions(_qa, _qb, k);
    v.pose = gripPose(L, k < 0.5 ? a : b);
  }
  // the shell's way in: S0 low and out of sight (tipped in the fingers), S1 under the port, S2 up in
  // the port, S3 thumbed forward into the tube. [x, y, z of the brass head, tilt about X]
  const S0 = [-0.13, -0.42, -0.17, 0.7],
    S1 = [0, -0.027, 0.034, 0],
    S2 = [0, -0.004, 0.036, 0],
    S3 = [0, TUBE, 0.075, 0];
  function placeShell(a, b, t) {
    shell.position.set(
      lerp(a[0], b[0], t),
      lerp(a[1], b[1], t),
      lerp(a[2], b[2], t),
    );
    shell.rotation.set(lerp(a[3], b[3], t), 0, 0);
  }
  // within one beat (u 0 -> 1): rise 0-0.4, into the port 0.4-0.55, forward 0.55-0.7, hand down 0.7-1
  function shellAt(u) {
    if (u < 0.4) placeShell(S0, S1, sm(0, 0.4, u));
    else if (u < 0.55) placeShell(S1, S2, sm(0.4, 0.55, u));
    else placeShell(S2, S3, sm(0.55, 0.7, u));
  }
  const BEATS = [0.08, 0.32, 0.56],
    BEAT = 0.24;
  // the gun comes level again while the hand travels back to the pump (span: in by, out from, out by)
  const reloadView = {
    pos: [0.04, 0.02, -0.03],
    rot: [0.45, 0.2, -1.15],
    span: [0.12, 0.74, 0.95],
  };

  let model;
  model = kit.weapon({
    id: "shotgun",
    root,
    anchors: {
      muzzle: {
        base: [0, BORE, barrelEnd + 0.002],
        a: [0, BORE, 0.636],
        b: [0, BORE, bEnd + 0.002],
      },
      eject: [-0.024, 0.04, 0.06],
    },
    // right hand round the wrist of the stock with the index on the trigger; left hand under the pump, riding it
    hands: {
      right: {
        // high on the wrist: thumb over the top, the other fingers round the underside, index in the guard
        at: [-0.0375, -0.0111, -0.0974],
        palm: [0.9, -0.383, -0.21],
        fingers: [-0.051, -0.569, 0.821],
        pose: {
          base: "wrap",
          r: 0.016,
          index: [0.33, 0.18, 0.16, 0.28],
          thumb: [0.73, -0.79, 0.45, 0, 1.4],
        },
        trigger: true,
      },
      left: {
        parent: pump,
        at: [0.0051, -0.0105, 0.3053],
        palm: [0.292, 0.956, 0.034],
        // the pump lies slantwise across the palm, in line with a forearm that comes up from
        // behind and below; fingers up the right side, thumb along the left
        // (finger angles from __lab.fitGrip)
        fingers: [-0.789, 0.221, 0.573],
        pose: {
          thumb: [0.46, -0.61, 0.64, 0.22, 0.24],
          index: [0.24, 0.87, 0.54, 0.03],
          middle: [0.79, 0.89, 0.55, 0.02],
          ring: [0.91, 1.01, 0.63, -0.02],
          pinky: [0.99, 1.09, 0.68, -0.01],
        },
        alts: {
          // a shell lying along the fingers, palm up, thumb along its left side
          shell: {
            parent: shell,
            at: [0, -0.0125, 0.026],
            palm: [0, 1, 0],
            fingers: [0, 0.1, 1],
            pose: { base: "pinch", thumb: [0.4, -0.4, 0.8, 0.3, 0.2] },
          },
          // pushing it home: hand flat under the receiver, thumb up behind the brass
          push: {
            parent: shell,
            at: [-0.004, -0.032, -0.008],
            palm: [-0.1, 1, 0],
            fingers: [0.45, 0.15, 0.9],
            pose: { base: "flat", thumb: [0.3, -0.5, 0.8, 0.2, 0.15] },
          },
          via: { at: [0, 0, 0], palm: [0, -1, 0], fingers: [0, 0, 1] },
        },
      },
    },
    ownReload: true,
    view: {
      hip: { pos: [0.15, -0.165, -0.3], rot: [0.012, 0.03, 0] },
      reload: reloadView,
    },
    show: { yaw: -0.85, pitch: 0.12 },
    // s.cycle: 0 -> 1 across the action after each shot. Pump runs back over the first 45% and home by 90%.
    update(s) {
      const c = s.cycle ?? 1;
      const back =
        c < 0.1
          ? 0
          : c < 0.45
            ? (c - 0.1) / 0.35
            : c < 0.55
              ? 1
              : c < 0.9
                ? 1 - (c - 0.55) / 0.35
                : 0;
      const e = back * back * (3 - 2 * back);
      pump.position.z = -0.082 * e;
      bolt.position.z = -0.062 * e;
      trigger.rotation.x = -(s.trigger || 0) * 0.32;
      const pc = s.prev ? s.prev.cycle : c;
      if (pc < 0.45 && c >= 0.45) s.cue("pumpBack");
      if (pc < 0.9 && c >= 0.9) s.cue("pumpFwd");
      reload(s);
    },
  });
  return model;

  //   0.00-0.08 off the pump and down to the first shell
  //   each beat (0.08, 0.32, 0.56; 0.24 long): up 40%, into the port 15%, thumbed home 15% (shellIn), down 30%
  //   after the third shell (0.73-1.00) from under the port back to the pump
  function reload(s) {
    const L = model && model.grips.left;
    const r = s.reload;
    if (r < 0 || r === undefined) {
      shell.visible = false;
      if (L) {
        L.to = null;
        L.mix = 0;
      }
      return;
    }
    for (let i = 0; i < BEATS.length; i++) {
      const at = BEATS[i] + BEAT * 0.68;
      if (s.prev && s.prev.reload < at && r >= at) s.cue("shellIn", 0.9);
    }
    if (!L || !L.alts.via) return;
    L.to = "via";
    L.mix = 1;
    if (r < BEATS[0]) {
      shellAt(0);
      shell.visible = true;
      capture(L, "main", _pa, _qa);
      capture(L, "shell", _pb, _qb);
      blend(L, "main", "shell", sm(0, BEATS[0], r));
      return;
    }
    const i = Math.min(2, Math.floor((r - BEATS[0]) / BEAT));
    const u = (r - BEATS[i]) / BEAT;
    if (u < 0.55) {
      // rising with the shell, then lifting it into the port
      shellAt(u);
      shell.visible = true;
      capture(L, "shell", _pa, _qa);
      capture(L, "push", _pb, _qb);
      blend(L, "shell", "push", sm(0.42, 0.55, u));
    } else if (u < 0.7) {
      shellAt(u);
      shell.visible = true;
      capture(L, "push", _pa, _qa);
      blend(L, "push", "push", 0);
    } else {
      // the shell is in the tube; the hand goes down for the next one (or back to the pump)
      shellAt(0.7);
      capture(L, "push", _pa, _qa);
      if (i === 2) {
        shell.visible = false;
        capture(L, "main", _pb, _qb);
        blend(L, "push", "main", sm(BEATS[2] + BEAT * 0.7, 1, r));
      } else {
        shellAt(0);
        shell.visible = u > 0.9;
        capture(L, "shell", _pb, _qb);
        blend(L, "push", "shell", sm(0.7, 1, u));
      }
    }
  }
}
