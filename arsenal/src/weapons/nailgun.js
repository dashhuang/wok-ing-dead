// 打桩 · framing nailer turned weapon.
// Gun space: +Z nose, +Y up, +X shooter's left. Origin at the trigger; the driver axis is at y = HY.
// Layout: fat yellow cylinder head along Z, handle hanging from its rear, angled stick magazine from the
// nose down to a foot that ties back into the handle, small compressed-air bottle on the tail.
const HY = 0.05;

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

  // text helpers for kit.wrap: draw in a logical canvas whose +x runs along the tool (reads level from that side)
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
  const scuff = (g, W, H, n = 60) => {
    for (let i = 0; i < n; i++) {
      g.strokeStyle = `rgba(40,30,20,${0.05 + Math.random() * 0.14})`;
      g.lineWidth = 1 + Math.random() * 2;
      g.beginPath();
      const x = Math.random() * W,
        y = Math.random() * H;
      g.moveTo(x, y);
      g.lineTo(x + (Math.random() - 0.5) * 70, y + (Math.random() - 0.5) * 24);
      g.stroke();
    }
  };

  // ------------------------------------------------------------------ head, handle, foot (fixed)
  const b = M();
  // cylinder housing
  b.add(
    lathe(
      [
        [-0.09, 0],
        [-0.09, 0.0405, 0.003],
        [-0.02, 0.0415, 0.02],
        [0.07, 0.0415, 0.012],
        [0.1, 0.036, 0.012],
        [0.122, 0.027, 0.004],
        [0.122, 0],
      ],
      { seg: 44 },
    ),
    "polymer_yellow",
    { at: [0, HY, 0] },
  );
  for (const z of [-0.07, -0.052, -0.034]) {
    b.add(
      lathe(
        [
          [z, 0.04],
          [z, 0.0438, 0.0012],
          [z + 0.008, 0.0438, 0.0012],
          [z + 0.008, 0.04],
        ],
        { seg: 44 },
      ),
      "polymer_yellow",
      { at: [0, HY, 0], wear: 0.6 },
    );
  }
  // black band and the rear cap with exhaust slots and four bolts
  b.add(tube(0.0424, 0.04, 0.062, 0.072, { seg: 44, r: 0.0008 }), "polymer", {
    at: [0, HY, 0],
  });
  b.add(
    lathe(
      [
        [-0.12, 0],
        [-0.12, 0.031, 0.006],
        [-0.109, 0.0432, 0.004],
        [-0.089, 0.0432, 0.0015],
        [-0.089, 0],
      ],
      { seg: 44 },
    ),
    "polymer",
    { at: [0, HY, 0] },
  );
  for (let i = 0; i < 4; i++) {
    const a = PI / 4 + (i * PI) / 2;
    b.add(screw(0.0045, { axis: "-z", hex: true, h: 0.003 }), "steel_bare", {
      at: [Math.cos(a) * 0.021, HY + Math.sin(a) * 0.021, -0.1198],
      wear: 0.4,
    });
  }
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * PI * 2 + 0.3;
    b.add(box(0.0035, 0.0016, 0.012, { bevel: 0.0004 }), "bore", {
      at: [Math.cos(a) * 0.0428, HY + Math.sin(a) * 0.0428, -0.099],
      rot: [0, 0, a + PI / 2],
    });
  }
  // cast nose block that takes the magazine
  b.add(
    prism(
      [
        [0.116, HY - 0.031, 0.003],
        [0.116, HY + 0.025, 0.004],
        [0.15, HY + 0.021, 0.006],
        [0.203, HY + 0.0125, 0.002],
        [0.203, HY - 0.0125, 0.002],
        [0.186, HY - 0.031, 0.004],
      ],
      0.032,
      { bevel: 0.0022, bevelSeg: 2 },
    ),
    "iron_cast",
  );
  for (const [z, y] of [
    [0.13, HY + 0.012],
    [0.13, HY - 0.018],
    [0.172, HY - 0.018],
  ]) {
    b.add(screw(0.0034, { axis: "x", hex: true, h: 0.0022 }), "steel_bare", {
      at: [0.016, y, z],
      mirror: true,
      wear: 0.4,
    });
  }
  // depth-of-drive wheel
  b.add(rod(0.0095, -0.0045, 0.0045, { r: 0.001, seg: 20 }), "rubber", {
    rot: [0, PI / 2, 0],
    at: [0.0185, HY - 0.006, 0.158],
  });
  b.add(rod(0.0035, -0.006, 0.006, { seg: 10 }), "steel_bare", {
    rot: [0, PI / 2, 0],
    at: [0.0185, HY - 0.006, 0.158],
    wear: 0.3,
  });
  // handle: yellow shell with a rubber over-mould
  b.add(
    prism(
      [
        [-0.04, 0.024],
        [-0.102, 0.024],
        [-0.114, -0.005, 0.014],
        [-0.109, -0.17, 0.006],
        [-0.05, -0.17, 0.006],
        [-0.043, -0.03, 0.02],
      ],
      0.04,
      { bevel: 0.012, bevelSeg: 4 },
    ),
    "polymer_yellow",
  );
  b.add(
    prism(
      [
        [-0.1118, -0.024, 0.01],
        [-0.1105, -0.146, 0.01],
        [-0.0468, -0.146, 0.01],
        [-0.0405, -0.024, 0.012],
      ],
      0.0445,
      { bevel: 0.0145, bevelSeg: 4 },
    ),
    "rubber",
  );
  // moulded grip ribs on both flanks of the over-mould
  for (let i = 0; i < 9; i++) {
    b.add(
      box(0.0018, 0.0026, 0.034 - (i % 2) * 0.006, { bevel: 0.0007 }),
      "rubber",
      {
        at: [0.0222, -0.038 - i * 0.012, -0.079 + i * 0.0006],
        mirror: true,
        wear: 0.15,
      },
    );
  }
  for (let i = 0; i < 4; i++) {
    // finger swells on the front of the grip
    b.add(
      sphere(0.011, { seg: 12, rings: 8, squash: [1.75, 1.1, 0.7] }),
      "rubber",
      { at: [0, -0.042 - i * 0.029, -0.0445 - i * 0.0014] },
    );
  }
  // web under the head that carries the trigger
  b.add(
    prism(
      [
        [-0.043, 0.024],
        [0.034, 0.02],
        [0.034, 0.008, 0.004],
        [-0.01, -0.01, 0.012],
        [-0.043, -0.018],
      ],
      0.03,
      { bevel: 0.004, bevelSeg: 2 },
    ),
    "polymer_yellow",
  );
  // handle end block, air inlet, foot that ties the magazine in
  b.add(
    prism(
      [
        [-0.115, -0.162, 0.004],
        [-0.044, -0.162, 0.004],
        [-0.04, -0.2, 0.01],
        [-0.115, -0.2, 0.01],
      ],
      0.047,
      { bevel: 0.009, bevelSeg: 3 },
    ),
    "polymer_yellow",
  );
  // (it stops short of the magazine's end cap so the stick can slide out down its own line; a spring
  // catch on its nose clicks over the end cap)
  b.add(box(0.022, 0.013, 0.066, { bevel: 0.002 }), "steel_park", {
    at: [0, -0.181, -0.037],
  });
  b.add(
    prism(
      [
        [-0.0045, -0.1875, 0.001],
        [0.0015, -0.1875, 0.001],
        [0.0015, -0.17, 0.001],
        [-0.001, -0.166, 0.001],
        [-0.0045, -0.168, 0.001],
      ],
      0.016,
      { bevel: 0.0008 },
    ),
    "steel_bare",
    { wear: 0.5 },
  );
  b.add(screw(0.0036, { axis: "x", hex: true, h: 0.0024 }), "steel_bare", {
    at: [0.011, -0.181, -0.03],
    mirror: true,
    wear: 0.4,
  });
  // belt hook on the right
  b.add(
    sweep(
      [
        [-0.024, -0.176, -0.06],
        [-0.036, -0.176, -0.058],
        [-0.04, -0.15, -0.06],
        [-0.04, -0.1, -0.066],
        [-0.036, -0.082, -0.068],
        [-0.03, -0.09, -0.068],
      ],
      0.0022,
      { seg: 6 },
    ),
    "steel_bare",
  );
  // compressed-air bottle on the tail: brass plug, regulator with a small gauge, aluminium bottle
  const AY = -0.181;
  b.add(rod(0.0085, -0.132, -0.112, { seg: 6, flat: true }), "brass", {
    at: [0, AY, 0],
  });
  b.add(rod(0.0145, -0.162, -0.13, { r: 0.002, seg: 24 }), "steel_bare", {
    at: [0, AY, 0],
  });
  b.add(rod(0.0115, 0, 0.007, { r: 0.0012, seg: 20 }), "steel_park", {
    rot: [-PI / 2, 0, 0],
    at: [0, AY + 0.014, -0.146],
  });
  b.add(
    lathe(
      [
        [-0.282, 0],
        [-0.282, 0.011, 0.01],
        [-0.268, 0.0265, 0.014],
        [-0.186, 0.0265, 0.01],
        [-0.172, 0.0135, 0.004],
        [-0.16, 0.0135],
        [-0.16, 0],
      ],
      { seg: 32 },
    ),
    "steel_bare",
    { at: [0, AY, 0], wear: 0.5 },
  );
  // two zip ties and a strip of tape keep the bottle from rattling
  for (const z of [-0.2, -0.252])
    b.add(tube(0.0276, 0.0262, z, z + 0.004, { seg: 28 }), "polymer", {
      at: [0, AY, 0],
      wear: 0.2,
    });
  b.add(box(0.005, 0.004, 0.006, { bevel: 0.0008 }), "polymer", {
    at: [0.0, AY + 0.0285, -0.198],
    wear: 0.2,
  });
  b.add(box(0.005, 0.004, 0.006, { bevel: 0.0008 }), "polymer", {
    at: [0.012, AY + 0.0255, -0.25],
    rot: [0, 0, -0.45],
    wear: 0.2,
  });
  const body = b.build("body");

  // stickers (wrapped round the head so they sit on the curve)
  body.add(
    wrap({
      key: "nailgun-logo",
      r: 0.0419,
      z0: -0.012,
      z1: 0.056,
      arc: [PI / 2 - 0.52, 1.04],
      px: 256,
      at: [0, HY, 0],
      rough: 0.55,
      draw(g, W, H) {
        onLeft(g, W, H, (g, w, h) => {
          g.fillStyle = "#16171a";
          g.fillRect(0, 0, w, h);
          g.fillStyle = "#e3a40f";
          g.fillRect(6, 6, w - 12, h - 12);
          g.fillStyle = "#16171a";
          g.fillRect(6, h * 0.66, w - 12, h * 0.34 - 6);
          g.fillStyle = "#16171a";
          g.font = `900 ${h * 0.44}px ${kit.FONT_HEI}`;
          g.textAlign = "left";
          g.textBaseline = "middle";
          g.fillText("打樁", w * 0.05, h * 0.36);
          g.fillRect(w * 0.635, h * 0.14, 2, h * 0.42);
          g.font = `700 ${h * 0.16}px ${kit.FONT_MONO}`;
          g.fillText("PN-90", w * 0.66, h * 0.25);
          g.font = `600 ${h * 0.085}px ${kit.FONT_MONO}`;
          g.fillText("34° · 90mm", w * 0.66, h * 0.46);
          g.fillStyle = "#e3a40f";
          g.font = `700 ${h * 0.17}px ${kit.FONT_HEI}`;
          g.fillText("金龍五金 · 氣動射釘槍", w * 0.06, h * 0.82);
          scuff(g, w, h, 70);
        });
      },
    }),
  );
  body.add(
    wrap({
      key: "nailgun-warn",
      r: 0.0419,
      z0: 0.0,
      z1: 0.056,
      arc: [(3 * PI) / 2 - 0.42, 0.84],
      px: 256,
      at: [0, HY, 0],
      rough: 0.6,
      draw(g, W, H) {
        onRight(g, W, H, (g, w, h) => {
          g.fillStyle = "#e9e4d6";
          g.fillRect(0, 0, w, h);
          g.fillStyle = "#c8201a";
          g.fillRect(0, 0, w, h * 0.3);
          g.fillStyle = "#fff";
          g.font = `900 ${h * 0.2}px ${kit.FONT_HEI}`;
          g.textAlign = "center";
          g.textBaseline = "middle";
          g.fillText("⚠ 危險 DANGER", w / 2, h * 0.16);
          g.fillStyle = "#1a1a1a";
          g.font = `700 ${h * 0.16}px ${kit.FONT_HEI}`;
          g.fillText("槍口切勿對人", w / 2, h * 0.47);
          g.font = `600 ${h * 0.11}px ${kit.FONT_HEI}`;
          g.fillText("（僵屍除外）", w / 2, h * 0.67);
          g.font = `600 ${h * 0.085}px ${kit.FONT_MONO}`;
          g.fillText("MAX 8.3 BAR · WEAR EYE PROTECTION", w / 2, h * 0.87);
          scuff(g, w, h, 60);
        });
      },
    }),
  );
  body.add(
    wrap({
      key: "nailgun-tank",
      r: 0.0268,
      z0: -0.262,
      z1: -0.206,
      px: 512,
      at: [0, AY, 0],
      rough: 0.5,
      metal: 0.2,
      draw(g, W, H) {
        g.fillStyle = "#1c2026";
        g.fillRect(0, 0, W, H);
        g.fillStyle = "#c8201a";
        g.fillRect(0, 0, W, H * 0.12);
        g.fillRect(0, H * 0.88, W, H * 0.12);
        for (const [u, side] of [
          [0.25, onLeft],
          [0.75, onRight],
        ]) {
          g.save();
          g.beginPath();
          g.rect(W * (u - 0.2), 0, W * 0.4, H);
          g.clip();
          g.translate(W * (u - 0.5), 0);
          side(g, W, H, (g, w, h) => {
            g.fillStyle = "#e9e4d6";
            g.textAlign = "center";
            g.textBaseline = "middle";
            g.font = `900 ${h * 0.085}px ${kit.FONT_HEI}`;
            g.fillText("壓縮空氣", w / 2, h * 0.47);
            g.font = `600 ${h * 0.04}px ${kit.FONT_MONO}`;
            g.fillText("HPA 0.2L · 20MPa", w / 2, h * 0.56);
          });
          g.restore();
        }
      },
    }),
  );
  // gauge face on top of the regulator
  body.add(
    label({
      key: "nailgun-gauge",
      w: 0.019,
      h: 0.019,
      px: 128,
      face: "y",
      at: [0, AY + 0.0213, -0.146],
      rough: 0.3,
      draw(g, W, H) {
        g.clearRect(0, 0, W, H);
        g.fillStyle = "#ece8dc";
        g.beginPath();
        g.arc(W / 2, H / 2, W * 0.46, 0, 7);
        g.fill();
        g.strokeStyle = "#111";
        g.lineWidth = 3;
        for (let i = 0; i <= 8; i++) {
          const a = PI * 0.8 + (i / 8) * PI * 1.4;
          g.beginPath();
          g.moveTo(
            W / 2 + Math.cos(a) * W * 0.3,
            H / 2 + Math.sin(a) * W * 0.3,
          );
          g.lineTo(
            W / 2 + Math.cos(a) * W * 0.4,
            H / 2 + Math.sin(a) * W * 0.4,
          );
          g.stroke();
        }
        g.strokeStyle = "#c8201a";
        g.lineWidth = 5;
        g.beginPath();
        g.moveTo(W / 2, H / 2);
        g.lineTo(
          W / 2 + Math.cos(-0.5) * W * 0.34,
          H / 2 + Math.sin(-0.5) * W * 0.34,
        );
        g.stroke();
      },
    }),
  );

  // ------------------------------------------------------------------ magazine(s)
  // angled 25 degrees off the handle; nails lie along Z and stack down the stick
  const U = [-0.4226, -0.9063]; // (z, y) direction down the stick
  const L = 0.25;
  const P0 = [0.118, HY + 0.012];
  const at = (dz, t) => [P0[0] + dz + U[0] * L * t, P0[1] + U[1] * L * t];
  function magazine(m, x, w) {
    m.add(
      prism([at(0, 0), at(0.06, 0), at(0.06, 1), at(0, 1)], w, {
        bevel: 0.0012,
        holes: [
          [at(0.014, 0.26), at(0.05, 0.26), at(0.05, 0.9), at(0.014, 0.9)].map(
            (p) => [p[0], p[1], 0.003],
          ),
        ],
      }),
      "steel_bare",
      { at: [x, 0, 0], wear: 0.6 },
    );
    // spine and nose lip
    m.add(
      prism(
        [at(-0.003, 0.1), at(0.006, 0.1), at(0.006, 1), at(-0.003, 1)],
        w + 0.004,
        { bevel: 0.001 },
      ),
      "polymer",
      { at: [x, 0, 0] },
    );
    m.add(
      prism(
        [at(0.055, 0.18), at(0.0625, 0.18), at(0.0625, 1), at(0.055, 1)],
        w + 0.003,
        { bevel: 0.001 },
      ),
      "steel_park",
      { at: [x, 0, 0] },
    );
    // nails and their paper collation
    for (let i = 0; i < 30; i++) {
      const c = at(0.031, 0.2 + i * 0.0245);
      m.add(
        rod(0.00145, c[0] - 0.024, c[0] + 0.024, { seg: 6, r: 0.0004 }),
        "brass",
        { at: [x, c[1], 0], wear: 0.3 },
      );
      m.add(
        rod(0.0028, c[0] - 0.0252, c[0] - 0.024, { seg: 6, r: 0 }),
        "brass",
        { at: [x, c[1], 0], wear: 0.3 },
      );
    }
    for (const dz of [0.02, 0.04]) {
      m.add(
        prism(
          [
            at(dz, 0.19),
            at(dz + 0.005, 0.19),
            at(dz + 0.005, 0.93),
            at(dz, 0.93),
          ],
          0.0042,
          { bevel: 0.0003 },
        ),
        "paper_kraft",
        {
          at: [x, 0, 0],
          wear: 0.2,
        },
      );
    }
    // follower with its pull tab, end cap
    m.add(
      prism(
        [at(0.004, 0.9), at(0.056, 0.9), at(0.056, 0.955), at(0.004, 0.955)],
        w - 0.005,
        { bevel: 0.001 },
      ),
      "polymer",
      { at: [x, 0, 0] },
    );
    m.add(box(0.006, 0.012, 0.016, { bevel: 0.002, r: 0.003 }), "rubber_red", {
      at: [x + w / 2 + 0.003, at(0.03, 0.93)[1], at(0.03, 0.93)[0]],
    });
    m.add(
      prism(
        [at(-0.004, 0.97), at(0.064, 0.97), at(0.064, 1.02), at(-0.004, 1.02)],
        w + 0.006,
        { bevel: 0.002 },
      ),
      "polymer",
      { at: [x, 0, 0] },
    );
  }
  const m1 = M();
  magazine(m1, 0, 0.02);
  const magStd = only(m1.build("magazine"), "base,b");
  const m2 = M();
  magazine(m2, 0.0128, 0.02);
  magazine(m2, -0.0128, 0.02);
  // bridge plates joining the two sticks
  for (const t of [0.14, 0.55, 0.96]) {
    const c = at(0.03, t);
    m2.add(box(0.05, 0.012, 0.07, { bevel: 0.0015 }), "steel_park", {
      at: [0, c[1], c[0]],
      rot: [0.436, 0, 0],
    });
  }
  const magWide = only(m2.build("magazine-double"), "a");

  // ------------------------------------------------------------------ nose (moves): single driver guide and contact trip
  const n = M();
  n.add(box(0.015, 0.02, 0.05, { bevel: 0.0015 }), "steel_bare", {
    at: [0, HY, 0.222],
  });
  n.add(box(0.0062, 0.0062, 0.003, { bevel: 0 }), "bore", {
    at: [0, HY, 0.2466],
  });
  // contact trip: stamped steel shoe with teeth
  n.add(
    prism(
      [
        [0.206, HY - 0.0105],
        [0.25, HY - 0.0105, 0.001],
        [0.254, HY - 0.016, 0.001],
        [0.25, HY - 0.0215, 0.002],
        [0.206, HY - 0.0165, 0.002],
      ],
      0.022,
      { bevel: 0.001 },
    ),
    "steel_park",
  );
  for (let i = 0; i < 5; i++) {
    n.add(box(0.0026, 0.004, 0.004, { bevel: 0.0005 }), "steel_bare", {
      at: [-0.008 + i * 0.004, HY - 0.016, 0.2555],
      rot: [PI / 4, 0, 0],
      wear: 0.5,
    });
  }
  n.add(
    sweep(
      [
        [-0.0125, HY - 0.016, 0.24],
        [-0.0185, HY - 0.02, 0.215],
        [-0.019, HY - 0.026, 0.17],
        [-0.0175, HY - 0.034, 0.14],
      ],
      0.0019,
      { seg: 6 },
    ),
    "steel_bare",
  );
  const nose = only(n.build("nose"), "base,b");

  // trigger (moves)
  const tg = M();
  tg.add(
    prism(
      [
        [-0.006, 0.006, 0.002],
        [0.008, 0.006, 0.002],
        [0.008, -0.012, 0.008],
        [0.015, -0.036, 0.003],
        [0.009, -0.039, 0.002],
        [-0.001, -0.016, 0.01],
      ],
      0.013,
      { bevel: 0.003, bevelSeg: 2 },
    ),
    "polymer",
  );
  const trigger = tg.build("trigger");
  trigger.position.set(0, -0.006, 0.004);

  // ------------------------------------------------------------------ branch A 排钉: five-hole manifold, steel carry handle
  const a = M();
  const HOLES = [-0.052, -0.026, 0, 0.026, 0.052];
  // fan casting from the nose block out to the bar
  a.add(
    prism(
      [
        [-0.017, 0.186, 0.004],
        [0.017, 0.186, 0.004],
        [0.066, 0.214, 0.01],
        [0.066, 0.238, 0.003],
        [-0.066, 0.238, 0.003],
        [-0.066, 0.214, 0.01],
      ],
      0.03,
      { plane: "top", bevel: 0.003, bevelSeg: 2 },
    ),
    "iron_cast",
    { at: [0, HY, 0] },
  );
  // stiffening ribs on top of the fan and the clamp bar across the mouths
  for (const x of HOLES) {
    a.add(box(0.005, 0.004, 0.034, { bevel: 0.001 }), "iron_cast", {
      at: [x * 0.86, HY + 0.0165, 0.215],
      rot: [0, x * 9, 0],
      wear: 0.5,
    });
  }
  a.add(box(0.136, 0.008, 0.006, { bevel: 0.001 }), "steel_park", {
    at: [0, HY + 0.0185, 0.232],
  });
  a.add(box(0.136, 0.008, 0.006, { bevel: 0.001 }), "steel_park", {
    at: [0, HY - 0.0185, 0.232],
  });
  for (const x of [-0.064, -0.039, -0.013, 0.013, 0.039, 0.064]) {
    a.add(screw(0.003, { axis: "y", hex: true, h: 0.002 }), "steel_bare", {
      at: [x, HY + 0.0225, 0.232],
      wear: 0.4,
    });
  }
  // air manifold pipe feeding the five drivers, with a braided line back to the head
  a.add(rod(0.0055, -0.07, 0.07, { seg: 12, r: 0.002 }), "brass", {
    rot: [0, PI / 2, 0],
    at: [0, HY + 0.028, 0.214],
  });
  for (const x of HOLES)
    a.add(rod(0.0032, 0, 0.012, { seg: 8 }), "brass", {
      rot: [PI / 2, 0, 0],
      at: [x, HY + 0.029, 0.214],
      wear: 0.4,
    });
  a.add(
    sweep(
      [
        [0.07, HY + 0.028, 0.214],
        [0.078, HY + 0.03, 0.2],
        [0.07, HY + 0.034, 0.15],
        [0.045, HY + 0.03, 0.105],
        [0.034, HY + 0.022, 0.085],
      ],
      0.0036,
      { seg: 8 },
    ),
    "rubber",
  );
  a.add(rod(0.0052, 0.08, 0.092, { seg: 6, flat: true }), "brass", {
    at: [0.0335, HY + 0.0205, 0],
    rot: [0, 0, 0],
  });
  // carry handle: bent steel bar over the head, taped where the hand goes
  a.add(
    sweep(
      [
        [0, HY + 0.036, -0.066],
        [0, HY + 0.054, -0.066],
        [0, HY + 0.071, -0.056],
        [0, HY + 0.075, -0.03],
        [0, HY + 0.075, 0.04],
        [0, HY + 0.071, 0.066],
        [0, HY + 0.054, 0.078],
        [0, HY + 0.034, 0.078],
      ],
      0.0052,
      { seg: 10, tension: 0.3 },
    ),
    "steel_bare",
  );
  a.add(rod(0.0072, -0.034, 0.044, { seg: 14, r: 0.001 }), "tape_black", {
    at: [0, HY + 0.075, 0],
    wear: 0.3,
  });
  for (const z of [-0.066, 0.078]) {
    a.add(box(0.03, 0.005, 0.02, { bevel: 0.0012 }), "steel_park", {
      at: [0, HY + (z < 0 ? 0.041 : 0.0405), z],
    });
    a.add(screw(0.0032, { axis: "y", hex: true, h: 0.002 }), "steel_bare", {
      at: [0.01, HY + (z < 0 ? 0.0435 : 0.043), z],
      mirror: true,
      wear: 0.4,
    });
  }
  const partsA = only(a.build("branch-a"), "a");

  // moving part of A: the five driver guides and one wide contact bar
  const na = M();
  for (const x of HOLES) {
    na.add(
      tube(0.0062, 0.0034, 0.236, 0.256, { seg: 14, r: 0.0006 }),
      "steel_bare",
      { at: [x, HY, 0] },
    );
    na.add(rod(0.0033, 0.24, 0.254, { seg: 8 }), "bore", { at: [x, HY, 0] });
  }
  na.add(
    prism(
      [
        [-0.068, 0.24, 0.002],
        [0.068, 0.24, 0.002],
        [0.068, 0.262, 0.004],
        [-0.068, 0.262, 0.004],
      ],
      0.0022,
      { plane: "top", bevel: 0.0005 },
    ),
    "steel_park",
    { at: [0, HY - 0.0125, 0] },
  );
  for (let i = 0; i < 17; i++) {
    na.add(box(0.0036, 0.004, 0.004, { bevel: 0.0005 }), "steel_bare", {
      at: [-0.064 + i * 0.008, HY - 0.0135, 0.2625],
      rot: [PI / 4, 0, 0],
      wear: 0.5,
    });
  }
  const noseA = only(na.build("nose-a"), "a");

  // ------------------------------------------------------------------ branch B 热钉: heating coil, ceramic sleeve, butane can and copper line
  const hot = kit.mats.glow(0xff5a14, 3.2).clone();
  hot.name = "nailgun-coil";
  hot.userData.glow = 3.2;
  kit.mats.glowMats.push(hot);
  const bb = M();
  // ceramic sleeve: three stacked beads round the nose guide
  for (let i = 0; i < 3; i++) {
    const z = 0.203 + i * 0.0105;
    bb.add(
      lathe(
        [
          [z, 0.0125, 0],
          [z, 0.0195, 0.003],
          [z + 0.0095, 0.0195, 0.003],
          [z + 0.0095, 0.0125, 0],
        ],
        { seg: 24, squash: [1, 1.12] },
      ),
      "ceramic",
      { at: [0, HY, 0], wear: 0.5 },
    );
  }
  // scorch-blued steel collar that carries the coil
  bb.add(
    tube(0.0168, 0.0125, 0.2345, 0.2395, {
      seg: 24,
      r: 0.0006,
      squash: [1, 1.12],
    }),
    "steel_blued",
    { at: [0, HY, 0] },
  );
  // coil leads back to a terminal block
  for (const s of [1, -1]) {
    bb.add(
      sweep(
        [
          [s * 0.012, HY + 0.012, 0.237],
          [s * 0.02, HY + 0.02, 0.222],
          [s * 0.02, HY + 0.026, 0.19],
          [s * 0.012, HY + 0.027, 0.166],
        ],
        0.0016,
        { seg: 6 },
      ),
      s > 0 ? "rubber_red" : "rubber",
    );
  }
  bb.add(box(0.03, 0.009, 0.016, { bevel: 0.0015 }), "ceramic", {
    at: [0, HY + 0.0265, 0.16],
    wear: 0.4,
  });
  bb.add(screw(0.0028, { axis: "y", h: 0.0016 }), "brass", {
    at: [0.009, HY + 0.031, 0.16],
    mirror: true,
    wear: 0.4,
  });
  // butane can strapped to the lower left of the head (kept low so the shooter sees the coil over it)
  const CA = -0.42; // where round the head the can sits (0 = level with the axis, on the left)
  const CR = 0.0645;
  const CX = CR * Math.cos(CA),
    CY = HY + CR * Math.sin(CA);
  // turn a point laid out for a can level with the axis round the head to where the can is
  const ca = Math.cos(CA - 0.093),
    sa = Math.sin(CA - 0.093);
  const rh = (p) => [
    p[0] * ca - (p[1] - HY) * sa,
    HY + p[0] * sa + (p[1] - HY) * ca,
    p[2],
  ];
  const CX0 = 0.064,
    CY0 = HY + 0.006;
  bb.add(
    lathe(
      [
        [-0.07, 0],
        [-0.07, 0.019, 0.003],
        [-0.066, 0.0225, 0.002],
        [0.026, 0.0225, 0.002],
        [0.033, 0.017, 0.004],
        [0.036, 0.0095, 0.002],
        [0.043, 0.0095, 0.0015],
        [0.043, 0],
      ],
      { seg: 28 },
    ),
    "enamel_white",
    { at: [CX, CY, 0], wear: 0.5 },
  );
  bb.add(rod(0.0062, 0.043, 0.052, { seg: 12, r: 0.001 }), "polymer", {
    at: [CX, CY, 0],
  });
  bb.add(rod(0.0042, 0.052, 0.06, { seg: 6, flat: true }), "brass", {
    at: [CX, CY, 0],
  });
  // two worm-drive hose clamps round can and head
  for (const z of [-0.05, 0.012]) {
    bb.add(tube(0.0236, 0.0226, z, z + 0.007, { seg: 28 }), "steel_bare", {
      at: [CX, CY, 0],
      wear: 0.3,
    });
    const tw = CA - 0.093;
    bb.add(box(0.008, 0.007, 0.011, { bevel: 0.001 }), "steel_bare", {
      at: rh([CX0 + 0.0255, CY0 + 0.004, z + 0.0035]),
      rot: [0, 0, tw],
      wear: 0.3,
    });
    bb.add(rod(0.0022, -0.008, 0.008, { seg: 6 }), "steel_park", {
      rot: [-PI / 2, 0, tw],
      at: rh([CX0 + 0.0265, CY0 + 0.004, z + 0.0035]),
      wear: 0.3,
    });
    bb.add(box(0.03, 0.0012, 0.007, { bevel: 0.0003 }), "steel_bare", {
      at: rh([0.05, CY0 + 0.021, z + 0.0035]),
      rot: [0, 0, -0.25 + tw],
      wear: 0.3,
    });
    bb.add(box(0.03, 0.0012, 0.007, { bevel: 0.0003 }), "steel_bare", {
      at: rh([0.05, CY0 - 0.021, z + 0.0035]),
      rot: [0, 0, 0.25 + tw],
      wear: 0.3,
    });
  }
  // copper line from the can valve up the flank to the coil, with a small expansion loop
  bb.add(
    sweep(
      [
        [CX, CY, 0.06],
        [CX, CY + 0.002, 0.082],
        [CX - 0.006, CY + 0.014, 0.1],
        [CX - 0.012, CY + 0.004, 0.112],
        [CX - 0.008, CY - 0.008, 0.122],
        [CX - 0.012, CY + 0.012, 0.138],
        [0.034, HY - 0.004, 0.165],
        [0.028, HY + 0.0, 0.2],
        [0.02, HY + 0.002, 0.228],
      ],
      0.002,
      { seg: 8 },
    ),
    "copper",
  );
  const partsB = only(bb.build("branch-b"), "b");
  partsB.add(
    wrap({
      key: "nailgun-butane",
      r: 0.0228,
      z0: -0.06,
      z1: 0.02,
      px: 512,
      at: [CX, CY, 0],
      rough: 0.4,
      draw(g, W, H) {
        g.fillStyle = "#e8e2d2";
        g.fillRect(0, 0, W, H);
        g.fillStyle = "#d2541a";
        g.fillRect(0, H * 0.72, W, H * 0.28);
        g.fillStyle = "#1c3a7a";
        g.fillRect(0, 0, W, H * 0.1);
        for (const u of [0.25, 0.75]) {
          g.save();
          g.beginPath();
          g.rect(W * (u - 0.22), 0, W * 0.44, H);
          g.clip();
          g.translate(W * (u - 0.5), 0);
          onLeft(g, W, H, (g, w, h) => {
            g.textAlign = "center";
            g.textBaseline = "middle";
            g.fillStyle = "#c8201a";
            g.font = `900 ${h * 0.1}px ${kit.FONT_HEI}`;
            g.fillText("丁烷氣", w * 0.42, h * 0.47);
            g.fillStyle = "#1a1a1a";
            g.font = `700 ${h * 0.04}px ${kit.FONT_MONO}`;
            g.fillText("BUTANE 250g", w * 0.42, h * 0.56);
            // flame mark
            g.fillStyle = "#d2541a";
            g.beginPath();
            g.moveTo(w * 0.12, h * 0.56);
            g.quadraticCurveTo(w * 0.05, h * 0.5, w * 0.11, h * 0.41);
            g.quadraticCurveTo(w * 0.12, h * 0.47, w * 0.15, h * 0.44);
            g.quadraticCurveTo(w * 0.2, h * 0.52, w * 0.12, h * 0.56);
            g.fill();
          });
          g.restore();
        }
      },
    }),
  );
  // the glowing coil rides on the nose so it recoils with it
  const cb = M();
  cb.add(
    helix(0.0182, 0.0025, 0.2405, 0.264, 4.5, {
      seg: 6,
      perTurn: 16,
      squash: [1, 1.12],
    }),
    hot,
    { at: [0, HY, 0] },
  );
  const coil = only(cb.build("coil"), "b");

  // ------------------------------------------------------------------ assemble
  const root = new THREE.Group();
  root.name = "nailgun";
  root.add(body, magStd, magWide, nose, trigger, partsA, noseA, partsB, coil);

  const tip = [0, HY, 0.258];
  const anchors = {
    muzzle: { base: tip, a: [0, HY, 0.264], b: [0, HY, 0.264] },
  };
  HOLES.forEach((x, i) => {
    anchors[`m${i}`] = { base: tip, a: [x, HY, 0.262], b: [0, HY, 0.264] };
  });

  // right hand: rubber grip, index reaching forward onto the trigger.
  // left hand: round the top of the magazine stick like a fore-grip (A's magazine is wider).
  // Holding A by its carry handle was tried: the forearm then crosses the whole view.
  const RIGHT = {
    at: [-0.0225, -0.056, -0.08],
    palm: [1, 0, 0.12],
    fingers: [0.08, -0.27, 0.96],
    pose: {
      base: "wrap",
      r: 0.03,
      index: [0.16, 0.5, 0.3, 0.04],
      thumb: [0.38, -0.75, 0.55, 0.5, 0.45],
    },
    trigger: true,
  };
  // Reloading, the left hand closes round the foot of the stick (its second grip rides the magazine).
  const MAG_GRIP = (x, r) => ({
    at: [x, -0.131, 0.058],
    palm: [-1, 0, 0.05],
    fingers: [-0.12, -0.05, 0.99],
    pose: { base: "wrap", r, thumb: [0.4, 0.1, 0.9, -0.05, 0] },
  });
  const hands = (br) => ({
    right: RIGHT,
    left:
      br === "a"
        ? {
            at: [0.0235, -0.045, 0.092],
            palm: [-1, 0, 0.05],
            fingers: [-0.12, -0.2, 0.97],
            pose: { base: "wrap", r: 0.032, thumb: [0.4, 0.1, 0.9, -0.05, 0] },
            alts: { mag: { parent: magWide, ...MAG_GRIP(0.0235, 0.033) } },
          }
        : {
            at: [0.0125, -0.045, 0.092],
            palm: [-1, 0, 0.05],
            fingers: [-0.12, -0.2, 0.97],
            pose: { base: "wrap", r: 0.019, thumb: [0.4, 0.1, 0.9, -0.05, 0] },
            alts: { mag: { parent: magStd, ...MAG_GRIP(0.0125, 0.02) } },
          },
  });

  const smooth = (x) => {
    const t = Math.min(1, Math.max(0, x));
    return t * t * (3 - 2 * t);
  };
  const span = (x, a, b) => smooth((x - a) / (b - a));
  // Reload, r 0 -> 1 over 1.4 s:
  //   0-0.12     the left hand slides down the stick to its foot
  //   0.12-0.17  thumb on the catch, the stick drops a hair (magOut)
  //   0.17-0.3   pulled out down its own line, clear of the nose block
  //   0.3-0.44   carried down and away out of sight; a beat there
  //   0.52-0.68  back with a full stick, lined up under the nose block
  //   0.68-0.76  pushed home (magIn); 0.8-0.86 heel of the hand slaps the foot over the catch (latch)
  //   0.86-1     back up to the top of the stick
  const PULL = 0.075; // metres down the stick's line before it clears the nose block
  const AWAY = [0.07, -0.26, -0.1]; // out of sight under the left of the gun
  function reload(r, pr, s) {
    const g = model && model.grips.left;
    const mag = model && model.branch === "a" ? magWide : magStd;
    if (r < 0) {
      if (g) g.mix = 0;
      magStd.position.set(0, 0, 0);
      magStd.rotation.set(0, 0, 0);
      magWide.position.set(0, 0, 0);
      magWide.rotation.set(0, 0, 0);
      return;
    }
    // d: distance slid down the line; w: 0..1 of the way to AWAY (and back)
    let d = 0,
      w = 0;
    if (r < 0.17) d = 0.004 * span(r, 0.12, 0.17);
    else if (r < 0.3) d = 0.004 + (PULL - 0.004) * span(r, 0.17, 0.3);
    else if (r < 0.52) {
      d = PULL;
      w = span(r, 0.3, 0.44);
    } else if (r < 0.68) {
      d = PULL;
      w = 1 - span(r, 0.52, 0.68);
    } else if (r < 0.76) d = PULL * (1 - span(r, 0.68, 0.76));
    // the slap: a quick knock up the line past home and back
    const slap =
      r > 0.8 && r < 0.86 ? Math.sin(((r - 0.8) / 0.06) * Math.PI) : 0;
    d -= 0.003 * slap;
    mag.position.set(
      AWAY[0] * w,
      U[1] * d + AWAY[1] * w,
      U[0] * d + AWAY[2] * w,
    );
    // tipped over as it goes, so it leaves foot first
    mag.rotation.set(0.5 * w, 0, -0.35 * w);
    if (s.cue) {
      if (pr < 0.12 && r >= 0.12) s.cue("magOut");
      if (pr < 0.76 && r >= 0.76) s.cue("magIn");
      if (pr < 0.83 && r >= 0.83) s.cue("latch");
    }
    if (g) {
      g.to = "mag";
      g.mix = r < 0.86 ? span(r, 0, 0.12) : 1 - span(r, 0.86, 0.99);
    }
  }

  let model;
  model = kit.weapon({
    id: "nailgun",
    root,
    anchors,
    hands,
    view: {
      hip: { pos: [0.17, -0.158, -0.43], rot: [0.03, 0.08, -0.03] },
      // reloading: lifted and turned side-on, muzzle to the left, so the whole magazine and its foot are in view
      reload: { pos: [0.326, 0.122, -0.114], rot: [0.05, 1.0, -0.1] },
    },
    ownReload: true,
    show: { yaw: -0.95, pitch: 0.1 },
    update(s) {
      reload(s.reload ?? -1, s.prev ? s.prev.reload : -1, s);
      // the contact trip and driver guide snap back on each nail, then return
      const c = s.cycle ?? 1;
      const k = c < 0.18 ? c / 0.18 : c < 0.6 ? 1 - (c - 0.18) / 0.42 : 0;
      const e = k * k * (3 - 2 * k);
      nose.position.z = noseA.position.z = -0.011 * e;
      coil.position.z = -0.011 * e;
      trigger.rotation.x = -(s.trigger || 0) * 0.3;
      // the coil idles at a dull orange and flares towards yellow-white as heat builds
      const heat = Math.max(0, Math.min(1, s.heat || 0));
      const boost = (s.level || 1) >= 5 ? 1.8 : 1;
      const flick =
        0.92 + 0.08 * Math.sin((s.t || 0) * 23) * Math.sin((s.t || 0) * 7.3);
      hot.emissiveIntensity = (2.6 + heat * 4.2 + e * 1.2) * boost * flick;
      hot.emissive.setRGB(1, 0.07 + heat * 0.3, heat * 0.06);
    },
  });
  return model;
}
