// 判官 · large-frame .44 revolver (N-frame class, 6-inch barrel).
// Gun space: +Z muzzle, +Y up, +X shooter's left. Origin at the trigger face.
// The bore sits at y = BORE; the cylinder turns about an axis CY below it, so the top chamber lines up.
const BORE = 0.042;
const CY = 0.0285; // cylinder axis height
const PITCH = BORE - CY; // chamber bolt-circle radius
const CR = 0.022; // cylinder radius
const CZ0 = 0.0258; // cylinder rear face
const CZ1 = 0.0664; // cylinder front face
const FW = 0.034; // frame width
const CH = 0.0059; // chamber radius
const END = 0.2225; // 6" muzzle
const END_A = 0.2735; // 8" muzzle

export default function build(kit) {
  const {
    M,
    prism,
    box,
    lathe,
    rod,
    tube,
    sweep,
    torus,
    screw,
    sphere,
    only,
    label,
  } = kit;
  const THREE = kit.THREE;
  const PI = Math.PI;
  const circ = (r, n = 48, cx = 0, cy = 0, rr = 0) => {
    const p = [];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * PI * 2;
      p.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r, rr]);
    }
    return p;
  };
  const chamberAt = (k) => {
    const a = PI / 2 + (k * PI) / 3;
    return [Math.cos(a) * PITCH, Math.sin(a) * PITCH];
  };

  // ------------------------------------------------------------------ fluted cylinder surface
  // A revolved surface whose radius depends on angle and z: ball-ended flutes between the chambers,
  // bolt notches over them, chamfered ends. Built by hand so the flutes really end in round scoops.
  const FL_D = 0.0028; // flute depth
  const FL_RC = 0.006; // cutter radius
  const FL_HW = Math.sqrt(FL_RC * FL_RC - (FL_RC - FL_D) ** 2);
  const FZ0 = 0.0362,
    FZ1 = 0.0578;
  const chR = 0.0009,
    chF = 0.0019;
  function cutAt(th, z) {
    let cut = 0;
    for (let k = 0; k < 6; k++) {
      // flutes at 0, 60, 120 ... (between the chambers)
      let d = th - (k * PI) / 3;
      d = Math.atan2(Math.sin(d), Math.cos(d));
      const s = d * CR;
      const dz = z < FZ0 ? FZ0 - z : z > FZ1 ? z - FZ1 : 0;
      const dist = Math.hypot(s, dz);
      if (dist < FL_HW)
        cut = Math.max(
          cut,
          Math.sqrt(FL_RC * FL_RC - dist * dist) - (FL_RC - FL_D),
        );
      // bolt notch over each chamber (30 deg further round)
      let e = th - (PI / 2 + (k * PI) / 3);
      e = Math.atan2(Math.sin(e), Math.cos(e));
      const se = Math.abs(e * CR);
      if (se < 0.0017 && z > 0.0288 && z < 0.0336) {
        const ramp = Math.min(
          1,
          (0.0017 - se) / 0.00035,
          (z - 0.0288) / 0.0006,
          (0.0336 - z) / 0.0003,
        );
        cut = Math.max(cut, 0.0011 * ramp);
      }
    }
    return cut;
  }
  function profR(z) {
    if (z < CZ0 + chR) return CR - (CZ0 + chR - z);
    if (z > CZ1 - chF) return CR - (z - (CZ1 - chF));
    return CR;
  }
  function cylinderSurface() {
    const nT = 120;
    const zs = [CZ0, CZ0 + chR * 0.5, CZ0 + chR, CZ0 + chR + 0.00025];
    for (let z = CZ0 + chR + 0.0008; z < CZ1 - chF - 0.0005; z += 0.00085)
      zs.push(z);
    zs.push(CZ1 - chF - 0.00025, CZ1 - chF, CZ1 - chF * 0.5, CZ1);
    const pos = [];
    for (const z of zs) {
      for (let j = 0; j < nT; j++) {
        const th = (j / nT) * PI * 2;
        const r = Math.min(profR(z), CR - cutAt(th, z));
        pos.push(Math.cos(th) * r, Math.sin(th) * r, z);
      }
    }
    const idx = [];
    for (let i = 0; i < zs.length - 1; i++) {
      for (let j = 0; j < nT; j++) {
        const a = i * nT + j,
          b = i * nT + ((j + 1) % nT),
          c = (i + 1) * nT + ((j + 1) % nT),
          d = (i + 1) * nT + j;
        idx.push(a, b, c, a, c, d);
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    g.setIndex(idx);
    g.computeVertexNormals();
    const out = kit.adopt(g);
    // wear: chamfered ends and flute rims rub bright, flute bottoms stay dark
    const P = out.attributes.position,
      W = out.attributes.aWear;
    for (let i = 0; i < P.count; i++) {
      const x = P.getX(i),
        y = P.getY(i),
        z = P.getZ(i);
      const th = Math.atan2(y, x);
      const c = cutAt(th < 0 ? th + PI * 2 : th, z);
      let w = 0;
      if (z < CZ0 + chR + 0.0002 || z > CZ1 - chF - 0.0002) w = 1;
      else if (c > 0 && c < 0.0005) w = 1;
      // flutes are struck bright with a polishing wheel; the bolt notches stay dark
      else if (c >= 0.0005) w = c > 0.0012 ? 0.85 : -0.25;
      W.setX(i, w);
    }
    return out;
  }

  // a cash coin (round, square hole, raised rims) lying in the gun's side plane, facing +X
  function coinGeo(R, t, hole) {
    const h = hole;
    const sq = (s, r = 0) => [
      [-s, -s, r],
      [s, -s, r],
      [s, s, r],
      [-s, s, r],
    ];
    const parts = [
      prism(circ(R - 0.0006, 32), t, { holes: [sq(h)], bevel: 0.0002 }),
      prism(circ(R, 32), t + 0.0006, {
        holes: [circ(R - 0.0011, 32)],
        bevel: 0.00025,
      }),
      prism(sq(h + 0.0008, 0.0002), t + 0.0006, {
        holes: [sq(h)],
        bevel: 0.00025,
      }),
    ];
    return kit.mergeGeometries(parts);
  }

  // ------------------------------------------------------------------ frame (fixed)
  const FRAME = [
    [0.0812, 0.0225, 0.001],
    [0.0812, 0.0568, 0.0018],
    [0.072, 0.059, 0.003],
    [-0.0035, 0.059, 0.0035],
    [-0.012, 0.0505, 0.004],
    [-0.028, 0.0405, 0.008],
    [-0.0365, 0.026, 0.008],
    [-0.0392, 0.012, 0.004],
    [-0.034, -0.001, 0.003],
    [-0.016, -0.0035, 0.003],
    [-0.0115, -0.0042, 0.002],
    [0.03, -0.0042, 0.002],
    [0.052, -0.0018, 0.006],
    [0.0705, 0.0006, 0.004],
    [0.0775, 0.009, 0.004],
  ];
  const WIN = [
    [0.0244, 0.0045, 0.0025],
    [0.0672, 0.0045, 0.0018],
    [0.0672, 0.0515, 0.0018],
    [0.0244, 0.0515, 0.0025],
  ];
  const fr = M();
  fr.add(
    prism(FRAME, FW, { bevel: 0.0038, bevelSeg: 3, holes: [WIN] }),
    "steel_blued",
  );
  // shank collar where the barrel screws in
  fr.add(
    lathe(
      [
        [0.0805, 0],
        [0.0805, 0.0119, 0.0006],
        [0.0862, 0.0119, 0.0008],
        [0.0875, 0.0108, 0.0004],
        [0.0875, 0],
      ],
      { seg: 36 },
    ),
    "steel_blued",
    { at: [0, BORE, 0] },
  );
  // hammer slot in the frame hump
  fr.add(box(0.0094, 0.0014, 0.02, { bevel: 0.0003 }), "bore", {
    at: [0, 0.0452, -0.0205],
    rot: [-0.56, 0, 0],
  });
  // cylinder release thumbpiece on the left, with grooves
  fr.add(
    box(0.0036, 0.0066, 0.0125, { bevel: 0.0008, r: 0.0022 }),
    "steel_blued",
    { at: [0.0183, 0.0372, 0.0072] },
  );
  for (let i = 0; i < 6; i++) {
    fr.add(
      box(0.0008, 0.0056, 0.0007, { bevel: 0.0002, edge: 0 }),
      "steel_bare",
      { at: [0.0202, 0.0372, 0.0025 + i * 0.0019], wear: 0.3 },
    );
  }
  // pins and sideplate screws
  for (const [z, y] of [
    [0.004, 0.0035],
    [-0.016, 0.026],
  ]) {
    fr.add(screw(0.0019, { axis: "x", slot: false, h: 0.0005 }), "steel_bare", {
      at: [FW / 2, y, z],
      mirror: true,
      wear: 0.3,
    });
  }
  for (const [z, y] of [
    [0.008, 0.012],
    [-0.027, 0.03],
    [0.012, 0.047],
    [0.0745, 0.03],
  ]) {
    fr.add(screw(0.0025, { axis: "-x", h: 0.0007 }), "steel_blued", {
      at: [-FW / 2, y, z],
      wear: 0.6,
    });
  }
  // adjustable rear sight: leaf on the top strap, notched blade, elevation and windage screws
  fr.add(
    prism(
      [
        [-0.003, 0.059],
        [0.026, 0.059],
        [0.026, 0.0602, 0.0006],
        [0.004, 0.0612, 0.003],
        [-0.003, 0.0612, 0.0008],
      ],
      0.0085,
      { bevel: 0.0006 },
    ),
    "steel_blued",
  );
  fr.add(
    prism(
      [
        [-0.0072, -0.003, 0.0005],
        [0.0072, -0.003, 0.0005],
        [0.0072, 0.0045, 0.0007],
        [0.0016, 0.0045, 0.0003],
        [0.0016, 0.0012, 0.0003],
        [-0.0016, 0.0012, 0.0003],
        [-0.0016, 0.0045, 0.0003],
        [-0.0072, 0.0045, 0.0007],
      ],
      0.0036,
      { plane: "front", bevel: 0.0004 },
    ),
    "steel_blued",
    { at: [0, 0.0636, -0.0012] },
  );
  fr.add(screw(0.0013, { axis: "y", h: 0.0005 }), "steel_bare", {
    at: [0, 0.0612, 0.0215],
    wear: 0.3,
  });
  fr.add(screw(0.0011, { axis: "-x", h: 0.0005 }), "steel_bare", {
    at: [-0.0073, 0.0645, -0.0012],
    wear: 0.3,
  });
  // white outline behind the notch
  fr.add(box(0.0042, 0.0005, 0.0004, { bevel: 0.0001 }), "enamel_white", {
    at: [0, 0.0645, -0.003],
    wear: 0,
  });
  // trigger guard
  fr.add(
    sweep(
      [
        [0, -0.003, 0.027],
        [0, -0.0125, 0.0245],
        [0, -0.0235, 0.0165],
        [0, -0.0288, 0.002],
        [0, -0.0272, -0.0105],
        [0, -0.018, -0.0172],
        [0, -0.0045, -0.0158],
      ],
      0.0027,
      { seg: 8, steps: 40 },
    ),
    "brass",
    { scale: [2.1, 1, 1], wear: 0.25 },
  );
  const frame = fr.build("frame");

  // ---- scroll engraving on both frame sides, clipped to the metal (never over the cylinder window)
  const ENG = { z0: -0.042, z1: 0.083, y0: -0.006, y1: 0.061 };
  function engrave(face, key) {
    const w = ENG.z1 - ENG.z0,
      h = ENG.y1 - ENG.y0;
    const zc = (ENG.z0 + ENG.z1) / 2,
      yc = (ENG.y0 + ENG.y1) / 2;
    return label({
      key,
      w,
      h,
      px: 1400,
      face,
      at: [(face === "x" ? 1 : -1) * (FW / 2 + 0.00018), yc, zc],
      metal: 0.7,
      rough: 0.4,
      draw(g, W, H) {
        const ppm = W / w;
        const P = (z, y) => [
          face === "x" ? (ENG.z1 - z) * ppm : (z - ENG.z0) * ppm,
          (ENG.y1 - y) * ppm,
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
        let seed = face === "x" ? 7 : 19;
        const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
        g.lineCap = "round";
        g.lineJoin = "round";
        const scroll = (x, y, s, rot, flip) => {
          g.save();
          g.translate(x, y);
          g.rotate(rot);
          g.scale(flip ? -1 : 1, 1);
          const sp = new Path2D();
          const turns = 2.6 * PI;
          for (let i = 0; i <= 48; i++) {
            const t = i / 48;
            const a = t * turns;
            const r = s * (1 - t * 0.88);
            const px = Math.cos(a) * r,
              py = Math.sin(a) * r;
            i ? sp.lineTo(px, py) : sp.moveTo(px, py);
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
          // leaves on the outer turn
          for (let k = 0; k < 5; k++) {
            const a = 0.5 + k * 0.85;
            const r = s * (1 - (a / turns) * 0.88);
            const px = Math.cos(a) * r,
              py = Math.sin(a) * r;
            const nx = Math.cos(a),
              ny = Math.sin(a);
            const tx = -ny,
              ty = nx;
            const L = s * (0.55 - k * 0.06);
            sp.moveTo(px, py);
            sp.quadraticCurveTo(
              px + nx * L * 0.7 + tx * L * 0.5,
              py + ny * L * 0.7 + ty * L * 0.5,
              px + nx * L + tx * L * 0.9,
              py + ny * L + ty * L * 0.9,
            );
            sp.quadraticCurveTo(
              px + nx * L * 0.2 + tx * L * 0.8,
              py + ny * L * 0.2 + ty * L * 0.8,
              px,
              py,
            );
          }
          // shadow cut then bright cut
          g.translate(1.6, 1.8);
          g.strokeStyle = "rgba(0,0,0,0.7)";
          g.lineWidth = 4.2;
          g.stroke(sp);
          g.translate(-1.6, -1.8);
          g.strokeStyle = "rgba(236,190,92,0.95)";
          g.lineWidth = 2.4;
          g.stroke(sp);
          g.strokeStyle = "rgba(255,232,160,0.6)";
          g.lineWidth = 0.9;
          g.stroke(sp);
          g.restore();
        };
        const step = 0.0135 * ppm;
        for (let y = 0; y < H + step; y += step * 0.86) {
          for (let x = 0; x < W + step; x += step) {
            scroll(
              x + (rnd() - 0.5) * step * 0.5,
              y + (rnd() - 0.5) * step * 0.5,
              step * (0.3 + rnd() * 0.1),
              rnd() * PI * 2,
              rnd() > 0.5,
            );
          }
        }
        // keep only the metal: inside the frame, outside the window, clear of the rounded edges
        g.globalCompositeOperation = "destination-in";
        path(FRAME);
        g.fill();
        g.globalCompositeOperation = "destination-out";
        path(WIN);
        g.fill();
        g.lineWidth = 0.0085 * ppm;
        path(FRAME);
        g.stroke();
        path(WIN);
        g.stroke();
        // grip panels cover the lower rear; clear it so nothing peeks through the wood edge
        path([
          [-0.06, 0.013],
          [-0.012, 0.0035],
          [-0.012, -0.03],
          [-0.06, -0.03],
        ]);
        g.fill();
        g.globalCompositeOperation = "source-over";
        // engraved border following the frame, inset from the edge
        g.strokeStyle = "rgba(240,196,98,0.95)";
        g.lineWidth = 3;
        const border = (pts, inset) => {
          // crude inset: pull every point towards the polygon centroid
          let cz = 0,
            cy = 0;
          pts.forEach((p) => ((cz += p[0]), (cy += p[1])));
          cz /= pts.length;
          cy /= pts.length;
          path(
            pts.map((p) => [
              p[0] + Math.sign(cz - p[0]) * inset,
              p[1] + Math.sign(cy - p[1]) * inset,
            ]),
          );
          g.stroke();
        };
        border(WIN, -0.0042);
        // cartouche on the recoil shield
        const [cx, cy] = P(0.0095, 0.0175);
        const cw = 0.021 * ppm,
          chh = 0.0185 * ppm;
        g.fillStyle = "rgba(10,12,16,0.85)";
        g.beginPath();
        g.ellipse(cx, cy, cw / 2, chh / 2, 0, 0, PI * 2);
        g.fill();
        g.strokeStyle = "rgba(226,182,90,0.95)";
        g.lineWidth = 2.2;
        g.stroke();
        g.beginPath();
        g.ellipse(cx, cy, cw / 2 - 5, chh / 2 - 5, 0, 0, PI * 2);
        g.lineWidth = 1.2;
        g.stroke();
        g.fillStyle = "#e6b95c";
        g.textAlign = "center";
        g.textBaseline = "middle";
        if (face === "x") {
          g.font = `700 ${chh * 0.42}px ${kit.FONT_KAI}`;
          g.fillText("判官", cx, cy + 1);
        } else {
          g.font = `600 ${chh * 0.2}px ${kit.FONT_MONO}`;
          g.fillText(".44 MAG", cx, cy - chh * 0.12);
          g.font = `700 ${chh * 0.22}px ${kit.FONT_KAI}`;
          g.fillText("金龍街", cx, cy + chh * 0.16);
        }
        // sideplate seam on the right side
        if (face === "-x") {
          g.strokeStyle = "rgba(0,0,0,0.75)";
          g.lineWidth = 1.4;
          g.beginPath();
          const sp = [
            [0.021, 0.056],
            [0.021, 0.004],
            [-0.006, 0.0005],
            [-0.03, 0.008],
            [-0.033, 0.026],
            [-0.025, 0.04],
            [-0.008, 0.052],
          ];
          sp.forEach((p, i) => {
            const [x, y] = P(p[0], p[1]);
            i ? g.lineTo(x, y) : g.moveTo(x, y);
          });
          g.stroke();
        }
      },
    });
  }
  frame.add(engrave("x", "rev-engrave-l"), engrave("-x", "rev-engrave-r"));

  // ------------------------------------------------------------------ cylinder (indexes 60 deg per shot)
  const cy = M();
  // the cylinder is polished harder than the frame: a lighter, glossier blue that catches the light
  const cylSteel = kit.mats.variant(
    "steel_blued",
    { color: 0x1f2633, rough: 0.2, edge: 0xe2e6ee, edgeAmt: 1, edgeRough: 0.1 },
    "rev_cyl_polish",
  );
  cy.add(cylinderSurface(), cylSteel);
  const chambers = [0, 1, 2, 3, 4, 5].map((k) => {
    const [x, y] = chamberAt(k);
    return [x, y, 0];
  });
  // front face with the six chamber mouths
  cy.add(
    prism(circ(CR - chF, 72), 0.0008, {
      plane: "front",
      bevel: 0,
      holes: chambers.map(([x, y]) => circ(CH, 24, x, y)),
    }),
    cylSteel,
    { at: [0, 0, CZ1 - 0.0004] },
  );
  cy.add(
    prism(circ(CR - chR, 72), 0.0008, { plane: "front", bevel: 0 }),
    cylSteel,
    { at: [0, 0, CZ0 + 0.0004] },
  );
  // the six rounds are their own part (rd): they slide out as empties during a reload and come back
  // in on the speed-loader. Built in cylinder space, rims at z = 0.0247.
  const rd = M();
  for (const [x, y] of chambers) {
    // chamber wall stays with the cylinder
    cy.add(
      tube(CH, CH - 0.0003, 0.0575, CZ1 - 0.0001, { seg: 20, rIn: 0 }),
      "bore",
      { at: [x, y, 0] },
    );
    // case: rim, body and mouth, with the jacketed hollow-point nose sitting in it
    rd.add(
      lathe(
        [
          [0.0247, 0],
          [0.0247, 0.0068, 0.0003],
          [0.0259, 0.0068, 0.0002],
          [0.0261, 0.0057],
          [0.0578, 0.0055, 0.0003],
          [0.0578, 0.0048],
        ],
        { seg: 18 },
      ),
      "brass",
      { at: [x, y, 0], wear: 0.5 },
    );
    rd.add(
      lathe(
        [
          [0.0565, 0],
          [0.0565, 0.0053],
          [0.0598, 0.0051, 0.001],
          [0.0628, 0.0036, 0.0012],
          [0.0631, 0.0019, 0.0004],
          [0.0626, 0.0012, 0.0003],
          [0.0624, 0],
        ],
        { seg: 20 },
      ),
      "copper",
      { at: [x, y, 0], wear: 0.3 },
    );
    // primer: brass tinted to nickel (saves a material on this part)
    rd.add(rod(0.0022, 0.02455, 0.0249, { seg: 16 }), "brass", {
      at: [x, y, 0],
      color: 0xb8bcc4,
      wear: 0.2,
    });
  }
  // centre bushing and the ejector rod with a knurled head
  cy.add(
    tube(0.0045, 0.0029, CZ1 - 0.0005, CZ1 + 0.0006, { seg: 24 }),
    "steel_bare",
    { wear: 0.4 },
  );
  // nickelled ejector rod and head
  cy.add(rod(0.0028, CZ1, 0.1285, { seg: 16 }), "steel_bare", { wear: 0.2 });
  cy.add(
    lathe(
      [
        [0.1282, 0],
        [0.1282, 0.0034, 0.0004],
        [0.1338, 0.0034, 0.0004],
        [0.1345, 0.0026, 0.0003],
        [0.1345, 0],
      ],
      { seg: 24 },
    ),
    "steel_bare",
    { wear: 0.4 },
  );
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * PI * 2;
    cy.add(
      box(0.0007, 0.0006, 0.0048, { bevel: 0.00015, edge: 0 }),
      "steel_bare",
      {
        at: [Math.cos(a) * 0.0034, Math.sin(a) * 0.0034, 0.131],
        rot: [0, 0, a + PI / 2],
        wear: 0.3,
      },
    );
  }
  const cylinder = cy.build("cylinder");
  const rounds = rd.build("rounds");
  cylinder.add(rounds);
  // crane: the cylinder swings out to the left on a yoke pivoting along Z inside the bottom of the
  // frame at (PX, PY). Opened by -90 degrees the cylinder sits clear of the frame, axis at OPEN_C.
  const PX = 0.012,
    PY = 0.0;
  const crane = new THREE.Group();
  crane.name = "crane";
  crane.position.set(PX, PY, 0);
  cylinder.position.set(-PX, CY - PY, 0);
  crane.add(cylinder);
  const yk = M();
  yk.add(
    prism(
      [
        [-0.0035, -0.0035, 0.003],
        [0.0035, -0.0035, 0.003],
        [-0.0085, CY - PY + 0.0045, 0.004],
        [-0.0155, CY - PY + 0.0045, 0.004],
      ],
      0.0036,
      { plane: "front", bevel: 0.0005 },
    ),
    "steel_blued",
    { at: [0, 0, CZ1 + 0.0021] },
  );
  yk.add(rod(0.0028, 0.027, 0.07, { seg: 14 }), "steel_blued");
  crane.add(yk.build("yoke"));
  const OPEN_C = [PX + (CY - PY), PY + PX, 0]; // where the cylinder axis ends up when open

  // speed-loader: a knurled ring with a twist knob; the rounds ride in it on the way to the cylinder
  const sl = M();
  sl.add(
    lathe(
      [
        [-0.0175, 0],
        [-0.0175, 0.0205, 0.002],
        [-0.003, 0.0215, 0.0015],
        [0.0035, 0.0205, 0.001],
        [0.0035, 0.0165],
        [-0.0005, 0.0165],
        [-0.0005, 0],
      ],
      { seg: 36 },
    ),
    "steel_dark",
    { wear: 0.4 },
  );
  sl.add(
    lathe(
      [
        [-0.031, 0],
        [-0.031, 0.0068, 0.0015],
        [-0.0175, 0.0062],
        [-0.0175, 0],
      ],
      { seg: 20, flat: true },
    ),
    "steel_dark",
    { wear: 0.5 },
  );
  const loaderHold = new THREE.Group(); // the hand holds this; its own rotation is the release twist
  loaderHold.name = "speed-loader";
  const loaderSpin = sl.build("speed-loader-body"); // turned so its rounds line up with the chambers
  loaderHold.add(loaderSpin);
  loaderHold.visible = false;

  // 乙: bullets painted with cinnabar, talisman paper and red cord round the cylinder (turn with it)
  const cyb = M();
  for (const [x, y] of chambers) {
    cyb.add(
      lathe(
        [
          [0.0622, 0],
          [0.0622, 0.0034],
          [0.0629, 0.0032, 0.0004],
          [0.0633, 0.0018, 0.0003],
          [0.0634, 0],
        ],
        { seg: 20 },
      ),
      "lacquer_red",
      { at: [x, y, 0], wear: 0.2 },
    );
  }
  for (const z of [0.0348, 0.0528]) {
    cyb.add(torus(0.02215, 0.0006, { seg: 6, around: 72 }), "cord_red", {
      at: [0, 0, z],
      wear: 0.2,
    });
  }
  cyb.add(
    sphere(0.0016, { seg: 10, rings: 6, squash: [1, 1.3, 0.9] }),
    "cord_red",
    { at: [-0.0215, -0.004, 0.0348], wear: 0.2 },
  );
  const cylB = only(cyb.build("cylinder-b"), "b");
  cylB.add(
    kit.wrap({
      key: "rev-talisman-cyl",
      r: 0.0221,
      z0: 0.0355,
      z1: 0.052,
      seg: 72,
      px: 1024,
      rough: 0.9,
      draw(g, W, H) {
        g.fillStyle = "#d8b240";
        g.fillRect(0, 0, W, H);
        g.fillStyle = "rgba(120,80,20,0.25)";
        for (let i = 0; i < 300; i++)
          g.fillRect(Math.random() * W, Math.random() * H, 2, 1);
        g.strokeStyle = "#a8180e";
        g.lineWidth = 3;
        g.strokeRect(0, 5, W, H - 10);
        g.fillStyle = "#a8180e";
        g.font = `700 ${H * 0.58}px ${kit.FONT_KAI}`;
        g.textAlign = "center";
        g.textBaseline = "middle";
        const txt = "敕令鎮煞斬邪";
        for (let i = 0; i < 6; i++)
          g.fillText(txt[i], ((i + 0.5) / 6) * W, H * 0.52);
      },
    }),
  );
  cylinder.add(cylB);

  // ------------------------------------------------------------------ barrels
  // shroud profile (underlug round the ejector rod) with a window that shows the rod
  const shroud = (end, full) =>
    prism(
      full
        ? [
            [0.0805, 0.0225, 0.001],
            [0.09, 0.0225, 0.0015],
            [0.0915, 0.0292, 0.0012],
            [0.1205, 0.0292, 0.0012],
            [0.122, 0.0225, 0.0015],
            [end - 0.004, 0.0225, 0.003],
            [end, 0.027, 0.0035],
            [end, 0.04],
            [0.0805, 0.04],
          ]
        : [
            [0.0805, 0.0225, 0.001],
            [0.09, 0.0225, 0.0015],
            [0.0915, 0.0292, 0.0012],
            [0.1145, 0.0292, 0.0012],
            [0.116, 0.0225, 0.0015],
            [end - 0.005, 0.0225, 0.004],
            [end, 0.0262, 0.004],
            [end - 0.002, 0.04, 0.004],
            [0.0805, 0.04],
          ],
      0.0172,
      { bevel: 0.0012, bevelSeg: 2 },
    );
  const frontSight = (z, mat) => {
    const parts = [];
    parts.push([
      prism(
        [
          [z - 0.019, 0.0553],
          [z + 0.0005, 0.0553],
          [z + 0.0005, 0.0668, 0.0008],
          [z - 0.0035, 0.0672, 0.0008],
          [z - 0.019, 0.0566, 0.004],
        ],
        0.0032,
        { bevel: 0.0005 },
      ),
      mat,
    ]);
    parts.push([
      box(0.0033, 0.0062, 0.0016, { bevel: 0.0002 }),
      "paint_red",
      { at: [0, 0.0634, z - 0.0042], rot: [0.62, 0, 0], wear: 0.1 },
    ]);
    return parts;
  };

  // base / 乙: 6" barrel, solid matted rib, short shroud
  const bs = M();
  bs.add(
    tube(0.0105, 0.0055, 0.0805, END, { seg: 44, r: 0.0008, rIn: 0.0012 }),
    "steel_blued",
    { at: [0, BORE, 0] },
  );
  bs.add(rod(0.0054, 0.086, 0.21, { seg: 16 }), "bore", { at: [0, BORE, 0] });
  bs.add(shroud(0.128, false), "steel_blued");
  bs.add(
    prism(
      [
        [-0.0031, 0.05, 0.0002],
        [0.0031, 0.05, 0.0002],
        [0.0031, 0.0553, 0.0007],
        [-0.0031, 0.0553, 0.0007],
      ],
      END - 0.0815,
      { plane: "front", bevel: 0.0006 },
    ),
    "steel_blued",
    { at: [0, 0, (0.0815 + END) / 2] },
  );
  for (let i = 0; i < 30; i++) {
    bs.add(
      box(0.0054, 0.0004, 0.0009, { bevel: 0.0001, edge: 0 }),
      "steel_dark",
      { at: [0, 0.0554, 0.088 + i * 0.0036], wear: 0 },
    );
  }
  // polished edges along the top of the rib and a bright muzzle crown
  bs.add(rod(0.00055, 0.0835, END - 0.019, { seg: 6 }), "steel_bare", {
    at: [0.0031, 0.0549, 0],
    mirror: true,
    wear: 0.15,
  });
  bs.add(
    tube(0.0101, 0.0062, END - 0.0004, END + 0.0003, { seg: 44 }),
    "steel_bare",
    {
      at: [0, BORE, 0],
      wear: 0.2,
    },
  );
  for (const [g, mat, o] of frontSight(END - 0.003, "steel_blued"))
    bs.add(g, mat, o);
  const barrelStd = only(bs.build("barrel-std"), "base,b");
  const stamp = (key, face, txt, z, w) =>
    label({
      key,
      w,
      h: 0.0052,
      px: 512,
      face,
      at: [(face === "x" ? 1 : -1) * 0.0088, 0.0326, z],
      metal: 0.9,
      rough: 0.35,
      draw(g, W, H) {
        g.clearRect(0, 0, W, H);
        g.fillStyle = "rgba(196,200,208,0.85)";
        g.font = `600 ${H * 0.6}px ${kit.FONT_MONO}`;
        g.textAlign = "center";
        g.textBaseline = "middle";
        g.fillText(txt, W / 2, H * 0.55);
      },
    });
  barrelStd.add(
    stamp("rev-stamp-l", "x", ".44 MAGNUM", 0.103, 0.022),
    stamp("rev-stamp-r", "-x", "N-29  CTN", 0.103, 0.022),
  );

  // 甲: 8" barrel, full underlug, ventilated top rib, gold-line inlay
  const ba = M();
  ba.add(
    tube(0.0105, 0.0055, 0.0805, END_A, { seg: 44, r: 0.0008, rIn: 0.0012 }),
    "steel_blued",
    { at: [0, BORE, 0] },
  );
  ba.add(rod(0.0054, 0.086, END_A - 0.012, { seg: 16 }), "bore", {
    at: [0, BORE, 0],
  });
  ba.add(shroud(END_A, true), "steel_blued");
  // rib: posts and a top strip, flush with the top strap
  ba.add(box(0.0086, 0.0026, END_A - 0.082, { bevel: 0.0005 }), "steel_blued", {
    at: [0, 0.0577, (0.082 + END_A) / 2],
  });
  for (let i = 0; i < 10; i++) {
    const z = 0.088 + i * ((END_A - 0.094) / 9);
    ba.add(box(0.0045, 0.0062, 0.0065, { bevel: 0.0004 }), "steel_blued", {
      at: [0, 0.0535, z],
    });
  }
  for (let i = 0; i < 52; i++) {
    ba.add(
      box(0.0078, 0.0004, 0.0009, { bevel: 0.0001, edge: 0 }),
      "steel_dark",
      { at: [0, 0.0591, 0.086 + i * 0.0036], wear: 0 },
    );
  }
  // gold lines inlaid along the barrel flanks and the lug
  ba.add(rod(0.0007, 0.089, END_A - 0.006, { seg: 6 }), "gold", {
    at: [0.0101, BORE + 0.0026, 0],
    mirror: true,
    wear: 0.2,
  });
  ba.add(rod(0.0006, 0.126, END_A - 0.007, { seg: 6 }), "gold", {
    at: [0.0084, 0.0243, 0],
    mirror: true,
    wear: 0.2,
  });
  // gold lines down both edges of the rib (the inlay you see from behind the gun) and gold bands
  ba.add(rod(0.0006, 0.0835, END_A - 0.019, { seg: 6 }), "gold", {
    at: [0.0042, 0.0589, 0],
    mirror: true,
    wear: 0.2,
  });
  for (const z of [0.0895, END_A - 0.007])
    ba.add(torus(0.0106, 0.0008, { seg: 6, around: 44 }), "gold", {
      at: [0, BORE, z],
      wear: 0.2,
    });
  for (const [g, mat, o] of frontSight(END_A - 0.003, "steel_blued"))
    ba.add(g, mat, o);
  const barrelA = only(ba.build("barrel-a"), "a");
  const inlay = (key, face) =>
    label({
      key,
      w: 0.13,
      h: 0.0094,
      px: 1400,
      face,
      at: [(face === "x" ? 1 : -1) * 0.0088, 0.0302, 0.199],
      metal: 1,
      rough: 0.2,
      draw(g, W, H) {
        g.clearRect(0, 0, W, H);
        g.strokeStyle = "#e8bf5c";
        g.fillStyle = "#f0c868";
        g.lineWidth = 2.4;
        g.lineCap = "round";
        // cloud scroll band either side of the name
        const band = (x0, x1) => {
          g.beginPath();
          for (let x = x0; x <= x1; x += 2) {
            const y = H * 0.5 + Math.sin((x / H) * 2.2) * H * 0.22;
            x === x0 ? g.moveTo(x, y) : g.lineTo(x, y);
          }
          g.stroke();
          for (let x = x0 + H; x < x1 - H * 0.5; x += H * 1.43) {
            g.beginPath();
            g.arc(
              x,
              H * 0.5 + Math.sin((x / H) * 2.2) * H * 0.22,
              H * 0.18,
              0,
              PI * 1.5,
            );
            g.stroke();
          }
        };
        band(10, W * 0.36);
        band(W * 0.64, W - 10);
        g.font = `700 ${H * 0.86}px ${kit.FONT_KAI}`;
        g.textAlign = "center";
        g.textBaseline = "middle";
        g.fillText(face === "x" ? "點 名" : "生死簿", W / 2, H * 0.55);
      },
    });
  barrelA.add(inlay("rev-inlay-l", "x"), inlay("rev-inlay-r", "-x"));

  // ------------------------------------------------------------------ grips (rosewood, cash coin inlay)
  const GRIP = [
    [-0.0118, -0.0028, 0.002],
    [-0.0142, -0.0135, 0.008],
    [-0.0182, -0.026, 0.012],
    [-0.0215, -0.0345, 0.01],
    [-0.0232, -0.05, 0.02],
    [-0.0262, -0.0715, 0.012],
    [-0.0305, -0.0862, 0.006],
    [-0.0632, -0.0915, 0.008],
    [-0.0705, -0.0805, 0.012],
    [-0.0668, -0.056, 0.03],
    [-0.0548, -0.024, 0.03],
    [-0.0462, -0.0035, 0.02],
    [-0.0418, 0.0105, 0.006],
    [-0.0302, 0.0098, 0.004],
    [-0.0165, 0.0035, 0.003],
  ];
  const gr = M();
  const rosewood = kit.mats.variant("wood_rose", {
    color: 0x34120b,
    edge: 0x7a4430,
  });
  gr.add(prism(GRIP, 0.0372, { bevel: 0.0128, bevelSeg: 5 }), rosewood);
  // frame butt between the panels
  gr.add(
    prism(
      [
        [-0.0315, -0.0868, 0.002],
        [-0.0628, -0.0919, 0.002],
        [-0.0628, -0.0905],
        [-0.0315, -0.0854],
      ],
      0.018,
      { bevel: 0.001 },
    ),
    "steel_blued",
  );
  const GC = [-0.0415, -0.047];
  const coinRot = -0.28;
  gr.add(coinGeo(0.0073, 0.0011, 0.002), "coin", {
    at: [0.0186 + 0.0004, GC[1], GC[0]],
    rot: [coinRot, 0, 0],
    mirror: true,
  });
  const grip = gr.build("grip");
  const coinFace = (key, face) =>
    label({
      key,
      w: 0.0144,
      h: 0.0144,
      px: 256,
      face,
      at: [(face === "x" ? 1 : -1) * 0.01962, GC[1], GC[0]],
      spin: face === "x" ? -coinRot : coinRot,
      metal: 1,
      rough: 0.4,
      draw(g, W, H) {
        g.clearRect(0, 0, W, H);
        g.fillStyle = "rgba(238,206,120,0.9)";
        g.textAlign = "center";
        g.textBaseline = "middle";
        g.font = `700 ${H * 0.26}px ${kit.FONT_KAI}`;
        const c = W / 2,
          o = W * 0.29;
        g.fillText("開", c, c - o);
        g.fillText("元", c, c + o);
        g.fillText("通", c + o, c);
        g.fillText("寶", c - o, c);
      },
    });
  grip.add(coinFace("rev-coin-l", "x"), coinFace("rev-coin-r", "-x"));

  // ------------------------------------------------------------------ hammer (pivot at the hammer pin)
  const HP = [-0.016, 0.026];
  const hl = (pts) => pts.map((p) => [p[0] - HP[0], p[1] - HP[1], p[2]]);
  const hm = M();
  hm.add(
    prism(
      hl([
        [-0.021, 0.022, 0.004],
        [-0.009, 0.026, 0.004],
        [-0.0046, 0.039, 0.002],
        [-0.0046, 0.0555, 0.0015],
        [-0.0095, 0.0588, 0.004],
        [-0.0225, 0.0604, 0.008],
        [-0.0335, 0.0652, 0.004],
        [-0.0372, 0.0618, 0.004],
        [-0.0285, 0.0525, 0.008],
        [-0.0255, 0.043, 0.006],
        [-0.0245, 0.028, 0.004],
      ]),
      0.0086,
      { bevel: 0.0011, bevelSeg: 2 },
    ),
    "steel_blued",
  );
  // checkered spur
  for (let i = 0; i < 7; i++) {
    const t = i / 6;
    const z = -0.0245 - t * 0.0095,
      y = 0.0612 + t * 0.0041;
    hm.add(
      box(0.0088, 0.0007, 0.0007, { bevel: 0.0002, edge: 0 }),
      "steel_blued",
      { at: [0, y - HP[1], z - HP[0]], rot: [0.375, 0, 0], wear: 0.7 },
    );
  }
  // hammer nose (firing pin) on the face
  hm.add(rod(0.0012, 0, 0.0016, { seg: 10 }), "steel_bare", {
    at: [0, 0.0475 - HP[1], -0.0046 - HP[0]],
    wear: 0.3,
  });
  const hammer = hm.build("hammer");
  hammer.position.set(0, HP[1], HP[0]);
  // 甲: wide fanning spur
  const hfa = M();
  hfa.add(
    prism(
      [
        [-0.0118, -0.0085, 0.003],
        [0.0118, -0.0085, 0.003],
        [0.0112, 0.0085, 0.005],
        [-0.0112, 0.0085, 0.005],
      ],
      0.0022,
      { plane: "top", bevel: 0.0007 },
    ),
    "steel_blued",
    { at: [0, 0.0642 - HP[1], -0.0305 - HP[0]], rot: [0.375, 0, 0] },
  );
  for (let i = 0; i < 9; i++) {
    hfa.add(
      box(0.021, 0.0006, 0.0008, { bevel: 0.0002, edge: 0 }),
      "steel_bare",
      {
        at: [
          0,
          0.0654 - HP[1] + (i - 4) * 0.0007,
          -0.0305 - HP[0] - (i - 4) * 0.0018,
        ],
        rot: [0.375, 0, 0],
        wear: 0.3,
      },
    );
  }
  hfa.add(box(0.0094, 0.0048, 0.008, { bevel: 0.0008 }), "steel_blued", {
    at: [0, 0.0618 - HP[1], -0.0295 - HP[0]],
    rot: [0.375, 0, 0],
  });
  hammer.add(only(hfa.build("hammer-a"), "a"));

  // ------------------------------------------------------------------ trigger (pivot above the guard)
  const tg = M();
  tg.add(
    prism(
      [
        [0.0035, 0.004, 0.002],
        [0.0012, -0.007, 0.012],
        [-0.0025, -0.0175, 0.01],
        [-0.0028, -0.0245, 0.002],
        [-0.0068, -0.0242, 0.002],
        [-0.0075, -0.016, 0.01],
        [-0.0048, -0.006, 0.01],
        [-0.004, 0.004, 0.002],
      ],
      0.0078,
      { bevel: 0.0016, bevelSeg: 2 },
    ),
    "steel_bare",
  );
  const trigger = tg.build("trigger");
  trigger.position.set(0, 0.0035, 0.004);

  // ------------------------------------------------------------------ 甲: vermilion tassel on a butt swivel
  const vermilion = kit.mats.variant("cloth_red", {
    color: 0xb52a16,
    edge: 0xe86a48,
  });
  const ta = M();
  ta.add(torus(0.0036, 0.0008, { seg: 6, around: 20 }), "steel_bare", {
    rot: [0, PI / 2, 0],
    at: [0, -0.0034, 0],
    wear: 0.4,
  });
  for (const s of [1, -1]) {
    ta.add(
      sweep(
        [
          [0, -0.0068, 0],
          [0.0012 * s, -0.011, 0.0014 * s],
          [0.0008 * s, -0.016, 0.0006 * s],
          [0, -0.0195, 0],
        ],
        0.0008,
        { seg: 6 },
      ),
      "cord_red",
      { wear: 0.2 },
    );
  }
  ta.add(
    sphere(0.0032, { seg: 12, rings: 8, squash: [1, 1.15, 1] }),
    "cord_red",
    { at: [0, -0.021, 0], wear: 0.2 },
  );
  ta.add(
    lathe(
      [
        [0, 0],
        [0, 0.0024, 0.0004],
        [0.006, 0.0036, 0.001],
        [0.0068, 0],
      ],
      { seg: 16 },
    ),
    "gold",
    { rot: [PI / 2, 0, 0], at: [0, -0.0235, 0], wear: 0.4 },
  );
  ta.add(
    lathe(
      [
        [0, 0],
        [0, 0.0034],
        [0.012, 0.0046, 0.004],
        [0.04, 0.0058, 0.002],
        [0.041, 0],
      ],
      { seg: 18 },
    ),
    vermilion,
    { rot: [PI / 2, 0, 0], at: [0, -0.029, 0], wear: 0.15 },
  );
  // loose strands fanning out at the bottom
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * PI * 2 + (i % 2) * 0.2;
    const r0 = 0.0042,
      r1 = 0.0064 + (i % 3) * 0.0006;
    const len = 0.009 + ((i * 7) % 5) * 0.0018;
    ta.add(
      sweep(
        [
          [Math.cos(a) * r0, -0.062, Math.sin(a) * r0],
          [
            Math.cos(a) * (r0 + r1) * 0.5,
            -0.066 - len * 0.4,
            Math.sin(a) * (r0 + r1) * 0.5,
          ],
          [Math.cos(a) * r1, -0.068 - len, Math.sin(a) * r1],
        ],
        0.0006,
        { seg: 4, steps: 6 },
      ),
      vermilion,
      { wear: 0.1 },
    );
  }
  ta.add(torus(0.0047, 0.0007, { seg: 5, around: 18 }), "gold", {
    rot: [PI / 2, 0, 0],
    at: [0, -0.034, 0],
    wear: 0.2,
  });
  const tassel = only(ta.build("tassel"), "a");
  tassel.position.set(0, -0.0905, -0.0485);

  // ------------------------------------------------------------------ 乙: talisman wraps, five-emperor coins, muzzle glow
  const glow = kit.mats.glow(0xff9440, 2.4).clone();
  glow.userData.glow = 2.4;
  kit.mats.glowMats.push(glow);
  const b = M();
  // cord rings on the barrel that the coin string hangs from
  for (const z of [0.142, 0.206]) {
    b.add(torus(0.0111, 0.0007, { seg: 6, around: 40 }), "cord_red", {
      at: [0, BORE, z],
      wear: 0.2,
    });
    b.add(torus(0.0111, 0.0006, { seg: 6, around: 40 }), "cord_red", {
      at: [0, BORE, z + 0.0016],
      wear: 0.2,
    });
  }
  for (const z of [0.1505, 0.1885]) {
    b.add(torus(0.0111, 0.0006, { seg: 6, around: 40 }), "cord_red", {
      at: [0, BORE, z],
      wear: 0.2,
    });
  }
  // the coin string: five coins side by side, a cord woven through the holes
  const coinZ = [0.15, 0.1625, 0.175, 0.1875, 0.2];
  const coinY = (i) => 0.0122 - Math.sin((i / 4) * PI) * 0.0024;
  coinZ.forEach((z, i) => {
    b.add(coinGeo(0.0063, 0.0009, 0.0016), "coin", {
      at: [0, coinY(i), z],
      rot: [(i - 2) * 0.1, 0, 0],
    });
  });
  const weave = [[0, 0.031, 0.142]];
  weave.push([0.0006, 0.022, 0.1435], [0, 0.0155, 0.144]);
  coinZ.forEach((z, i) => weave.push([(i % 2 ? -1 : 1) * 0.0011, coinY(i), z]));
  weave.push([0, 0.015, 0.2055], [0.0006, 0.022, 0.2065], [0, 0.031, 0.206]);
  b.add(sweep(weave, 0.00055, { seg: 5 }), "cord_red", { wear: 0.2 });
  // a red knot and a short tail under the middle coin
  b.add(sphere(0.0017, { seg: 10, rings: 6 }), "cord_red", {
    at: [0, coinY(2) - 0.0072, 0.175],
    wear: 0.2,
  });
  b.add(
    sweep(
      [
        [0, coinY(2) - 0.0072, 0.175],
        [0.0004, coinY(2) - 0.013, 0.1745],
        [0, coinY(2) - 0.019, 0.1756],
      ],
      0.0006,
      { seg: 5 },
    ),
    "cord_red",
    { wear: 0.2 },
  );
  // faint gold-red glow at the muzzle: a ring on the crown and light deep in the bore
  b.add(torus(0.0068, 0.0007, { seg: 6, around: 32 }), glow, {
    at: [0, BORE, END + 0.0003],
  });
  b.add(rod(0.0053, 0.2105, 0.2115, { seg: 16 }), glow, { at: [0, BORE, 0] });
  const partsB = only(b.build("branch-b"), "b");
  partsB.add(
    kit.wrap({
      key: "rev-talisman-barrel",
      r: 0.01075,
      z0: 0.151,
      z1: 0.188,
      arc: [PI + 0.3, PI * 2 - 0.6],
      px: 512,
      rough: 0.9,
      at: [0, BORE, 0],
      draw(g, W, H) {
        g.fillStyle = "#d6ae3c";
        g.fillRect(0, 0, W, H);
        g.fillStyle = "rgba(120,80,20,0.22)";
        for (let i = 0; i < 400; i++)
          g.fillRect(Math.random() * W, Math.random() * H, 2, 1);
        g.strokeStyle = "#a01a10";
        g.lineWidth = 4;
        g.strokeRect(W * 0.08, 8, W * 0.84, H - 16);
        g.fillStyle = "#a01a10";
        g.textAlign = "center";
        g.textBaseline = "middle";
        g.font = `700 ${W * 0.16}px ${kit.FONT_KAI}`;
        // canvas top is the muzzle end: write top-to-bottom so it reads from muzzle to breech on both flanks
        const col = (x, txt) => {
          for (let i = 0; i < txt.length; i++)
            g.fillText(txt[i], x, H * (0.16 + (i * 0.68) / (txt.length - 1)));
        };
        col(W * 0.25, "急急如律令");
        col(W * 0.75, "敕令鎮邪符");
        g.strokeStyle = "#a01a10";
        g.lineWidth = 3;
        g.beginPath();
        g.moveTo(W * 0.5, 14);
        for (let y = 14; y < H - 14; y += 10)
          g.lineTo(W * 0.5 + Math.sin(y * 0.15) * 10, y);
        g.stroke();
      },
    }),
  );

  // ------------------------------------------------------------------ assemble
  const root = new THREE.Group();
  root.name = "revolver";
  root.add(
    frame,
    crane,
    loaderHold,
    barrelStd,
    barrelA,
    grip,
    hammer,
    trigger,
    tassel,
    partsB,
  );

  const smooth = (x) => {
    const t = Math.min(1, Math.max(0, x));
    return t * t * (3 - 2 * t);
  };
  // ------------------------------------------------------------------ hands
  // Right hand high on the grip, web under the hammer spur, index through the guard onto the trigger,
  // thumb along the left of the frame. Left hand cups it from the left and below: palm on the free
  // left panel, fingers wrapped over the right hand's fingers, thumb forward under the right thumb.
  const RIGHT = {
    at: [-0.0212, -0.035, -0.0484],
    palm: [0.997, -0.027, 0.079],
    fingers: [-0.083, -0.261, 0.962],
    pose: {
      base: "wrap",
      r: 0.021,
      // knuckle open, last two joints curled: the pad lands on the trigger inside the guard
      index: [0.57, 1.43, 1.26, 0.1],
      // the other three round the front strap, tips on the left panel
      middle: [1.15, 1.03, 0.8, 0],
      ring: [1.15, 0.88, 0.8, -0.02],
      pinky: [0.94, 0.72, 0.7, -0.05],
      // thumb round the back strap and forward along the left of the frame
      thumb: [0.55, -0.54, 0.6, 0.36, 0.45],
    },
    trigger: true,
  };
  const CUP = {
    at: [0.0329, -0.0694, -0.0271],
    palm: [-0.744, 0.668, -0.017],
    fingers: [-0.208, -0.207, 0.956],
    pose: { base: "wrap", r: 0.028, thumb: [0.3, -0.55, 0.78, 0.15, 0.1] },
  };
  // 甲 fanning: the left hand flat over the hammer, palm down, fingers across to the right; it rakes the
  // spur back for every shot. FAN0 is the forward end of the stroke, FAN1 the back end.
  const FAN = {
    palm: [-0.42, -0.9, 0.05],
    fingers: [-0.88, 0.42, 0.22],
    pose: { base: "flat", thumb: [0.62, -0.32, 0.7, 0.25, 0.2] },
  };
  const FAN0 = [-0.002, 0.073, 0.006],
    FAN1 = [-0.002, 0.067, -0.044];
  const gripQuat = (palm, fingers) => {
    const z = new THREE.Vector3(...fingers).normalize();
    const y = new THREE.Vector3(...palm).negate();
    y.addScaledVector(z, -y.dot(z)).normalize();
    const x = new THREE.Vector3().crossVectors(y, z);
    return new THREE.Quaternion().setFromRotationMatrix(
      new THREE.Matrix4().makeBasis(x, y, z),
    );
  };
  const qCup = gripQuat(CUP.palm, CUP.fingers),
    qFan = gripQuat(FAN.palm, FAN.fingers);
  const vCup = new THREE.Vector3(...CUP.at),
    vFan0 = new THREE.Vector3(...FAN0),
    vFan1 = new THREE.Vector3(...FAN1),
    _v = new THREE.Vector3();
  let fan = 0,
    lastShots = 0,
    lastShotT = -1,
    gap = 1;

  // ------------------------------------------------------------------ reload choreography
  //   0.00-0.10 left thumb presses the latch (latch), the hand moves out to the left to catch
  //   0.10-0.20 the cylinder swings out on its crane into the left palm (cylOpen)
  //   0.20-0.38 muzzle up: the empties slide out and drop away
  //   0.36-0.46 muzzle down, the hand goes below for the speed-loader
  //   0.46-0.58 it comes up behind the open cylinder; 0.58-0.64 the rounds go in (roundIn)
  //   0.64-0.68 twist to release; 0.68-0.74 pull it off; 0.74-0.79 drop it, hand back to the cylinder
  //   0.78-0.85 push the cylinder shut (cylClose); 0.81-1.00 back to the cup grip (slowly: the hand
  //   turns over on the way and the elbow has to come round with it)
  const lerp = (a, b, t) => a + (b - a) * t;
  const CUES = [
    [0.08, "latch"],
    [0.11, "cylOpen"],
    [0.63, "roundIn"],
    [0.845, "cylClose"],
  ];
  const _inv = new THREE.Matrix4(),
    _m = new THREE.Matrix4(),
    _pa = new THREE.Vector3(),
    _pb = new THREE.Vector3(),
    _qa = new THREE.Quaternion(),
    _qb = new THREE.Quaternion(),
    _sc = new THREE.Vector3();
  const gripNode = (L, n) => (n === "main" ? L.anchor : L.alts[n].anchor);
  function capture(L, n, p, q) {
    root.updateWorldMatrix(true, false);
    _inv.copy(root.matrixWorld).invert();
    const o = gripNode(L, n);
    o.updateWorldMatrix(true, false);
    _m.multiplyMatrices(_inv, o.matrixWorld).decompose(p, q, _sc);
  }
  function blend(L, k, pose) {
    const v = L.alts.via;
    v.anchor.position.lerpVectors(_pa, _pb, k);
    v.anchor.quaternion.slerpQuaternions(_qa, _qb, k);
    v.pose = pose;
  }
  const LATCH_POSE = {
    base: "wrap",
    r: 0.028,
    thumb: [0.3, -0.55, 0.8, 0.05, 0.05],
  };
  const CATCH_POSE = { base: "relax", thumb: [0.7, -0.25, 0.6, 0.15, 0.1] };
  const HOLD_POSE = { base: "wrap", r: 0.024 };
  const LOADER_POSE = {
    base: "wrap",
    r: 0.022,
    thumb: [0.6, -0.4, 0.7, 0.3, 0.2],
  };
  // the loader: L0 low and out of sight, L1 lined up 4 cm behind the open cylinder, L2 seated
  const L0 = [0.16, -0.36, -0.2],
    L1 = [OPEN_C[0], OPEN_C[1], -0.016],
    L2 = [OPEN_C[0], OPEN_C[1], 0.0247];
  const setLoader = (a, b, t) =>
    loaderHold.position.set(
      lerp(a[0], b[0], t),
      lerp(a[1], b[1], t),
      lerp(a[2], b[2], t),
    );
  const BASE_ROT = [0.12, 0.08, -0.5],
    BASE_POS = [-0.035, 0.045, 0.0];
  const reloadView = { pos: BASE_POS.slice(), rot: BASE_ROT.slice() };

  let model;
  model = kit.weapon({
    id: "revolver",
    root,
    anchors: {
      muzzle: {
        base: [0, BORE, END + 0.002],
        a: [0, BORE, END_A + 0.002],
        b: [0, BORE, END + 0.002],
      },
    },
    hands: {
      right: RIGHT,
      left: {
        ...CUP,
        alts: {
          // the open cylinder: palm on its outer side, fingers up and over the top
          cyl: {
            at: [OPEN_C[0] + 0.0235, OPEN_C[1] - 0.004, 0.046],
            palm: [-1, 0, 0],
            fingers: [0, 1, 0.1],
            pose: HOLD_POSE,
          },
          // the speed-loader held the same way, from its left side
          loader: {
            parent: loaderHold,
            at: [0.022, -0.009, -0.02],
            palm: [-1, 0.35, 0],
            fingers: [-0.1, 0.8, 1],
            pose: LOADER_POSE,
          },
          via: { at: [0, 0, 0], palm: [0, -1, 0], fingers: [0, 0, 1] },
        },
      },
    },
    ownReload: true,
    view: {
      hip: { pos: [0.085, -0.098, -0.27], rot: [0.03, 0.24, -0.12] },
      reload: reloadView,
    },
    show: { yaw: -0.85, pitch: 0.12 },
    // s.cycle 0 -> 1 after each shot: the hammer drops at once, the cylinder turns one chamber
    // (counter-clockwise from the shooter's side) between 12% and 70%, and the hammer re-cocks by 85%.
    update(s, dt = 1 / 60) {
      const c = s.cycle ?? 1;
      const t = s.t || 0;
      const turn = smooth((c - 0.12) / 0.58);
      cylinder.rotation.z = -((s.shots || 0) - 1 + turn) * (PI / 3);
      let cock =
        c < 0.05 ? 1 - c / 0.05 : c < 0.3 ? 0 : smooth((c - 0.3) / 0.55);
      // 甲: shots coming faster than a trigger pull can manage are being fanned
      const shots = s.shots || 0;
      if (shots !== lastShots) {
        gap = lastShotT >= 0 ? t - lastShotT : 1;
        lastShotT = t;
        lastShots = shots;
      }
      const sinceShot = s.shot ?? 9;
      const fanning =
        s.branch === "a" && s.reload < 0 && gap < 0.16 && sinceShot < 0.2;
      fan += ((fanning ? 1 : 0) - fan) * Math.min(1, dt * (fanning ? 30 : 9));
      const L = model && model.grips.left;
      if (L) {
        // stroke: back to the front over the first 40% of the gap, then rake the spur back
        const p = Math.min(1, sinceShot / 0.075);
        const rake = p < 0.4 ? 1 - smooth(p / 0.4) : smooth((p - 0.4) / 0.6);
        _v.lerpVectors(vFan0, vFan1, rake);
        // the hand lifts a little on the way forward so it clears the spur
        if (p < 0.4) _v.y += 0.008 * Math.sin((p / 0.4) * PI);
        L.anchor.position.lerpVectors(vCup, _v, fan);
        L.anchor.quaternion.slerpQuaternions(qCup, qFan, fan);
        L.pose = fan > 0.5 ? FAN.pose : CUP.pose;
        // the spur goes back with the hand and drops when it slips off
        if (fan > 0.01)
          cock +=
            (Math.max(0, (rake - 0.25) / 0.75) * (p >= 0.4 ? 1 : 0) - cock) *
            fan;
      }
      hammer.rotation.x = -0.46 * cock;
      const pc = s.prev ? s.prev.cycle : c;
      if (pc < 0.85 && c >= 0.85) s.cue("hammerCock");
      reload(s);
      trigger.rotation.x = (s.trigger || 0) * 0.32;
      const kick =
        c < 1 ? Math.sin(Math.min(1, c * 2.2) * PI) * (1 - c) * 0.35 : 0;
      tassel.rotation.x = Math.sin(t * 1.7) * 0.06 + kick;
      tassel.rotation.z = Math.sin(t * 1.23 + 0.7) * 0.05;
      glow.emissiveIntensity =
        glow.userData.glow *
        ((s.level || 1) >= 5 ? 1.8 : 1) *
        (0.85 + Math.sin(t * 2.3) * 0.15 + (1 - c) * 0.6);
    },
  });
  return model;

  function reload(s) {
    const L = model && model.grips.left;
    const r = s.reload;
    if (r < 0 || r === undefined) {
      crane.rotation.z = 0;
      if (rounds.parent !== cylinder) cylinder.add(rounds);
      rounds.position.set(0, 0, 0);
      rounds.visible = true;
      loaderHold.visible = false;
      if (L) {
        L.to = null;
        L.mix = 0;
      }
      for (let i = 0; i < 3; i++) {
        reloadView.rot[i] = BASE_ROT[i];
        reloadView.pos[i] = BASE_POS[i];
      }
      return;
    }
    if (s.prev)
      for (let i = 0; i < CUES.length; i++)
        if (s.prev.reload < CUES[i][0] && r >= CUES[i][0]) s.cue(CUES[i][1]);
    // crane
    const open =
      r < 0.5 ? smooth((r - 0.1) / 0.1) : 1 - smooth((r - 0.78) / 0.07);
    crane.rotation.z = -(PI / 2) * open;
    // muzzle up to drop the empties, then a little down to look into the chambers
    const tip = smooth((r - 0.2) / 0.06) - smooth((r - 0.32) / 0.06);
    const look = smooth((r - 0.38) / 0.08) - smooth((r - 0.74) / 0.08);
    reloadView.rot[0] = BASE_ROT[0] + 0.42 * tip - 0.18 * look;
    // tipping about the eye would lift the gun out of view: drop it as it tips
    reloadView.pos[1] = BASE_POS[1] - 0.075 * tip;
    reloadView.pos[2] = BASE_POS[2] + 0.02 * tip;
    reloadView.rot[2] = BASE_ROT[2] - 0.15 * look;
    // the rounds: out as empties and gone, then back on the loader, then in
    if (r < 0.36) {
      if (rounds.parent !== cylinder) cylinder.add(rounds);
      const out = smooth((r - 0.23) / 0.06);
      const fall = Math.max(0, r - 0.29) / 0.07;
      rounds.position.set(0, 0, -0.045 * out - 0.35 * fall * fall);
      rounds.visible = r < 0.355;
    } else if (r < 0.63) {
      if (rounds.parent !== loaderSpin) loaderSpin.add(rounds);
      rounds.position.set(0, 0, -0.0247);
      rounds.visible = true;
    } else {
      if (rounds.parent !== cylinder) cylinder.add(rounds);
      rounds.position.set(0, 0, 0);
      rounds.visible = true;
    }
    // the loader
    loaderHold.visible = r > 0.36 && r < 0.8;
    loaderSpin.rotation.z = cylinder.rotation.z + crane.rotation.z;
    loaderHold.rotation.z = 0.35 * smooth((r - 0.64) / 0.04);
    if (r < 0.46) setLoader(L0, L0, 0);
    else if (r < 0.58) setLoader(L0, L1, smooth((r - 0.46) / 0.12));
    else if (r < 0.68) setLoader(L1, L2, smooth((r - 0.58) / 0.05));
    else if (r < 0.74) setLoader(L2, L1, smooth((r - 0.68) / 0.06));
    else setLoader(L1, L0, smooth((r - 0.74) / 0.06));
    if (!L || !L.alts.via) return;
    // left hand
    L.to = "via";
    L.mix = 1;
    if (r < 0.1) {
      capture(L, "main", _pa, _qa);
      capture(L, "cyl", _pb, _qb);
      const k = smooth((r - 0.04) / 0.06);
      blend(L, k, k > 0.3 ? CATCH_POSE : r > 0.02 ? LATCH_POSE : L.pose);
    } else if (r < 0.36) {
      capture(L, "cyl", _pa, _qa);
      blend(L, 0, r < 0.2 ? CATCH_POSE : HOLD_POSE);
    } else if (r < 0.46) {
      capture(L, "cyl", _pa, _qa);
      capture(L, "loader", _pb, _qb);
      const k = smooth((r - 0.36) / 0.1);
      blend(L, k, k < 0.5 ? HOLD_POSE : LOADER_POSE);
    } else if (r < 0.74) {
      capture(L, "loader", _pa, _qa);
      blend(L, 0, LOADER_POSE);
    } else if (r < 0.79) {
      // let go of the loader where it was pulled off; it drops away
      const t = loaderHold.position.z;
      setLoader(L1, L1, 0);
      capture(L, "loader", _pa, _qa);
      loaderHold.position.z = t;
      setLoader(L1, L0, smooth((r - 0.74) / 0.06));
      capture(L, "cyl", _pb, _qb);
      const k = smooth((r - 0.74) / 0.05);
      blend(L, k, k < 0.5 ? LOADER_POSE : CATCH_POSE);
    } else {
      // push the cylinder home riding its left side, then back to the cup
      capture(L, "cyl", _pa, _qa);
      const a = crane.rotation.z;
      _pa.x += PX - Math.cos(a) * PX - Math.sin(a) * (CY - PY) - OPEN_C[0];
      _pa.y += PY - Math.sin(a) * PX + Math.cos(a) * (CY - PY) - OPEN_C[1];
      capture(L, "main", _pb, _qb);
      const k = smooth((r - 0.81) / 0.19);
      blend(L, k, k < 0.5 ? CATCH_POSE : L.pose);
    }
  }
}
