// 蜂巢 · submachine gun.
// Compact polymer receiver, magazine in the pistol grip, ventilated barrel shroud, full-length top
// rail with a micro red dot and a skeleton stock. Gun space: +Z muzzle, +Y up, +X shooter's left.
// Origin at the trigger; bore axis at y = BORE.
//   甲 弹鼓: twin drum, three-chamber compensator, vertical fore grip.
//   乙 电击: copper coil round the barrel (replaces the shroud), battery box and high-tension leads.
const BORE = 0.046;
const SLOPE = 0.197; // grip rake: dz per unit of -dy

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
    rail,
  } = kit;
  const PI = Math.PI;

  // honeycomb drawn on labels (the gun's motif)
  const hexes = (g, W, H, size, style, lw = 2) => {
    g.strokeStyle = style;
    g.lineWidth = lw;
    const dx = size * 1.5,
      dy = size * Math.sqrt(3);
    for (let cx = 0, i = 0; cx < W + size; cx += dx, i++) {
      for (let cy = (i % 2) * (dy / 2); cy < H + size; cy += dy) {
        g.beginPath();
        for (let k = 0; k < 6; k++) {
          const a = (k / 6) * PI * 2;
          const x = cx + Math.cos(a) * size * 0.9,
            y = cy + Math.sin(a) * size * 0.9;
          k ? g.lineTo(x, y) : g.moveTo(x, y);
        }
        g.closePath();
        g.stroke();
      }
    }
  };

  // ------------------------------------------------------------------ receiver (fixed)
  const body = M();
  // upper: octagonal-topped polymer shell
  body.add(
    prism(
      [
        [-0.022, 0.016, 0.003],
        [0.022, 0.016, 0.003],
        [0.022, 0.058, 0.003],
        [0.0145, 0.0715, 0.004],
        [-0.0145, 0.0715, 0.004],
        [-0.022, 0.058, 0.003],
      ],
      0.3,
      { plane: "front", bevel: 0.0016 },
    ),
    "polymer",
    { at: [0, 0, -0.01] },
  );
  // raised side panels and slanted cooling cuts
  body.add(box(0.0012, 0.03, 0.115, { bevel: 0.0005, r: 0.004 }), "polymer", {
    at: [0.0224, 0.036, -0.092],
    mirror: true,
    wear: 0.5,
  });
  for (let i = 0; i < 5; i++) {
    body.add(box(0.0012, 0.022, 0.0045, { bevel: 0.0004, r: 0.0015 }), "bore", {
      at: [0.0222, 0.036, 0.094 + i * 0.0095],
      rot: [0.35, 0, 0],
      mirror: true,
    });
  }
  // lower: trigger housing
  body.add(
    prism(
      [
        [-0.086, 0.019],
        [0.102, 0.019],
        [0.102, 0.004, 0.004],
        [0.074, -0.012, 0.004],
        [-0.07, -0.012, 0.003],
        [-0.086, -0.002, 0.004],
      ],
      0.038,
      { bevel: 0.002 },
    ),
    "polymer",
  );
  // steel trunnion where the barrel leaves the receiver, rear end cap
  body.add(rod(0.0215, 0.139, 0.151, { r: 0.0012, seg: 32 }), "steel_park", {
    at: [0, BORE - 0.002, 0],
  });
  body.add(
    box(0.041, 0.054, 0.012, { bevel: 0.0015, r: 0.004 }),
    "steel_park",
    { at: [0, 0.043, -0.165] },
  );
  body.add(rod(0.0042, -0.03, 0.03, { r: 0.0008, seg: 12 }), "steel_bare", {
    rot: [-PI / 2, 0, 0],
    at: [-0.0185, 0.043, -0.172],
    wear: 0.4,
  });
  // ejection port (right) and charging-handle slot (left)
  body.add(
    box(0.003, 0.021, 0.052, { bevel: 0.0008, r: 0.003 }),
    "steel_dark",
    { at: [-0.0212, 0.047, 0.03] },
  );
  body.add(box(0.002, 0.0062, 0.086, { bevel: 0.0005, r: 0.003 }), "bore", {
    at: [0.0216, 0.0525, 0.066],
  });
  // trigger guard
  body.add(
    prism(
      [
        [0.074, -0.008],
        [0.074, -0.024, 0.006],
        [0.053, -0.053, 0.012],
        [-0.009, -0.053, 0.003],
        [-0.009, -0.008],
      ],
      0.015,
      {
        bevel: 0.0015,
        holes: [
          [
            [0.0675, -0.0125, 0.003],
            [0.0675, -0.025, 0.005],
            [0.0505, -0.048, 0.01],
            [-0.0045, -0.048, 0.002],
            [-0.0045, -0.0125, 0.002],
          ],
        ],
      },
    ),
    "polymer",
  );
  // selector, magazine release, pins, sling loop
  body.add(rod(0.0052, 0, 0.0028, { r: 0.0008, seg: 16 }), "steel_park", {
    rot: [0, PI / 2, 0],
    at: [0.019, 0.006, -0.03],
    mirror: true,
    wear: 0.4,
  });
  body.add(box(0.0022, 0.0034, 0.014, { bevel: 0.0006 }), "steel_park", {
    at: [0.0218, 0.0085, -0.036],
    rot: [-0.5, 0, 0],
    mirror: true,
    wear: 0.4,
  });
  body.add(
    box(0.003, 0.0075, 0.011, { bevel: 0.0008, r: 0.002 }),
    "steel_park",
    { at: [0.0192, -0.004, -0.004], wear: 0.4 },
  );
  for (const [z, y] of [
    [0.085, 0.009],
    [-0.062, 0.009],
    [0.04, 0.0005],
  ]) {
    body.add(
      screw(0.0028, { axis: "x", slot: false, h: 0.0007 }),
      "steel_bare",
      { at: [0.019, y, z], mirror: true, wear: 0.3 },
    );
  }
  body.add(torus(0.0065, 0.0015, { seg: 6, around: 18 }), "steel_bare", {
    at: [0.0235, 0.03, 0.142],
    rot: [0, 0, 0],
    wear: 0.3,
  });
  // full-length top rail, folded back-up sights
  body.add(rail(-0.152, 0.134), "steel_park", { at: [0, 0.0839, 0] });
  for (const z of [0.118, -0.138]) {
    body.add(box(0.019, 0.0055, 0.03, { bevel: 0.001, r: 0.002 }), "polymer", {
      at: [0, 0.0872, z],
      wear: 0.5,
    });
    body.add(box(0.021, 0.004, 0.008, { bevel: 0.0008 }), "steel_park", {
      at: [0, 0.0862, z + (z > 0 ? -0.012 : 0.012)],
      wear: 0.4,
    });
  }
  // micro red dot: clamp, emitter housing, hooded window
  body.add(box(0.03, 0.0065, 0.04, { bevel: 0.001 }), "steel_park", {
    at: [0, 0.0872, -0.03],
  });
  body.add(screw(0.003, { axis: "x", hex: true, h: 0.0025 }), "steel_bare", {
    at: [0.015, 0.0868, -0.03],
    wear: 0.3,
  });
  body.add(box(0.028, 0.011, 0.02, { bevel: 0.0015, r: 0.002 }), "steel_dark", {
    at: [0, 0.0958, -0.041],
  });
  body.add(
    prism(
      [
        [-0.015, 0.0905, 0.003],
        [0.015, 0.0905, 0.003],
        [0.015, 0.113, 0.006],
        [-0.015, 0.113, 0.006],
      ],
      0.013,
      {
        plane: "front",
        bevel: 0.0008,
        holes: [
          [
            [-0.0122, 0.0935, 0.002],
            [0.0122, 0.0935, 0.002],
            [0.0122, 0.1105, 0.0045],
            [-0.0122, 0.1105, 0.0045],
          ],
        ],
      },
    ),
    "steel_dark",
    { at: [0, 0, -0.0225] },
  );
  body.add(
    box(0.0245, 0.0172, 0.0008, { bevel: 0 }),
    kit.mats.glass(0x9ad0ff, { opacity: 0.2, side: kit.THREE.DoubleSide }),
    { at: [0, 0.102, -0.0225] },
  );
  body.add(sphere(0.00075, { seg: 8, rings: 6 }), kit.mats.glow(0xff2a14, 6), {
    at: [0, 0.1035, -0.0228],
  });
  body.add(rod(0.003, 0, 0.004, { seg: 10, r: 0.0006 }), "steel_bare", {
    rot: [0, PI / 2, 0],
    at: [0.014, 0.096, -0.042],
    wear: 0.3,
  });
  // hinge block for the stock
  body.add(box(0.03, 0.034, 0.012, { bevel: 0.0015 }), "steel_park", {
    at: [0, 0.044, -0.176],
  });
  // the receiver, grip, barrel and stock never move: they share one merge (built after the stock)
  const receiver = new kit.THREE.Group();
  receiver.name = "receiver";

  receiver.add(
    label({
      key: "smg-name",
      w: 0.092,
      h: 0.026,
      px: 512,
      face: "x",
      at: [0.0232, 0.0365, -0.092],
      rough: 0.55,
      draw(g, W, H) {
        g.clearRect(0, 0, W, H);
        g.save();
        g.beginPath();
        g.rect(0, 0, H * 1.05, H);
        g.clip();
        hexes(g, H * 1.05, H, H * 0.19, "rgba(226,174,60,0.95)", 3);
        g.restore();
        g.fillStyle = "rgba(226,222,210,0.92)";
        g.textBaseline = "middle";
        g.font = `700 ${H * 0.6}px ${kit.FONT_KAI}`;
        g.fillText("蜂 巢", H * 1.3, H * 0.4);
        g.font = `600 ${H * 0.19}px ${kit.FONT_MONO}`;
        g.fillStyle = "rgba(200,196,186,0.8)";
        g.fillText("FC-9  ·  9×19  ·  1000 RPM", H * 1.32, H * 0.84);
      },
    }),
  );
  receiver.add(
    label({
      key: "smg-serial",
      w: 0.08,
      h: 0.012,
      px: 512,
      face: "-x",
      at: [-0.0232, 0.0285, -0.092],
      rough: 0.55,
      draw(g, W, H) {
        g.clearRect(0, 0, W, H);
        g.fillStyle = "rgba(200,196,186,0.75)";
        g.font = `600 ${H * 0.5}px ${kit.FONT_MONO}`;
        g.textAlign = "center";
        g.textBaseline = "middle";
        g.fillText("守夜人 · 金龍街  NW-09-0417", W / 2, H / 2);
      },
    }),
  );
  receiver.add(
    label({
      key: "smg-selector",
      w: 0.03,
      h: 0.012,
      px: 256,
      face: "x",
      at: [0.0193, 0.0125, -0.046],
      rough: 0.5,
      draw(g, W, H) {
        g.clearRect(0, 0, W, H);
        g.font = `700 ${H * 0.62}px ${kit.FONT_HEI}`;
        g.textBaseline = "middle";
        g.textAlign = "center";
        g.fillStyle = "#e8e2d4";
        g.fillText("安", W * 0.84, H / 2);
        g.fillStyle = "#e23a2a";
        g.fillText("連", W * 0.5, H / 2);
        g.fillText("單", W * 0.16, H / 2);
      },
    }),
  );

  // ------------------------------------------------------------------ grip (fixed)
  const gr = body;
  gr.add(
    prism(
      [
        // every corner rounded at least as much as the 9 mm bevel, or the inset side faces fold over
        [-0.004, 0.017, 0.0095],
        [-0.004, -0.008, 0.012],
        [-0.0262, -0.131, 0.0095],
        [-0.092, -0.131, 0.0095],
        [-0.069, -0.02, 0.014],
        [-0.084, -0.004, 0.0095],
        [-0.084, 0.017, 0.0095],
        [-0.06, 0.017],
      ],
      0.035,
      { bevel: 0.009, bevelSeg: 3 },
    ),
    "polymer_grip",
  );
  // magazine well lip
  gr.add(
    prism(
      [
        [-0.0225, -0.1285, 0.002],
        [-0.0935, -0.1285, 0.002],
        [-0.0945, -0.1345, 0.002],
        [-0.0215, -0.1345, 0.002],
      ],
      0.037,
      { bevel: 0.0015, bevelSeg: 2 },
    ),
    "polymer",
    { wear: 0.3 },
  );
  const grip = new kit.THREE.Group();
  grip.name = "grip";
  for (const face of ["x", "-x"]) {
    grip.add(
      label({
        key: "smg-grip-hex",
        w: 0.034,
        h: 0.082,
        px: 256,
        face,
        at: [face === "x" ? 0.0178 : -0.0178, -0.068, -0.05],
        spin: face === "x" ? -0.195 : 0.195,
        rough: 0.9,
        draw(g, W, H) {
          g.clearRect(0, 0, W, H);
          hexes(g, W, H, W * 0.11, "rgba(70,72,76,0.9)", 3);
        },
      }),
    );
  }

  // ------------------------------------------------------------------ magazine (base and 乙)
  const zc = (y) => -0.035 - (-0.01 - y) * SLOPE; // centre line of the magazine well
  const mg = M();
  mg.add(
    prism(
      [
        [zc(-0.118) + 0.017, -0.118],
        [zc(-0.226) + 0.017, -0.226],
        [zc(-0.226) - 0.017, -0.226],
        [zc(-0.118) - 0.017, -0.118],
      ],
      0.0225,
      { bevel: 0.0015 },
    ),
    "steel_park",
  );
  // stamped ribs and floor plate
  for (const dz of [0.007, -0.007]) {
    mg.add(
      prism(
        [
          [zc(-0.14) + dz + 0.0022, -0.14, 0.002],
          [zc(-0.215) + dz + 0.0022, -0.215, 0.002],
          [zc(-0.215) + dz - 0.0022, -0.215, 0.002],
          [zc(-0.14) + dz - 0.0022, -0.14, 0.002],
        ],
        0.0243,
        { bevel: 0.0009 },
      ),
      "steel_park",
      { wear: 0.5 },
    );
  }
  mg.add(
    prism(
      [
        [zc(-0.226) + 0.02, -0.2245, 0.002],
        [zc(-0.236) + 0.022, -0.2365, 0.003],
        [zc(-0.236) - 0.02, -0.2365, 0.003],
        [zc(-0.226) - 0.019, -0.2245, 0.002],
      ],
      0.027,
      { bevel: 0.003, bevelSeg: 2 },
    ),
    "polymer_yellow",
    { wear: 0.35 },
  );
  // witness holes up the spine
  for (let i = 0; i < 5; i++) {
    const y = -0.15 - i * 0.015;
    mg.add(sphere(0.0017, { seg: 8, rings: 6, squash: [1, 1, 0.3] }), "bore", {
      at: [0, y, zc(y) - 0.0171],
    });
  }
  // the magazine leaves the gun during a reload: it hangs from a holder whose origin sits in the
  // middle of the magazine, so it can be tilted about itself (the mesh keeps gun-space coordinates)
  const MAG_P = [0, -0.175, zc(-0.175)];
  const magazine = only(new kit.THREE.Group(), "base,b");
  magazine.name = "magazine";
  magazine.position.set(...MAG_P);
  const magMesh = mg.build("magazine-body");
  magMesh.position.set(-MAG_P[0], -MAG_P[1], -MAG_P[2]);
  magazine.add(magMesh);

  // ------------------------------------------------------------------ barrel (fixed)
  const br = body;
  br.add(
    tube(0.008, 0.0047, 0.145, 0.306, { seg: 24, r: 0.0006 }),
    "steel_blued",
    { at: [0, BORE, 0] },
  );
  br.add(rod(0.0046, 0.15, 0.3, { seg: 12 }), "bore", { at: [0, BORE, 0] });

  // flash hider (base and 乙)
  const fh = M();
  fh.add(
    tube(0.0108, 0.0056, 0.288, 0.326, { seg: 24, r: 0.0012 }),
    "steel_park",
    { at: [0, BORE, 0] },
  );
  for (let i = 0; i < 6; i++) {
    const an = (i / 6) * PI * 2 + PI / 6;
    fh.add(box(0.003, 0.0012, 0.02, { bevel: 0.0004, r: 0.0012 }), "bore", {
      at: [Math.cos(an) * 0.0104, BORE + Math.sin(an) * 0.0104, 0.309],
      rot: [0, 0, an - PI / 2],
    });
  }
  fh.add(
    tube(0.0112, 0.0079, 0.282, 0.289, { seg: 24, r: 0.0008 }),
    "steel_blued",
    { at: [0, BORE, 0] },
  );
  const hider = only(fh.build("flash-hider"), "base,b");

  // ventilated shroud (base and 甲): rings joined by six ribs
  const sh = M();
  const SR = 0.0205;
  for (let i = 0; i < 6; i++) {
    const z0 = 0.153 + i * 0.0212;
    sh.add(
      tube(SR, SR - 0.0022, z0, z0 + 0.0108, { seg: 28, r: 0.0005 }),
      "steel_park",
      { at: [0, BORE, 0] },
    );
  }
  for (let i = 0; i < 6; i++) {
    const an = (i / 6) * PI * 2 + PI / 6;
    sh.add(box(0.0075, 0.0024, 0.118, { bevel: 0.0005 }), "steel_park", {
      at: [
        Math.cos(an) * (SR - 0.0011),
        BORE + Math.sin(an) * (SR - 0.0011),
        0.2115,
      ],
      rot: [0, 0, an - PI / 2],
      wear: 0.5,
    });
  }
  sh.add(
    lathe(
      [
        [0.268, 0.0082, 0],
        [0.268, SR, 0.0006],
        [0.2745, SR, 0.0012],
        [0.2775, 0.0165, 0.001],
        [0.2775, 0.0082, 0.0004],
        [0.268, 0.0082, 0],
      ],
      { seg: 28 },
    ),
    "steel_park",
    { at: [0, BORE, 0] },
  );
  const shroud = only(sh.build("shroud"), "base,a");

  // ------------------------------------------------------------------ skeleton stock (fixed)
  const st = body;
  st.add(
    prism(
      [
        [-0.172, 0.062, 0.003],
        [-0.366, 0.062, 0.006],
        [-0.381, 0.045, 0.006],
        [-0.381, -0.045, 0.008],
        [-0.362, -0.056, 0.006],
        [-0.336, -0.056, 0.006],
        [-0.172, 0.0225, 0.004],
      ],
      0.014,
      {
        bevel: 0.002,
        holes: [
          [
            [-0.19, 0.0525, 0.003],
            [-0.361, 0.0525, 0.004],
            [-0.3705, 0.043, 0.004],
            [-0.3705, -0.038, 0.004],
            [-0.341, -0.0452, 0.004],
            [-0.19, 0.0252, 0.003],
          ],
        ],
      },
    ),
    "steel_park",
  );
  st.add(
    prism(
      [
        [-0.378, 0.065, 0.0065],
        [-0.394, 0.061, 0.0065],
        [-0.394, -0.053, 0.0065],
        [-0.378, -0.058, 0.0065],
      ],
      0.031,
      { bevel: 0.006, bevelSeg: 2 },
    ),
    "rubber",
  );
  // cheek tube along the top strut, latch button
  st.add(rod(0.0088, -0.345, -0.2, { seg: 18, r: 0.002 }), "polymer", {
    at: [0, 0.0585, 0],
    wear: 0.5,
  });
  st.add(rod(0.0036, 0, 0.003, { seg: 12, r: 0.0006 }), "steel_bare", {
    rot: [0, PI / 2, 0],
    at: [0.007, 0.04, -0.181],
    wear: 0.3,
  });
  receiver.add(body.build("frame"));

  // ------------------------------------------------------------------ bolt + charging handle (move together)
  const bo = M();
  bo.add(box(0.004, 0.0185, 0.046, { bevel: 0.001 }), "steel_bare", {
    at: [-0.0203, 0.047, 0.031],
  });
  bo.add(box(0.0044, 0.005, 0.014, { bevel: 0.001 }), "steel_dark", {
    at: [-0.0203, 0.0445, 0.016],
  });
  bo.add(rod(0.0036, 0.0205, 0.029, { seg: 12, r: 0.0006 }), "steel_bare", {
    rot: [0, PI / 2, 0],
    at: [0, 0.0525, 0.1],
    wear: 0.3,
  });
  // honey-yellow knob, big enough to read from the shooter's eye as it slams back and forth
  bo.add(
    lathe(
      [
        [0.0275, 0],
        [0.0275, 0.0062, 0.0012],
        [0.0305, 0.0074, 0.0012],
        [0.0318, 0.0068, 0.0004],
        [0.0331, 0.0076, 0.0004],
        [0.0344, 0.0068, 0.0004],
        [0.0357, 0.0076, 0.0004],
        [0.0398, 0.0074, 0.0016],
        [0.0412, 0.0056, 0.001],
        [0.0412, 0],
      ],
      { seg: 18 },
    ),
    "polymer_yellow",
    { rot: [0, PI / 2, 0], at: [0, 0.0525, 0.1], wear: 0.35 },
  );
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
      0.006,
      { bevel: 0.0012, bevelSeg: 2 },
    ),
    "steel_park",
    { wear: 0.5 },
  );
  const trigger = tg.build("trigger");
  trigger.position.set(0, -0.016, 0.018);

  // ------------------------------------------------------------------ 甲 弹鼓: twin drum, compensator, fore grip
  const a = M();
  // the drum is its own part (it comes off for a reload): feed tower, bridge, both drums
  const dm = M();
  // feed tower in the grip and the bridge between the drums
  dm.add(
    prism(
      [
        [zc(-0.118) + 0.017, -0.118],
        [zc(-0.158) + 0.017, -0.158],
        [zc(-0.158) - 0.017, -0.158],
        [zc(-0.118) - 0.017, -0.118],
      ],
      0.0225,
      { bevel: 0.0015 },
    ),
    "steel_park",
  );
  const DZ = zc(-0.185) - 0.004; // drum centre along Z
  dm.add(
    prism(
      [
        [-0.05, -0.15, 0.006],
        [0.05, -0.15, 0.006],
        [0.05, -0.19, 0.004],
        [-0.05, -0.19, 0.004],
      ],
      0.04,
      { plane: "front", bevel: 0.003, bevelSeg: 2 },
    ),
    "steel_park",
    { at: [0, 0, DZ] },
  );
  for (const sx of [1, -1]) {
    // drum body
    dm.add(
      lathe(
        [
          [-0.027, 0],
          [-0.027, 0.0375, 0.003],
          [-0.0225, 0.0405, 0.002],
          [0.0225, 0.0405, 0.002],
          [0.027, 0.0375, 0.003],
          [0.027, 0],
        ],
        { seg: 40 },
      ),
      "steel_park",
      { at: [sx * 0.049, -0.187, DZ] },
    );
    // polymer hoop, hub, winder
    dm.add(
      tube(0.0418, 0.04, -0.007, 0.007, { seg: 40, r: 0.001 }),
      "polymer",
      {
        at: [sx * 0.049, -0.187, DZ],
      },
    );
    for (const sz of [1, -1]) {
      dm.add(
        lathe(
          [
            [0, 0],
            [0, 0.012, 0.001],
            [0.003, 0.012, 0.0015],
            [0.0045, 0.0085, 0.001],
            [0.0045, 0],
          ],
          { seg: 20 },
        ),
        "steel_bare",
        {
          rot: [sz > 0 ? 0 : PI, 0, 0],
          at: [sx * 0.049, -0.187, DZ + sz * 0.027],
          wear: 0.4,
        },
      );
      for (let k = 0; k < 6; k++) {
        const an = (k / 6) * PI * 2;
        dm.add(
          screw(0.0022, { axis: sz > 0 ? "z" : "-z", slot: false, h: 0.0008 }),
          "steel_bare",
          {
            at: [
              sx * 0.049 + Math.cos(an) * 0.031,
              -0.187 + Math.sin(an) * 0.031,
              DZ + sz * 0.0272,
            ],
            wear: 0.3,
          },
        );
      }
    }
    dm.add(box(0.005, 0.02, 0.003, { bevel: 0.001, r: 0.002 }), "steel_bare", {
      at: [sx * 0.049, -0.187, DZ - 0.0325],
      rot: [0, 0, 0.6],
      wear: 0.4,
    });
  }
  // three-chamber compensator
  a.add(
    tube(0.0112, 0.0079, 0.282, 0.292, { seg: 24, r: 0.0008 }),
    "steel_blued",
    { at: [0, BORE, 0] },
  );
  a.add(
    prism(
      [
        [-0.0135, BORE - 0.0135, 0.004],
        [0.0135, BORE - 0.0135, 0.004],
        [0.0135, BORE + 0.0135, 0.004],
        [-0.0135, BORE + 0.0135, 0.004],
      ],
      0.064,
      {
        plane: "front",
        bevel: 0.0015,
        holes: [{ c: [0, BORE], r: 0.0058, seg: 16 }],
      },
    ),
    "steel_park",
    { at: [0, 0, 0.324] },
  );
  for (let i = 0; i < 3; i++) {
    const z = 0.305 + i * 0.0185;
    a.add(box(0.0012, 0.015, 0.0115, { bevel: 0.0004, r: 0.002 }), "bore", {
      at: [0.0133, BORE, z],
      mirror: true,
    });
    a.add(box(0.015, 0.0012, 0.0115, { bevel: 0.0004, r: 0.002 }), "bore", {
      at: [0, BORE + 0.0133, z],
    });
  }
  a.add(rod(0.0057, 0.293, 0.3555, { seg: 14 }), "bore", { at: [0, BORE, 0] });
  // lower rail under the shroud and a vertical grip
  a.add(rail(0.158, 0.262), "steel_park", {
    rot: [0, 0, PI],
    at: [0, BORE - SR - 0.0118, 0],
  });
  a.add(box(0.03, 0.009, 0.036, { bevel: 0.0012 }), "polymer", {
    at: [0, BORE - SR - 0.0155, 0.21],
  });
  a.add(screw(0.0034, { axis: "x", hex: true, h: 0.003 }), "steel_bare", {
    at: [0.015, BORE - SR - 0.016, 0.21],
    wear: 0.3,
  });
  a.add(
    lathe(
      [
        [0, 0],
        [0, 0.0145, 0.002],
        [0.008, 0.0152, 0.003],
        [0.018, 0.0128, 0.006],
        [0.078, 0.0142, 0.006],
        [0.084, 0.0162, 0.002],
        [0.089, 0.0145, 0.003],
        [0.089, 0],
      ],
      { seg: 24, squash: [1, 1.18] },
    ),
    "polymer_grip",
    { rot: [PI / 2, 0, 0], at: [0, BORE - SR - 0.0195, 0.21] },
  );
  const partsA = only(a.build("branch-a"), "a");
  // drum holder: origin at the middle of the bridge, so the drum tilts about itself when it comes off
  const DRUM_P = [0, -0.17, DZ];
  const drum = only(new kit.THREE.Group(), "a");
  drum.name = "drum";
  drum.position.set(...DRUM_P);
  const drumMesh = dm.build("drum-body");
  drumMesh.position.set(-DRUM_P[0], -DRUM_P[1], -DRUM_P[2]);
  drum.add(drumMesh);
  drumMesh.add(
    ...[1, -1].map((sx) =>
      label({
        key: "smg-drum",
        w: 0.06,
        h: 0.06,
        px: 256,
        face: "-z",
        at: [sx * 0.049, -0.187, DZ - 0.0273],
        rough: 0.6,
        draw(g, W, H) {
          g.clearRect(0, 0, W, H);
          g.save();
          g.beginPath();
          g.arc(W / 2, H / 2, W * 0.44, 0, PI * 2);
          g.arc(W / 2, H / 2, W * 0.24, 0, PI * 2, true);
          g.clip();
          hexes(g, W, H, W * 0.075, "rgba(226,174,60,0.85)", 2.5);
          g.restore();
        },
      }),
    ),
  );

  // ------------------------------------------------------------------ 乙 电击: coil, battery box, high-tension leads
  const b = M();
  const coilGlow = kit.mats.glow(0x46d6ff, 3.2, { rough: 0.31 });
  b.add(rod(0.0112, 0.158, 0.268, { seg: 20 }), coilGlow, { at: [0, BORE, 0] });
  b.add(
    helix(0.0142, 0.0023, 0.16, 0.266, 15, { seg: 6, perTurn: 14 }),
    "copper",
    { at: [0, BORE, 0] },
  );
  for (const z of [0.151, 0.2675]) {
    b.add(
      lathe(
        [
          [z, 0.0082, 0],
          [z, 0.0195, 0.0015],
          [z + 0.0035, 0.0195, 0.0006],
          [z + 0.0035, 0.0165, 0.0006],
          [z + 0.0075, 0.0165, 0.0015],
          [z + 0.0075, 0.0082, 0],
          [z, 0.0082, 0],
        ],
        { seg: 28 },
      ),
      "ceramic",
      { at: [0, BORE, 0] },
    );
  }
  // three tie rods holding the end plates
  for (let i = 0; i < 3; i++) {
    const an = (i / 3) * PI * 2 - PI / 2;
    b.add(rod(0.0013, 0.15, 0.277, { seg: 8 }), "brass", {
      at: [Math.cos(an) * 0.0178, BORE + Math.sin(an) * 0.0178, 0],
      wear: 0.3,
    });
    b.add(screw(0.0024, { axis: "z", hex: true, h: 0.0016 }), "brass", {
      at: [Math.cos(an) * 0.0178, BORE + Math.sin(an) * 0.0178, 0.2765],
      wear: 0.3,
    });
  }
  // battery box on the left of the receiver
  b.add(box(0.019, 0.03, 0.084, { bevel: 0.0015, r: 0.003 }), "paint_grey", {
    at: [0.0328, 0.0325, 0.03],
  });
  b.add(box(0.0205, 0.004, 0.086, { bevel: 0.001, r: 0.002 }), "steel_park", {
    at: [0.0328, 0.0485, 0.03],
    wear: 0.5,
  });
  for (const z of [-0.004, 0.064]) {
    b.add(box(0.022, 0.033, 0.006, { bevel: 0.0008 }), "cloth_black", {
      at: [0.0322, 0.0325, z],
      wear: 0.3,
    });
    b.add(screw(0.0026, { axis: "x", h: 0.001 }), "steel_bare", {
      at: [0.0433, 0.022, z],
      wear: 0.3,
    });
  }
  // terminals and leads: red to the front plate, black to the rear plate
  const leads = [
    {
      z: 0.056,
      mat: "rubber_red",
      path: [
        [0.0328, 0.054, 0.056],
        [0.034, 0.064, 0.075],
        [0.03, 0.068, 0.12],
        [0.022, 0.066, 0.2],
        [0.014, 0.064, 0.262],
        [0.008, 0.0625, 0.2712],
      ],
    },
    {
      z: 0.04,
      mat: "rubber",
      path: [
        [0.0328, 0.054, 0.04],
        [0.037, 0.062, 0.058],
        [0.034, 0.058, 0.11],
        [0.026, 0.052, 0.14],
        [0.018, 0.0545, 0.1545],
      ],
    },
  ];
  for (const l of leads) {
    b.add(
      lathe(
        [
          [0, 0],
          [0, 0.0034, 0.0006],
          [0.003, 0.0034, 0.0006],
          [0.0035, 0.0022, 0.0004],
          [0.0065, 0.0022, 0.0006],
          [0.0065, 0],
        ],
        { seg: 6, flat: true },
      ),
      "brass",
      { rot: [-PI / 2, 0, 0], at: [0.0328, 0.0495, l.z], wear: 0.3 },
    );
    b.add(sweep(l.path, 0.0019, { seg: 6 }), l.mat);
  }
  // charge lamp
  b.add(sphere(0.0022, { seg: 10, rings: 6 }), coilGlow, {
    at: [0.0328, 0.051, 0.008],
  });
  const partsB = only(b.build("branch-b"), "b");
  partsB.add(
    label({
      key: "smg-battery",
      w: 0.07,
      h: 0.026,
      px: 512,
      face: "x",
      at: [0.0426, 0.0325, 0.03],
      rough: 0.6,
      draw(g, W, H) {
        g.clearRect(0, 0, W, H);
        g.fillStyle = "#e0a80e";
        g.fillRect(4, 4, W - 8, H - 8);
        g.fillStyle = "#101010";
        for (let x = -H; x < W; x += 34) {
          g.beginPath();
          g.moveTo(x, H - 4);
          g.lineTo(x + 12, H - 4);
          g.lineTo(x + 12 + 22, H - 26);
          g.lineTo(x + 22, H - 26);
          g.fill();
          g.beginPath();
          g.moveTo(x, 26);
          g.lineTo(x + 12, 26);
          g.lineTo(x + 12 + 22, 4);
          g.lineTo(x + 22, 4);
          g.fill();
        }
        g.font = `700 ${H * 0.44}px ${kit.FONT_HEI}`;
        g.textAlign = "center";
        g.textBaseline = "middle";
        g.fillText("⚡ 高壓危險  12 kV", W / 2, H * 0.52);
      },
    }),
  );

  // ------------------------------------------------------------------ assemble
  const root = new kit.THREE.Group();
  root.name = "smg";
  root.add(
    receiver,
    grip,
    magazine,
    hider,
    shroud,
    bolt,
    trigger,
    partsA,
    drum,
    partsB,
  );

  // ------------------------------------------------------------------ reload choreography
  // The left hand leaves the fore-end, takes the magazine (甲: the twin drum) off the bottom of the grip
  // and carries it down out of sight, comes back with a fresh one and seats it, then racks the charging
  // handle and returns. All of it runs on s.reload 0 -> 1; the hand rides the part it holds through a
  // second grip ("via") that is moved here every frame between the named grips.
  const THREE = kit.THREE;
  const sm = (a, b, x) => {
    const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
    return t * t * (3 - 2 * t);
  };
  const crossed = (s, at) => s.prev && s.prev.reload < at && s.reload >= at;
  const _inv = new THREE.Matrix4(),
    _m = new THREE.Matrix4(),
    _pa = new THREE.Vector3(),
    _pb = new THREE.Vector3(),
    _qa = new THREE.Quaternion(),
    _qb = new THREE.Quaternion(),
    _sc = new THREE.Vector3();
  const gripNode = (L, n) => (n === "main" ? L.anchor : L.alts[n].anchor);
  const gripPose = (L, n) => (n === "main" ? L.pose : L.alts[n].pose);
  const rel = (o, p, q) => {
    o.updateWorldMatrix(true, false);
    _m.multiplyMatrices(_inv, o.matrixWorld).decompose(p, q, _sc);
  };
  /** Put the "via" grip k of the way from grip a to grip b (gun space), bowed out by `bow` metres along +X. */
  function via(L, a, b, k, bow = 0, dzA = 0) {
    root.updateWorldMatrix(true, false);
    _inv.copy(root.matrixWorld).invert();
    rel(gripNode(L, a), _pa, _qa);
    rel(gripNode(L, b), _pb, _qb);
    _pa.z += dzA;
    const v = L.alts.via;
    v.anchor.position.lerpVectors(_pa, _pb, k);
    v.anchor.position.x += bow * Math.sin(Math.PI * k);
    v.anchor.position.y += bow * 0.4 * Math.sin(Math.PI * k);
    v.anchor.quaternion.slerpQuaternions(_qa, _qb, k);
    v.pose = gripPose(L, k < 0.5 ? a : b);
  }
  // the magazine slides down the well, then swings down and away; the drum travels further and tilts more
  const MAG_AX = new THREE.Vector3(0, -1, -SLOPE).normalize();
  const PATH = {
    mag: { slide: 0.03, away: [0.05, -0.2, -0.09], tilt: [0.5, 0.2, -0.5] },
    drum: { slide: 0.035, away: [0.08, -0.26, -0.12], tilt: [0.7, 0.3, -0.7] },
  };
  function placeMag(node, P, path, k) {
    const sl = sm(0, 0.3, k) * path.slide,
      aw = sm(0.18, 1, k);
    node.position.set(
      P[0] + MAG_AX.x * sl + path.away[0] * aw,
      P[1] + MAG_AX.y * sl + path.away[1] * aw,
      P[2] + MAG_AX.z * sl + path.away[2] * aw,
    );
    node.rotation.set(path.tilt[0] * aw, path.tilt[1] * aw, path.tilt[2] * aw);
  }
  const BOLT_BACK = -0.066;
  // canted up for the magazine swap, level again (span) before the hand goes up to the charging
  // handle, so the arm racks it from below instead of reaching across the top of the view
  const reloadView = {
    pos: [-0.05, 0.09, -0.09],
    rot: [0.4, 0.25, -0.85],
    span: [0.12, 0.62, 0.76],
  };

  let model;
  model = kit.weapon({
    id: "smg",
    root,
    anchors: {
      muzzle: {
        base: [0, BORE, 0.328],
        a: [0, BORE, 0.358],
        b: [0, BORE, 0.328],
      },
      eject: [-0.026, 0.049, 0.03],
    },
    // right hand on the pistol grip, index on the trigger. Left hand: under the shroud (base) or the coil (乙),
    // round the vertical fore grip in 甲.
    hands: (branch) => ({
      right: {
        // palm on the right of the grip, fingers round the front strap with their tips on the left,
        // thumb round the back; index in the guard on the trigger
        at: [-0.0182, -0.076, -0.0548],
        palm: [0.999, -0.033, -0.001],
        fingers: [-0.003, -0.111, 0.994],
        pose: {
          base: "pistol",
          index: [0.23, 0.59, 1.15, 0.34],
          middle: [1.2, 0.8, 0.8, 0],
          ring: [1.23, 0.8, 0.8, -0.02],
          pinky: [0.95, 0.7, 0.7, -0.08],
          thumb: [0.45, -0.45, 0.75, 0.6, 0.4],
        },
        trigger: true,
      },
      left: {
        ...(branch === "a"
          ? {
              // palm on the left of the fore grip, fingers round the front
              at: [0.0107, -0.036, 0.1925],
              palm: [-0.999, -0.023, 0.049],
              fingers: [0.05, -0.055, 0.997],
              pose: {
                base: "wrap",
                r: 0.021,
                index: [0.98, 1.4, 0.86, 0.03],
                middle: [1.04, 1.45, 0.86, 0],
                ring: [1.08, 1.38, 0.78, -0.02],
                pinky: [0.85, 1.01, 0.7, -0.05],
                thumb: [0.79, -0.45, 0.7, 0.6, 0.5],
              },
            }
          : {
              at: [
                -0.0024,
                BORE - (branch === "b" ? 0.0185 : SR) - 0.0009,
                0.1915,
              ],
              palm: [0.377, 0.924, -0.069],
              // palm under the shroud, which lies slantwise across it in line with a forearm
              // that comes up from behind and below; fingers up its right side, thumb along
              // the left (finger angles from __lab.fitGrip)
              fingers: [-0.744, 0.346, 0.572],
              pose:
                branch === "b"
                  ? {
                      // the coil is thinner than the shroud: the fingers close further
                      thumb: [0.47, -0.61, 0.64, 0.21, 0.23],
                      index: [0.6, 0.89, 1, 0.02],
                      middle: [1.09, 1.19, 0.74, 0.01],
                      ring: [1.13, 1.23, 0.77, -0.01],
                      pinky: [1.12, 1.21, 0.76, -0.01],
                    }
                  : {
                      thumb: [0.43, -0.63, 0.65, 0.25, 0.35],
                      index: [0.41, 1.11, 0.69, 0.03],
                      middle: [1.01, 1.11, 0.69, 0.01],
                      ring: [1.07, 1.17, 0.73, -0.01],
                      pinky: [1.06, 1.16, 0.72, -0.01],
                    },
            }),
        alts: {
          // the magazine: palm on its left face, fingers round the front, thumb up the back.
          // 甲: the hand spreads over the outside of the left drum.
          mag:
            branch === "a"
              ? {
                  parent: drumMesh,
                  at: [0.093, -0.1838, DZ - 0.0069],
                  palm: [-0.983, -0.07, 0.173],
                  fingers: [0.181, -0.137, 0.974],
                  pose: {
                    base: "wrap",
                    r: 0.032,
                    pinky: [0.6, 0.8, 0.5, -0.05],
                  },
                }
              : {
                  parent: magMesh,
                  at: [0.0145, -0.201, zc(-0.198) - 0.0028],
                  palm: [-0.998, -0.023, -0.062],
                  fingers: [-0.056, -0.207, 0.977],
                  pose: { base: "wrap", r: 0.019 },
                },
          // charging handle: the knob pinched between the thumb (behind it) and the index finger
          bolt: {
            parent: bolt,
            at: [0.058, 0.048, 0.074],
            palm: [-1, 0, 0.1],
            fingers: [0.3, 0.2, 1],
            pose: { base: "pinch", thumb: [0.4, -0.6, 0.7, 0.5, 0.4] },
          },
          via: { at: [0, 0, 0], palm: [0, -1, 0], fingers: [0, 0, 1] },
        },
      },
    }),
    ownReload: true,
    view: {
      hip: { pos: [0.15, -0.16, -0.31], rot: [0.012, 0.0, 0] },
      reload: reloadView,
    },
    show: { yaw: -0.85, pitch: 0.14 },
    // s.cycle: 0 -> 1 between shots. The bolt snaps back over the first 40% and returns.
    update(s) {
      const c = s.cycle ?? 1;
      const back = c >= 1 ? 0 : c < 0.4 ? c / 0.4 : 1 - (c - 0.4) / 0.6;
      bolt.position.z = -0.044 * back * (2 - back);
      trigger.rotation.x = -(s.trigger || 0) * 0.3;
      reload(s);
      // 乙: the coil brightens as the gun heats up and crackles while firing
      const heat = s.heat || 0;
      const flick =
        heat > 0.02
          ? Math.sin((s.t || 0) * 47) * 0.12 + Math.sin((s.t || 0) * 113) * 0.08
          : 0;
      coilGlow.emissiveIntensity =
        coilGlow.userData.glow *
        ((s.level || 1) >= 5 ? 1.8 : 1) *
        (0.55 + heat * 0.9 + flick * heat);
    },
  });
  return model;

  //   0.00-0.12 reach for the magazine      0.12-0.40 pull it and take it away (magOut)
  //   0.40-0.50 out of sight: the swap      0.50-0.66 bring the fresh one up and seat it (magIn)
  //   0.66-0.73 up to the charging handle   0.73-0.79 rack it back (boltBack)
  //   0.79-0.82 let it slam home (boltFwd)  0.82-1.00 back to the fore-end (slow enough for the
  //   elbow to follow the hand round)
  function reload(s) {
    const L = model && model.grips.left;
    const drumForm = s.branch === "a";
    const part = drumForm ? drum : magazine;
    const P = drumForm ? DRUM_P : MAG_P;
    const r = s.reload;
    if (r < 0 || r === undefined) {
      part.position.set(P[0], P[1], P[2]);
      part.rotation.set(0, 0, 0);
      if (L) {
        L.to = null;
        L.mix = 0;
      }
      return;
    }
    // the part: out over 0.12-0.40, back in over 0.50-0.66 (it is a fresh one by then)
    const out = r < 0.45 ? sm(0.12, 0.4, r) : 1 - sm(0.5, 0.66, r);
    placeMag(part, P, drumForm ? PATH.drum : PATH.mag, out);
    // the bolt: back over 0.73-0.79, slams home 0.79-0.815
    if (r > 0.71)
      bolt.position.z =
        BOLT_BACK * (r < 0.79 ? sm(0.73, 0.79, r) : 1 - sm(0.79, 0.815, r));
    if (crossed(s, 0.13)) s.cue("magOut");
    if (crossed(s, 0.65)) s.cue("magIn");
    if (crossed(s, 0.79)) s.cue("boltBack");
    if (crossed(s, 0.81)) s.cue("boltFwd");
    if (!L || !L.alts.via) return;
    L.to = "via";
    L.mix = 1;
    if (r < 0.12) via(L, "main", "mag", sm(0, 0.12, r), 0.02);
    else if (r < 0.66) via(L, "mag", "mag", 0);
    else if (r < 0.73) via(L, "mag", "bolt", sm(0.66, 0.73, r), 0.05);
    else if (r < 0.79) via(L, "bolt", "bolt", 0);
    // the hand lets go at the back of the stroke and stays there while the bolt runs home
    else if (r < 0.82)
      via(L, "bolt", "bolt", 0, 0, BOLT_BACK - bolt.position.z);
    else
      via(L, "bolt", "main", sm(0.82, 1, r), 0.02, BOLT_BACK - bolt.position.z);
  }
}
